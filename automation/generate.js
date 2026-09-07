/**
 * generate.js — مرحله‌ی اول pipeline: انتخاب عکس، تولید کپشن، رندر سه فرمت
 * (تلگرام، پست اینستاگرام، استوری اینستاگرام)، نوشتنِ فایل‌های خروجی روی
 * دیسک (repo checkout همین Action). Commit/push وظیفه‌ی workflow YAML است.
 */

const fs = require("fs");
const path = require("path");
const { pickNextImage, requeueImage } = require("./state.js");
const { renderPost, renderServicePost, fetchBytes, pickTemplateName } = require("./render.js");
const { generateCaption, pickCTA, buildInstagramCaption, buildTwitterCaption, CATEGORY_LABEL_FA } = require("./caption.js");
const { getDesignInfo } = require("./design-lookup.js");
const { pickServicePost, buildServiceCaption } = require("./services.js");

// یه روز از هر ~۵ روز (نه هر روز — تا کانال از پستِ محصول خالی نشه)، به‌جای
// عکسِ محصول، یه پستِ «خدمات» (قسطیِ دیجی‌پی/تنوعِ رنگ/سایز) می‌ره — طبقِ
// خواستِ کاربر: «یه سری پست اضافه کن درباره خدمات میزطوری».
const SERVICE_POST_CHANCE = 0.2;

const GITHUB_OWNER = "mizartoon";
const GITHUB_REPO = "miztore-library";
const GITHUB_BRANCH = "main";
const CATEGORY_FALLBACK_URL = "https://miztore.com/product-category/wearable/t-shirt/";

// اسم فایل جدید → لینک مستقیم محصول (اگه طرح شناسایی/مچ شده بود)، وگرنه null
// (data/product-links.json از design-identification.json + rename-map.json +
// product-catalog.json ساخته شده — به scripts/build-product-links.js نگاه کن)
const PRODUCT_LINKS_PATH = path.join(__dirname, "..", "data", "product-links.json");
const productLinks = fs.existsSync(PRODUCT_LINKS_PATH)
  ? JSON.parse(fs.readFileSync(PRODUCT_LINKS_PATH, "utf-8"))
  : {};

function withUtm(url, source, campaign = "daily_post") {
  const u = new URL(url);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", "bot");
  u.searchParams.set("utm_campaign", campaign);
  return u.toString();
}

// خروجی/last-run.json دقیقاً هم‌شکلِ مسیرِ محصوله (publish.js فرقی بین این
// دو نمی‌ذاره) — فقط بدون عکسِ محصول، بدون pickNextImage/pool. key این‌جا
// فقط برای audit-logِ state.json (markUsed) استفاده می‌شه، نه دیدوپِ واقعی.
async function runServicePost(env, dryRun) {
  const service = pickServicePost();
  const caption = buildServiceCaption(service);

  const dateStr = new Date().toISOString().slice(0, 10);
  const runId = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT || "1"}`
    : String(Date.now());
  const baseName = `${dateStr}-${runId}-service-${service.id}`;

  const outputs = {};
  for (const format of ["telegram", "post", "story"]) {
    const buffer = await renderServicePost({ format, headline: service.headline, body: service.body, cta: service.cta });
    const outRelPath = `outputs/${format}-${baseName}`;
    const outAbsPath = path.join(__dirname, "..", outRelPath);
    fs.mkdirSync(path.dirname(outAbsPath), { recursive: true });
    fs.writeFileSync(outAbsPath, buffer);
    outputs[format] = outRelPath;
  }

  const buyUrlTelegram = withUtm(CATEGORY_FALLBACK_URL, "telegram", "service_post");
  const buyUrlInstagram = withUtm(CATEGORY_FALLBACK_URL, "instagram", "service_post");
  const buyUrlTwitter = withUtm(CATEGORY_FALLBACK_URL, "twitter", "service_post");

  fs.writeFileSync(
    path.join(__dirname, "last-run.json"),
    JSON.stringify(
      {
        ok: true,
        dryRun,
        key: `service/${service.id}`,
        category: "خدمات",
        templateName: "service",
        outputs,
        headline: service.headline,
        caption,
        instagramCaption: caption,
        twitterCaption: `${caption}\n\n${buyUrlTwitter}`,
        buyUrlTelegram,
        buyUrlInstagram,
        buyUrlTwitter,
      },
      null,
      2
    )
  );

  console.log(`✅ پستِ خدمات رندر شد${dryRun ? " (dry-run)" : ""}: ${service.id}`);
}

async function main() {
  const env = process.env;
  const dryRun = env.DRY_RUN === "true";

  if (Math.random() < SERVICE_POST_CHANCE) {
    return runServicePost(env, dryRun);
  }

  const picked = pickNextImage();
  if (!picked) {
    console.log("::warning::هیچ عکسِ استفاده‌نشده‌ای پیدا نشد.");
    fs.writeFileSync(path.join(__dirname, "last-run.json"), JSON.stringify({ ok: false, reason: "no-images" }));
    return;
  }

  const { key, category } = picked;

  try {
    const sourceUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${key}`;
    const photoBytes = await fetchBytes(sourceUrl);

    const designInfo = getDesignInfo(key);
    const { headline, caption } = await generateCaption(env, { category, designInfo });
    const cta = pickCTA();
    const categoryLabel = CATEGORY_LABEL_FA[category] || "میزطوری";
    // یک قالب برای هر سه فرمتِ همین پست — تا تلگرام/پست/استوریِ یک پست
    // ناهم‌خوان نشن (هر پست یک ظاهر، نه قاطیِ سه تا خانواده‌ی مختلف).
    const templateName = pickTemplateName();

    // نکته‌ی مهم: baseName باید per-run یکتا باشه، نه فقط per-day — چون
    // dry-run بلافاصله عکس رو requeue می‌کنه، ممکنه چند اجرا (dry-run یا
    // واقعی) تو یه روز دقیقاً همون عکس رو بردارن. اگه فقط تاریخ+کلید بود،
    // دو اجرا مسیر خروجیِ یکسان می‌ساختن و commitِ دومی روی باینریِ JPEG
    // merge-conflict می‌خورد (دقیقاً همون خطایی که باعث شد /post چیزی پست
    // نکنه — مرحله‌ی commit/push شکست خورد، هیچ‌وقت به مرحله‌ی publish نرسید).
    const dateStr = new Date().toISOString().slice(0, 10);
    const runId = process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT || "1"}`
      : String(Date.now());
    const baseName = `${dateStr}-${runId}-${key.replace(/\//g, "-")}`;

    const outputs = {};
    for (const format of ["telegram", "post", "story"]) {
      const buffer = await renderPost({ photoBytes, headline, cta, categoryLabel, format, templateName });
      const outRelPath = `outputs/${format}-${baseName}`;
      const outAbsPath = path.join(__dirname, "..", outRelPath);
      fs.mkdirSync(path.dirname(outAbsPath), { recursive: true });
      fs.writeFileSync(outAbsPath, buffer);
      outputs[format] = outRelPath;
    }

    const baseBuyUrl = productLinks[key] || CATEGORY_FALLBACK_URL;
    const buyUrlTelegram = withUtm(baseBuyUrl, "telegram");
    const buyUrlInstagram = withUtm(baseBuyUrl, "instagram");
    const buyUrlTwitter = withUtm(baseBuyUrl, "twitter");
    const instagramCaption = buildInstagramCaption(caption, category);
    const twitterCaption = buildTwitterCaption(caption, category, buyUrlTwitter);

    // dry-run: چیزی مصرف نمی‌شه — عکس فوراً به جلوی pool برمی‌گرده تا فردا
    // (یا اجرای واقعی بعدی) دوباره در دسترس باشه.
    if (dryRun) requeueImage(category, key);

    fs.writeFileSync(
      path.join(__dirname, "last-run.json"),
      JSON.stringify(
        {
          ok: true,
          dryRun,
          key,
          category,
          templateName,
          outputs, // { telegram, post, story } → مسیر نسبیِ هر فایل
          headline,
          caption,
          instagramCaption,
          twitterCaption,
          buyUrlTelegram,
          buyUrlInstagram,
          buyUrlTwitter,
        },
        null,
        2
      )
    );

    console.log(`✅ رندر شد${dryRun ? " (dry-run)" : ""}: ${Object.values(outputs).join(", ")}`);
  } catch (err) {
    requeueImage(category, key);
    console.error("::error::" + (err && err.stack ? err.stack : err));
    fs.writeFileSync(
      path.join(__dirname, "last-run.json"),
      JSON.stringify({ ok: false, reason: "error", message: String(err.message || err), key, category })
    );
    process.exitCode = 1;
  }
}

main();

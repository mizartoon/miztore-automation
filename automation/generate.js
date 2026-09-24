/**
 * generate.js — مرحله‌ی اول pipeline: انتخاب عکس، تولید کپشن، رندر سه فرمت
 * (تلگرام، پست اینستاگرام، استوری اینستاگرام)، نوشتنِ فایل‌های خروجی روی
 * دیسک (repo checkout همین Action). Commit/push وظیفه‌ی workflow YAML است.
 */

const fs = require("fs");
const path = require("path");
const { pickNextImage, requeueImage, loadState, saveState } = require("./state.js");
const { setTheme, renderPost, renderAlt, renderChart, renderServicePost, fetchBytes } = require("./render.js");
const { buildInstagramCaption, buildTwitterCaption, CATEGORY_LABEL_FA } = require("./caption.js");
const { writePost, locateDesign } = require("./copywriter.js");
const { studioDesignBox } = require("./design-box.js");
const { getProductFacts } = require("./product-facts.js");
const { getDesignInfo } = require("./design-lookup.js");
const { pickServicePost, buildServiceCaption } = require("./services.js");
const { runCampaign } = require("./campaigns.js");
const store = require("./store.js");

// ترکیبِ محتوایِ روزانه (کاربر: «محتواهایی برای تشویقِ مشتری به خرید اضافه کن»).
// بیشترِ روزها هنوز عکسِ یه محصول، بقیه: خدمات، پرفروش‌ها، کالکشن، راهنمایِ
// هدیه، «این یا اون؟». با CONTENT_TYPE=... می‌شه یه نوعِ خاص رو اجبار کرد (تست).
// ۲۰۲۶-۰۹-۲۵ (کاربر): تمرکزِ بیشتر رویِ طرح‌هایِ اختصاصی، بعد تنوعِ رنگ و سایز، و هدیه.
const CONTENT_MIX = [
  ["product", 0.38],
  ["service", 0.17], // اولویت با «طرح‌هایِ اختصاصی»، بعد رنگ/سایز/ست‌شدن و هدیه — services.js
  ["spotlight", 0.13], // معرفیِ یه محصول: رنگ‌ها / سایزها / جنس و کیفیت / مدل‌هایِ دوخت
  ["gift", 0.14],
  ["collection", 0.08],
  ["bestsellers", 0.05],
  ["versus", 0.05],
];
function pickContentType(forced) {
  if (forced && CONTENT_MIX.some(([t]) => t === forced)) return forced;
  let r = Math.random();
  for (const [t, w] of CONTENT_MIX) if ((r -= w) < 0) return t;
  return "product";
}

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

// لینکِ کوتاه (اینستاگرام لینکِ بلندِ فارسیِ encodeشده + UTMِ کامل رو قبول نمی‌کرد):
// وردپرس خودش ?p=ID و ?product_cat=slug رو به صفحه‌ی اصلی ریدایرکت می‌کنه و
// utm_source رو هم نگه می‌داره.
const CAT_SLUG = { tshirt: "t-shirt", hoodie: "hoodie", pullover: "sweatshirt", longsleeve: "t-shirt", croptop: "crop-top" };
function shortLink({ productId, category }, source) {
  if (productId) return `https://miztore.com/?p=${productId}&utm_source=${source}`;
  return `https://miztore.com/?product_cat=${CAT_SLUG[category] || "t-shirt"}&utm_source=${source}`;
}

// یه عکسِ دیگه از همین طرح: اول از کتابخونه (همون اسم، شماره یا دسته‌یِ دیگه، مثلاً
// tshirt/x-2.jpg یا hoodie/x.jpg)، وگرنه یه عکسِ دیگه از گالریِ صفحه‌یِ محصول در سایت.
const baseOf = (k) => String(k).split("/").pop().replace(/\.[a-z]+$/i, "").replace(/-\d+$/, "");
async function findAltPhoto(key, facts) {
  const st = loadState();
  const base = baseOf(key);
  const sibs = [];
  for (const [cat, list] of Object.entries(st.manifests || {})) for (const k of list || []) if (k !== key && baseOf(k) === base) sibs.push({ k, cat });
  if (sibs.length) {
    const s = sibs[Math.floor(Math.random() * sibs.length)];
    const bytes = await fetchBytes(`https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${s.k}`);
    return { bytes, category: s.cat };
  }
  if (facts && facts.scope === "product" && facts.id) {
    const d = await store.productDetail(facts.id);
    const imgs = (d?.images || []).slice(1);
    if (imgs.length) return { bytes: await fetchBytes(imgs[Math.floor(Math.random() * imgs.length)]), category: null };
  }
  return null;
}

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
  const [shipping, custom] = await Promise.all([store.shippingNote().catch(() => null), store.customDesign().catch(() => null)]);
  const service = pickServicePost({ shipping, custom });
  const caption = buildServiceCaption(service);

  const dateStr = new Date().toISOString().slice(0, 10);
  const runId = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT || "1"}`
    : String(Date.now());
  const baseName = `${dateStr}-${runId}-service-${service.id}`;

  const outputs = {};
  for (const format of ["telegram", "post", "story", "twitter"]) {
    const buffer = await renderServicePost({ format, ...service });
    const outRelPath = `outputs/${format}-${baseName}`;
    const outAbsPath = path.join(__dirname, "..", outRelPath);
    fs.mkdirSync(path.dirname(outAbsPath), { recursive: true });
    fs.writeFileSync(outAbsPath, buffer);
    outputs[format] = outRelPath;
  }

  const svcLink = (src) => (service.id === "custom" && custom ? custom.link(src) : shortLink({ category: "tshirt" }, src));
  const buyUrlTelegram = svcLink("tg");
  const buyUrlInstagram = svcLink("ig");
  const buyUrlTwitter = svcLink("x");

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

async function runCampaignPost(env, dryRun, type) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const runId = process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT || "1"}` : String(Date.now());
  const baseName = `${dateStr}-${runId}-campaign-${type}.jpg`;
  const write = (name, buffer) => {
    const outRelPath = `outputs/${name}-${baseName}`;
    const outAbsPath = path.join(__dirname, "..", outRelPath);
    fs.mkdirSync(path.dirname(outAbsPath), { recursive: true });
    fs.writeFileSync(outAbsPath, buffer);
    return outRelPath;
  };
  const r = await runCampaign(env, { type, dryRun, write });
  fs.writeFileSync(path.join(__dirname, "last-run.json"), JSON.stringify({ ok: true, templateName: type, ...r }, null, 2));
  console.log(`✅ پستِ ${type} رندر شد${dryRun ? " (dry-run)" : ""}: ${r.headline} (${r.copySource})`);
}

// تمِ تیره پیش‌فرضه (کاربر، ۲۰۲۶-۰۹-۲۵: «تم دارک مد بیشتر به قالب میاد»). روشن فقط گاهی
// برایِ تنوعِ فید: بعد از پستِ تیره ۲۰٪ شانس، هیچ‌وقت دو روشن پشتِ‌سرِهم (در کل ~۸۵٪ تیره).
// THEME=light|dark برایِ تست.
function pickTheme(forced, dryRun) {
  if (forced === "light" || forced === "dark") return forced;
  const st = loadState();
  const theme = st.lastTheme === "light" ? "dark" : Math.random() < 0.2 ? "light" : "dark";
  if (!dryRun) {
    st.lastTheme = theme;
    saveState(st);
  }
  return theme;
}

async function main() {
  const env = process.env;
  const dryRun = env.DRY_RUN === "true";
  const theme = pickTheme(env.THEME, dryRun);
  setTheme(theme);
  console.log(`🎨 تم: ${theme === "dark" ? "تیره" : "روشن"}`);

  const type = pickContentType(env.CONTENT_TYPE);
  console.log(`🎲 نوعِ محتوایِ امروز: ${type}`);
  if (type === "service") return runServicePost(env, dryRun);
  if (type !== "product") {
    try {
      return await runCampaignPost(env, dryRun, type);
    } catch (err) {
      console.error(`[campaign] ${type} شکست خورد، برمی‌گردیم رویِ پستِ محصول:`, err.message);
    }
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
    const categoryLabel = CATEGORY_LABEL_FA[category] || "میزطوری";
    // اطلاعاتِ واقعیِ فروشگاه (قیمت/رنگ/سایز) + متن و جایِ طرح از رویِ خودِ عکس
    const facts = await getProductFacts({ productUrl: productLinks[key], category });
    const copy = await writePost(env, { photoBytes, category, label: categoryLabel, designInfo, facts, key });
    const { headline, caption, designBox } = copy;
    console.log(`✍️ متن از ${copy.source} | طرح ${designBox ? "پیدا شد" : "پیدا نشد"} | اطلاعات: ${facts ? facts.scope : "ندارد"}`);

    // نکته‌ی مهم: baseName باید per-run یکتا باشه، نه فقط per-day — چون
    // dry-run بلافاصله عکس رو requeue می‌کنه، ممکنه چند اجرا تو یه روز دقیقاً
    // همون عکس رو بردارن؛ مسیرِ یکسان = merge-conflictِ باینری تو commit.
    const dateStr = new Date().toISOString().slice(0, 10);
    const runId = process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT || "1"}`
      : String(Date.now());
    const baseName = `${dateStr}-${runId}-${key.replace(/\//g, "-")}`;

    const write = (name, buffer) => {
      const outRelPath = `outputs/${name}-${baseName}`;
      const outAbsPath = path.join(__dirname, "..", outRelPath);
      fs.mkdirSync(path.dirname(outAbsPath), { recursive: true });
      fs.writeFileSync(outAbsPath, buffer);
      return outRelPath;
    };

    const outputs = {};
    for (const format of ["telegram", "post", "story", "twitter"]) {
      outputs[format] = write(format, await renderPost({ photoBytes, headline, categoryLabel, facts, designBox, format }));
    }
    // کاروسلِ اینستاگرام: پستِ اصلی ← یه عکسِ واقعیِ دیگه از همین طرح ← رنگ و سایز
    // (کاربر، ۲۰۲۶-۰۹-۲۵: «طرح از نزدیک» کیفیت نداشت و اسلایدِ اطلاعات تو همه‌یِ پست‌ها تکراری بود)
    const carousel = [outputs.post];
    const alt = await findAltPhoto(key, facts).catch((e) => (console.error("alt:", e.message), null));
    if (alt) {
      const tag = alt.category && alt.category !== category ? `رو ${CATEGORY_LABEL_FA[alt.category] || "لباسِ دیگه"} هم هست` : null;
      const altBox = (await studioDesignBox(alt.bytes).catch(() => null)) || (await locateDesign(env, alt.bytes).catch(() => null));
      const buf = await renderAlt({ photoBytes: alt.bytes, line: copy.altLine, tag, designBox: altBox }).catch((e) => (console.error("alt render:", e.message), null));
      if (buf) carousel.push(write("alt", buf));
    }
    const chart = await renderChart({ facts, category, title: copy.chartLine }).catch((e) => (console.error("chart:", e.message), null));
    if (chart) carousel.push(write("chart", chart));
    outputs.carousel = carousel;
    const templateName = "frame";

    const linkTarget = { productId: facts && facts.scope === "product" ? facts.id : null, category };
    const buyUrlTelegram = shortLink(linkTarget, "tg");
    const buyUrlInstagram = shortLink(linkTarget, "ig");
    const buyUrlTwitter = shortLink(linkTarget, "x");
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
          outputs, // { telegram, post, story, twitter, carousel[] } → مسیرِ نسبیِ هر فایل
          copySource: copy.source,
          about: copy.about || null, // ریشه‌یِ طرح: یادداشتِ صاحبِ برند یا تحقیقِ وب (برایِ بازبینیِ ادمین)
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

    console.log(`✅ رندر شد${dryRun ? " (dry-run)" : ""}: ${Object.values(outputs).flat().join(", ")}`);
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

/**
 * generate.js — مرحله‌ی اول pipeline: انتخاب عکس، تولید کپشن، رندر طرح نهایی،
 * نوشتنِ فایل خروجی روی دیسک (repo checkout همین Action). Commit/push این
 * فایل‌ها وظیفه‌ی workflow YAML است، نه این اسکریپت — چون باید بعد از push
 * بشه که URL خامِ GitHub واقعاً زنده بشه (مرحله‌ی بعدی: publish.js).
 */

const fs = require("fs");
const path = require("path");
const { pickNextImage, requeueImage } = require("./state.js");
const { renderPost, fetchBytes } = require("./render.js");
const { generateCaption } = require("./caption.js");

const GITHUB_OWNER = "mizartoon";
const GITHUB_REPO = "miztore-library";
const GITHUB_BRANCH = "main";
const CTA_TEXT = "ببرش"; // متنِ ثابتِ روی خودِ عکس — کنترل‌شده، نه AI
const CATEGORY_FALLBACK_URL = "https://miztore.com/product-category/wearable/t-shirt/";

// اسم فایل جدید → لینک مستقیم محصول (اگه طرح شناسایی/مچ شده بود)، وگرنه null
// (data/product-links.json از design-identification.json + rename-map.json +
// product-catalog.json ساخته شده — به scripts/build-product-links.js نگاه کن)
const PRODUCT_LINKS_PATH = path.join(__dirname, "..", "data", "product-links.json");
const productLinks = fs.existsSync(PRODUCT_LINKS_PATH)
  ? JSON.parse(fs.readFileSync(PRODUCT_LINKS_PATH, "utf-8"))
  : {};

async function main() {
  const env = process.env;
  const dryRun = env.DRY_RUN === "true";

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

    const { headline, caption } = await generateCaption(env, { category });

    const buffer = await renderPost({ photoBytes, headline, cta: CTA_TEXT, format: "telegram" });

    const dateStr = new Date().toISOString().slice(0, 10);
    const outName = `${dateStr}-${key.replace(/\//g, "-")}`;
    const outRelPath = `outputs/${outName}`;
    const outAbsPath = path.join(__dirname, "..", outRelPath);
    fs.mkdirSync(path.dirname(outAbsPath), { recursive: true });
    fs.writeFileSync(outAbsPath, buffer);

    // لینک دکمه‌ی شیشه‌ای: اگه طرح این عکس مچِ یه محصول واقعی بود، مستقیم به
    // همون صفحه؛ وگرنه به صفحه‌ی دسته‌بندیِ تیشرت (fallback عمومی).
    const buyUrl = productLinks[key] || CATEGORY_FALLBACK_URL;

    // dry-run: چیزی مصرف نمی‌شه — عکس فوراً به جلوی pool برمی‌گرده تا فردا
    // (یا اجرای واقعی بعدی) دوباره در دسترس باشه.
    if (dryRun) requeueImage(category, key);

    fs.writeFileSync(
      path.join(__dirname, "last-run.json"),
      JSON.stringify({ ok: true, dryRun, key, category, outRelPath, headline, caption, buyUrl }, null, 2)
    );

    console.log(`✅ رندر شد${dryRun ? " (dry-run)" : ""}: ${outRelPath}`);
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

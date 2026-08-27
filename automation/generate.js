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

    const fullCaption = `${caption}\n\n🔗 <a href="https://miztore.com/product-category/wearable/t-shirt/">مشاهده در فروشگاه</a>`;

    // dry-run: چیزی مصرف نمی‌شه — عکس فوراً به جلوی pool برمی‌گرده تا فردا
    // (یا اجرای واقعی بعدی) دوباره در دسترس باشه.
    if (dryRun) requeueImage(category, key);

    fs.writeFileSync(
      path.join(__dirname, "last-run.json"),
      JSON.stringify({ ok: true, dryRun, key, category, outRelPath, headline, caption: fullCaption }, null, 2)
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

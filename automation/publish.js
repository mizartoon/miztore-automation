/**
 * publish.js — مرحله‌ی دوم: بعد از اینکه workflow خروجیِ generate.js را
 * commit/push کرد (پس URL خام گیت‌هاب حالا واقعاً زنده است)، این اسکریپت
 * آن را به کانال تلگرام پست می‌کند و به دیدوپ اضافه می‌کند.
 */

const fs = require("fs");
const path = require("path");
const { markUsed } = require("./state.js");
const { sendPhotoByUrl, notifyAdmin } = require("./telegram.js");

const GITHUB_OWNER = "mizartoon";
const GITHUB_REPO = "miztore-automation";
const GITHUB_BRANCH = "main";

async function main() {
  const env = process.env;
  const lastRunPath = path.join(__dirname, "last-run.json");
  const lastRun = JSON.parse(fs.readFileSync(lastRunPath, "utf-8"));

  if (!lastRun.ok) {
    await notifyAdmin(env, `⚠️ میزطوری: پایپ‌لاین امروز پست نکرد — ${lastRun.reason}: ${lastRun.message || ""}`);
    return;
  }

  const outputUrl = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${lastRun.outRelPath}`;

  try {
    const buttonOpts = { buttonText: "🛍 مشاهده در فروشگاه", buttonUrl: lastRun.buyUrl };

    if (lastRun.dryRun) {
      if (!env.TELEGRAM_ADMIN_CHAT_ID) throw new Error("TELEGRAM_ADMIN_CHAT_ID تنظیم نشده — پیش‌نمایش رو کجا بفرستم؟");
      const previewCaption = `🧪 <b>پیش‌نمایش</b> (${lastRun.category}) — پست نشده، عکس هنوز تو pool هست.\n\n${lastRun.caption}`;
      await sendPhotoByUrl(env, env.TELEGRAM_ADMIN_CHAT_ID, outputUrl, previewCaption, buttonOpts);
      console.log("✅ پیش‌نمایش به ادمین فرستاده شد (پست واقعی انجام نشد).");
      return;
    }

    await sendPhotoByUrl(env, env.TELEGRAM_CHANNEL_ID, outputUrl, lastRun.caption, buttonOpts);
    markUsed(lastRun.key);
    await notifyAdmin(env, `✅ میزطوری پست شد (${lastRun.category}): ${lastRun.key}\n${lastRun.headline}`);
    console.log("✅ به تلگرام پست شد.");
  } catch (err) {
    console.error("::error::" + (err && err.stack ? err.stack : err));
    await notifyAdmin(env, `❌ میزطوری: خطا در پست کردن ${lastRun.key}:\n${err.message}`);
    process.exitCode = 1;
  }
}

main();

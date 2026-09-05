/**
 * publish.js — مرحله‌ی دوم: بعد از اینکه workflow خروجی‌های generate.js را
 * commit/push کرد، این اسکریپت:
 *   - نسخه‌ی تلگرام رو مستقیم به کانال پست می‌کنه (کاملاً خودکار)
 *   - نسخه‌های پست/استوریِ اینستاگرام رو برای ادمین می‌فرسته (چون هنوز
 *     دسترسیِ API رسمی اینستاگرام نداریم — این نیمه‌دستی‌ترین/ساده‌ترین
 *     مسیره: عکس رو سیو کن، کپشن رو کپی کن، دستی پست کن)
 */

const fs = require("fs");
const path = require("path");
const { markUsed } = require("./state.js");
const { sendPhotoByUrl, sendMessage, notifyAdmin } = require("./telegram.js");

const GITHUB_OWNER = "mizartoon";
const GITHUB_REPO = "miztore-automation";
const GITHUB_BRANCH = "main";

function rawUrl(relPath) {
  return `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${relPath}`;
}

async function sendInstagramPackage(env, lastRun) {
  if (!env.TELEGRAM_ADMIN_CHAT_ID) return;

  await sendPhotoByUrl(
    env,
    env.TELEGRAM_ADMIN_CHAT_ID,
    rawUrl(lastRun.outputs.post),
    "📸 <b>اینستاگرام — پست</b> (۴:۵)\nسیو کن و دستی پست کن."
  );
  await sendPhotoByUrl(
    env,
    env.TELEGRAM_ADMIN_CHAT_ID,
    rawUrl(lastRun.outputs.story),
    "📱 <b>اینستاگرام — استوری</b> (۹:۱۶)\nسیو کن و دستی تو استوری بذار. لینکِ محصول رو با استیکرِ Link به استوری اضافه کن:\n" +
      lastRun.buyUrlInstagram
  );
  // کپشن به‌صورت پیامِ جدا و متنی (نه تو caption عکس) که راحت کپی بشه
  await sendMessage(
    env,
    env.TELEGRAM_ADMIN_CHAT_ID,
    `📝 <b>کپشنِ آماده برای پست اینستاگرام</b> (کپی کن):\n\n${lastRun.instagramCaption}`
  );
}

async function main() {
  const env = process.env;
  const lastRunPath = path.join(__dirname, "last-run.json");
  const lastRun = JSON.parse(fs.readFileSync(lastRunPath, "utf-8"));

  if (!lastRun.ok) {
    await notifyAdmin(env, `⚠️ میزطوری: پایپ‌لاین امروز پست نکرد — ${lastRun.reason}: ${lastRun.message || ""}`);
    return;
  }

  try {
    const telegramButton = { buttonText: "🛍 مشاهده در فروشگاه", buttonUrl: lastRun.buyUrlTelegram };

    if (lastRun.dryRun) {
      if (!env.TELEGRAM_ADMIN_CHAT_ID) throw new Error("TELEGRAM_ADMIN_CHAT_ID تنظیم نشده — پیش‌نمایش رو کجا بفرستم؟");
      const previewCaption = `🧪 <b>پیش‌نمایش تلگرام</b> (${lastRun.category} — قالب: ${lastRun.templateName}) — پست نشده، عکس هنوز تو pool هست.\n\n${lastRun.caption}`;
      await sendPhotoByUrl(env, env.TELEGRAM_ADMIN_CHAT_ID, rawUrl(lastRun.outputs.telegram), previewCaption, telegramButton);
      await sendInstagramPackage(env, lastRun);
      console.log("✅ پیش‌نمایشِ کامل (تلگرام + اینستاگرام) به ادمین فرستاده شد.");
      return;
    }

    await sendPhotoByUrl(env, env.TELEGRAM_CHANNEL_ID, rawUrl(lastRun.outputs.telegram), lastRun.caption, telegramButton);
    await sendInstagramPackage(env, lastRun);
    markUsed(lastRun.key);
    await notifyAdmin(env, `✅ میزطوری پست شد (${lastRun.category} — قالب: ${lastRun.templateName}): ${lastRun.key}\n${lastRun.headline}\n\n📸 نسخه‌ی اینستاگرام هم بالاتر فرستاده شد.`);
    console.log("✅ به تلگرام پست شد + پکیجِ اینستاگرام برای ادمین فرستاده شد.");
  } catch (err) {
    console.error("::error::" + (err && err.stack ? err.stack : err));
    await notifyAdmin(env, `❌ میزطوری: خطا در پست کردن ${lastRun.key}:\n${err.message}`);
    process.exitCode = 1;
  }
}

main();

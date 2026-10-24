/**
 * publish.js — مرحله‌ی دوم: بعد از اینکه workflow خروجی‌های generate.js را
 * commit/push کرد، نسخه‌ی تلگرام (عکس یا ریلز) رو مستقیم به کانال پست می‌کنه.
 * ۲۰۲۶-۱۰-۲۴ (کاربر): پکیجِ اینستاگرام/توییتر و پیامِ «پست شد» به ادمین حذف شد — استفاده نمی‌شد.
 * فقط خطاها به ادمین خبر داده می‌شن.
 */

const fs = require("fs");
const path = require("path");
const { markUsed } = require("./state.js");
const { sendPhotoFile, sendVideoFile, notifyAdmin } = require("./telegram.js");

// فایل‌ها مستقیم از رویِ دیسکِ همین اجرا آپلود می‌شن، نه با لینکِ raw گیت‌هاب
// (CDNِ گیت‌هاب ~۱ ثانیه بعدِ push هنوز فایلِ تازه رو serve نمی‌کنه).
function localPath(relPath) {
  return path.join(__dirname, "..", relPath);
}

async function main() {
  const env = process.env;
  const lastRun = JSON.parse(fs.readFileSync(path.join(__dirname, "last-run.json"), "utf-8"));

  if (!lastRun.ok) {
    await notifyAdmin(env, `⚠️ میزطوری: پایپ‌لاین امروز پست نکرد — ${lastRun.reason}: ${lastRun.message || ""}`);
    return;
  }

  try {
    const telegramButton = { buttonText: "🛍 مشاهده در فروشگاه", buttonUrl: lastRun.buyUrlTelegram };
    const send = (chatId, caption) =>
      lastRun.outputs.reel
        ? sendVideoFile(env, chatId, localPath(lastRun.outputs.reel), caption, telegramButton)
        : sendPhotoFile(env, chatId, localPath(lastRun.outputs.telegram), caption, telegramButton);

    if (lastRun.dryRun) {
      if (!env.TELEGRAM_ADMIN_CHAT_ID) throw new Error("TELEGRAM_ADMIN_CHAT_ID تنظیم نشده — پیش‌نمایش رو کجا بفرستم؟");
      await send(env.TELEGRAM_ADMIN_CHAT_ID, `🧪 <b>پیش‌نمایشِ کانال</b> (${lastRun.category} — متن: ${lastRun.copySource || "?"})\n\n${lastRun.caption}`);
      console.log("✅ پیش‌نمایشِ کانال به ادمین فرستاده شد.");
      return;
    }

    await send(env.TELEGRAM_CHANNEL_ID, lastRun.caption);
    markUsed(lastRun.key);
    console.log("✅ به کانالِ تلگرام پست شد.");
  } catch (err) {
    console.error("::error::" + (err && err.stack ? err.stack : err));
    await notifyAdmin(env, `❌ میزطوری: خطا در پست کردن ${lastRun.key}:\n${err.message}`);
    process.exitCode = 1;
  }
}

main();

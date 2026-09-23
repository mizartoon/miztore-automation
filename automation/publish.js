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
const { sendPhotoFile, sendMediaGroupFiles, sendMessage, notifyAdmin } = require("./telegram.js");

// عکس‌ها مستقیم از رویِ دیسکِ همین اجرا آپلود می‌شن، نه با لینکِ raw گیت‌هاب:
// publish.js فقط ~۱ ثانیه بعدِ push اجرا می‌شه و CDNِ گیت‌هاب هنوز فایلِ تازه
// رو serve نمی‌کنه (تلگرام: «failed to get HTTP URL content»). فایل همین‌جا
// رویِ دیسکه، پس اصلاً نیازی به CDN نیست.
// متنِ داخلِ <pre> تو تلگرام با یه لمس کپی می‌شه (دسکتاپ: دکمه‌ی Copy)
const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const copyBlock = (s) => `<pre>${escHtml(s)}</pre>`;

function localPath(relPath) {
  return path.join(__dirname, "..", relPath);
}

async function sendInstagramPackage(env, lastRun) {
  if (!env.TELEGRAM_ADMIN_CHAT_ID) return;

  const carousel = (lastRun.outputs.carousel || [lastRun.outputs.post]).filter(Boolean);
  if (carousel.length > 1) {
    // پستِ چنداسلایدی: همه‌ی اسلایدها یک‌جا و به ترتیب (عکسِ اصلی ← طرح از نزدیک ← اطلاعاتِ خرید)
    await sendMediaGroupFiles(
      env,
      env.TELEGRAM_ADMIN_CHAT_ID,
      carousel.map(localPath),
      `📸 <b>اینستاگرام — پستِ ${carousel.length} اسلایدی</b> (۴:۵)\nهمه رو به همین ترتیب سیو کن و یه پستِ چنداسلایدی بساز.`
    );
  } else {
    await sendPhotoFile(env, env.TELEGRAM_ADMIN_CHAT_ID, localPath(lastRun.outputs.post), "📸 <b>اینستاگرام — پست</b> (۴:۵)\nسیو کن و دستی پست کن.");
  }
  await sendPhotoFile(
    env,
    env.TELEGRAM_ADMIN_CHAT_ID,
    localPath(lastRun.outputs.story),
    "📱 <b>اینستاگرام — استوری</b> (۹:۱۶)\nلینکِ کوتاه برای استیکرِ Link (لمس کن تا کپی شه):\n<code>" + escHtml(lastRun.buyUrlInstagram) + "</code>"
  );
  // کپشن به‌صورت پیامِ جدا، داخلِ <pre> که با یه لمس کپی بشه
  await sendMessage(
    env,
    env.TELEGRAM_ADMIN_CHAT_ID,
    `📝 <b>کپشنِ اینستاگرام</b> — لمس کن تا کپی شه:\n${copyBlock(lastRun.instagramCaption)}\n🔗 لینکِ بیو/استوری: <code>${escHtml(lastRun.buyUrlInstagram)}</code>`
  );
}

async function sendTwitterPackage(env, lastRun) {
  if (!env.TELEGRAM_ADMIN_CHAT_ID) return;

  // همون عکسِ پستِ اینستاگرام (۴:۵) — X با هر نسبتی کار می‌کنه، نیازی به
  // رندرِ جداگانه نیست. کپشن اما جداست: کوتاه‌تر، بدون سؤالِ تعاملی، با
  // لینکِ کلیک‌پذیر — نه کپیِ کپشنِ اینستاگرام (که در NovinHub هم به‌جای
  // کپشنِ اختصاصیِ توییتر انتخاب می‌شه اگه این پیام رو نداشته باشیم).
  await sendPhotoFile(
    env,
    env.TELEGRAM_ADMIN_CHAT_ID,
    localPath(lastRun.outputs.twitter || lastRun.outputs.post),
    "🐦 <b>توییتر/X</b> (۱۶:۹)\nسیو کن و دستی از طریق نوین‌هاب پست کن — کپشنِ زیر رو استفاده کن، نه کپشنِ اینستاگرام."
  );
  await sendMessage(
    env,
    env.TELEGRAM_ADMIN_CHAT_ID,
    `📝 <b>کپشنِ توییتر/X</b> — لمس کن تا کپی شه:\n${copyBlock(lastRun.twitterCaption)}`
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
      const previewCaption = `🧪 <b>پیش‌نمایش تلگرام</b> (${lastRun.category} — متن: ${lastRun.copySource || "?"}) — پست نشده، عکس هنوز تو pool هست.\n\n${lastRun.caption}`;
      await sendPhotoFile(env, env.TELEGRAM_ADMIN_CHAT_ID, localPath(lastRun.outputs.telegram), previewCaption, telegramButton);
      await sendInstagramPackage(env, lastRun);
      await sendTwitterPackage(env, lastRun);
      console.log("✅ پیش‌نمایشِ کامل (تلگرام + اینستاگرام + توییتر) به ادمین فرستاده شد.");
      return;
    }

    await sendPhotoFile(env, env.TELEGRAM_CHANNEL_ID, localPath(lastRun.outputs.telegram), lastRun.caption, telegramButton);
    await sendInstagramPackage(env, lastRun);
    await sendTwitterPackage(env, lastRun);
    markUsed(lastRun.key);
    await notifyAdmin(env, `✅ میزطوری پست شد (${lastRun.category} — متن: ${lastRun.copySource || "?"}): ${lastRun.key}\n${lastRun.headline}\n\n📸 نسخه‌ی اینستاگرام و 🐦 توییتر هم بالاتر فرستاده شد.`);
    console.log("✅ به تلگرام پست شد + پکیجِ اینستاگرام و توییتر برای ادمین فرستاده شد.");
  } catch (err) {
    console.error("::error::" + (err && err.stack ? err.stack : err));
    await notifyAdmin(env, `❌ میزطوری: خطا در پست کردن ${lastRun.key}:\n${err.message}`);
    process.exitCode = 1;
  }
}

main();

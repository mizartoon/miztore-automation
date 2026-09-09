const fs = require("fs");
const path = require("path");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RETRY_DELAYS_MS = [2000, 5000];

function buildReplyMarkup({ buttonText, buttonUrl }) {
  // «دکمه‌ی شیشه‌ای» تلگرام = inline keyboard button (زیر عکس، نه لینکِ توی متن)
  if (!buttonUrl) return null;
  return JSON.stringify({
    inline_keyboard: [[{ text: buttonText || "مشاهده در فروشگاه", url: buttonUrl }]],
  });
}

// هر fetch به api.telegram.org (چه sendPhoto چه sendMessage) ممکنه با یه
// خطای شبکه‌ایِ گذرا مواجه بشه (DNS/TLS/connection reset — دقیقاً همون
// چیزی که یه اجرای واقعی نشونش داد: "TypeError: fetch failed"، نه خطای
// خودِ تلگرام). بدونِ retry، یه بلیپِ شبکه‌ای کلِ اجرا رو fail می‌کنه.
async function withRetry(fn) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= RETRY_DELAYS_MS.length) throw err;
      console.error(`[telegram] retry ${attempt + 1}/${RETRY_DELAYS_MS.length} after: ${err.message}`);
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
}

/**
 * عکس رو مستقیم از رویِ دیسکِ همین runner آپلود می‌کنه (multipart)، نه با URL.
 *
 * چرا: قبلاً عکس رو با لینکِ raw.githubusercontent.com می‌فرستادیم، ولی
 * publish.js فقط ~۱ ثانیه بعدِ push اجرا می‌شه و CDNِ گیت‌هاب هنوز فایلِ
 * تازه رو serve نمی‌کنه؛ تلگرام «failed to get HTTP URL content» می‌داد و
 * کلِ اجرا fail می‌شد. آپلودِ مستقیم این وابستگی رو کامل حذف می‌کنه.
 */
async function sendPhotoFile(env, chatId, filePath, caption, { buttonText, buttonUrl } = {}) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`;
  const replyMarkup = buildReplyMarkup({ buttonText, buttonUrl });
  const bytes = fs.readFileSync(filePath);
  const filename = path.basename(filePath) || "photo.jpg";

  return withRetry(async () => {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    if (caption) form.append("caption", caption);
    form.append("parse_mode", "HTML");
    if (replyMarkup) form.append("reply_markup", replyMarkup);
    form.append("photo", new Blob([bytes], { type: "image/jpeg" }), filename);

    const res = await fetch(url, { method: "POST", body: form });
    const body = await res.json();
    if (!res.ok || body.ok === false) {
      throw new Error(`Telegram sendPhoto failed: ${body.description || res.status}`);
    }
    return body.result;
  });
}

async function sendMessage(env, chatId, text) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  return withRetry(async () => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
    const body = await res.json();
    if (!res.ok || body.ok === false) {
      throw new Error(`Telegram sendMessage failed: ${body.description || res.status}`);
    }
    return body.result;
  });
}

async function notifyAdmin(env, text) {
  if (!env.TELEGRAM_ADMIN_CHAT_ID) return;
  try {
    await sendMessage(env, env.TELEGRAM_ADMIN_CHAT_ID, text);
  } catch (err) {
    console.error("[notifyAdmin] failed:", err.message);
  }
}

module.exports = { sendPhotoFile, sendMessage, notifyAdmin };

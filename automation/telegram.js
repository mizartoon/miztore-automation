const fs = require("fs");
const path = require("path");

function buildReplyMarkup({ buttonText, buttonUrl }) {
  // «دکمه‌ی شیشه‌ای» تلگرام = inline keyboard button (زیر عکس، نه لینکِ توی متن)
  if (!buttonUrl) return null;
  return JSON.stringify({
    inline_keyboard: [[{ text: buttonText || "مشاهده در فروشگاه", url: buttonUrl }]],
  });
}

/**
 * عکس رو مستقیم از رویِ دیسکِ همین runner آپلود می‌کنه (multipart)، نه با URL.
 *
 * چرا: قبلاً عکس رو با لینکِ raw.githubusercontent.com می‌فرستادیم، ولی
 * publish.js فقط ~۱ ثانیه بعدِ push اجرا می‌شه و CDNِ گیت‌هاب هنوز فایلِ
 * تازه رو serve نمی‌کنه؛ تلگرام «failed to get HTTP URL content» می‌داد و
 * کلِ اجرا fail می‌شد (حتی با retry، چون گاهی بیشتر از ۲۰ ثانیه طول می‌کشه).
 * آپلودِ مستقیم این وابستگی رو کامل حذف می‌کنه — فایل همین‌جا رویِ دیسکه.
 */
async function sendPhotoFile(env, chatId, filePath, caption, { buttonText, buttonUrl } = {}) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`;

  const form = new FormData();
  form.append("chat_id", String(chatId));
  if (caption) form.append("caption", caption);
  form.append("parse_mode", "HTML");
  const replyMarkup = buildReplyMarkup({ buttonText, buttonUrl });
  if (replyMarkup) form.append("reply_markup", replyMarkup);

  const bytes = fs.readFileSync(filePath);
  form.append("photo", new Blob([bytes], { type: "image/jpeg" }), path.basename(filePath) || "photo.jpg");

  const res = await fetch(url, { method: "POST", body: form });
  const body = await res.json();
  if (!res.ok || body.ok === false) {
    throw new Error(`Telegram sendPhoto failed: ${body.description || res.status}`);
  }
  return body.result;
}

async function sendMessage(env, chatId, text) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
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

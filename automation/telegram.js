async function sendPhotoByUrl(env, chatId, photoUrl, caption, { buttonText, buttonUrl } = {}) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`;
  const params = {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: "HTML",
  };
  // «دکمه‌ی شیشه‌ای» تلگرام = inline keyboard button (زیر عکس، نه لینکِ توی متن)
  if (buttonUrl) {
    params.reply_markup = JSON.stringify({
      inline_keyboard: [[{ text: buttonText || "مشاهده در فروشگاه", url: buttonUrl }]],
    });
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
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

module.exports = { sendPhotoByUrl, sendMessage, notifyAdmin };

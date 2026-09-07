const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// راست بلافاصله بعدِ push به raw.githubusercontent.com اشاره می‌کنه — گاهی
// CDNِ گیت‌هاب چند ثانیه طول می‌کشه تا فایلِ تازه‌کامیت‌شده رو serve کنه، و
// تلگرام تا اون موقع «failed to get HTTP URL content» برمی‌گردونه (نه
// خطای واقعیِ ما). قبل از این fix، همین باعثِ fail کاملِ اجرا می‌شد —
// دقیقاً طبقِ همون منطقِ retry-loopِ push تو workflow.
const RETRYABLE_PATTERN = /failed to get http url content/i;
const RETRY_DELAYS_MS = [3000, 6000, 10000];

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

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });
    const body = await res.json();
    if (res.ok && body.ok !== false) return body.result;

    const description = body.description || String(res.status);
    const canRetry = RETRYABLE_PATTERN.test(description) && attempt < RETRY_DELAYS_MS.length;
    if (!canRetry) throw new Error(`Telegram sendPhoto failed: ${description}`);
    console.error(`[telegram] sendPhoto retry ${attempt + 1}/${RETRY_DELAYS_MS.length} (${description})`);
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
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

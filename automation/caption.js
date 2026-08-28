/**
 * caption.js — تولید هوک روی عکس + کپشن پیام، با صدای برند میزطوری.
 * اگر GEMINI_API_KEY نباشد یا خطا بدهد، به یک جفت ثابت برمی‌گردد.
 *
 * توصیه‌ی ثبت‌شده از قبل: هوکِ روی خودِ عکس بهتره در آینده از یک لیست
 * دستیِ تأییدشده بیاد، نه AI — چون داخل عکس ماندگار می‌شود. فعلاً برای تست
 * از همین Gemini استفاده می‌کنیم.
 */

const CATEGORY_LABEL_FA = {
  tshirt: "تیشرت",
  hoodie: "هودی",
  pullover: "پلیور",
  croptop: "کراپ‌تاپ",
  tank: "تاپ",
  longsleeve: "آستین‌بلند",
  misc: "محصول",
};

const SYSTEM_PROMPT = `تو کپشن‌نویسِ برند میزطوری هستی — یک برند فرهنگیِ رند و ایرانی («هنر ایرانی، نه برای قاب؛ برای تن»).

صدای برند: رند، عمیق، طعنه‌دار، خونسرد و خودمانی. هرگز کیوت، هرگز التماس‌گر. بدون زبان تخفیف/حراج.
همیشه ارقام فارسی، همیشه راست‌چین. بدون هشتگ. حداکثر ۱-۲ ایموجی.

دقیقاً یک شیء JSON با این شکل برگردان، بدون هیچ متن اضافه:
{
  "headline": "یک عبارت خیلی کوتاه (۲-۵ کلمه) برای چاپ روی خودِ عکس — ضربه‌ای، بدون نقطه در پایان",
  "caption": "۲-۳ جمله‌ی کوتاه برای متنِ زیرِ پست — توصیفِ طرح/جنس در حد چیزی که واقعاً از عکس قابل دیدنه (چیزی که نمی‌بینی رو اختراع نکن)، و در پایان یک CTA مستقیم مثل «ببرش»."
}`;

async function callGemini(env, userPrompt) {
  const model = env.GEMINI_CAPTION_MODEL || "gemini-3.6-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      // این مدل بخشی از maxOutputTokens رو صرف «فکرکردنِ» داخلی می‌کنه
      // (thoughtsTokenCount) — با ۳۰۰ توکن، تقریباً همه‌ش صرفِ فکرکردن می‌شد و
      // برای JSON واقعی چیزی نمی‌موند (باگِ واقعی که دیدیم: خروجیِ نصفه).
      generationConfig: { maxOutputTokens: 2048, temperature: 0.9, responseMimeType: "application/json" },
    }),
  });

  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  const parsed = JSON.parse(text);
  if (!parsed.headline || !parsed.caption) throw new Error("Gemini خروجی ناقص داد");
  return parsed;
}

function fallback(category) {
  const label = CATEGORY_LABEL_FA[category] || "محصول";
  return { headline: `یه ${label} دیگه`, caption: `از ته کشو.\n\nببرش.` };
}

async function generateCaption(env, { category }) {
  const label = CATEGORY_LABEL_FA[category] || "محصول";
  if (!env.GEMINI_API_KEY) return fallback(category);

  try {
    const prompt = `یک هوک+کپشن برای یک عکسِ محصول از دسته‌ی «${label}» بساز. عکس رو ندیدی، فقط بر اساس نوع پوشاک و صدای برند بنویس.`;
    return await callGemini(env, prompt);
  } catch (err) {
    console.error("[caption] Gemini failed, using fallback:", err.message);
    return fallback(category);
  }
}

// ---------------------------------------------------------------------------
// تنوع کنترل‌شده — به‌جای یک CTA ثابت روی همه‌ی عکس‌ها، از یک لیستِ کوچیکِ
// تأییدشده انتخاب تصادفی می‌شه (نه AI — طبق همون توصیه‌ی قبلی: متنِ روی خودِ
// عکس باید همیشه از یه مجموعه‌ی کنترل‌شده بیاد، نه تولیدِ آزادِ مدل).
// ---------------------------------------------------------------------------
const CTA_POOL = ["ببرش", "مال خودت کن", "بذار تو کشو", "همینو کم داشتی", "امتحانش کن"];

function pickCTA() {
  return CTA_POOL[Math.floor(Math.random() * CTA_POOL.length)];
}

// ---------------------------------------------------------------------------
// نسخه‌ی اینستاگرامِ کپشن — هشتگ + سؤالِ تعاملی. اینستاگرام برخلاف تلگرام از
// هشتگ برای دیده‌شدن استفاده می‌کنه، و سؤال باعثِ کامنت بیشتر (سیگنالِ
// الگوریتم) می‌شه — برای همین این‌جا (فقط اینستاگرام) جدا از قانونِ
// «بدون هشتگ»ِ تلگرامه. هشتگ‌ها از یک لیستِ ثابتِ تأییدشده‌ن، نه AI.
// ---------------------------------------------------------------------------
const HASHTAGS_BASE = ["#میزطوری", "#Miztore", "#پوشاک_ایرانی", "#استریت_ویر"];
const HASHTAGS_BY_CATEGORY = {
  tshirt: ["#تیشرت", "#تیشرت_طرحدار"],
  hoodie: ["#هودی"],
  pullover: ["#پلیور"],
  croptop: ["#کراپ_تاپ"],
  tank: ["#تاپ"],
  longsleeve: ["#آستین_بلند"],
  misc: [],
};
const ENGAGEMENT_QUESTIONS = [
  "نظرت چیه؟ 👇",
  "مشکی می‌بری یا سفید؟",
  "برای خودت می‌خوای یا هدیه؟",
  "کدوم تیکه‌ی این طرح بیشتر به دلت نشست؟",
];

function buildInstagramCaption(baseCaption, category) {
  const question = ENGAGEMENT_QUESTIONS[Math.floor(Math.random() * ENGAGEMENT_QUESTIONS.length)];
  const tags = [...HASHTAGS_BASE, ...(HASHTAGS_BY_CATEGORY[category] || [])].join(" ");
  return `${baseCaption}\n\n${question}\n\n${tags}`;
}

module.exports = { generateCaption, pickCTA, buildInstagramCaption };

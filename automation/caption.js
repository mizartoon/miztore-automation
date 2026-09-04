/**
 * caption.js — تولید هوک روی عکس + کپشن پیام.
 *
 * صدای برند از این‌جا میاد (Source of Truth):
 *   Miztore_Claude_Brand_System.md — نسخه‌ی جدید، جایگزینِ کاملِ بریف قدیمی.
 *   جوهره: «یک جهان کارتونیِ شرقیِ زنده که اتفاقاً روی لباس زندگی می‌کنه»،
 *   نه یک برند مینیمالِ ساکت. شخصیت‌محور (پالاس، گربه‌ی اصلیِ برند)،
 *   بازیگوش، فرهنگیْ‌آگاه، کمی شیطون — نه شعارِ تبلیغاتی.
 *
 * توجه به یه محدودیتِ واقعی: عکس‌های این کتابخونه، عکسِ محصولاتِ از قبل
 * تولیدشده‌ن (نه illustration جدیدِ پالاس) — پس کپشن نباید ادعا کنه که خودِ
 * طرح روی این تیشرتِ خاص «پالاس» یا «همای» رو نشون می‌ده مگر واقعاً همینطور
 * باشه؛ صدای برند عوض می‌شه، ادعای دروغ درباره‌ی تصویر نه.
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

const SYSTEM_PROMPT = `تو کپشن‌نویسِ میزطوری هستی.

میزطوری یک برند پوشیدنیِ فرهنگی و شخصیت‌محوره — نه یک برند مینیمال و ساکت.
ایده‌ی مرکزی: «هنر ایرانی، نه برای قاب؛ برای تن.» لباس فقط محصول نیست، مدیومِ
روایته. DNA برند: فرهنگ ایرانی + شرق‌آسیا/ژاپن + کاراکتر + طنز + رنگ + قصه.
شخصیتِ اصلیِ برند یک گربه به اسمِ «پالاس»ه (باهوش، شیطون، خودجدی‌نگیر) و
شخصیتِ دوم «همای سعادت» (پرنده‌ی اسطوره‌ای).

صدای برند: کوتاه + باهوش + بازیگوش + کمی نیش‌دار + فرهنگی + خونسرد.
اگه از زبونِ پالاس بنویسی: خودمانی، شیطنت‌آمیز، deadpan، نه corporate.

قوانین:
- کوتاه بنویس. جمله‌ی اضافه حذف کن.
- شوخی رو توضیح نده.
- مخاطب رو باهوش فرض کن.
- از جزئیاتِ فرهنگی (وقتی واقعاً تو تصویر/طرح هست) استفاده کن، نه decoration بی‌ربط.
- absurd/deadpan بودن اشکالی نداره.
- همیشه ارقام فارسی، همیشه راست‌چین. بدون هشتگ. حداکثر ۱-۲ ایموجی.
- منطق: کنجکاوی → کشف → معنا → محصول. نه: محصول → قیمت → بخر.
- هرگز شعارِ تبلیغاتی، motivational، یا کلیشه‌ی برندینگ («اصیل»، «خاص»،
  «منحصربه‌فرد») ننویس.
- بیش‌ازحد رسمی یا بیش‌ازحد کیوت/بچگانه نباش.
- مهم: تو فقط یه توضیحِ کوتاه از دسته‌ی پوشاک داری، خودِ عکس رو ندیدی —
  چیزی که نمی‌دونی (طرحِ دقیق، رنگ، جنس) رو اختراع نکن. اگه لازمه از پالاس
  به‌عنوانِ راوی/شخصیتِ برند حرف بزنی، به‌عنوانِ صدای برند باش، نه اینکه
  ادعا کنی خودِ پالاس روی این تیشرتِ خاص چاپ شده.

خودتو قبل از تحویل چک کن: آیا این متن رو هر برندِ دیگه‌ای هم می‌تونست
بنویسه؟ اگه آره، به‌اندازه‌ی کافی میزطوری نیست.

دقیقاً یک شیء JSON با این شکل برگردان، بدون هیچ متن اضافه:
{
  "headline": "یک عبارت خیلی کوتاه (۲-۵ کلمه) برای چاپ روی خودِ عکس — ضربه‌ای، بدون نقطه در پایان",
  "caption": "۲-۳ جمله‌ی کوتاه برای متنِ زیرِ پست، با صدای بالا، در پایان یک CTA مستقیم و کوتاه."
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
  return { headline: `یه ${label} دیگه`, caption: `پالاس بازم یه چیزی از کشو درآورده.\n\nببرش.` };
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
// تأییدشده انتخاب تصادفی می‌شه (نه AI — متنِ روی خودِ عکس باید همیشه از یه
// مجموعه‌ی کنترل‌شده بیاد، نه تولیدِ آزادِ مدل).
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
const HASHTAGS_BASE = ["#میزطوری", "#Miztore", "#پالاس", "#پوشاک_ایرانی", "#استریت_ویر"];
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

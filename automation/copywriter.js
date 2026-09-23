/**
 * copywriter.js — نویسنده‌ی پست، این‌بار «با دیدنِ خودِ عکس».
 *
 * قبلاً Gemini فقط اسم/متنِ طرح رو (از قبل استخراج‌شده) می‌گرفت و عکس رو
 * نمی‌دید؛ نتیجه: جمله‌های کلی. حالا خودِ عکس هم فرستاده می‌شه و یک درخواست
 * سه چیز برمی‌گردونه:
 *   1) headline — یه جمله‌ی کوتاهِ طبیعی برای رویِ عکس (نه شعار)
 *   2) caption — کپشنِ انسانی و خودمونی برای تلگرام/اینستاگرام
 *   3) designBox — جایِ دقیقِ طرحِ چاپ‌شده رویِ لباس (۰ تا ۱۰۰۰)؛ render.js
 *      با این: (الف) برشِ عکس هیچ‌وقت طرح رو نمی‌بُره، (ب) کارتِ متن رویِ
 *      طرح نمی‌افته، (ج) اسلایدِ «از نزدیک» برای کاروسلِ اینستاگرام ساخته می‌شه.
 *
 * واقعیت‌هایِ محصول (قیمت/رنگ/سایز) از خودِ فروشگاه میاد (product-facts.js)،
 * نه از مدل — مدل فقط اجازه داره از همون‌ها استفاده کنه.
 */

const sharp = require("sharp");

const MODELS = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

const SYSTEM_PROMPT = `تو آدمِ شبکه‌های اجتماعیِ «میزطوری» هستی — یه برندِ ایرانیِ لباسِ هنری (تیشرت، هودی، پلیور با طرح‌های شعر، خوشنویسی، تصویرسازی، شخصیت‌ها، ترانه و نوستالژی). ماسکوتِ برند یه گربه‌ی پالاسِ شیطونه به اسمِ «پالاس».

کارت: یه عکسِ محصول می‌بینی و برای پستِ امروز می‌نویسی. مثلِ یه آدمِ واقعی بنویس که خودش عاشقِ این طرحه و داره برای دوستاش تعریفش می‌کنه — نه مثلِ آگهی، نه مثلِ ربات.

قانون‌های لحن:
- فارسیِ محاوره‌ایِ طبیعی، گرم و سرِحال؛ مخاطب «تو». انرژی داشته باش ولی داد نزن.
- دقیقاً درباره‌ی همین طرح حرف بزن: جمله/شعرِ رویِ لباس، آدم یا شخصیتِ توی طرح، حس‌وحالش، اینکه به کی میاد یا کجا پوشیدنش حال می‌ده. جمله‌ای که برای هر لباسِ دیگه‌ای هم درست باشه، ممنوعه.
- اگه متنِ رویِ طرح شعر/جمله‌ی معروفه، می‌تونی باهاش بازی کنی یا ادامه‌ش بدی — درست و بدونِ غلط.
- ممنوع: شعارِ تبلیغاتی و کلیشه («منحصربه‌فرد»، «اصیل»، «خاص‌ترین»، «استایلتو کامل کن»، «همین حالا»، «فرصت رو از دست نده»)، جمله‌های امری و پوکِ تبلیغی مثلِ «مال خودت کن»، «امتحانش کن»، «بزنش تو تنت»، «بپوشش حرف بزن»، استعاره‌ی انتزاعی (قاب/دیوار/موزه/بوم)، و این کلمه‌ها: «کشو»، «ببرش»، «کمد»، «یه تیشرت دیگه».
- چیزی که در عکس/اطلاعات نیست رو نساز (جنس، قیمت، رنگ، تخفیف، زمانِ ارسال). فقط از «واقعیت‌های محصول» که بهت داده می‌شه استفاده کن.
- ارقامِ فارسی. بدونِ هشتگ.

خروجی — فقط JSON:
{
  "headline": "جمله‌ی رویِ عکس: ۳ تا ۸ کلمه، طبیعی و خودمونی، مخصوصِ همین طرح (مثلاً یه برداشتِ بامزه، یه نیمچه‌دیالوگ، یا یه اشاره به جمله‌ی رویِ لباس). بدونِ ایموجی، بدونِ نقطه‌ی پایانی.",
  "caption": "کپشن: ۲ تا ۴ خطِ کوتاه، هر خط در یک سطرِ جدا.خطِ اول یه هوکِ کاملاً مستقل و مخصوصِ همین طرح (همون چیزیه که قبل از «بیشتر» دیده می‌شه). وسط اگه جا داشت یه جزئیاتِ واقعی از «واقعیت‌های محصول». خطِ آخر یه کارِ مشخص برای خرید، هر بار با یه جمله‌ی تازه (مثلاً لینک تو بیو، سفارش از سایت، سایزتو دایرکت بپرس). حداکثر یک ایموجی.",
  "designBox": [ymin, xmin, ymax, xmax],
  "designVisible": true
}
designBox: کادرِ دورِ «کلِ طرحِ چاپ‌شده رویِ لباس» (تصویر + همه‌ی نوشته‌هاش، نه کلِ لباس)، به مقیاسِ ۰ تا ۱۰۰۰ نسبت به عکس. اگه طرح در عکس دیده نمی‌شه، designVisible=false و designBox=[0,0,0,0].`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    caption: { type: "STRING" },
    designBox: { type: "ARRAY", items: { type: "NUMBER" } },
    designVisible: { type: "BOOLEAN" },
  },
  required: ["headline", "caption", "designBox", "designVisible"],
};

const BANNED = [/کشو/, /ببرش/, /کمد/, /یه تیشرت دیگه/, /مال خودت کن/, /امتحانش کن/, /بزنش تو تنت/, /بپوشش،? حرف بزن/, /منحصر ?به ?فرد/];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function describeFacts(facts, label) {
  if (!facts) return "واقعیت‌های محصول: (نامشخص — درباره‌ی قیمت/رنگ/سایز چیزی نگو)";
  const out = [];
  if (facts.name) out.push(`اسمِ محصول در سایت: «${facts.name}»`);
  if (facts.priceText) out.push(`قیمت: ${facts.priceText}`);
  if (facts.colors?.length) out.push(`${facts.colors.length} رنگ موجود`);
  if (facts.sizesText) out.push(`سایز: ${facts.sizesText}`);
  if (facts.cuts?.length) out.push(`مدل‌ها: ${facts.cuts.join("، ")}`);
  out.push("خرید قسطی با دیجی‌پی، ۷ روز ضمانتِ بازگشت");
  const note =
    facts.scope === "product"
      ? "(مالِ همین محصول)"
      : `(این‌ها مالِ کلِ ${label}‌های سایته، نه لزوماً همین طرح؛ اگه خواستی بگی، کلی بگو مثلاً «${label}‌های میزطوری …»، نه «این طرح …»)`;
  return `واقعیت‌های محصول ${note}:\n- ${out.join("\n- ")}`;
}

async function callModel(env, model, parts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          temperature: 0.95,
          maxOutputTokens: 2048,
          thinkingConfig: { thinkingLevel: "low" },
        },
      }),
      signal: controller.signal,
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(`${model} HTTP ${res.status}: ${(j.error?.message || "").slice(0, 200)}`);
      err.status = res.status;
      throw err;
    }
    const text = j.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text || "").join("") || "";
    return JSON.parse(text);
  } finally {
    clearTimeout(timer);
  }
}

function clean(s) {
  return String(s || "")
    .replace(/[#＃]\S+/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function validBox(b) {
  if (!Array.isArray(b) || b.length !== 4) return null;
  const [y0, x0, y1, x1] = b.map(Number);
  if ([y0, x0, y1, x1].some((v) => !isFinite(v))) return null;
  if (y1 - y0 < 30 || x1 - x0 < 30) return null; // خیلی کوچیک/خالی
  return {
    top: Math.max(0, y0) / 1000,
    left: Math.max(0, x0) / 1000,
    bottom: Math.min(1000, y1) / 1000,
    right: Math.min(1000, x1) / 1000,
  };
}

// جمله‌های پشتیبان — فقط وقتی هیچ مدلی جواب نداد. طبیعی و متنوع، و اگه اسم/
// متنِ طرح رو داریم، از همون استفاده می‌کنن تا کلی نباشن.
function fallbackCopy({ designInfo, label, facts }) {
  const subject = designInfo?.visibleText || designInfo?.visualSubject || facts?.name || "";
  const s = subject ? `«${String(subject).slice(0, 40)}»` : "";
  const heads = s
    ? [`${s} رو این‌بار روی تن ببین`, `اینم از ${s}`, `${s}، نسخه‌ی پوشیدنی`]
    : [`${label} امروزمون اینه`, `اینو ببین و بگو بهت نمیاد`, `یه ${label} با یه قصه‌ی کوچیک`];
  const closers = ["لینکِ خرید تو بیوئه.", "برای سایز و رنگ دایرکت بده.", "از سایتِ میزطوری سفارش بده."];
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const headline = pick(heads);
  const middle = facts?.colors?.length ? `${facts.colors.length} تا رنگ داره و قسطی هم می‌شه برداشت.` : "با دیجی‌پی قسطی هم می‌شه برداشت.";
  return { headline, caption: `${headline}.\n${middle}\n${pick(closers)}`, designBox: null, source: "fallback" };
}

async function writePost(env, { photoBytes, category, label, designInfo, facts }) {
  if (!env.GEMINI_API_KEY) return fallbackCopy({ designInfo, label, facts });

  const small = await sharp(photoBytes).resize({ width: 1024, height: 1024, fit: "inside" }).jpeg({ quality: 85 }).toBuffer();
  const hints = [];
  if (designInfo?.visibleText) hints.push(`متنِ رویِ طرح (از قبل خونده‌شده): «${designInfo.visibleText}»`);
  if (designInfo?.visualSubject) hints.push(`موضوعِ تصویرِ طرح: «${designInfo.visualSubject}»`);
  const userText = [`دسته: ${label}`, ...hints, describeFacts(facts, label), "برای همین عکس بنویس."].join("\n");
  const parts = [{ inline_data: { mime_type: "image/jpeg", data: small.toString("base64") } }, { text: userText }];

  let lastErr;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await callModel(env, model, parts);
        const headline = clean(r.headline).replace(/[.。!！]+$/, "").split("\n")[0];
        const caption = clean(r.caption);
        if (!headline || !caption) throw new Error("خروجیِ ناقص");
        if (BANNED.some((re) => re.test(headline) || re.test(caption))) throw new Error("کلمه‌ی ممنوع");
        if (headline.split(/\s+/).length > 10) throw new Error("هدلاین بلند");
        return { headline, caption, designBox: r.designVisible ? validBox(r.designBox) : null, source: model };
      } catch (err) {
        lastErr = err;
        console.error(`[copywriter] ${model} try ${attempt + 1}: ${err.message}`);
        if (err.status === 429 && /quota/i.test(err.message)) break; // سهمیه‌ی روزانه‌ی این مدل تموم شده → مدلِ بعدی
        if (err.status === 503 || err.status === 429 || err.name === "AbortError") await sleep(4000);
        else if (err.status >= 400 && err.status < 500) break;
      }
    }
  }
  console.error("[copywriter] همه‌ی مدل‌ها شکست خوردن، متنِ پشتیبان:", lastErr && lastErr.message);
  return fallbackCopy({ designInfo, label, facts });
}

module.exports = { writePost };

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

const MODELS = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-flash-lite-latest"];

const SYSTEM_PROMPT = `تو آدمِ شبکه‌های اجتماعیِ «میزطوری» هستی — یه برندِ ایرانیِ لباسِ هنری (تیشرت، هودی، پلیور با طرح‌های شعر، خوشنویسی، تصویرسازی، شخصیت‌ها، ترانه و نوستالژی). ماسکوتِ برند یه گربه‌ی پالاسِ شیطونه به اسمِ «پالاس».

کارت: یه عکسِ محصول می‌بینی و برای پستِ امروز می‌نویسی. مثلِ یه آدمِ واقعی بنویس که خودش عاشقِ این طرحه و داره برای دوستاش تعریفش می‌کنه — نه مثلِ آگهی، نه مثلِ ربات.

قانون‌های لحن:
- فارسیِ محاوره‌ایِ طبیعی، گرم و سرِحال؛ مخاطب «تو». انرژی داشته باش ولی داد نزن.
- دقیقاً درباره‌ی همین طرح حرف بزن: جمله/شعرِ رویِ لباس، آدم یا شخصیتِ توی طرح، حس‌وحالش، اینکه به کی میاد یا کجا پوشیدنش حال می‌ده. جمله‌ای که برای هر لباسِ دیگه‌ای هم درست باشه، ممنوعه.
- اگه متنِ رویِ طرح شعر/جمله‌ی معروفه، می‌تونی باهاش بازی کنی یا ادامه‌ش بدی — درست و بدونِ غلط.
- وسطِ کپشن (نه تو هوک) یکی از «برتری‌های میزطوری» رو طبیعی و مرتبط با همین طرح بیار، به این ترتیبِ اولویت: اینکه این طرح اختصاصیِ میزطوریه و جای دیگه پیدا نمی‌شه؛ بعد تنوعِ رنگ و سایز (با همه چیز ست می‌شه، از هیکلِ لاغر و بچه تا سایزهای بزرگ)؛ یا اینکه برای کی هدیه‌ی خوبیه. هر بار یکی، با جمله‌ی تازه، نه هر سه‌تا.
- ممنوع: شعارِ تبلیغاتی و کلیشه («منحصربه‌فرد»، «اصیل»، «خاص‌ترین»، «استایلتو کامل کن»، «همین حالا»، «فرصت رو از دست نده»)، جمله‌های امری و پوکِ تبلیغی مثلِ «مال خودت کن»، «امتحانش کن»، «بزنش تو تنت»، «بپوشش حرف بزن»، استعاره‌ی انتزاعی (قاب/دیوار/موزه/بوم)، و این کلمه‌ها: «کشو»، «ببرش»، «کمد»، «یه تیشرت دیگه».
- چیزی که در عکس/اطلاعات نیست رو نساز (جنس، قیمت، رنگ، تخفیف، زمانِ ارسال). فقط از «واقعیت‌های محصول» که بهت داده می‌شه استفاده کن.
- ارقامِ فارسی. بدونِ هشتگ.

خروجی — فقط JSON:
{
  "headline": "جمله‌ی رویِ عکس: ۳ تا ۸ کلمه، طبیعی و خودمونی، مخصوصِ همین طرح (مثلاً یه برداشتِ بامزه، یه نیمچه‌دیالوگ، یا یه اشاره به جمله‌ی رویِ لباس). بدونِ ایموجی، بدونِ نقطه‌ی پایانی.",
  "caption": "کپشن: ۲ تا ۴ خطِ کوتاه، هر خط در یک سطرِ جدا.خطِ اول یه هوکِ کاملاً مستقل و مخصوصِ همین طرح (همون چیزیه که قبل از «بیشتر» دیده می‌شه). وسط اگه جا داشت یه جزئیاتِ واقعی از «واقعیت‌های محصول». خطِ آخر یه کارِ مشخص برای خرید، هر بار با یه جمله‌ی تازه (مثلاً لینک تو بیو، سفارش از سایت، سایزتو دایرکت بپرس). حداکثر یک ایموجی.",
  "designBox": [ymin, xmin, ymax, xmax],
  "designVisible": true,
  "headTop": 120
}
designBox: کادرِ دورِ «کلِ طرحِ چاپ‌شده رویِ لباس» (تصویر + همه‌ی نوشته‌هاش، نه کلِ لباس)، به مقیاسِ ۰ تا ۱۰۰۰ نسبت به عکس. اگه طرح در عکس دیده نمی‌شه، designVisible=false و designBox=[0,0,0,0].
headTop: اگه آدم در عکس هست، y بالاترین نقطه‌ی سرش (مو هم حساب می‌شه) به همون مقیاسِ ۰ تا ۱۰۰۰؛ اگه آدمی در عکس نیست (لباس رویِ چوب‌لباسی/زمین/مانکنِ بی‌سر)، -1.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    caption: { type: "STRING" },
    designBox: { type: "ARRAY", items: { type: "NUMBER" } },
    designVisible: { type: "BOOLEAN" },
    headTop: { type: "NUMBER" },
  },
  required: ["headline", "caption", "designBox", "designVisible"],
};

const BANNED = [/کشو/, /ببرش/, /کمد/, /یه تیشرت دیگه/, /مال خودت کن/, /امتحانش کن/, /بزنش تو تنت/, /بپوشش،? حرف بزن/, /منحصر ?به ?فرد/];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ۲۰۲۶-۰۹-۲۵ (کاربر): به این ترتیبِ اولویت تبلیغ بشن.
const BRAND_POINTS =
  "برتری‌های میزطوری (همیشه درست، برایِ همه‌ی محصولات؛ به ترتیبِ اولویت):\n- طرح‌ها اختصاصیِ میزطوری‌ان؛ فقط این‌جا پیدا می‌شن\n- هر طرح تو چند رنگ؛ با همه چیز ست می‌شه\n- سایز برای همه: از هیکلِ لاغر و بچه تا سایزهای بزرگ\n- انتخابِ خوب برای هدیه (طرحِ شخصی و متفاوت + ۷ روز ضمانتِ بازگشت اگه سایز جور نشد)";

function describeFacts(facts, label) {
  if (!facts) return `واقعیت‌های محصول: (نامشخص — درباره‌ی قیمت/تعدادِ رنگِ همین طرح چیزی نگو)\n${BRAND_POINTS}`;
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
  return `واقعیت‌های محصول ${note}:\n- ${out.join("\n- ")}\n${BRAND_POINTS}`;
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
        const designBox = r.designVisible ? validBox(r.designBox) : null;
        // بالایِ سرِ مدل: render.js موقعِ زوم رویِ طرح صورت رو نمی‌بُره (null = آدمی در عکس نیست)
        if (designBox && typeof r.headTop === "number") designBox.headTop = r.headTop >= 0 && r.headTop / 1000 < designBox.top ? r.headTop / 1000 : null;
        return { headline, caption, designBox, source: model };
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


// ---------------------------------------------------------------------------
// پست‌هایِ گروهی (پرفروش‌ها، کالکشن، راهنمایِ هدیه، «این یا اون؟») — فقط متن،
// بدونِ عکس. همون لحنِ طبیعی؛ محصولات و قیمت‌ها از فروشگاه میان، نه از مدل.
// ---------------------------------------------------------------------------
const CAMPAIGN_SYSTEM = `تو آدمِ شبکه‌های اجتماعیِ «میزطوری» هستی (برندِ ایرانیِ لباسِ هنری با طرح‌های شعر، خوشنویسی، تصویرسازی، شخصیت، ترانه و نوستالژی؛ ماسکوت: گربه‌ی پالاس).
مثلِ یه آدمِ واقعی و سرِحال برای دوستات بنویس، نه آگهی. فارسیِ محاوره‌ای، مخاطب «تو»، پرانرژی ولی طبیعی.
${BRAND_POINTS}
اگه جا داشت، یکی از این برتری‌ها رو طبیعی و مرتبط با همین پست بیار (هر بار با جمله‌ی تازه؛ نه هر چهارتا).
ممنوع: شعار و کلیشه («منحصربه‌فرد»، «فرصت رو از دست نده»، «همین حالا»، «استایلتو کامل کن»)، امریِ پوک («مال خودت کن»، «امتحانش کن»)، «کشو»، «ببرش»، «کمد»، «یه تیشرت دیگه»، تخفیف/زمان‌بندی/موجودیِ ساختگی، و هر ادعایی که تو اطلاعات نیست. بدونِ هشتگ. ارقامِ فارسی. حداکثر یک ایموجی.
خروجی فقط JSON طبقِ schema.`;

const CAMPAIGN_SCHEMA = {
  type: "OBJECT",
  properties: {
    headline: { type: "STRING" },
    caption: { type: "STRING" },
    ids: { type: "ARRAY", items: { type: "INTEGER" } },
  },
  required: ["headline", "caption"],
};

async function callText(env, model, userText) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 45000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: CAMPAIGN_SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: CAMPAIGN_SCHEMA, temperature: 0.95, maxOutputTokens: 1500, thinkingConfig: { thinkingLevel: "low" } },
      }),
      signal: c.signal,
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = new Error(`${model} HTTP ${res.status}: ${(j.error?.message || "").slice(0, 150)}`);
      e.status = res.status;
      throw e;
    }
    return JSON.parse(j.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text || "").join("") || "");
  } finally {
    clearTimeout(t);
  }
}

async function askCampaign(env, userText, maxHeadWords) {
  if (!env.GEMINI_API_KEY) return null;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await callText(env, model, userText);
        const headline = clean(r.headline).replace(/[.。!！]+$/, "").split("\n")[0];
        const caption = clean(r.caption);
        if (!headline || !caption) throw new Error("خروجیِ ناقص");
        if (BANNED.some((re) => re.test(headline) || re.test(caption))) throw new Error("کلمه‌ی ممنوع");
        if (headline.split(/\s+/).length > maxHeadWords) throw new Error("تیترِ بلند");
        return { headline, caption, ids: Array.isArray(r.ids) ? r.ids.map(Number) : [], source: model };
      } catch (err) {
        console.error(`[campaign] ${model} try ${attempt + 1}: ${err.message}`);
        if (err.status === 429 && /quota/i.test(err.message)) break;
        if (err.status === 503 || err.status === 429) await sleep(4000);
        else if (err.status >= 400 && err.status < 500) break;
      }
    }
  }
  return null;
}

const itemLine = (it) => `${it.id} | ${it.kind || "محصول"} «${it.shortName}» | ${it.priceText || ""}${it.collections?.length ? ` | ${it.collections.join("،")}` : ""}`;

async function writeCampaign(env, { type, items, theme, collectionName, pool, spot }) {
  const listText = (items || []).map(itemLine).join("\n");
  if (type === "spotlight") {
    return askCampaign(
      env,
      `پستِ «معرفیِ محصول» دربارهِ یه جنبه‌یِ واقعیِ یک محصول.
محصول: ${itemLine(spot.item)}
جنبه‌یِ این پست: ${spot.focusText}
اطلاعاتِ واقعی از صفحه‌یِ محصول (فقط از همین‌ها استفاده کن؛ هیچ عدد، جنس یا ویژگیِ دیگه‌ای نساز):
${spot.facts}
- headline: تیترِ رویِ تصویر، ۳ تا ۷ کلمه، طبیعی و پرانرژی، دربارهِ همین جنبه (رنگ/سایز/جنس/مدل) و مخصوصِ همین طرح.
- caption: ۲ تا ۴ خطِ کوتاه (هر خط یه سطر): یه هوکِ مخصوصِ همین طرح، یکی دو جزئیاتِ واقعی از همین جنبه، و آخرش یه کارِ مشخص برایِ خرید.`,
      8
    );
  }
  if (type === "gift") {
    const r = await askCampaign(
      env,
      `راهنمایِ هدیه با موضوعِ «${theme}». از بینِ این محصولاتِ واقعیِ فروشگاه، ۴ تا که واقعاً به این موضوع می‌خورن انتخاب کن (شناسه‌ها تو ids، به ترتیبِ بهترین). بعد:
- headline: تیترِ رویِ تصویر، ۳ تا ۷ کلمه، طبیعی و بامزه، دربارهِ همین موضوعِ هدیه.
- caption: ۳ تا ۵ خطِ کوتاه (هر خط یه سطر): چرا این‌ها هدیه‌ی خوبی برای اون آدمن (با اشاره به طرح‌ها، نه کلی)؛ اینکه این طرح‌ها رو جای دیگه نمی‌شه خرید پس هدیه‌ت تکراری درنمیاد؛ اینکه رنگ و سایزشو (از لاغر و بچه تا سایزهای بزرگ) خودت انتخاب می‌کنی و اگه جور نشد ۷ روز ضمانتِ بازگشت داره — این دو تا رو کوتاه و خودمونی بگو، نه شعاری. آخرش یه کارِ مشخص (لینک تو بیو/سفارش از سایت).
محصولات:
${pool.map(itemLine).join("\n")}`,
      8
    );
    return r;
  }
  if (type === "versus") {
    return askCampaign(
      env,
      `پستِ «این یا اون؟» با دو طرح:
الف: ${itemLine(items[0])}
ب: ${itemLine(items[1])}
- headline: یه سؤالِ کوتاه و بامزه (۳ تا ۸ کلمه) که آدم رو وادار کنه یکی رو انتخاب کنه، مرتبط با حال‌وهوای این دو طرح. با علامتِ سؤال تموم بشه.
- caption: ۲ تا ۳ خط: یه جمله دربارهِ هر کدوم (مشخص، نه کلی)، بعد بخواد تو کامنت بنویسه الف یا ب، و اینکه لینکِ هر دو تو سایته.`,
      9
    );
  }
  const what = type === "bestsellers" ? "پرفروش‌ترین طرح‌هایِ میزطوری (واقعی، بر اساسِ فروشِ سایت)" : `چند طرح از کالکشنِ «${collectionName}»`;
  return askCampaign(
    env,
    `پستِ گروهی: ${what}.
محصولات:
${listText}
- headline: تیترِ رویِ تصویر، ۳ تا ۷ کلمه، طبیعی و پرانرژی، مخصوصِ همین ${type === "bestsellers" ? "پرفروش‌ها" : "کالکشن"} (نه جمله‌ی کلی).
- caption: ۲ تا ۴ خطِ کوتاه (هر خط یه سطر). اسمِ یکی دو تا از طرح‌ها رو بیار و بگو چی دارن، و آخرش یه کارِ مشخص برایِ خرید.`,
    8
  );
}

module.exports = { writePost, writeCampaign };

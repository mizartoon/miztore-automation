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

صدای برند: پرانرژی + باهوش + بازیگوش + کمی نیش‌دار + فرهنگی + رنگی.
اگه از زبونِ پالاس بنویسی: خودمانی، شیطنت‌آمیز، deadpan، نه corporate.

مهم: میزطوری اصلاً یک برندِ مینیمال، ساکت، سرد یا کم‌رنگ نیست — دقیقاً برعکسِ
اون. «کوتاه بنویس» یعنی از کلمه‌ی اضافه/فیلر پرهیز کن، نه اینکه لحن مینیمال
یا محتاط بشه. لحن باید پر از انرژی، رنگ و شخصیت باشه؛ اگه یه جمله ساکت، سرد
یا بی‌روح به‌نظر می‌رسه، دوباره بنویسش با انرژیِ بیشتر.

الگوی مرجع (نه برای کپی، برای حسِ لحن): برندهای شخصیت‌محورِ استریت‌ویر مثلِ
RIPNDIP (با ماسکوتِ گربه‌شون، Lord Nermal) — کپشن‌هاشون کوتاه، مستقیم و
باحاله، یه شوخیِ مشخص و ملموس داره که همون لحظه‌ی اول می‌فهمی چیه، نه یه
استعاره‌ی چندلایه که باید رمزگشاییش کنی. هدف همینه: خنده/نیش‌خندِ آنی، نه
فکرکردنِ عمیق برای فهمیدنِ منظور.

قوانین:
- کوتاه بنویس. جمله‌ی اضافه حذف کن.
- شوخی رو توضیح نده.
- مخاطب رو باهوش فرض کن.
- از جزئیاتِ فرهنگی (وقتی واقعاً تو تصویر/طرح هست) استفاده کن، نه decoration بی‌ربط.
- absurd/deadpan بودن اشکالی نداره، ولی باید فوری قابل‌فهم باشه.
- ممنوع: استعاره‌های انتزاعی/چندلایه که خواننده باید حدس بزنه یعنی چی
  (مثلاً بازی با «قاب»، «دیوار»، «موزه»، «بوم نقاشی» به‌عنوانِ نمادِ
  انتزاعی) — این‌ها گیج‌کننده‌ن، نه باهوشانه. جمله باید همون بارِ اول
  معنیش روشن باشه، حتی اگه شوخی/absurd باشه.
- ممنوع: هرگونه اشاره به «کشو» یا «از ته کشو درآوردن» — این عبارت از
  برندِ قدیمی مونده و دیگه استفاده نمی‌شه.
- ممنوع: کلمه‌ی «ببرش» به‌عنوان CTA پایانیِ کپشن — دیگه استفاده نمی‌شه؛
  به‌جاش یه CTA کوتاه و باانرژی و متفاوت با صدای همون کپشن بنویس.
- همیشه ارقام فارسی، همیشه راست‌چین. بدون هشتگ. حداکثر ۱-۲ ایموجی.
- منطق: کنجکاوی → کشف → معنا → محصول. نه: محصول → قیمت → بخر.
- هرگز شعارِ تبلیغاتی، motivational، یا کلیشه‌ی برندینگ («اصیل»، «خاص»،
  «منحصربه‌فرد») ننویس.
- بیش‌ازحد رسمی یا بیش‌ازحد کیوت/بچگانه نباش.
- مهم: اگه توی پیام، متنِ چاپ‌شده/موضوعِ تصویرِ همین طرح داده شده، کپشن باید
  واقعاً درباره‌ی همون (شوخی/جمله/شخصیتِ رویِ تیشرت) باشه — نه یه جمله‌ی
  ژنریک که برای هر تیشرتِ دیگه‌ای هم صدق می‌کنه. این دقیقاً همون چیزیه که
  باعثِ تکراری‌شدنِ کپشن‌ها می‌شه: وقتی داده‌ی واقعی داری و بازم کلی/عمومی
  می‌نویسی. اگه هیچ داده‌ای درباره‌ی طرح داده نشده، فقط بر اساسِ دسته‌ی
  پوشاک بنویس و چیزی که نمی‌دونی (طرحِ دقیق، رنگ، جنس) رو اختراع نکن. اگه
  لازمه از پالاس به‌عنوانِ راوی/شخصیتِ برند حرف بزنی، به‌عنوانِ صدای برند
  باش، نه اینکه ادعا کنی خودِ پالاس روی این تیشرتِ خاص چاپ شده.
- درباره‌ی رنگ/سایز/مدلِ همینِ عکس چیزی ادعا نکن (چون نمی‌دونی) — یه خطِ
  جدا (کنترل‌شده، نه از تو) بعد از کپشنِ تو اضافه می‌شه که به‌طور کلی به
  تنوعِ رنگ/سایزِ سایت اشاره می‌کنه؛ خودت لازم نیست بهش اشاره کنی.

خودتو قبل از تحویل چک کن:
۱) آیا این متن رو هر برندِ دیگه‌ای هم می‌تونست بنویسه؟ اگه آره، به‌اندازه‌ی
   کافی میزطوری نیست.
۲) آیا یه آدمِ عادی که تندتند اسکرول می‌کنه، همون لحظه‌ی اول می‌فهمه این
   جمله چی می‌گه؟ اگه نیاز به فکرکردن/رمزگشایی داره، خیلی انتزاعیه — ساده‌تر
   و مستقیم‌ترش کن.

دقیقاً یک شیء JSON با این شکل برگردان، بدون هیچ متن اضافه:
{
  "headline": "یک عبارت خیلی کوتاه (۲-۵ کلمه) برای چاپ روی خودِ عکس — ضربه‌ای، بدون نقطه در پایان",
  "caption": "۲-۳ جمله‌ی کوتاه برای متنِ زیرِ پست، با صدای بالا، در پایان یک CTA مستقیم و کوتاه."
}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGeminiModel(env, model, userPrompt) {
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

  if (!res.ok) {
    const err = new Error(`Gemini HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  const parsed = JSON.parse(text);
  if (!parsed.headline || !parsed.caption) throw new Error("Gemini خروجی ناقص داد");
  return parsed;
}

// مدلِ اصلی (gemini-3.6-flash) این اواخر مدام 503 «high demand» می‌ده — این
// دقیقاً همون چیزیه که باعث شد کپشنِ همه‌ی پست‌ها بشه متنِ ثابتِ fallback
// (کاربر: «کپشن تمام پست‌ها شده...»). به‌جای یه تلاشِ تک، این‌جا: هر مدل
// تا ۲ بار (فقط رویِ خطاهایِ موقتیِ ۵۰۳/۴۲۹ با یه مکث کوتاه)، بعد مدلِ
// دومِ پایدارتر — و فقط اگه همه‌شون شکست خوردن، caption بره سراغِ متنِ ثابت.
async function callGemini(env, userPrompt) {
  const models = [env.GEMINI_CAPTION_MODEL || "gemini-3.6-flash", env.GEMINI_CAPTION_FALLBACK_MODEL || "gemini-2.5-flash"];
  let lastErr;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callGeminiModel(env, model, userPrompt);
      } catch (err) {
        lastErr = err;
        console.error(`[caption] Gemini (${model}) attempt ${attempt + 1} failed: ${err.message}`);
        const retryable = err.status === 503 || err.status === 429;
        if (retryable && attempt === 0) {
          await sleep(4000);
          continue;
        }
        break;
      }
    }
  }
  throw lastErr;
}

function fallback(category) {
  const label = CATEGORY_LABEL_FA[category] || "محصول";
  return {
    headline: `یه ${label} دیگه`,
    caption: `پالاس بازم یه بلایی سرِ کمدمون آورده.\n\nمال خودت کن.\n\n${pickVarietyLine()}`,
  };
}

// این عکسِ خاص ممکنه فقط تو یه رنگ/سایز موجود باشه (خیلی از عکس‌های کتابخونه
// به محصولِ واقعیِ مچ‌شده وصل نیستن) — پس کپشن نباید ادعا کنه «همینِ طرح» تو
// چندتا رنگ/سایزه (دروغِ احتمالی درباره‌ی تصویر). به‌جاش یه اشاره‌ی کلی و
// راست به این‌که خودِ فروشگاه تنوعِ رنگ/سایز/مدل داره — از یه لیستِ
// کنترل‌شده (نه AI)، دقیقاً طبقِ همون الگویِ CTA_POOL.
const VARIETY_LINES = [
  "رنگ و سایزای دیگه‌شم تو سایت هست.",
  "مدل و رنگ و سایزِ دلخواهتو تو سایت پیدا کن.",
  "تنوعِ رنگ و سایز کامل، تو خودِ سایته.",
  "این یکی رو نه، کلی رنگ و سایزِ دیگه هم داریم.",
  "رنگ‌بندی و سایزبندیِ کامل رو تو سایت ببین.",
  // با دیجی‌پی قسطی — فاکتِ واقعیِ دیگه‌ای که باید هرازگاهی تو کپشن‌ها بیاد
  "دستت خالیه؟ با دیجی‌پی قسطی بخر.",
  "نیازی نیست یه‌جا حساب کنی — قسطیِ دیجی‌پی رو داریم.",
];

function pickVarietyLine() {
  return VARIETY_LINES[Math.floor(Math.random() * VARIETY_LINES.length)];
}

async function generateCaption(env, { category, designInfo }) {
  const label = CATEGORY_LABEL_FA[category] || "محصول";
  if (!env.GEMINI_API_KEY) return fallback(category);

  try {
    let prompt;
    if (designInfo && (designInfo.visibleText || designInfo.visualSubject)) {
      const parts = [`یک هوک+کپشن برای یک عکسِ محصول از دسته‌ی «${label}» بساز.`];
      if (designInfo.visibleText) parts.push(`متنِ چاپ‌شده رو‌یِ طرح: «${designInfo.visibleText}»`);
      if (designInfo.visualSubject) parts.push(`موضوعِ بصریِ طرح: «${designInfo.visualSubject}»`);
      parts.push("کپشن باید واقعاً درباره‌ی همین طرح/شوخی باشه، نه یه جمله‌ی عمومی درباره‌ی دسته‌ی پوشاک.");
      prompt = parts.join("\n");
    } else {
      prompt = `یک هوک+کپشن برای یک عکسِ محصول از دسته‌ی «${label}» بساز. عکس رو ندیدی، فقط بر اساس نوع پوشاک و صدای برند بنویس.`;
    }
    const result = await callGemini(env, prompt);
    return { headline: result.headline, caption: `${result.caption}\n\n${pickVarietyLine()}` };
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
const CTA_POOL = ["مال خودت کن", "همینو کم داشتی", "امتحانش کن", "بچسبونش به تنت", "بزنش تو تنت"];

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

// ---------------------------------------------------------------------------
// نسخه‌ی توییتر/X کپشن — کوتاه، بدون سؤالِ تعاملیِ اینستاگرام (فرمتِ X باهاش
// سازگار نیست)، حداکثر یکی‌دو هشتگ (نه پنج‌تای اینستاگرام — شلوغی تو X جواب
// نمی‌ده)، و لینکِ مستقیمِ محصول (برخلافِ کپشنِ اینستاگرام، این‌جا لینک واقعاً
// کلیک‌پذیره). فقط جمله‌ی اولِ کپشنِ پایه (هوکِ اصلی) رو می‌بره، نه کلِ
// کپشنِ ۲-۳ جمله‌ای، تا زیرِ محدودیتِ ۲۸۰ کاراکتریِ X بمونه.
// ---------------------------------------------------------------------------
const TWITTER_HASHTAGS_BY_CATEGORY = {
  tshirt: ["#تیشرت"],
  hoodie: ["#هودی"],
  pullover: ["#پلیور"],
  croptop: ["#کراپ_تاپ"],
  tank: ["#تاپ"],
  longsleeve: ["#آستین_بلند"],
  misc: [],
};

const TWITTER_MAX_LEN = 280;
// X همیشه لینک رو با t.co کوتاه می‌کنه و همین طولِ ثابت رو برای شمارشِ
// کاراکتر حساب می‌کنه، صرف‌نظر از طولِ واقعیِ URL.
const TWITTER_URL_WEIGHT = 23;

function buildTwitterCaption(baseCaption, category, buyUrl) {
  const tags = ["#میزطوری", ...(TWITTER_HASHTAGS_BY_CATEGORY[category] || [])].join(" ");
  const firstLine = baseCaption.split("\n")[0].trim();
  const fixedTail = `\n\n${tags}\n${buyUrl}`;
  const fixedTailWeight = fixedTail.length - buyUrl.length + TWITTER_URL_WEIGHT;
  const budget = TWITTER_MAX_LEN - fixedTailWeight;
  const bodyText = firstLine.length > budget ? `${firstLine.slice(0, Math.max(0, budget - 1)).trim()}…` : firstLine;
  return `${bodyText}${fixedTail}`;
}

module.exports = { generateCaption, pickCTA, buildInstagramCaption, buildTwitterCaption, CATEGORY_LABEL_FA };

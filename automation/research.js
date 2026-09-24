/**
 * research.js — قبل از نوشتن، دربارهِ نوشته/موضوعِ طرح تحقیق می‌شه. فقط جوابِ تأییدشده
 * با منبع استفاده می‌شه؛ وگرنه «نامعلوم» و مدلِ نویسنده حق نداره ریشه‌یِ طرح رو حدس بزنه.
 *   ۱) جستجویِ گوگل از طریقِ Gemini (grounding) — رویِ پلنِ رایگانِ فعلی سهمیه نداره (429)،
 *      ولی اگه پلن ارتقا پیدا کنه خودبه‌خود کار می‌کنه.
 *   ۲) گنجور (شعرِ فارسی): اولین شعری که خودِ عبارت عیناً توشه؛ خلاصه مستقیم از عنوانِ
 *      گنجور ساخته می‌شه، بدونِ تفسیرِ AI. ویکی‌پدیا عمداً نه: فقط هم‌اسمی پیدا می‌کرد
 *      (مثلاً «به کجا چنین شتابان» → سریال، «مثل یک دختر بجنگ» → آلبومِ خارجی).
 * اولویت: یادداشتِ صاحبِ برند (design-notes.json) > تحقیق > هیچی.
 * نتیجه‌ها تو state.json (research) کش می‌شن تا هر طرح یه بار تحقیق بشه؛ برایِ اصلاح،
 * یادداشت تو data/design-notes.json بذار (همیشه بر تحقیق مقدمه).
 */
const { loadState, saveState } = require("./state.js");

const MODELS = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.5-flash"];
const KIND_WORDS = /^(تیشرت|تی شرت|هودی|پلیور(\s*دورس)?|دورس|کراپ\s*تاپ|نیم\s*تنه|توت\s*بگ(\s*پارچه\s*ای)?|قاب\s*موبایل|کلاه(\s*نقاب\s*دار|\s*باکت)?|آستین\s*بلند)\s+/;

// اسمِ طرح: از اسمِ محصول در سایت (بدونِ «تیشرت/هودی…») یا از اسمِ فایل (tshirt/استمرار-گذشتن-2.jpg)
function designName({ key, siteName }) {
  if (siteName) return siteName.replace(KIND_WORDS, "").replace(/\s+/g, " ").trim();
  if (!key) return "";
  const base = String(key).split("/").pop().replace(/\.[a-z]+$/i, "").replace(/-\d+$/, "");
  if (/^[\x00-\x7f]+$/.test(base)) return ""; // اسمِ فایلِ قدیمیِ لاتین (IMG_…) — چیزی برایِ تحقیق نیست
  return base.replace(/[-_]+/g, " ").trim();
}

const cacheKey = (s) => s.replace(/[‌\s،,.\-]+/g, " ").trim();

function cached(name) {
  if (!name) return undefined;
  const st = loadState();
  return (st.research || {})[cacheKey(name)];
}

const PROMPT = (name, visibleText) => `یه برندِ ایرانیِ لباس طرحی داره به اسمِ «${name}»${visibleText ? ` (نوشته‌یِ رویِ طرح طبقِ خوانشِ ماشینی، شاید غلط: «${visibleText}»)` : ""}.
با جستجو پیدا کن این عبارت/موضوع از کجاست: بیتِ کدوم شاعر، تیکه‌ای از کدوم ترانه و خواننده/گروه، دیالوگِ کدوم فیلم، کدوم شخصیت یا آیینِ فرهنگی، یا یه اصطلاح/ضرب‌المثل.
قانون: فقط چیزی بگو که نتیجه‌هایِ جستجو صریحاً تأییدش کنن. یه اثرِ هم‌اسم (آلبوم/سریال/کتابی که فقط اسمش همینه) منبعِ عبارت حساب نمی‌شه. اگه مطمئن نیستی یا چند جوابِ متفاوت هست، found=false. حدس نزن. اسمِ برند یا فروشگاه‌ها منبع حساب نمی‌شن.
فقط یه JSON بده، بدونِ هیچ متنِ دیگه:
{"found": true/false, "confidence": "high"|"medium"|"low", "summary": "یک یا دو جمله‌یِ کوتاهِ فارسی: این عبارت/موضوع چیه و مالِ کیه"}`;

async function callGrounded(env, model, text) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 60000);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1200 },
      }),
      signal: c.signal,
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = new Error(`${model} HTTP ${res.status}: ${(j.error?.message || "").slice(0, 150)}`);
      e.status = res.status;
      throw e;
    }
    const cand = j.candidates?.[0] || {};
    const out = (cand.content?.parts || []).filter((p) => !p.thought).map((p) => p.text || "").join("");
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("JSON پیدا نشد");
    const r = JSON.parse(m[0]);
    const sources = (cand.groundingMetadata?.groundingChunks || [])
      .map((g) => g.web)
      .filter(Boolean)
      .slice(0, 3)
      .map((w) => ({ title: w.title || "", uri: w.uri || "" }));
    return { ...r, sources };
  } finally {
    clearTimeout(t);
  }
}

// → { found, summary, sources } یا null (اسم نداشت/کلید نبود/خطایِ شبکه)
async function researchDesign(env, { key, siteName, visibleText }) {
  const name = designName({ key, siteName });
  if (!name || !env.GEMINI_API_KEY) return null;
  const hit = cached(name);
  if (hit) {
    console.log(`🔎 تحقیقِ طرح «${name}» (از کش): ${hit.found ? hit.summary : "نامعلوم"}`);
    return hit;
  }
  const at = new Date().toISOString().slice(0, 10);
  const save = (result) => {
    const st = loadState();
    st.research = st.research || {};
    st.research[cacheKey(name)] = result;
    saveState(st);
    console.log(`🔎 تحقیقِ طرح «${name}» (${result.via}): ${result.found ? result.summary : "نامعلوم (حدس زده نمی‌شه)"}`);
    return result;
  };

  // ۱) جستجویِ گوگل
  for (const model of MODELS) {
    try {
      const r = await callGrounded(env, model, PROMPT(name, visibleText));
      const ok = r.found === true && r.confidence === "high" && r.sources.length > 0 && typeof r.summary === "string" && r.summary.trim();
      if (ok) return save({ found: true, summary: r.summary.trim(), sources: r.sources, via: "google", at });
      break; // گوگل چیزِ مطمئنی پیدا نکرد → گنجور هم امتحان بشه
    } catch (err) {
      console.error(`[research] google ${model}: ${err.message.slice(0, 90)}`);
      if (err.status === 503 || err.name === "AbortError") continue;
      break; // سهمیه/دسترسی نیست → گنجور
    }
  }

  // ۲) گنجور
  const hits = await searchGanjoor(name).catch((e) => (console.error(`[research] ganjoor: ${e.message}`), null));
  if (hits === null) return null; // خطایِ شبکه → کش نمی‌شه، دفعه‌یِ بعد دوباره
  if (!hits.length) return save({ found: false, via: "ganjoor", at });
  const h = hits[0];
  const where = h.title.split("»").map((s) => s.trim()).filter(Boolean);
  const summary = `این عبارت تو شعرِ ${where[0]} اومده${where.length > 1 ? ` (${where.slice(1).join("، ")})` : ""}، طبقِ گنجور: «${h.text}»`;
  return save({ found: true, summary, sources: [{ title: `گنجور: ${h.title}`, uri: h.uri }], via: "ganjoor", at });
}

// برایِ مقایسه: بدونِ فاصله/نیم‌فاصله/اعراب و با ی/ک یکسان
const flat = (s) =>
  String(s || "")
    .replace(/<[^>]+>/g, "")
    .replace(/[يىئ]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[أإآ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ة/g, "ه")
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/[\s‌،,.:;!؟?«»"'()\-]+/g, "");

async function getJson(url) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 20000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": "miztore-automation/1.0 (+https://miztore.com)" }, signal: c.signal });
    if (!res.ok) throw new Error(`${new URL(url).host} HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// → [{ title, text, uri, born }] فقط شعرهایی که خودِ عبارت عیناً توشونه، قدیمی‌ترین شاعر اول
// (یه مصراعِ معروف رو شاعرهایِ بعدی هم نقل کردن؛ قدیمی‌ترین معمولاً اصلشه).
// عبارتِ کوتاه‌تر از ۳ کلمه تحقیق نمی‌شه (یه کلمه تو هزار تا شعر هست).
async function searchGanjoor(name) {
  const words = name.split(/\s+/);
  if (words.length < 3) return [];
  const needle = flat(name);
  const terms = [name];
  if (words.length > 4) terms.push(words.slice(0, 4).join(" ")); // اعراب/همزه‌یِ متفاوت نذاره جستجو چیزی رو از دست بده
  const seen = new Set();
  const out = [];
  for (const term of terms) {
    const list = await getJson(`https://api.ganjoor.net/api/ganjoor/poems/search?term=${encodeURIComponent(term)}&PageNumber=1&PageSize=10`);
    for (const p of Array.isArray(list) ? list : []) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      const line = String(p.plainText || "").split(/\n/).find((l) => flat(l).includes(needle));
      if (!line && !flat(p.plainText).includes(needle)) continue;
      const born = p.category?.poet?.birthYearInLHijri || p.category?.poet?.deathYearInLHijri || 9999;
      out.push({ title: p.fullTitle, text: (line || name).trim().slice(0, 200), uri: `https://ganjoor.net${p.fullUrl}`, born });
    }
  }
  return out.sort((a, b) => a.born - b.born);
}

module.exports = { researchDesign, cachedResearch: (opts) => cached(designName(opts)), designName, searchGanjoor };

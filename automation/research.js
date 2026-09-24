/**
 * research.js — قبل از نوشتن، دربارهِ نوشته/موضوعِ طرح تو وب تحقیق می‌شه (Gemini +
 * Google Search). فقط وقتی جواب با منبع تأیید شده باشه استفاده می‌شه؛ وگرنه «نامعلوم»
 * و مدلِ نویسنده حق نداره ریشه‌یِ طرح رو حدس بزنه.
 * اولویت: یادداشتِ صاحبِ برند (design-notes.json) > تحقیق > هیچی.
 * نتیجه‌ها تو state.json (research) کش می‌شن تا هر طرح یه بار تحقیق بشه؛ برایِ اصلاح،
 * یادداشت تو data/design-notes.json بذار (همیشه بر تحقیق مقدمه).
 */
const { loadState, saveState } = require("./state.js");

const MODELS = ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.5-flash"];
const KIND_WORDS = /^(تیشرت|تی شرت|هودی|پلیور(\s*دورس)?|دورس|کراپ\s*تاپ|نیم\s*تنه|توت\s*بگ(\s*پارچه\s*ای)?|قاب\s*موبایل|کلاه(\s*نقاب\s*دار|\s*باکت)?|آستین\s*بلند)\s+/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
قانون: فقط چیزی بگو که نتیجه‌هایِ جستجو صریحاً تأییدش کنن. اگه مطمئن نیستی یا چند جوابِ متفاوت هست، found=false. حدس نزن. اسمِ برند یا فروشگاه‌ها منبع حساب نمی‌شن.
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

// → { found, summary, sources } یا null (اسم نداشت/کلید نبود/همه‌یِ مدل‌ها شکست خوردن)
async function researchDesign(env, { key, siteName, visibleText }) {
  const name = designName({ key, siteName });
  if (!name || !env.GEMINI_API_KEY) return null;
  const hit = cached(name);
  if (hit) {
    console.log(`🔎 تحقیقِ طرح «${name}» (از کش): ${hit.found ? hit.summary : "نامعلوم"}`);
    return hit;
  }
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await callGrounded(env, model, PROMPT(name, visibleText));
        // فقط جوابِ مطمئن و با منبعِ واقعیِ جستجو
        const ok = r.found === true && r.confidence === "high" && r.sources.length > 0 && typeof r.summary === "string" && r.summary.trim();
        const result = ok
          ? { found: true, summary: r.summary.trim(), sources: r.sources, model, at: new Date().toISOString().slice(0, 10) }
          : { found: false, model, at: new Date().toISOString().slice(0, 10) };
        const st = loadState();
        st.research = st.research || {};
        st.research[cacheKey(name)] = result;
        saveState(st);
        console.log(`🔎 تحقیقِ طرح «${name}»: ${result.found ? result.summary : "نامعلوم (حدس زده نمی‌شه)"}`);
        return result;
      } catch (err) {
        console.error(`[research] ${model} try ${attempt + 1}: ${err.message}`);
        if (err.status === 503 || err.status === 429 || err.name === "AbortError") await sleep(4000);
        else if (err.status >= 400 && err.status < 500) break;
      }
    }
  }
  return null; // کش نمی‌شه تا دفعه‌یِ بعد دوباره امتحان بشه
}

module.exports = { researchDesign, cachedResearch: (opts) => cached(designName(opts)), designName };

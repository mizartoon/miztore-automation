/**
 * identify-designs.js — برای هر عکس تیشرت، متنِ روی تیشرت رو با Gemini Vision
 * می‌خونه (بدون لیست کاندید — فقط OCR خام، تا مدل حدس نزنه)، بعد با کد (نه
 * حدسِ مدل) با کاتالوگ واقعیِ miztore.com مقایسه می‌کنه.
 *
 * چرا این‌طوری؟ اولین تلاش (دادنِ لیست محصولات به مدل و خواستنِ انتخاب)
 * baghi داد: با اطمینانِ کامل عکسِ «اسپایدرمن» رو به محصولِ «THE BAHMAN»
 * (که کاملاً متفاوته) matched کرد. مدل تحتِ فشارِ «یکی رو انتخاب کن» حدس
 * می‌زنه. جدا کردنِ «چی می‌بینی» (grounded) از «آیا مطابقت داره» (کدِ
 * قطعی، نه LLM) این مشکل رو حل کرد.
 *
 * مدل: gemini-3.1-flash-lite — چون gemini-3.6-flash فقط ۲۰ درخواستِ رایگان
 * در روز داره (خیلی کم برای ۷۴۹ عکس)، ولی flash-lite چیزی حدودِ
 * ۱۰۰۰-۱۵۰۰/روز رایگانه.
 */

const fs = require("fs");
const path = require("path");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3.1-flash-lite";
const LIB_DIR = process.env.LIB_DIR || "C:\\Users\\Dear User\\Downloads\\miztore-content-pipeline\\library-staging\\tshirt";
const CATALOG_PATH = path.join(__dirname, "..", "data", "product-catalog.json");
const OUT_PATH = path.join(__dirname, "..", "data", "design-identification.json");
const DELAY_MS = 1200; // برای رعایتِ RPM

const SYSTEM_PROMPT = `تو داری عکس یک مدل با تیشرت میزطوری رو می‌بینی. روی تیشرت معمولاً یک طرح تصویری و/یا یک نوشته (فارسی یا لاتین) چاپ شده.

فقط دقیقاً چیزی که می‌بینی رو گزارش بده — چیزی حدس نزن یا اختراع نکن.

دقیقاً یک JSON برگردون:
{
  "visibleText": "دقیقاً متنِ چاپ‌شده روی تیشرت، کلمه‌به‌کلمه (اگه هیچ متنی نیست، رشته‌ی خالی)",
  "visualSubject": "توصیفِ خیلی کوتاه (۲-۵ کلمه) از خودِ تصویر/کاراکترِ چاپ‌شده",
  "illegible": false یا true (اگه از پشت گرفته شده یا طرح اصلاً دیده نمی‌شه)
}`;

function normalize(s) {
  return String(s || "")
    .replace(/تیشرت/g, "")
    .replace(/[.,،!؟?()«»"'٬]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokenOverlapRatio(a, b) {
  const ta = new Set(normalize(a).split(" ").filter((w) => w.length > 1));
  const tb = normalize(b).split(" ").filter((w) => w.length > 1);
  if (ta.size === 0 || tb.length === 0) return 0;
  const hits = tb.filter((w) => ta.has(w)).length;
  return hits / Math.min(ta.size, tb.length);
}

function findCatalogMatch(visibleText, visualSubject, catalog) {
  if (!visibleText && !visualSubject) return null;
  let best = null;
  for (const p of catalog) {
    const nameNoPrefix = p.name.replace(/^تیشرت\s*/, "");
    const scoreText = tokenOverlapRatio(nameNoPrefix, visibleText);
    if (!best || scoreText > best.score) best = { product: p, score: scoreText };
  }
  // آستانه‌ی سخت‌گیرانه — فقط matchِ خیلی مطمئن قبول می‌شه، وگرنه fallback به OCR خام
  if (best && best.score >= 0.75) return best;
  return null;
}

function slugify(text) {
  return String(text || "")
    .replace(/[.,،!؟?()«»"'٬:]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join("-");
}

async function classifyImage(filePath) {
  const bytes = fs.readFileSync(filePath);
  const base64 = bytes.toString("base64");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          { role: "user", parts: [{ text: "این عکسه:" }, { inlineData: { mimeType: "image/jpeg", data: base64 } }] },
        ],
        generationConfig: { maxOutputTokens: 2048, temperature: 0.1, responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  return JSON.parse(text);
}

async function main() {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY تنظیم نشده");

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf-8"));
  const files = fs.readdirSync(LIB_DIR).filter((f) => f.endsWith(".jpg")).sort();

  let results = {};
  if (fs.existsSync(OUT_PATH)) {
    results = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"));
    console.log(`ادامه از نتایج قبلی: ${Object.keys(results).length} عکس قبلاً پردازش شده`);
  }

  let done = 0, errors = 0;
  for (const file of files) {
    if (results[file]) continue; // resume — این عکس قبلاً پردازش شده

    try {
      const ocr = await classifyImage(path.join(LIB_DIR, file));
      const match = findCatalogMatch(ocr.visibleText, ocr.visualSubject, catalog);

      results[file] = {
        visibleText: ocr.visibleText,
        visualSubject: ocr.visualSubject,
        illegible: ocr.illegible,
        matchedProductId: match ? match.product.id : null,
        matchedProductName: match ? match.product.name.replace(/^تیشرت\s*/, "") : null,
        matchScore: match ? match.score : null,
        fallbackSlug: !match ? slugify(ocr.visibleText || ocr.visualSubject) : null,
      };
      done++;

      if (done % 20 === 0) {
        fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
        console.log(`  ${done} پردازش شد (checkpoint ذخیره شد)...`);
      }
    } catch (err) {
      console.error(`❌ ${file}: ${err.message}`);
      errors++;
      if (String(err.message).includes("429")) {
        console.log("   rate limit خورد، ۳۰ ثانیه صبر می‌کنیم...");
        await new Promise((r) => setTimeout(r, 30000));
      }
    }

    await new Promise((r) => setTimeout(r, DELAY_MS));
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
  console.log(`\n✅ تمام شد: ${done} پردازش شد، ${errors} خطا. مجموع نتایج: ${Object.keys(results).length}`);
}

main().catch((err) => {
  console.error("خطای کلی:", err);
  process.exit(1);
});

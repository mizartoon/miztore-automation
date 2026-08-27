/**
 * persianize-slugs.js — برای عکس‌هایی که fallbackSlug شون لاتین/فینگلیش بود
 * (مثلاً "UN KE DAD ENGHAD")، یک نسخه‌ی فارسی/آوانویسی‌شده می‌سازه (مثلاً
 * "اون که داد انقد") — طبق درخواست کاربر. یک درخواست دسته‌ای (نه یکی‌یکی)
 * چون این‌جا فقط متن داریم، نیازی به Vision نیست.
 */

const fs = require("fs");
const path = require("path");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OUT_PATH = path.join(__dirname, "..", "data", "design-identification.json");

function isLatinHeavy(s) {
  if (!s) return false;
  const latin = (s.match(/[A-Za-z]/g) || []).length;
  const persian = (s.match(/[؀-ۿ]/g) || []).length;
  return latin > persian;
}

async function persianizeBatch(items) {
  const prompt = `این‌ها متن‌های خام (لاتین یا فینگلیش) هستن که از روی چاپِ تیشرت خونده شدن. برای هرکدوم یک نسخه‌ی فارسیِ کوتاه (۲-۵ کلمه، مناسب برای اسم فایل) بده:
- اگه فینگلیش بود (مثلاً "UN KE DAD ENGHAD")، آوانویسیِ فارسیش رو بده (مثلاً "اون که داد انقد").
- اگه اسم خاص/برند انگلیسی بود (مثلاً NIRVANA)، تلفظ فارسیش رو بده (مثلاً "نیروانا").
- خروجی فقط فارسی باشه، بدون حروف لاتین.

لیست (با همون شماره جواب بده):
${items.map((t, i) => `${i + 1}. ${t}`).join("\n")}

دقیقاً یک JSON array از رشته‌های فارسی برگردون، به همون ترتیب و تعداد، بدون هیچ متن اضافه.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.2, responseMimeType: "application/json" },
      }),
    }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
  return JSON.parse(text);
}

function slugify(text) {
  return String(text || "")
    .replace(/[.,،!؟?()«»"'٬:]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 5)
    .join("-");
}

async function main() {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY تنظیم نشده");

  const results = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"));
  const targets = Object.entries(results).filter(
    ([k, v]) => !v.matchedProductId && isLatinHeavy(v.fallbackSlug)
  );

  console.log(`${targets.length} عکس نیاز به فارسی‌سازیِ اسم دارن.`);

  const BATCH_SIZE = 40;
  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE);
    const rawTexts = batch.map(([k, v]) => v.visibleText || v.visualSubject || v.fallbackSlug);

    try {
      const persianTexts = await persianizeBatch(rawTexts);
      batch.forEach(([k, v], idx) => {
        if (persianTexts[idx]) {
          v.fallbackSlug = slugify(persianTexts[idx]);
          v.fallbackSlugSource = "persianized";
        }
      });
      fs.writeFileSync(OUT_PATH, JSON.stringify(results, null, 2));
      console.log(`  ${Math.min(i + BATCH_SIZE, targets.length)}/${targets.length} فارسی شد (ذخیره شد)...`);
    } catch (err) {
      console.error(`❌ batch ${i}: ${err.message}`);
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("✅ تمام شد.");
}

main().catch((err) => {
  console.error("خطای کلی:", err);
  process.exit(1);
});

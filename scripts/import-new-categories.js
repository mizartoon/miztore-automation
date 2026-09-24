/**
 * import-new-categories.js — هودی/پلیور/آستین‌بلند از پوشه‌های محلیِ کاربر
 * (D:\pictures\...) به کتابخونه‌ی گیت‌هاب (mizartoon/miztore-library).
 *
 * برای هر عکس:
 *   1) Gemini Vision (رویِ نسخه‌ی کوچیکِ ۱۰۲۴px): نوعِ لباس، متن/موضوعِ طرح،
 *      و یه اسمِ فارسیِ کوتاه از رویِ طرح.
 *   2) اگه با یه محصولِ واقعیِ سایت جور دربیاد → لینکِ مستقیمِ خرید.
 *   3) اسمِ فایلِ اصلی رویِ کامپیوترِ کاربر عوض می‌شه (همون فرمت/کیفیت، بدونِ
 *      افت)؛ یه نسخه‌ی فشرده (JPEG، ضلعِ بلند ۱۶۰۰px) تویِ کلونِ کتابخونه
 *      نوشته می‌شه که push بشه.
 *   4) data/design-identification.json + rename-map.json + product-links.json
 *      به‌روز می‌شن تا pipeline (design-lookup/copywriter) ازشون استفاده کنه.
 *
 * resume-friendly: نتیجه‌ی Vision برای هر فایل تو PROGRESS ذخیره می‌شه.
 *   GEMINI_API_KEY=... LIB_DIR=... node scripts/import-new-categories.js [--apply] [--limit N]
 *   بدونِ --apply فقط شناسایی/گزارش (هیچ فایلی تغییر نمی‌کنه).
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
sharp.cache(false); // ویندوز: sharp دستگیره‌ی فایل رو نگه می‌داشت → EBUSY موقعِ rename

async function renameRetry(a, b) {
  for (let i = 0; ; i++) {
    try {
      return fs.renameSync(a, b);
    } catch (e) {
      if (i >= 8 || !/EBUSY|EPERM|UNKNOWN/.test(e.code || "")) throw e;
      await sleep(500 * (i + 1));
    }
  }
}

const KEY = process.env.GEMINI_API_KEY;
const LIB_DIR = process.env.LIB_DIR; // کلونِ miztore-library
const APPLY = process.argv.includes("--apply");
const LIMIT = Number((process.argv.find((a) => a.startsWith("--limit=")) || "").split("=")[1] || 0);
const MODELS = ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.5-flash", "gemini-3.7-flash", "gemini-3.1-flash-lite"];

const SOURCES = [
  { dir: "D:\\pictures\\هودی", expect: "hoodie" },
  { dir: "D:\\pictures\\پلیور", expect: "pullover" },
  { dir: "D:\\pictures\\آستین‌بلند", expect: "longsleeve" },
];
const GARMENT_TO_CAT = { hoodie: "hoodie", sweatshirt: "pullover", longsleeve: "longsleeve" };
const CAT_WOO = { hoodie: "hoodie", pullover: "sweatshirt", longsleeve: "t-shirt" };
const CAT_LABEL = { hoodie: "هودی", pullover: "پلیور", longsleeve: "تیشرت" };

const DATA = path.join(__dirname, "..", "data");
const PROGRESS = path.join(DATA, "import-progress.json");
const IDENT = path.join(DATA, "design-identification.json");
const RENAME = path.join(DATA, "rename-map.json");
const LINKS = path.join(DATA, "product-links.json");
const LOCAL_LOG = "D:\\pictures\\rename-log-2026-09-24.json";

const readJson = (p, d) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf-8")) : d);
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PROMPT = `عکسِ یک مدل با لباسِ فروشگاهِ «میزطوری» است. فقط چیزی که واقعاً می‌بینی رو گزارش کن.
JSON برگردان:
{
  "garment": یکی از "hoodie" (سویشرتِ کلاه‌دار)، "sweatshirt" (پلیور/دورسِ بدونِ کلاه)، "longsleeve" (تیشرتِ آستین‌بلندِ نازک)، "tshirt" (آستین‌کوتاه)، "other",
  "visibleText": "متنِ چاپ‌شده رویِ لباس کلمه‌به‌کلمه (فارسی یا لاتین)، اگه نیست رشته‌ی خالی",
  "visualSubject": "توصیفِ ۲ تا ۶ کلمه‌ایِ تصویرِ چاپ‌شده",
  "slug": "اسمِ فایل: ۲ تا ۵ کلمه‌ی فارسی که طرح رو معرفی کنه (اگه متن داره، همون متن یا خلاصه‌ش؛ اسمِ لاتین/برند رو فارسی بنویس)؛ بدونِ حرفِ لاتین، بدونِ علامت",
  "designVisible": true/false
}`;

async function vision(filePath) {
  const small = await sharp(filePath).rotate().resize({ width: 1024, height: 1024, fit: "inside" }).jpeg({ quality: 82 }).toBuffer();
  const body = {
    contents: [{ parts: [{ inline_data: { mime_type: "image/jpeg", data: small.toString("base64") } }, { text: PROMPT }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.1, maxOutputTokens: 1024 },
  };
  let last;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
          body: JSON.stringify(body),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) {
          const e = new Error(`${model} ${res.status} ${(j.error?.message || "").slice(0, 120)}`);
          e.status = res.status;
          throw e;
        }
        const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
        let parsed = JSON.parse(text);
        if (Array.isArray(parsed)) parsed = parsed[0] || {};
        if (!parsed.garment || !("slug" in parsed)) throw new Error(`${model} پاسخِ ناقص: ${text.slice(0, 80)}`);
        return { ...parsed, model };
      } catch (e) {
        last = e;
        if (e.status === 429 && /quota/i.test(e.message)) break;
        await sleep(e.status === 503 || e.status === 429 ? 6000 * (attempt + 1) : 1500);
      }
    }
  }
  throw last;
}

async function catalog(wooSlug) {
  const out = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(`https://miztore.com/wp-json/wc/store/v1/products?category=${wooSlug}&per_page=100&page=${page}&_fields=id,name,permalink`);
    if (!res.ok) break;
    const batch = await res.json();
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

const norm = (s) =>
  String(s || "")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[.,،!؟?()«»"'٬:؛\-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

function bestMatch(v, products, label) {
  const hay = norm(`${v.visibleText} ${v.slug}`);
  const words = new Set(hay.split(" ").filter((w) => w.length > 1));
  let best = null;
  for (const p of products) {
    const name = norm(p.name.replace(new RegExp(`^(${label}|هودی|پلیور|تیشرت)\\s*`), ""));
    const pw = name.split(" ").filter((w) => w.length > 1);
    if (!pw.length) continue;
    const hits = pw.filter((w) => words.has(w)).length;
    const score = hits / pw.length;
    if (!best || score > best.score) best = { p, score };
  }
  return best && best.score >= 0.75 ? best : null;
}

function slugify(s) {
  return (
    String(s || "")
      .replace(/[A-Za-z]/g, "")
      .replace(/[\\/:*?"<>|.,،!؟()«»'٬؛\u200c]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 6)
      .join("-") || "طرح"
  );
}

async function main() {
  if (!KEY) throw new Error("GEMINI_API_KEY لازمه");
  const progress = readJson(PROGRESS, {});
  const products = {};
  for (const cat of Object.keys(CAT_WOO)) products[cat] = await catalog(CAT_WOO[cat]);
  console.log("کاتالوگ:", Object.fromEntries(Object.entries(products).map(([k, v]) => [k, v.length])));

  // ۱) شناسایی
  let n = 0;
  for (const src of SOURCES) {
    const files = fs.readdirSync(src.dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
    for (const f of files) {
      const id = `${src.expect}::${f}`;
      if (progress[id]) continue;
      if (LIMIT && n >= LIMIT) break;
      try {
        progress[id] = await vision(path.join(src.dir, f));
        n++;
        if (n % 10 === 0) {
          writeJson(PROGRESS, progress);
          console.log(`  ${n} عکس شناسایی شد…`);
        }
      } catch (e) {
        console.error(`❌ ${id}: ${e.message}`);
      }
      await sleep(700);
    }
  }
  writeJson(PROGRESS, progress);

  // ۲) برنامه‌ریزیِ اسم‌ها
  const plan = [];
  const used = {};
  const skipped = [];
  for (const src of SOURCES) {
    const files = fs.readdirSync(src.dir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort();
    for (const f of files) {
      const v = progress[`${src.expect}::${f}`];
      if (!v) continue;
      const cat = GARMENT_TO_CAT[v.garment] || null;
      if (!cat) {
        skipped.push({ file: `${src.dir}\\${f}`, garment: v.garment, slug: v.slug });
        continue;
      }
      const m = bestMatch(v, products[cat], CAT_LABEL[cat]);
      let base = slugify(v.slug || v.visibleText || v.visualSubject);
      // «هودی-…»، «طرح-…» اولِ اسم تکراریه (پوشه خودش نوعِ لباس رو می‌گه)
      for (let k = 0; k < 3; k++) base = base.replace(/^(هودی|پلیور|تیشرت|آستین-بلند|آستین‌بلند|طرح|تصویر)-/, "");
      if (!base) base = "طرح";
      used[cat] = used[cat] || new Map();
      const c = (used[cat].get(base) || 0) + 1;
      used[cat].set(base, c);
      const name = c === 1 ? base : `${base}-${c}`;
      plan.push({ srcDir: src.dir, file: f, expect: src.expect, cat, name, v, match: m ? { id: m.p.id, name: m.p.name, url: m.p.permalink, score: m.score } : null });
    }
  }
  const byCat = plan.reduce((a, p) => ((a[p.cat] = (a[p.cat] || 0) + 1), a), {});
  console.log("\nبرنامه:", byCat, "| لینکِ محصول:", plan.filter((p) => p.match).length, "| رد شده (نوعِ دیگه):", skipped.length);
  console.log("نمونه‌ها:", plan.slice(0, 8).map((p) => `${p.expect}/${p.file} → ${p.cat}/${p.name}.jpg${p.match ? " 🔗" : ""}`).join("\n  "));
  writeJson(path.join(DATA, "import-plan.json"), { plan, skipped });
  if (!APPLY) return console.log("\n(پیش‌نمایش — با --apply اجرا کن)");
  if (!LIB_DIR) throw new Error("LIB_DIR لازمه");

  // ۳) اعمال: نسخه‌ی فشرده تو کتابخونه + تغییرِ اسمِ اصلی رویِ دیسک + داده‌ها
  const ident = readJson(IDENT, {});
  const rename = readJson(RENAME, {});
  const links = readJson(LINKS, {});
  const log = readJson(LOCAL_LOG, {});
  let i = 0;
  for (const p of plan) {
    const oldAbs = path.join(p.srcDir, p.file);
    const outRel = `${p.cat}/${p.name}.jpg`;
    const outAbs = path.join(LIB_DIR, p.cat, `${p.name}.jpg`);
    const ext = path.extname(p.file).toLowerCase();
    if (fs.existsSync(oldAbs)) {
      fs.mkdirSync(path.dirname(outAbs), { recursive: true });
      const buf = await sharp(fs.readFileSync(oldAbs))
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 84, mozjpeg: true })
        .toBuffer();
      fs.writeFileSync(outAbs, buf);
      let newLocal = `${p.name}${ext}`;
      for (let k = 2; fs.existsSync(path.join(p.srcDir, newLocal)) && newLocal !== p.file; k++) newLocal = `${p.name}-${k}${ext}`;
      await renameRetry(oldAbs, path.join(p.srcDir, newLocal));
      log[path.join(p.srcDir, newLocal)] = oldAbs;
    } else if (!fs.existsSync(outAbs)) {
      continue; // نه اصلش هست نه خروجیش — دست نزن
    } // وگرنه: تو اجرایِ قبلی انجام شده بود؛ فقط داده‌ها ثبت می‌شن

    const oldKey = `${p.expect}/${p.file}`;
    ident[oldKey] = {
      visibleText: p.v.visibleText || "",
      visualSubject: p.v.visualSubject || "",
      illegible: !p.v.designVisible,
      garment: p.v.garment,
      matchedProductId: p.match ? p.match.id : null,
      matchedProductName: p.match ? p.match.name : null,
      matchScore: p.match ? p.match.score : null,
    };
    rename[oldKey] = outRel;
    if (p.match) links[outRel] = p.match.url;
    if (++i % 25 === 0) console.log(`  ${i}/${plan.length} اعمال شد…`);
  }
  writeJson(IDENT, ident);
  writeJson(RENAME, rename);
  writeJson(LINKS, links);
  writeJson(LOCAL_LOG, log);
  console.log(`\n✅ ${i} عکس: نسخه‌ی فشرده تو کتابخونه، اسمِ اصلی‌ها رویِ دیسک عوض شد. لاگِ برگشت: ${LOCAL_LOG}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

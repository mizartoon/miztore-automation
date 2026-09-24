/**
 * store.js — لیست‌هایِ واقعیِ محصول از فروشگاه برایِ پست‌هایِ گروهی
 * (پرفروش‌ها، کالکشن‌ها، راهنمایِ هدیه، «این یا اون؟»).
 * همه‌چی از Store APIِ عمومیِ ووکامرس؛ هیچ عدد/ادعایی ساخته نمی‌شه.
 */

const API = "https://miztore.com/wp-json/wc/store/v1";
const FIELDS = "_fields=id,name,prices,images,categories,is_in_stock,attributes";

const COLLECTIONS = {
  gilding: "نوشتار",
  illustration: "تصویرسازی",
  celebrity: "شخصیت",
  music: "ترانه",
  nostalgia: "نوستالژی",
  work: "کار",
};
const KIND = { "t-shirt": "تیشرت", hoodie: "هودی", sweatshirt: "پلیور", "crop-top": "کراپ تاپ" };
const HIDDEN = new Set(["test-v2"]);
const CUSTOM_DESIGN_ID = 60863; // «لباس با طرحِ دلخواهِ شما» — تو لیست‌هایِ طرح نمیاد

const faDigits = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const money = (n) => faDigits(Number(n).toLocaleString("en-US"));

async function getJson(url, tries = 3) {
  for (let i = 0; ; i++) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 40000);
    try {
      const res = await fetch(url, { headers: { "User-Agent": "miztore-automation" }, signal: c.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i >= tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
    } finally {
      clearTimeout(t);
    }
  }
}

function compact(p) {
  const cats = p.categories || [];
  if (cats.some((c) => HIDDEN.has(c.slug)) || p.id === CUSTOM_DESIGN_ID || !p.is_in_stock) return null;
  const kind = cats.map((c) => KIND[c.slug]).find(Boolean) || null;
  const range = p.prices?.price_range;
  const min = Number(range?.min_amount || p.prices?.price || 0);
  const max = Number(range?.max_amount || p.prices?.price || 0);
  const colors = (p.attributes || []).find((a) => a.taxonomy === "pa_color")?.terms?.length || 0;
  const img = p.images?.[0];
  if (!img) return null;
  return {
    id: p.id,
    name: p.name.replace(/\s+/g, " ").trim(),
    shortName: p.name
      .replace(/^(تیشرت|هودی|پلیور|کراپ\s*تاپ|نیم\s*تنه|توت\s*بگ(\s*پارچه\s*ای)?|قاب\s*موبایل|کلاه(\s*نقاب\s*دار|\s*باکت)?)\s+/, "")
      .replace(/\s+/g, " ")
      .replace(/\s+([،,])/g, "$1")
      .trim(),
    kind,
    collections: cats.map((c) => COLLECTIONS[c.slug]).filter(Boolean),
    priceText: min ? (max > min ? `از ${money(min)}` : money(min)) + " تومان" : null,
    colors,
    image: img.src,
    link: (src) => `https://miztore.com/?p=${p.id}&utm_source=${src}`,
  };
}

async function list(query, n = 8) {
  const items = await getJson(`${API}/products?${query}&per_page=${Math.max(n * 2, 12)}&${FIELDS}`);
  return items.map(compact).filter(Boolean);
}

// یه محصول از هر طرح (نه تیشرت+هودی+پلیورِ یک طرح کنارِ هم)
function distinctDesigns(items, n) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = it.shortName.replace(/[\s،,]+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
    if (out.length >= n) break;
  }
  return out;
}

const bestsellers = async (n = 4) => distinctDesigns(await list("orderby=popularity&order=desc", 12), n);
const newest = async (n = 4) => distinctDesigns(await list("orderby=date&order=desc", 12), n);
async function collection(slug, n = 4) {
  const items = await list(`category=${slug}&orderby=popularity&order=desc`, 12);
  return distinctDesigns(items, n);
}
// نمونه‌یِ بزرگ برایِ راهنمایِ هدیه (Gemini از بینشون انتخاب می‌کنه)
async function pool(n = 60) {
  const out = [];
  for (let page = 1; page <= 2 && out.length < n; page++) {
    const items = await getJson(`${API}/products?per_page=100&page=${page}&orderby=popularity&${FIELDS}`);
    out.push(...items.map(compact).filter(Boolean));
    if (items.length < 100) break;
  }
  return distinctDesigns(out, n);
}

async function shippingNote() {
  try {
    const html = await (await fetch("https://miztore.com/", { headers: { "User-Agent": "miztore-automation" } })).text();
    const i = html.indexOf("ارسال رایگان");
    if (i < 0) return null;
    const m = html.slice(i, i + 300).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").match(/ارسال رایگان[^.،<]{0,60}?تومان/);
    return m ? m[0].trim() : null;
  } catch {
    return null;
  }
}

async function customDesign() {
  const p = await getJson(`${API}/products/${CUSTOM_DESIGN_ID}`);
  if (!p || !p.is_in_stock) return null;
  const r = p.prices?.price_range;
  const cuts = (p.attributes || []).find((a) => /برش/.test(a.name))?.terms?.map((t) => t.name) || [];
  return {
    priceText: r ? `از ${money(r.min_amount)} تومان` : null,
    cuts,
    link: (src) => `https://miztore.com/?p=${CUSTOM_DESIGN_ID}&utm_source=${src}`,
  };
}

module.exports = { COLLECTIONS, bestsellers, newest, collection, pool, shippingNote, customDesign, faDigits };

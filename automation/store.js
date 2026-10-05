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
  "cat-lovers": "گربه‌دوستان",
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
  let min = Number(range?.min_amount || p.prices?.price || 0);
  let max = Number(range?.max_amount || p.prices?.price || 0);
  // قیمتِ سطحِ محصولِ متغیر گاهی کهنه می‌مونه (قبلِ تخفیف)؛ اگه تخفیف داره قیمتِ تخفیفی ملاکه
  const salePrice = p.on_sale ? Number(p.prices?.sale_price || 0) : 0;
  if (salePrice && salePrice < min) {
    min = salePrice;
    if (!range) max = salePrice;
  }
  const colors = (p.attributes || []).find((a) => a.taxonomy === "pa_color")?.terms?.length || 0;
  const img = p.images?.[0];
  if (!img) return null;
  return {
    id: p.id,
    name: p.name.replace(/\s+/g, " ").trim(),
    shortName: p.name
      .replace(/^(تیشرت|هودی|پلیور(\s+دورس)?|کراپ\s*تاپ|نیم\s*تنه|توت\s*بگ(\s*پارچه\s*ای)?|قاب\s*موبایل|کلاه(\s*نقاب\s*دار|\s*باکت)?)\s+/, "")
      .replace(/\s+/g, " ")
      .replace(/\s+([،,])/g, "$1")
      .trim(),
    kind,
    kindLabel: kind || (/^توت\s*بگ/.test(p.name) ? "توت‌بگ" : null), // فقط برایِ برچسبِ کارت؛ kind دست‌نخورده می‌مونه
    onSale: !!p.on_sale,
    regularPrice: Number(p.prices?.regular_price || 0),
    salePrice,
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
async function collection(slug, n = 4, { mix = false } = {}) {
  const items = await list(`category=${slug}&orderby=popularity&order=desc`, 12);
  return mix ? mixOfKinds(items, n) : distinctDesigns(items, n);
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

// ---------------------------------------------------------------------------
// جزئیاتِ کاملِ یک محصول برایِ پستِ «معرفیِ محصول»: رنگ‌ها، سایزها، مدل‌هایِ دوخت،
// عکس‌هایِ گالری، و جنس/کیفیت — همه از خودِ صفحه‌یِ محصول. توضیحاتِ سایت بخش‌هایِ
// «دربارهِ … میزطوری» دارن (یه جمله + چند خطِ کوتاه)؛ فقط همون خط‌ها استفاده می‌شن.
// ---------------------------------------------------------------------------
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

function descLines(html) {
  return String(html || "")
    .replace(/<\/(p|li|h\d|div)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&zwnj;|&#8204;/g, "‌")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function parseSections(html) {
  const intro = [];
  const sections = [];
  let cur = null;
  for (const l of descLines(html)) {
    const m = l.match(/^درباره‌?ی?\s+(.+?)\s+میزطوری$/);
    if (m) {
      cur = { title: m[1].trim(), lead: null, bullets: [] };
      sections.push(cur);
    } else if (!cur) intro.push(l);
    else if (!cur.lead) cur.lead = l;
    else cur.bullets.push(l);
  }
  return { intro, sections };
}

// جزئیاتِ فنیِ مهمی که فقط تو پاراگرافِ اولِ هودی/پلیور اومده
const INTRO_FACTS = [
  [/دورس\s*۳\s*نخ/, "دورسِ ۳ نخِ ضخیم"],
  [/کش درجه ۱ به پهنای ۵ سانتی/, "کشِ درجه‌یک ۵ سانتی تو مچ و پایینِ لباس"],
  [/پلی‌?\s?اورتان/, "چاپِ دیجیتالِ پلی‌اورتان، ماندگار"],
];

const shortFact = (t) => {
  let x = t.split("؛")[0].trim();
  if (x.length > 30 && x.includes("،")) x = x.split("،")[0].trim();
  // فقط بخشِ اصلیِ جمله (بدونِ «از کارخانه‌هایِ…»، «نسبت به…»)
  if (x.length > 30) x = x.replace(/\s+(از کارخانه|نسبت به|و مطابق).*$/, "").trim();
  return x;
};
const GENERIC = /^پارچه ۱۰۰٪ پنبه$|^چاپ|^شست/;

async function productDetail(id) {
  const p = await getJson(`${API}/products/${id}`);
  const base = compact(p);
  if (!base || !base.kind) return null; // فقط لباس (کلاه/بگ/قاب توضیحاتِ دقیق ندارن)
  const attr = (tax) => (p.attributes || []).find((a) => a.taxonomy === tax);
  const colors = (attr("pa_color")?.terms || []).map((t) => t.name.trim());
  const sizes = (attr("pa_size")?.terms || []).map((t) => t.name.trim()).filter((z) => SIZE_ORDER.includes(z));
  sizes.sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
  const cutAttr = (p.attributes || []).find((a) => !a.taxonomy && /برش|مدل/.test(a.name));
  const cutNames = cutAttr ? cutAttr.terms.map((t) => t.name.trim()) : [];
  const { intro, sections } = parseSections(p.description);
  const introText = intro.join(" ");
  // بخشِ اصلیِ همین نوعِ لباس (تیشرت → کلاسیک، پلیور، هودی، نیم‌تنه)
  const kindKey = { تیشرت: "تیشرت کلاسیک", هودی: "هودی", پلیور: "پلیور", "کراپ تاپ": "نیم‌تنه" }[base.kind] || base.kind;
  const main = sections.find((x) => x.title.startsWith(kindKey)) || sections[0] || null;
  const fabric = [];
  for (const [re, txt] of INTRO_FACTS) if (re.test(introText)) fabric.push(txt);
  for (const b of main ? main.bullets : []) if (fabric.length < 5) fabric.push(shortFact(b));
  // مدل‌هایِ دوخت: هر مدل + خطِ متمایزِ بخشِ خودش
  const cutKey = (c) => (c === "اسلیم" ? "تیشرت کلاسیک" : c);
  const cuts = cutNames.map((c) => {
    const sec = sections.find((x) => x.title.endsWith(cutKey(c)));
    const d = sec ? sec.bullets.find((b) => !GENERIC.test(b)) || sec.lead : null;
    return { name: c, desc: d ? shortFact(d) : null };
  });
  const images = [...new Set((p.images || []).map((i) => i.src))];
  return {
    ...base,
    colorNames: colors,
    sizes,
    cuts: cuts.filter((c) => c.desc),
    fabric: [...new Set(fabric)].filter(Boolean),
    fabricTitle: main ? main.title : base.kind,
    images,
  };
}

// ---------------------------------------------------------------------------
// تخفیفِ واقعی: فقط محصولاتی که ووکامرس خودش «on_sale» حساب می‌کنه (تاریخِ شروع/پایانِ
// تخفیف رو هم خودش رعایت می‌کنه). قیمتِ سطحِ محصولِ متغیر کهنه می‌مونه، پس قیمتِ هر
// تنوع (variation) خونده می‌شه و فقط تنوع‌هایی که الان موجودن و واقعاً تخفیف دارن حساب می‌شن.
// ---------------------------------------------------------------------------
const designKey = (it) => it.shortName.replace(/[\s،,]+/g, " ").trim();

async function saleDetail(it) {
  let vs = [];
  try {
    vs = await getJson(`${API}/products?type=variation&parent=${it.id}&per_page=100&_fields=id,on_sale,prices,is_in_stock`);
  } catch {
    return null;
  }
  let price, regular, partial;
  if (vs.length) {
    const live = vs.filter((v) => v.is_in_stock && v.on_sale && Number(v.prices?.regular_price) > Number(v.prices?.price));
    if (!live.length) return null;
    const cheapest = live.reduce((a, b) => (Number(b.prices.price) < Number(a.prices.price) ? b : a));
    price = Number(cheapest.prices.price);
    regular = Number(cheapest.prices.regular_price);
    partial = new Set(live.map((v) => Number(v.prices.price))).size > 1 || vs.some((v) => v.is_in_stock && !v.on_sale);
  } else {
    // محصولِ ساده (بدونِ تنوع)
    price = it.salePrice;
    regular = it.regularPrice;
    partial = false;
  }
  const pct = regular ? Math.round((1 - price / regular) * 100) : 0;
  if (!price || pct < 5) return null;
  return {
    ...it,
    sale: { price, regular, pct },
    priceText: `${partial ? "از " : ""}${money(price)} تومان`,
    regularText: money(regular),
  };
}

// n محصولِ تخفیف‌دار با طرحِ متفاوت؛ اونایی که تازه استفاده شدن (avoid) آخر صف می‌رن
async function saleItems(n = 4, avoid = []) {
  const all = [];
  for (let page = 1; page <= 8; page++) {
    const items = await getJson(`${API}/products?per_page=100&page=${page}&orderby=popularity&order=desc&${FIELDS},on_sale`);
    all.push(...items.filter((p) => p.on_sale).map(compact).filter(Boolean));
    if (items.length < 100) break;
  }
  const fresh = distinctDesigns(all.filter((it) => !avoid.includes(it.id)), 30);
  const used = distinctDesigns(all.filter((it) => avoid.includes(it.id)), 30);
  const out = [];
  for (const it of [...fresh, ...used]) {
    const d = await saleDetail(it);
    if (d) out.push(d);
    if (out.length >= n) break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// محصولاتِ مناسبتی (دسته‌یِ «occasions»): n کارت، اول از هر طرح یکی، با تنوعِ نوعِ لباس
// (تیشرت/هودی/پلیور/توت‌بگ)؛ اگه طرحِ کم بود، با لباسِ دیگه‌یِ همون طرح‌ها پر می‌شه.
// ---------------------------------------------------------------------------
const KIND_ORDER = ["تیشرت", "هودی", "پلیور", "توت‌بگ"];

function mixOfKinds(items, n) {
  const byDesign = new Map();
  for (const it of items) {
    const k = designKey(it);
    if (!byDesign.has(k)) byDesign.set(k, []);
    byDesign.get(k).push(it);
  }
  const designs = [...byDesign.values()];
  const used = new Set();
  const out = [];
  const take = (list, start) => {
    for (let i = 0; i < KIND_ORDER.length; i++) {
      const kind = KIND_ORDER[(start + i) % KIND_ORDER.length];
      const f = list.find((x) => (x.kindLabel || x.kind) === kind && !used.has(x.id));
      if (f) return f;
    }
    return list.find((x) => !used.has(x.id));
  };
  designs.slice(0, n).forEach((list, i) => {
    const it = take(list, i);
    if (it) {
      used.add(it.id);
      out.push(it);
    }
  });
  for (let r = 0; out.length < n && r < designs.length * KIND_ORDER.length; r++) {
    const it = take(designs[r % designs.length], r + out.length);
    if (it) {
      used.add(it.id);
      out.push(it);
    }
  }
  return out;
}

async function occasionItems(keywords, n = 4) {
  const items = await getJson(`${API}/products?category=occasions&per_page=100&orderby=popularity&order=desc&${FIELDS}`);
  const mine = items.map(compact).filter(Boolean).filter((it) => keywords.some((k) => it.name.includes(k)));
  return mixOfKinds(mine, n);
}

module.exports = { COLLECTIONS, productDetail, bestsellers, newest, collection, pool, saleItems, occasionItems, shippingNote, customDesign, faDigits, money };

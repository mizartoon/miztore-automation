/**
 * product-facts.js — اطلاعاتِ واقعی از خودِ فروشگاه (Store APIِ عمومیِ ووکامرس)
 * برای کارتِ رویِ عکس و اسلایدِ اطلاعات: قیمت، رنگ‌ها، سایزها، مدل‌ها.
 *
 * اگه عکس به یه محصولِ مشخص وصل باشه (data/product-links.json)، اطلاعاتِ
 * «همون محصول» میاد (scope: product). وگرنه اطلاعاتِ کلیِ همون دسته (scope:
 * category) — که فقط به‌صورتِ کلی گفته می‌شه، نه به اسمِ همین طرح.
 * هر خطایی → null (پست بدونِ این اطلاعات ساخته می‌شه، کرش نمی‌کنه).
 */

const STORE = "https://miztore.com/wp-json/wc/store/v1";
const CATEGORY_SLUG = { tshirt: "t-shirt", hoodie: "hoodie", pullover: "sweatshirt", croptop: "crop-top", longsleeve: "t-shirt" };
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const FIELDS = "_fields=id,name,permalink,prices,attributes,is_in_stock";

const faDigits = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const money = (n) => faDigits(Number(n).toLocaleString("en-US"));

async function getJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": "miztore-automation" }, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function summarize(p, scope) {
  const attr = (tax) => (p.attributes || []).find((a) => a.taxonomy === tax);
  const colors = (attr("pa_color")?.terms || []).map((t) => t.name);
  const sizes = (attr("pa_size")?.terms || []).map((t) => t.name).filter((s) => SIZE_ORDER.includes(s));
  sizes.sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b));
  const cutAttr = (p.attributes || []).find((a) => !a.taxonomy || /برش|مدل/.test(a.name));
  const cuts = cutAttr ? cutAttr.terms.map((t) => t.name).filter((c) => c.length < 20) : [];
  const range = p.prices?.price_range;
  const min = Number(range?.min_amount || p.prices?.price || 0);
  const max = Number(range?.max_amount || p.prices?.price || 0);
  return {
    scope,
    id: scope === "product" ? p.id : null,
    name: scope === "product" ? p.name.trim() : null,
    url: scope === "product" ? decodeURI(p.permalink) : null,
    inStock: !!p.is_in_stock,
    priceMin: min || null,
    priceText: min ? (max > min ? `از ${money(min)} تومان` : `${money(min)} تومان`) : null,
    colors,
    sizes,
    sizesText: sizes.length > 2 ? `${sizes[0]} تا ${sizes[sizes.length - 1]}` : sizes.join(" و ") || null,
    cuts,
  };
}

async function getProductFacts({ productUrl, category }) {
  try {
    if (productUrl) {
      const m = new URL(productUrl).pathname.match(/\/product\/([^/]+)/);
      if (m) {
        const slug = encodeURIComponent(decodeURIComponent(m[1]));
        const list = await getJson(`${STORE}/products?slug=${slug}&${FIELDS}`);
        if (list && list[0]) return summarize(list[0], "product");
      }
    }
    const catSlug = CATEGORY_SLUG[category];
    if (!catSlug) return null;
    const list = await getJson(`${STORE}/products?category=${catSlug}&per_page=1&orderby=popularity&${FIELDS}`);
    return list && list[0] ? summarize(list[0], "category") : null;
  } catch (err) {
    console.error("[facts] اطلاعاتِ فروشگاه خونده نشد:", err.message);
    return null;
  }
}

module.exports = { getProductFacts, faDigits, money };

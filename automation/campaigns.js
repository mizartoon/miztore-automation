/**
 * campaigns.js — پست‌هایِ «تشویق به خرید» که از چند محصولِ واقعی ساخته می‌شن:
 *   bestsellers : ۴ پرفروشِ واقعیِ سایت (ترتیبِ فروشِ ووکامرس)
 *   collection  : ۴ طرح از یه کالکشن (ترانه، نوستالژی، نوشتار…)
 *   gift        : راهنمایِ هدیه — Gemini از بینِ محصولاتِ واقعی برایِ یه موضوع انتخاب می‌کنه
 *   versus      : «این یا اون؟» — دو طرح کنارِ هم برایِ نظرسنجیِ استوری/کامنت
 * خروجی دقیقاً هم‌شکلِ پستِ محصوله (outputs + کپشن‌ها + لینک‌ها) تا publish.js فرقی نذاره.
 */

const fs = require("fs");
const path = require("path");
const store = require("./store.js");
const { renderGrid, renderVersus, renderPost, fetchBytes } = require("./render.js");
const { writeCampaign } = require("./copywriter.js");
const { loadState, saveState } = require("./state.js");

const GIFT_THEMES = [
  "برایِ کسی که شعرِ فارسی حفظه",
  "برایِ رفیقِ خوره‌یِ فیلم و سریال",
  "برایِ کسی که دلش برایِ دهه‌یِ شصت تنگه",
  "برایِ برنامه‌نویس‌ها و آدمایِ پشتِ میز",
  "برایِ عاشقِ موسیقیِ ایرانی",
  "برایِ کسی که شوخ‌طبعه و جدی نمی‌گیره",
  "برایِ عاشقِ خوشنویسی و خطِ فارسی",
  "برایِ کسی که هنر و نقاشی دوست داره",
];

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const escHtml = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// کمتر-استفاده‌شده: از state.json، تا یه کالکشن/موضوع پشتِ‌سرِهم تکرار نشه
function pickFresh(kind, options) {
  const st = loadState();
  st.campaigns = st.campaigns || {};
  const recent = st.campaigns[kind] || [];
  const fresh = options.filter((o) => !recent.includes(o));
  const choice = pick(fresh.length ? fresh : options);
  st.campaigns[kind] = [choice, ...recent.filter((r) => r !== choice)].slice(0, Math.max(1, Math.floor(options.length / 2)));
  saveState(st);
  return choice;
}

const FALLBACK = {
  bestsellers: () => ({ headline: "این روزها همه اینا رو برمی‌دارن", caption: "پرفروش‌ترین طرح‌هایِ این روزهایِ میزطوری.\nکدومش به تو میاد؟\nلینکِ همه‌شون تو سایته." }),
  collection: (name) => ({ headline: `یه سر به کالکشنِ ${name} بزن`, caption: `چند تا از طرح‌هایِ کالکشنِ ${name}.\nبقیه‌ش هم تو سایته، با کلی رنگ و سایز.` }),
  gift: (theme) => ({ headline: `هدیه ${theme}`, caption: `چند تا ایده‌یِ هدیه ${theme}.\nقسطی هم می‌شه برداشت؛ لینکش تو سایته.` }),
  versus: () => ({ headline: "کدوم رو می‌پوشی؟", caption: "الف یا ب؟ جوابتو کامنت کن.\nلینکِ هر دو تو سایته." }),
};

async function buildCampaign(env, type) {
  let items, copy, eyebrow, label, keySuffix, listLink;
  if (type === "bestsellers") {
    items = await store.bestsellers(4);
    copy = await writeCampaign(env, { type, items });
    eyebrow = "پرفروش‌هایِ میزطوری";
    label = "پرفروش‌ها";
    keySuffix = "top";
    listLink = (src) => `https://miztore.com/shop/?orderby=popularity&utm_source=${src}`;
  } else if (type === "collection") {
    const slug = pickFresh("collection", Object.keys(store.COLLECTIONS));
    const name = store.COLLECTIONS[slug];
    items = await store.collection(slug, 4);
    copy = await writeCampaign(env, { type, items, collectionName: name });
    copy = copy || FALLBACK.collection(name);
    eyebrow = `کالکشنِ ${name}`;
    label = `کالکشنِ ${name}`;
    keySuffix = slug;
    listLink = (src) => `https://miztore.com/?product_cat=${slug}&utm_source=${src}`;
  } else if (type === "gift") {
    const theme = pickFresh("gift", GIFT_THEMES);
    const pool = await store.pool(60);
    copy = await writeCampaign(env, { type, theme, pool });
    const byId = new Map(pool.map((p) => [p.id, p]));
    items = (copy?.ids || []).map((id) => byId.get(id)).filter(Boolean).slice(0, 4);
    if (items.length < 4) {
      items = pool.slice(0, 4); // مدل جواب نداد → پرفروش‌ها، با تیترِ پشتیبان
      copy = FALLBACK.gift(theme);
    }
    eyebrow = "راهنمایِ هدیه";
    label = "راهنمایِ هدیه";
    keySuffix = GIFT_THEMES.indexOf(theme);
    listLink = (src) => `https://miztore.com/shop/?utm_source=${src}`;
  } else if (type === "versus") {
    const pool = await store.pool(24);
    const kind = pick(["تیشرت", "هودی", "پلیور"]);
    const same = pool.filter((p) => p.kind === kind);
    const src = same.length >= 2 ? same : pool;
    const a = pick(src.slice(0, 12));
    const b = pick(src.filter((p) => p.id !== a.id).slice(0, 12));
    items = [a, b];
    copy = await writeCampaign(env, { type, items });
    label = "این یا اون؟";
    keySuffix = `${a.id}-${b.id}`;
    listLink = (src2) => `https://miztore.com/shop/?utm_source=${src2}`;
  }
  if (!items || items.length < (type === "versus" ? 2 : 3)) throw new Error(`محصولِ کافی برایِ ${type} پیدا نشد`);
  copy = copy || FALLBACK[type]();
  return { items, copy, eyebrow, label, keySuffix, listLink };
}

async function runCampaign(env, { type, dryRun, write }) {
  const c = await buildCampaign(env, type);
  const outputs = {};
  for (const format of ["telegram", "post", "story", "twitter"]) {
    const buf =
      type === "versus"
        ? await renderVersus({ format, question: c.copy.headline, a: c.items[0], b: c.items[1] })
        : await renderGrid({ format, eyebrow: c.eyebrow, title: c.copy.headline, items: c.items, badges: type === "bestsellers" ? ["۱", "۲", "۳", "۴"] : null });
    outputs[format] = write(format, buf);
  }
  // کاروسلِ اینستاگرام: جلد + یک اسلاید برایِ هر محصول (عکسِ محصول در قابِ نازک + اسم + قیمت)
  const carousel = [outputs.post];
  for (const [i, it] of c.items.entries()) {
    try {
      const photoBytes = await fetchBytes(it.image);
      const facts = { scope: "product", priceText: it.priceText, colors: new Array(it.colors || 0).fill(0) };
      carousel.push(write(`slide${i + 1}`, await renderPost({ photoBytes, headline: it.shortName, categoryLabel: it.kind || "میزطوری", facts, designBox: null, format: "post", studio: true })));
    } catch (e) {
      console.error("slide:", e.message);
    }
  }
  outputs.carousel = carousel;

  const lines = c.items.map((it, i) => `${type === "versus" ? ["الف", "ب"][i] : "•"} ${it.kind ? it.kind + " " : ""}«${it.shortName}» — ${it.link("tg")}`);
  const caption = `${c.copy.caption}\n\n${lines.map(escHtml).join("\n")}`;
  return {
    key: `campaign/${type}/${c.keySuffix}`,
    category: c.label,
    outputs,
    headline: c.copy.headline,
    caption,
    instagramCaption: `${c.copy.caption}\n\n${c.items.map((it, i) => `${type === "versus" ? ["الف", "ب"][i] : "•"} ${it.kind ? it.kind + " " : ""}«${it.shortName}»`).join("\n")}\n\nلینکِ همه تو بیو 👆\n\n#میزطوری #Miztore #پوشاک_ایرانی #استریت_ویر`,
    twitterCaption: `${c.copy.caption.split("\n")[0]}\n\n#میزطوری\n${c.listLink("x")}`,
    buyUrlTelegram: c.listLink("tg"),
    buyUrlInstagram: c.listLink("ig"),
    buyUrlTwitter: c.listLink("x"),
    copySource: c.copy.source || "fallback",
    dryRun,
  };
}

module.exports = { runCampaign, GIFT_THEMES };

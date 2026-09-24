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
const sharp = require("sharp");
const { renderGrid, renderVersus, renderPost, renderSpotlight, renderChart, fetchBytes } = require("./render.js");
const { studioDesignBox } = require("./design-box.js");
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
  "برایِ تولدِ رفیقی که همه چی داره",
  "برایِ بابا و مامانی که هنوز جوونن",
  "برایِ زوج‌هایی که دوست دارن ست بپوشن",
  "برایِ یه همکار که می‌خوای غافلگیرش کنی",
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
  gift: (theme) => ({
    headline: `هدیه ${theme}`,
    caption: `چند تا ایده‌یِ هدیه ${theme}.\nاین طرح‌ها فقط تو میزطوری پیدا می‌شن، پس هدیه‌ت تکراری درنمیاد.\nرنگ و سایزشو خودت انتخاب کن؛ جور نشد، ۷ روز ضمانتِ بازگشت داره.\nلینکش تو سایته.`,
  }),
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

// ---------------------------------------------------------------------------
// «معرفیِ محصول»: یه محصول + یه جنبه‌یِ تصادفی (رنگ‌ها، سایزها، جنس و کیفیت، مدل‌هایِ
// دوخت) رویِ جلد؛ بقیه‌یِ جنبه‌ها + «طرح از نزدیک» + عکس‌هایِ گالری تو کاروسل.
// همه‌یِ اطلاعات از صفحه‌یِ خودِ محصول (store.productDetail)، نه ساختگی.
// ---------------------------------------------------------------------------
const fa = store.faDigits;
const FOCI = {
  colors: {
    ok: (d) => d.colorNames.length >= 3,
    eyebrow: (d) => `${fa(d.colorNames.length)} رنگ برایِ همین طرح`,
    slide: (d) => `${fa(d.colorNames.length)} رنگ، یه طرح`,
    panel: (d) => ({ type: "swatches", colors: d.colorNames }),
    facts: (d) => `رنگ‌ها (${fa(d.colorNames.length)} تا): ${d.colorNames.join("، ")}`,
    fallback: (d) => `${fa(d.colorNames.length)} رنگ، یه ${d.kind}`,
    short: (d) => `${fa(d.colorNames.length)} رنگ داره، از ${d.colorNames.slice(0, 3).join(" و ")} تا کلی رنگِ دیگه؛ با هر چی بپوشی ست می‌شه.`,
  },
  sizes: {
    ok: (d) => d.sizes.length >= 3,
    eyebrow: (d) => `سایزها از ${d.sizes[0]} تا ${d.sizes[d.sizes.length - 1]}`,
    slide: () => "سایزتو پیدا کن",
    panel: (d) => ({ type: "chips", items: d.sizes, foot: "جدولِ سایزِ دقیق تو صفحه‌یِ محصوله" }),
    facts: (d) => `سایزها: ${d.sizes.join("، ")}`,
    fallback: () => "سایزت حتماً هست",
    short: (d) => `سایزش از ${d.sizes[0]} تا ${d.sizes[d.sizes.length - 1]} هست؛ از هیکلِ لاغر تا سایزهای بزرگ.`,
  },
  fabric: {
    ok: (d) => d.fabric.length >= 2,
    eyebrow: () => "جنس و کیفیت",
    slide: () => "جنس و دوختش",
    panel: (d) => ({ type: "list", items: d.fabric.slice(0, 4) }),
    facts: (d) => `${d.fabricTitle}: ${d.fabric.join("؛ ")}`,
    fallback: (d) => `${d.kind}ی که ارزشِ طرحشو داره`,
    short: (d) => `${d.fabric.slice(0, 2).join("، ")}.`,
  },
  cuts: {
    ok: (d) => d.cuts.length >= 2,
    eyebrow: (d) => `${fa(d.cuts.length)} مدلِ دوخت`,
    slide: () => "مدلتو انتخاب کن",
    panel: (d) => ({ type: "cuts", rows: d.cuts }),
    facts: (d) => d.cuts.map((c) => `${c.name}: ${c.desc}`).join("؛ "),
    fallback: (d) => `یه طرح، ${fa(d.cuts.length)} مدلِ دوخت`,
    short: (d) => `مدل‌ها: ${d.cuts.map((c) => c.name).join("، ")}.`,
  },
};
const FOCUS_TEXT = { colors: "تنوعِ رنگ (یعنی با همه چیز ست می‌شه)", sizes: "سایزبندی (برای هر هیکلی، از لاغر تا سایزهای بزرگ)", fabric: "جنس و کیفیتِ پارچه و چاپ", cuts: "مدل‌هایِ دوخت (برش)" };

async function pickSpotlight(dryRun) {
  const st = loadState();
  const rec = st.spotlight || { recent: [], lastFocus: null };
  const pool = (await store.pool(60)).filter((p) => p.kind && !rec.recent.includes(p.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (const p of pool.slice(0, 8)) {
    const d = await store.productDetail(p.id).catch(() => null);
    if (!d) continue;
    const foci = Object.keys(FOCI).filter((k) => FOCI[k].ok(d));
    if (foci.length < 2) continue;
    const fresh = foci.filter((k) => k !== rec.lastFocus);
    // رنگ و سایز بیشتر (کاربر، ۲۰۲۶-۰۹-۲۵)
    const W = { colors: 3, sizes: 3, fabric: 1, cuts: 1 };
    const cand = fresh.length ? fresh : foci;
    let r = Math.random() * cand.reduce((a, k) => a + (W[k] || 1), 0);
    const focus = cand.find((k) => (r -= W[k] || 1) < 0) || cand[0];
    if (!dryRun) {
      st.spotlight = { recent: [d.id, ...rec.recent].slice(0, 30), lastFocus: focus };
      saveState(st);
    }
    return { d, focus, foci };
  }
  return null;
}

async function runSpotlight(env, { dryRun, write }) {
  const sp = await pickSpotlight(dryRun);
  if (!sp) throw new Error("محصولی برایِ معرفی پیدا نشد");
  const { d, focus, foci } = sp;
  const F = FOCI[focus];
  let copy = await writeCampaign(env, { type: "spotlight", spot: { item: d, focusText: FOCUS_TEXT[focus], facts: F.facts(d) } });
  copy = copy || { headline: F.fallback(d), caption: `${d.kind} «${d.shortName}»\n${F.short(d)}\nلینکش تو سایته.`, source: "fallback" };

  const photoBytes = await fetchBytes(d.images[0]);
  const base = { photoBytes, kind: d.kind, name: d.shortName, priceText: d.priceText };
  const outputs = {};
  for (const format of ["telegram", "post", "story", "twitter"])
    outputs[format] = write(format, await renderSpotlight({ ...base, format, eyebrow: F.eyebrow(d), title: copy.headline, panel: F.panel(d) }));

  // کاروسل: جلد → بقیه‌یِ جنبه‌ها → عکس‌هایِ دیگه‌یِ گالری → رنگ و سایز
  // («طرح از نزدیک» حذف شد: بزرگ‌نمایی بود و کیفیت نداشت — کاربر، ۲۰۲۶-۰۹-۲۵)
  const carousel = [outputs.post];
  for (const k of foci.filter((x) => x !== focus)) {
    const G = FOCI[k];
    carousel.push(write(`slide-${k}`, await renderSpotlight({ ...base, format: "post", eyebrow: G.eyebrow(d), title: G.slide(d), panel: G.panel(d) })));
  }
  for (const [i, src] of d.images.slice(1, 3).entries()) {
    if (carousel.length >= 6) break;
    try {
      const b = await fetchBytes(src);
      const facts = { scope: "product", priceText: d.priceText, colors: d.colorNames };
      carousel.push(write(`gallery${i + 1}`, await renderPost({ photoBytes: b, headline: d.shortName, categoryLabel: d.kind, facts, designBox: null, format: "post", studio: true })));
    } catch (e) {
      console.error("gallery:", e.message);
    }
  }
  const catOf = { تیشرت: "tshirt", هودی: "hoodie", پلیور: "pullover" }[d.kind];
  const chart = await renderChart({ facts: { colors: d.colorNames, sizesText: d.sizes.length ? `${d.sizes[0]} تا ${d.sizes[d.sizes.length - 1]}` : null, priceText: d.priceText }, category: catOf, title: null }).catch((e) => (console.error("chart:", e.message), null));
  if (chart) carousel.push(write("chart", chart));
  outputs.carousel = carousel;

  const line = `${d.kind} «${d.shortName}»`;
  return {
    key: `campaign/spotlight/${d.id}-${focus}`,
    category: "معرفیِ محصول",
    outputs,
    headline: copy.headline,
    caption: `${copy.caption}\n\n${escHtml(line)} — ${d.link("tg")}`,
    instagramCaption: `${copy.caption}\n\n${line}\nلینکش تو بیو 👆\n\n#میزطوری #Miztore #پوشاک_ایرانی #استریت_ویر`,
    twitterCaption: `${copy.caption.split("\n")[0]}\n\n#میزطوری\n${d.link("x")}`,
    buyUrlTelegram: d.link("tg"),
    buyUrlInstagram: d.link("ig"),
    buyUrlTwitter: d.link("x"),
    copySource: copy.source || "fallback",
    dryRun,
  };
}

async function runCampaign(env, { type, dryRun, write }) {
  if (type === "spotlight") return runSpotlight(env, { dryRun, write });
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

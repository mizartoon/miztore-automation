/**
 * render.js — قالب‌های پست، نسخه‌ی ۳ («قابِ نازک»، هم‌زبان با طراحیِ سایت).
 *
 * خواسته‌ی کاربر: «طراحی‌ها بسیار حرفه‌ای به سبکِ طراحیِ سایت؛ قاب نازک باشه
 * و تمرکز روی طرحِ لباس و عکس.»
 *
 * زبانِ طراحی (همون توکن‌های سایتِ v2):
 *   بومِ استخوانی #F4F1EA، عکس داخلِ یک قابِ گِرد با خطِ مشکیِ نازک (حاشیه
 *   فقط ~۲.۵٪)، پیل‌های گِرد (مثلِ هدرِ سایت)، کارتِ متن با سایه‌ی سختِ مشکی
 *   (-x +y) مثلِ کارت‌های محصولِ سایت، قرمزِ #C90000 فقط برای یک تأکید.
 *
 * طرحِ لباس هیچ‌وقت بریده نمی‌شه: copywriter.js جایِ طرح (designBox) رو از رویِ
 * عکس پیدا می‌کنه؛ برش دورِ همون انجام می‌شه و کارتِ متن هم جایی می‌شینه که
 * رویِ طرح نیفته. اگه جایِ طرح معلوم نبود، همون منطقِ امنِ قبلی (سقفِ برش).
 *
 * خروجی‌ها:
 *   renderPost        — پستِ اصلی (post 4:5، telegram 1:1، story 9:16، twitter 16:9)
 *   renderDetail      — اسلایدِ «طرح از نزدیک» (کاروسلِ اینستاگرام)
 *   renderInfo        — اسلایدِ اطلاعات (رنگ/سایز/مدل/قیمت/قسطی/ضمانت)
 *   renderServicePost — پستِ خدمات (بدونِ عکسِ محصول)
 */

const sharp = require("sharp");
const { Resvg } = require("@resvg/resvg-js");
const path = require("path");

const C = {
  ink: "#0B0B0B",
  bone: "#F4F1EA",
  b50: "#FBFAF6",
  b200: "#E8E4D9",
  b400: "#C2BDAF",
  red: "#C90000",
  g20: "#3C3C3C",
  g40: "#6D6D6D",
};

const FONT_DIR = path.join(__dirname, "..", "fonts");
const FONT_FILES = ["Tabliq-Bold.ttf", "Tlesk-Regular.ttf", "Tlesk-Medium.ttf", "Tlesk-Bold.ttf"].map((f) => path.join(FONT_DIR, f));
const FA = "Tabliq Bold";
const LATIN = "Tlesk";
const ASSET_DIR = path.join(__dirname, "..", "assets");

const FORMATS = {
  post: { W: 1080, H: 1350 },
  telegram: { W: 1080, H: 1080 },
  story: { W: 1080, H: 1920 },
  twitter: { W: 1200, H: 675 },
};

// ---------------------------------------------------------------------------
// ابزارها
// ---------------------------------------------------------------------------
async function fetchBytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`دانلود ${url} شکست خورد: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

const esc = (s) =>
  String(s)
    .replace(/[—–]/g, "،")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const faDigits = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

// resvg جهتِ پاراگراف رو از اولین حرفِ قوی می‌گیره، نه از direction="rtl"؛ پس
// «S تا XXXL» یا «۷ روز …» برعکس چیده می‌شد. هر متنِ فارسی داخلِ RLE…PDF
// (U+202B…U+202C) پیچیده می‌شه تا پایه‌ی پاراگراف همیشه راست‌به‌چپ باشه.
const fixBidi = (svg) =>
  svg.replace(/(<text[^>]*direction="rtl"[^>]*>)([^<]*)(<\/text>)/g, (m, a, t, b) => a + "‫" + t + "‬" + b);

function svgToPng(svg, width) {
  svg = fixBidi(svg);
  return new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: FA },
  })
    .render()
    .asPng();
}

// اندازه‌گیریِ واقعیِ عرضِ متن با خودِ resvg (نه تخمینِ «تعدادِ حرف × ضریب») —
// فارسی با اتصال‌ها و کشیده‌ها عرضِ خیلی متغیری داره.
const measureCache = new Map();
function textWidth(text, size, family = FA) {
  const key = `${family}|${size}|${text}`;
  if (measureCache.has(key)) return measureCache.get(key);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="${size * 2}"><text x="3990" y="${size * 1.4}" text-anchor="end" direction="rtl" font-family="${family}" font-size="${size}" fill="#000">${esc(text)}</text></svg>`;
  let w;
  try {
    const r = new Resvg(fixBidi(svg), { font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: FA } });
    const bb = r.getBBox();
    w = bb ? bb.width : text.length * size * 0.55;
  } catch {
    w = text.length * size * 0.55;
  }
  measureCache.set(key, w);
  return w;
}

function wrap(text, size, maxW, family = FA) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const cand = cur ? `${cur} ${w}` : w;
    if (cur && textWidth(cand, size, family) > maxW) {
      lines.push(cur);
      cur = w;
    } else cur = cand;
  }
  if (cur) lines.push(cur);
  return lines;
}

// بزرگ‌ترین سایزی که متن توش در حداکثر maxLines خط جا بشه
function fit(text, { maxW, maxLines, sizes, family = FA }) {
  for (const size of sizes) {
    const lines = wrap(text, size, maxW, family);
    if (lines.length <= maxLines && lines.every((l) => textWidth(l, size, family) <= maxW)) return { lines, size };
  }
  const size = sizes[sizes.length - 1];
  const lines = wrap(text, size, maxW, family).slice(0, maxLines);
  return { lines, size };
}

function textLines({ lines, size, x, y, color = C.ink, anchor = "end", lh = 1.32, family = FA }) {
  return lines
    .map(
      (l, i) =>
        `<text x="${x}" y="${Math.round(y + i * size * lh)}" text-anchor="${anchor}" direction="rtl" font-family="${family}" font-size="${size}" fill="${color}">${esc(l)}</text>`
    )
    .join("");
}

async function asset(file, { height, width }) {
  const buf = await sharp(path.join(ASSET_DIR, file)).resize({ height, width }).png().toBuffer();
  const m = await sharp(buf).metadata();
  return { buffer: buf, w: m.width, h: m.height };
}

async function roundedPhoto(buffer, w, h, r) {
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`);
  return sharp(buffer).resize(w, h).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
}

// ---------------------------------------------------------------------------
// قاب‌بندیِ عکس — برش حولِ طرح (اگه جاش معلومه) تا هیچ‌وقت بریده نشه
// ---------------------------------------------------------------------------
const MAX_BLIND_CROP = 0.14;

async function framePhoto(photoBytes, w, h, box) {
  const meta = await sharp(photoBytes).metadata();
  const sw = meta.width;
  const sh = meta.height;
  const a = w / h;
  let winW, winH;
  if (sw / sh > a) {
    winH = sh;
    winW = Math.round(sh * a);
  } else {
    winW = sw;
    winH = Math.round(sw / a);
  }

  if (box) {
    const bl = box.left * sw,
      br = box.right * sw,
      bt = box.top * sh,
      bb = box.bottom * sh;
    const margin = 0.04;
    if (br - bl <= winW * (1 - margin * 2) && bb - bt <= winH * (1 - margin * 2)) {
      const cx = (bl + br) / 2;
      const cy = (bt + bb) / 2;
      // طرح کمی بالاتر از وسطِ قاب بشینه (کارتِ متن معمولاً پایینه)
      const left = Math.round(Math.min(Math.max(cx - winW / 2, 0), sw - winW));
      const top = Math.round(Math.min(Math.max(cy - winH * 0.46, 0), sh - winH));
      const buffer = await sharp(photoBytes).extract({ left, top, width: winW, height: winH }).resize(w, h).toBuffer();
      const k = w / winW;
      return { buffer, design: { x: (bl - left) * k, y: (bt - top) * k, w: (br - bl) * k, h: (bb - bt) * k } };
    }
  }

  const cropRatio = sw / sh > a ? 1 - a / (sw / sh) : 1 - sw / sh / a;
  if (!box && cropRatio <= MAX_BLIND_CROP) {
    const buffer = await sharp(photoBytes).resize({ width: w, height: h, fit: "cover", position: "attention" }).toBuffer();
    return { buffer, design: null };
  }
  // برشِ لازم زیادیه یا طرح تو قاب جا نمی‌شه: عکسِ کامل رویِ نسخه‌ی تارِ خودش
  const [bg, fg] = await Promise.all([
    sharp(photoBytes).resize({ width: w, height: h, fit: "cover" }).blur(40).modulate({ brightness: 0.8 }).toBuffer(),
    sharp(photoBytes).resize({ width: w, height: h, fit: "inside" }).toBuffer({ resolveWithObject: true }),
  ]);
  const x = Math.round((w - fg.info.width) / 2);
  const y = Math.round((h - fg.info.height) / 2);
  const buffer = await sharp(bg).composite([{ input: fg.data, left: x, top: y }]).toBuffer();
  const k = fg.info.width / sw;
  const design = box
    ? { x: x + box.left * sw * k, y: y + box.top * sh * k, w: (box.right - box.left) * sw * k, h: (box.bottom - box.top) * sh * k }
    : null;
  return { buffer, design };
}

function overlap(a, b) {
  if (!a || !b) return 0;
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return (x * y) / (b.w * b.h);
}

// ---------------------------------------------------------------------------
// اجزای مشترک
// ---------------------------------------------------------------------------
// پیلِ برند (مثلِ هدرِ سایت): سرِ پالاس + «میزطوری»
function brandPill({ right, top, h, icon }) {
  const fs = Math.round(h * 0.46);
  const tw = textWidth("میزطوری", fs);
  const padX = Math.round(h * 0.34);
  const iconW = icon ? icon.w : 0;
  const gap = icon ? Math.round(h * 0.16) : 0;
  const w = Math.round(padX * 2 + tw + iconW + gap);
  const x = right - w;
  const svg =
    `<rect x="${x}" y="${top}" width="${w}" height="${h}" rx="${h / 2}" fill="${C.b50}" stroke="${C.ink}" stroke-width="${Math.max(2, h * 0.045)}"/>` +
    `<text x="${right - padX - iconW - gap}" y="${top + h * 0.66}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${fs}" fill="${C.ink}">میزطوری</text>`;
  const layer = icon ? { input: icon.buffer, left: Math.round(right - padX - iconW), top: Math.round(top + (h - icon.h) / 2) } : null;
  return { svg, layer, w };
}

function pill({ x, y, h, text, fill, color, stroke, family = FA, anchor = "right" }) {
  const fs = Math.round(h * (family === FA ? 0.44 : 0.4));
  const tw = textWidth(text, fs, family);
  const w = Math.round(tw + h * 0.9);
  const left = anchor === "right" ? x - w : x;
  const svg =
    `<rect x="${left}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${Math.max(2, h * 0.05)}"` : ""}/>` +
    `<text x="${left + w / 2}" y="${y + h * (family === FA ? 0.66 : 0.64)}" text-anchor="middle" ${family === FA ? 'direction="rtl"' : ""} font-family="${family}" font-size="${fs}" fill="${color}">${esc(text)}</text>`;
  return { svg, w, left };
}

// کارتِ متن: هدلاین + ردیفِ چیپ‌ها، با سایه‌ی سختِ سایت
function textCard({ headline, chips, maxW, s, anchorRight, anchorY, placeTop }) {
  const pad = Math.round(26 * s);
  const { lines, size } = fit(headline, { maxW: maxW - pad * 2, maxLines: 2, sizes: [48, 45, 42, 39, 36, 33].map((v) => Math.round(v * s)) });
  const lineW = Math.max(...lines.map((l) => textWidth(l, size)));
  const chipH = Math.round(44 * s);
  const gapC = Math.round(10 * s);
  const chipObjs = [];
  let chipsW = 0;
  for (const c of chips) {
    const fam = c.family || FA;
    const fs = Math.round(chipH * (fam === LATIN ? 0.4 : 0.44));
    const w = Math.round(textWidth(c.text, fs, fam) + chipH * 0.9);
    chipsW += w + (chipObjs.length ? gapC : 0);
    chipObjs.push({ ...c, w });
  }
  const innerW = Math.max(lineW, chipsW);
  const w = Math.round(Math.min(maxW, innerW + pad * 2));
  const textH = Math.round(lines.length * size * 1.32);
  const h = Math.round(pad * 0.9 + textH + (chipObjs.length ? chipH + pad * 0.55 : 0) + pad * 0.7);
  const x = Math.round(anchorRight - w);
  const y = Math.round(placeTop ? anchorY : anchorY - h);
  const sh = Math.round(9 * s);
  let svg =
    `<rect x="${x - sh}" y="${y + sh}" width="${w}" height="${h}" rx="${22 * s}" fill="${C.ink}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${22 * s}" fill="${C.b50}" stroke="${C.ink}" stroke-width="${3 * s}"/>` +
    textLines({ lines, size, x: x + w - pad, y: y + pad * 0.9 + size * 0.98 });
  let cx = x + w - pad;
  const cy = y + pad * 0.9 + textH + pad * 0.25;
  for (const c of chipObjs) {
    const p = pill({ x: cx, y: cy, h: chipH, text: c.text, fill: c.fill, color: c.color, stroke: c.stroke, family: c.family || FA });
    svg += p.svg;
    cx -= p.w + gapC;
  }
  return { svg, rect: { x: x - sh, y, w: w + sh, h: h + sh }, h };
}

function factChips(facts) {
  const chips = [];
  if (facts && facts.scope === "product") {
    if (facts.priceText) chips.push({ text: facts.priceText, fill: C.red, color: C.b50 });
    if (facts.colors?.length > 1) chips.push({ text: `${faDigits(facts.colors.length)} رنگ`, fill: C.b50, color: C.ink, stroke: C.ink });
  }
  if (!chips.length) chips.push({ text: "miztore.com", fill: C.red, color: C.b50, family: LATIN });
  return chips;
}

// under: زیرِ لایه‌ی SVG (عکس)، over: رویِ اون (آیکونِ پالاس، ماسکوت)
async function compose(W, H, bg, under, svg, over = []) {
  const all = [...under.filter(Boolean)];
  if (svg) all.push({ input: svgToPng(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`, W), left: 0, top: 0 });
  all.push(...over.filter(Boolean));
  return sharp({ create: { width: W, height: H, channels: 4, background: bg } })
    .composite(all)
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4" })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// پستِ اصلی
// ---------------------------------------------------------------------------
async function renderPost({ photoBytes, headline, categoryLabel, facts, designBox, format }) {
  const F = FORMATS[format];
  if (!F) throw new Error(`فرمت ناشناخته: ${format}`);
  if (format === "twitter") return renderTwitter({ photoBytes, headline, categoryLabel, facts, designBox });

  const { W, H } = F;
  const s = W / 1080;
  const m = Math.round(26 * s); // قابِ نازک
  const R = Math.round(30 * s);
  const fw = W - m * 2;
  const fh = H - m * 2;
  const { buffer, design } = await framePhoto(photoBytes, fw, fh, designBox);
  const photo = await roundedPhoto(buffer, fw, fh, R);
  const designAbs = design ? { x: design.x + m, y: design.y + m, w: design.w, h: design.h } : null;

  // ناحیه‌ی امنِ استوری (رابطِ اینستاگرام بالا و پایین رو می‌پوشونه)
  const safeTop = format === "story" ? Math.round(210 * s) : m + Math.round(26 * s);
  const safeBottom = format === "story" ? H - Math.round(300 * s) : H - m - Math.round(28 * s);
  const inset = m + Math.round(26 * s);

  const icon = await asset("palas-mark.png", { height: Math.round(46 * s) });
  const brand = brandPill({ right: W - inset, top: safeTop, h: Math.round(64 * s), icon });
  const cat = pill({ x: inset, y: safeTop + Math.round(6 * s), h: Math.round(52 * s), text: categoryLabel, fill: C.ink, color: C.b50, anchor: "left" });

  const cs = format === "story" ? s * 1.08 : s;
  const cardArgs = { headline, chips: factChips(facts), maxW: Math.round(fw * 0.72), s: cs, anchorRight: W - inset };
  let card = textCard({ ...cardArgs, anchorY: safeBottom, placeTop: false });
  if (designAbs && overlap(card.rect, designAbs) > 0.1) {
    const topCard = textCard({ ...cardArgs, anchorY: safeTop + Math.round(90 * s), placeTop: true });
    if (overlap(topCard.rect, designAbs) < overlap(card.rect, designAbs)) card = topCard;
  }

  const svg =
    `<rect x="${m}" y="${m}" width="${fw}" height="${fh}" rx="${R}" fill="none" stroke="${C.ink}" stroke-width="${3 * s}"/>` +
    brand.svg +
    cat.svg +
    card.svg;
  return compose(W, H, C.bone, [{ input: photo, left: m, top: m }], svg, [brand.layer]);
}

// توییتر (۱۶:۹): عکس در قابِ چپ، ستونِ متن راست
async function renderTwitter({ photoBytes, headline, categoryLabel, facts, designBox }) {
  const W = 1200,
    H = 675,
    m = 24,
    R = 26;
  const pw = 610,
    ph = H - m * 2;
  const { buffer } = await framePhoto(photoBytes, pw, ph, designBox);
  const photo = await roundedPhoto(buffer, pw, ph, R);
  const colRight = W - 44;
  const colLeft = m + pw + 44;
  const colW = colRight - colLeft;
  const icon = await asset("palas-mark.png", { height: 40 });
  const brand = brandPill({ right: colRight, top: 44, h: 56, icon });
  const { lines, size } = fit(headline, { maxW: colW, maxLines: 3, sizes: [58, 54, 50, 46, 42, 38] });
  const hy = 190;
  let svg =
    `<rect x="${m}" y="${m}" width="${pw}" height="${ph}" rx="${R}" fill="none" stroke="${C.ink}" stroke-width="3"/>` +
    brand.svg +
    `<text x="${colRight}" y="160" text-anchor="end" direction="rtl" font-family="${FA}" font-size="24" fill="${C.red}">${esc(categoryLabel)}ِ امروزِ میزطوری</text>` +
    textLines({ lines, size, x: colRight, y: hy + size * 0.9 });
  let cx = colRight;
  const cy = Math.round(hy + lines.length * size * 1.32 + 34);
  for (const c of factChips(facts)) {
    const p = pill({ x: cx, y: cy, h: 50, text: c.text, fill: c.fill, color: c.color, stroke: c.stroke, family: c.family || FA });
    svg += p.svg;
    cx -= p.w + 10;
  }
  svg += `<line x1="${colLeft}" y1="${H - 92}" x2="${colRight}" y2="${H - 92}" stroke="${C.b400}" stroke-width="2"/>`;
  svg += `<text x="${colRight}" y="${H - 50}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="24" fill="${C.g40}">قسطی با دیجی‌پی · ۷ روز ضمانتِ بازگشت</text>`;
  return compose(W, H, C.bone, [{ input: photo, left: m, top: m }], svg, [brand.layer]);
}

// ---------------------------------------------------------------------------
// اسلایدِ «طرح از نزدیک»
// ---------------------------------------------------------------------------
async function renderDetail({ photoBytes, designBox, format = "post" }) {
  if (!designBox) return null;
  const { W, H } = FORMATS[format];
  const s = W / 1080;
  const meta = await sharp(photoBytes).metadata();
  const sw = meta.width,
    sh = meta.height;
  const m = Math.round(26 * s),
    R = Math.round(30 * s);
  const fw = W - m * 2,
    fh = H - m * 2;
  const a = fw / fh;
  // کادرِ طرح + ۱۸٪ حاشیه از هر طرف، بعد به نسبتِ قاب
  let bw = (designBox.right - designBox.left) * sw * 1.36;
  let bh = (designBox.bottom - designBox.top) * sh * 1.36;
  if (bw / bh > a) bh = bw / a;
  else bw = bh * a;
  if (bw > sw) {
    bw = sw;
    bh = bw / a;
  }
  if (bh > sh) {
    bh = sh;
    bw = bh * a;
  }
  if (bw < 260) return null; // خیلی کوچیک → بزرگ‌نمایی تار می‌شه
  const cx = ((designBox.left + designBox.right) / 2) * sw;
  const cy = ((designBox.top + designBox.bottom) / 2) * sh;
  const left = Math.round(Math.min(Math.max(cx - bw / 2, 0), sw - bw));
  const top = Math.round(Math.min(Math.max(cy - bh / 2, 0), sh - bh));
  const crop = await sharp(photoBytes)
    .extract({ left, top, width: Math.min(Math.round(bw), sw - left), height: Math.min(Math.round(bh), sh - top) })
    .resize(fw, fh, { kernel: "lanczos3" })
    .sharpen({ sigma: 0.6 })
    .toBuffer();
  const photo = await roundedPhoto(crop, fw, fh, R);
  const inset = m + Math.round(26 * s);
  const icon = await asset("palas-mark.png", { height: Math.round(46 * s) });
  const brand = brandPill({ right: W - inset, top: inset, h: Math.round(64 * s), icon });
  const tag = pill({ x: W - inset, y: H - inset - Math.round(60 * s), h: Math.round(60 * s), text: "طرح از نزدیک", fill: C.ink, color: C.b50 });
  const svg =
    `<rect x="${m}" y="${m}" width="${fw}" height="${fh}" rx="${R}" fill="none" stroke="${C.ink}" stroke-width="${3 * s}"/>` + brand.svg + tag.svg;
  return compose(W, H, C.bone, [{ input: photo, left: m, top: m }], svg, [brand.layer]);
}

// ---------------------------------------------------------------------------
// اسلایدِ اطلاعات
// ---------------------------------------------------------------------------
const ICONS = {
  palette:
    '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.640 1.640 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
  ruler:
    '<path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/>',
  shirt:
    '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  shield:
    '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
};

const SWATCH = {
  "مشکی": "#111111", "سفید": "#FFFFFF", "قرمز": "#C90000", "آبی": "#2F5FB3", "آبی آسمانی": "#7CC0EA", "آبی روشن": "#9CCBF0",
  "آبی شالی": "#5D7EA6", "بنفش": "#6B3FA0", "خاکستری": "#8A8A8A", "زرد": "#F2C500", "زرد قناری": "#FFE135", "زرشکی": "#7B1E2B",
  "سبز": "#2E8B57", "سبز ارتشی": "#4B5320", "سبز چمنی": "#4CAF50", "سبز خزه‌ای": "#6B7F3A", "سبز سدری": "#7A8F5A",
  "سبز مغز پسته‌ای": "#B5D38A", "سبز یشمی": "#168B73", "سرخابی": "#D6246E", "سرمه‌ای": "#1F2A52", "شتری": "#C19A6B",
  "صورتی تیره": "#C2527A", "فیروزه‌ای": "#30B5B0", "فیلی": "#8E8A82", "قهوه‌ای": "#6B4226", "کالباسی": "#F4A79D", "کرم": "#EFE3C8",
  "کرمی": "#EFE3C8", "گلبهی": "#F7B7A3", "ملانژ": "#BDBDBD", "ملانژ(توسی)": "#9E9E9E", "نارنجی": "#F07C1B", "نارنجی آجری": "#C1502E",
  "نسکافه‌ای": "#A67B5B", "یاسی": "#C8A2C8",
};

async function renderInfo({ facts, categoryLabel, format = "post" }) {
  if (!facts) return null;
  const { W, H } = FORMATS[format];
  const m = 26,
    R = 30;
  const inset = 84;
  const icon = await asset("palas-mark.png", { height: 46 });
  const brand = brandPill({ right: W - inset, top: inset, h: 64, icon });
  const title = facts.scope === "product" && facts.name ? facts.name : `${categoryLabel}‌های میزطوری`;
  const t = fit(title, { maxW: W - inset * 2, maxLines: 2, sizes: [72, 66, 60, 54, 48] });
  let y = 250;
  let svg =
    `<rect x="${m}" y="${m}" width="${W - m * 2}" height="${H - m * 2}" rx="${R}" fill="${C.b50}" stroke="${C.ink}" stroke-width="3"/>` +
    brand.svg +
    `<text x="${W - inset}" y="${y}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="28" fill="${C.red}">هر چی قبلِ خرید باید بدونی</text>`;
  y += 26;
  svg += textLines({ lines: t.lines, size: t.size, x: W - inset, y: y + t.size });
  y += t.lines.length * t.size * 1.32 + 40;

  const rows = [];
  if (facts.colors?.length) rows.push({ icon: "palette", k: "رنگ‌ها", v: `${faDigits(facts.colors.length)} رنگ`, swatches: facts.colors });
  if (facts.sizesText) rows.push({ icon: "ruler", k: "سایز", v: facts.sizesText });
  if (facts.cuts?.length) rows.push({ icon: "shirt", k: "مدل", v: facts.cuts.slice(0, 4).join("، ") });
  if (facts.priceText) rows.push({ icon: "tag", k: "قیمت", v: facts.priceText });
  rows.push({ icon: "card", k: "پرداخت", v: "قسطی با دیجی‌پی" });
  rows.push({ icon: "shield", k: "خیالت راحت", v: "۷ روز ضمانتِ بازگشت" });

  const rowH = 118;
  for (const r of rows.slice(0, 6)) {
    const cx = W - inset - 34;
    const cy = y + 34;
    svg += `<line x1="${inset}" y1="${y - 14}" x2="${W - inset}" y2="${y - 14}" stroke="${C.b200}" stroke-width="2"/>`;
    svg += `<circle cx="${cx}" cy="${cy}" r="34" fill="${C.b200}" stroke="${C.ink}" stroke-width="2.5"/>`;
    svg += `<g transform="translate(${cx - 17} ${cy - 17}) scale(1.42)" fill="none" stroke="${C.ink}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" color="${C.ink}">${ICONS[r.icon]}</g>`;
    svg += `<text x="${cx - 58}" y="${cy - 4}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="26" fill="${C.g40}">${esc(r.k)}</text>`;
    const vfit = fit(r.v, { maxW: W - inset * 2 - 120, maxLines: 1, sizes: [38, 34, 30, 26] });
    const vText = vfit.lines[0] || r.v;
    svg += `<text x="${cx - 58}" y="${cy + 40}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${vfit.size}" fill="${C.ink}">${esc(vText)}</text>`;
    if (r.swatches) {
      const vw = textWidth(vText, vfit.size);
      let sx = cx - 58 - vw - 34;
      for (const name of r.swatches.slice(0, 12)) {
        if (sx < inset + 16) break;
        svg += `<circle cx="${sx}" cy="${cy + 28}" r="13" fill="${SWATCH[name] || C.b400}" stroke="${C.ink}" stroke-opacity="0.45" stroke-width="1.5"/>`;
        sx -= 32;
      }
    }
    y += rowH;
  }

  const mascot = await asset("palas-full.png", { height: 260 });
  const url = pill({ x: W - inset, y: H - inset - 64, h: 64, text: "miztore.com", fill: C.red, color: C.b50, family: LATIN });
  svg += url.svg;
  return compose(W, H, C.bone, [], svg, [brand.layer, { input: mascot.buffer, left: inset - 10, top: H - m - mascot.h - 6 }]);
}

// ---------------------------------------------------------------------------
// پستِ خدمات (بدونِ عکسِ محصول)
// ---------------------------------------------------------------------------
async function renderServicePost({ format, headline, body, cta }) {
  const F = FORMATS[format];
  if (!F) throw new Error(`فرمت ناشناخته: ${format}`);
  const { W, H } = F;
  const horizontal = W > H;
  const s = horizontal ? H / 1080 : W / 1080;
  const m = Math.round(26 * s),
    R = Math.round(30 * s);
  const inset = Math.round(84 * s);
  const icon = await asset("palas-mark.png", { height: Math.round(46 * s) });
  const brand = brandPill({ right: W - inset, top: format === "story" ? Math.round(210 * s) : inset, h: Math.round(64 * s), icon });
  const mascotH = Math.round((horizontal ? 520 : format === "story" ? 760 : 560) * s);
  const mascot = await asset("palas-full.png", { height: mascotH });
  const textMaxW = horizontal ? W - inset * 2 - mascot.w - 40 : W - inset * 2;
  const h = fit(headline, { maxW: textMaxW, maxLines: 3, sizes: [96, 88, 80, 72, 64, 56].map((v) => Math.round(v * s)) });
  const b = fit(body, { maxW: textMaxW, maxLines: 4, sizes: [38, 36, 34, 32, 30].map((v) => Math.round(v * s)) });
  let y = format === "story" ? Math.round(420 * s) : Math.round(horizontal ? 190 * s : 250 * s);
  let svg =
    `<rect x="${m}" y="${m}" width="${W - m * 2}" height="${H - m * 2}" rx="${R}" fill="${C.b50}" stroke="${C.ink}" stroke-width="${3 * s}"/>` +
    brand.svg +
    `<text x="${W - inset}" y="${y}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${Math.round(30 * s)}" fill="${C.red}">خدماتِ میزطوری</text>`;
  y += Math.round(30 * s);
  svg += textLines({ lines: h.lines, size: h.size, x: W - inset, y: y + h.size, lh: 1.25 });
  y += h.lines.length * h.size * 1.25 + Math.round(30 * s);
  svg += textLines({ lines: b.lines, size: b.size, x: W - inset, y: y + b.size, color: C.g20, lh: 1.6 });
  y += b.lines.length * b.size * 1.6 + Math.round(40 * s);
  const c = pill({ x: W - inset, y, h: Math.round(68 * s), text: cta, fill: C.red, color: C.b50 });
  svg += c.svg;
  svg += `<text x="${W - inset - c.w - Math.round(24 * s)}" y="${y + Math.round(44 * s)}" text-anchor="end" font-family="${LATIN}" font-size="${Math.round(26 * s)}" fill="${C.ink}">miztore.com</text>`;
  const mx = inset - Math.round(10 * s);
  const my = H - m - mascot.h - Math.round(6 * s) - (format === "story" ? Math.round(160 * s) : 0);
  return compose(W, H, C.bone, [], svg, [brand.layer, { input: mascot.buffer, left: mx, top: my }]);
}

// سازگاری با کدِ قدیمی
function pickTemplateName() {
  return "frame";
}
const TEMPLATES = { frame: {} };

module.exports = { renderPost, renderDetail, renderInfo, renderServicePost, fetchBytes, FORMATS, pickTemplateName, TEMPLATES };

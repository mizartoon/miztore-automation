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

// فاصله‌ی خط‌ها: تبلیغ نقطه‌ها و دنباله‌هایِ بلند داره؛ کمتر از این، نقطه‌هایِ یه خط
// به حروفِ خطِ بعد می‌خوره (فیدبکِ کاربر). LH برایِ تیترها، LH_BODY برایِ متنِ توضیحی.
const LH = 1.5;
const LH_BODY = 1.75;

function textLines({ lines, size, x, y, color = C.ink, anchor = "end", lh = LH, family = FA }) {
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

async function framePhoto(photoBytes, w, h, box, reserveBottom = 0, studio = false) {
  if (studio) {
    // عکسِ استودیوییِ محصول (پس‌زمینه‌ی ساده): کلِ لباس رویِ رنگِ پس‌زمینه‌ی خودِ عکس،
    // کمی بالاتر از وسط تا کارتِ متنِ پایین روش نیفته — نه پس‌زمینه‌ی تار.
    // عکس‌هایِ سایت پس‌زمینه‌یِ شفاف دارن → اول رویِ bone-200 (رنگِ کارت‌هایِ سایت)
    photoBytes = await sharp(photoBytes).flatten({ background: C.b200 }).jpeg({ quality: 95 }).toBuffer();
    const { data } = await sharp(photoBytes).resize(8, 8, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const bg = { r: data[0], g: data[1], b: data[2] };
    const boxH = Math.round(h * (1 - reserveBottom) * 0.94);
    const fg = await sharp(photoBytes).resize({ width: Math.round(w * 0.92), height: boxH, fit: "inside" }).toBuffer({ resolveWithObject: true });
    const top = Math.round(Math.max(h * 0.05, (h * (1 - reserveBottom) - fg.info.height) / 2));
    const buffer = await sharp({ create: { width: w, height: h, channels: 3, background: bg } })
      .composite([{ input: fg.data, left: Math.round((w - fg.info.width) / 2), top }])
      .jpeg()
      .toBuffer();
    return { buffer, design: null };
  }
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
      // عمودی: تا جایی که طرح کامل تو قاب بمونه، قاب رو بالاتر نگه دار (سر و صورتِ مدل بریده نشه)
      const mpx = winH * margin;
      // و پایینِ طرح بالاتر از جایِ کارتِ متن (reserveBottom) بیفته تا کارت رویِ طرح نشینه
      const want = Math.max(bb + mpx - winH * (1 - reserveBottom), 0);
      const top = Math.round(Math.min(want, Math.max(0, Math.min(bt - mpx, sh - winH))));
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

// دو خطِ هم‌اندازه به‌جای «یه خطِ بلند + یه کلمه‌ی تنها» — جای خالیِ کارت کم می‌شه
function balanced(text, size, maxW) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const one = words.join(" ");
  if (textWidth(one, size) <= maxW) return [one];
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const wa = textWidth(a, size);
    const wb = textWidth(b, size);
    if (wa > maxW || wb > maxW) continue;
    const score = Math.max(wa, wb);
    if (!best || score < best.score) best = { lines: [a, b], score };
  }
  return best ? best.lines : null;
}

// کارتِ متن: هدلاینِ درشت + چیپ‌ها، با سایه‌ی سختِ سایت. اگه جا باشه، چیپ‌ها
// کنارِ خطِ آخر (سمتِ چپ) می‌شینن تا کارت فشرده و بدونِ فضای خالی باشه.
function textCard({ headline, chips, maxW, s, sizes, anchorRight, anchorY, placeTop }) {
  const pad = Math.round(24 * s);
  let lines = null;
  let size = sizes[sizes.length - 1];
  for (const sz of sizes) {
    const l = balanced(headline, sz, maxW - pad * 2);
    if (l) {
      lines = l;
      size = sz;
      break;
    }
  }
  if (!lines) lines = fit(headline, { maxW: maxW - pad * 2, maxLines: 3, sizes: [size] }).lines;
  const lineWs = lines.map((l) => textWidth(l, size));
  const lineW = Math.max(...lineWs);
  const lh = Math.round(size * LH);
  const chipH = Math.round(Math.max(40 * s, size * 0.7));
  const gapC = Math.round(8 * s);
  const chipObjs = [];
  let chipsW = 0;
  for (const c of chips) {
    const fam = c.family || FA;
    const fs = Math.round(chipH * (fam === LATIN ? 0.4 : 0.44));
    const w = Math.round(textWidth(c.text, fs, fam) + chipH * 0.9);
    chipsW += w + (chipObjs.length ? gapC : 0);
    chipObjs.push({ ...c, w });
  }
  const lastW = lineWs[lineWs.length - 1];
  const inline = chipObjs.length && lastW + Math.round(22 * s) + chipsW <= Math.max(lineW, maxW * 0.62 - pad * 2);
  const innerW = inline ? Math.max(lineW, lastW + Math.round(22 * s) + chipsW) : Math.max(lineW, chipsW);
  const w = Math.round(innerW + pad * 2);
  const textH = lines.length * lh;
  const chipRowH = chipObjs.length && !inline ? chipH + Math.round(12 * s) : 0;
  const h = Math.round(pad * 0.85 + textH + chipRowH + pad * 0.55);
  const x = Math.round(anchorRight - w);
  const y = Math.round(placeTop ? anchorY : anchorY - h);
  const sh = Math.round(9 * s);
  const baseline0 = y + pad * 0.85 + size * 0.95;
  let svg =
    `<rect x="${x - sh}" y="${y + sh}" width="${w}" height="${h}" rx="${20 * s}" fill="${C.ink}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${20 * s}" fill="${C.b50}" stroke="${C.ink}" stroke-width="${3 * s}"/>` +
    textLines({ lines, size, x: x + w - pad, y: baseline0, lh: LH });
  let cx, cy;
  if (inline) {
    // چیپ‌ها از لبه‌ی چپِ کارت، هم‌ترازِ خطِ آخر
    cx = x + pad + chipsW;
    cy = Math.round(baseline0 + (lines.length - 1) * lh - size * 0.62 - (chipH - size * 0.62) / 2);
  } else {
    cx = x + w - pad;
    cy = Math.round(y + pad * 0.85 + textH + Math.round(4 * s));
  }
  for (const c of chipObjs) {
    const p = pill({ x: cx, y: cy, h: chipH, text: c.text, fill: c.fill, color: c.color, stroke: c.stroke, family: c.family || FA });
    svg += p.svg;
    cx -= p.w + gapC;
  }
  return { svg, rect: { x: x - sh, y, w: w + sh, h: h + sh }, x, y, w, h };
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
async function renderPost({ photoBytes, headline, categoryLabel, facts, designBox, format, studio = false }) {
  const F = FORMATS[format];
  if (!F) throw new Error(`فرمت ناشناخته: ${format}`);
  if (format === "twitter") return renderTwitter({ photoBytes, headline, categoryLabel, facts, designBox });

  const { W, H } = F;
  const s = W / 1080;
  const m = Math.round(26 * s); // قابِ نازک
  const R = Math.round(30 * s);
  const fw = W - m * 2;
  const fh = H - m * 2;
  const reserve = { post: 0.24, telegram: 0.3, story: 0.3 }[format] || 0.25;
  const { buffer, design } = await framePhoto(photoBytes, fw, fh, designBox, reserve, studio);
  const photo = await roundedPhoto(buffer, fw, fh, R);
  const designAbs = design ? { x: design.x + m, y: design.y + m, w: design.w, h: design.h } : null;

  // ناحیه‌ی امنِ استوری (رابطِ اینستاگرام بالا و پایین رو می‌پوشونه)
  const safeTop = format === "story" ? Math.round(210 * s) : m + Math.round(26 * s);
  const safeBottom = format === "story" ? H - Math.round(270 * s) : H - m - Math.round(24 * s);
  const inset = m + Math.round(26 * s);

  const icon = await asset("palas-mark.png", { height: Math.round(46 * s) });
  const brand = brandPill({ right: W - inset, top: safeTop, h: Math.round(64 * s), icon });
  const cat = pill({ x: inset, y: safeTop + Math.round(6 * s), h: Math.round(52 * s), text: categoryLabel, fill: C.ink, color: C.b50, anchor: "left" });

  const sizes = (format === "story" ? [84, 78, 72, 66, 60, 54, 50] : [68, 64, 60, 56, 52, 48, 44]).map((v) => Math.round(v * s));
  const mascotSlot = Math.round((format === "story" ? 250 : 210) * s); // جایِ ماسکوت کنارِ کارت
  const cardArgs = { headline, chips: factChips(facts), maxW: fw - Math.round(52 * s) - mascotSlot, s, sizes, anchorRight: W - inset };
  // کارت به لبه‌ی پایینِ قاب چسبیده (نه معلق وسطِ عکس)؛ اگه رویِ طرح می‌افته، بالا
  let card = textCard({ ...cardArgs, anchorY: safeBottom, placeTop: false });
  if (designAbs && overlap(card.rect, designAbs) > 0.08) {
    const topCard = textCard({ ...cardArgs, anchorY: safeTop + Math.round(96 * s), placeTop: true });
    if (overlap(topCard.rect, designAbs) < overlap(card.rect, designAbs)) card = topCard;
  }

  // ماسکوت کنارِ کارت می‌ایسته، انگار داره متن رو معرفی می‌کنه
  const over = [brand.layer];
  const mFile = pickMascot(headline);
  const meta = await sharp(path.join(ASSET_DIR, mFile)).metadata();
  const aspect = meta.width / meta.height;
  const avail = card.x - (m + Math.round(12 * s)); // فضایِ خالیِ چپِ کارت
  let mH = Math.round(Math.min(Math.max(card.h * 1.9, 230 * s), (format === "story" ? 420 : 330) * s));
  mH = Math.round(Math.min(mH, avail / 0.94 / aspect));
  if (mH >= 150 * s) {
    const mascot = await asset(mFile, { height: mH });
    const mx = Math.round(card.x - mascot.w * 0.94); // فقط لبه‌ی کارت رو لمس کنه، نه متن رو
    const my = Math.round(card.y + card.h - mascot.h + Math.round(6 * s));
    const mRect = { x: mx, y: my, w: mascot.w, h: mascot.h };
    if (my >= m && (!designAbs || overlap(mRect, designAbs) < 0.06)) over.push({ input: mascot.buffer, left: mx, top: my });
  }

  const svg =
    `<rect x="${m}" y="${m}" width="${fw}" height="${fh}" rx="${R}" fill="none" stroke="${C.ink}" stroke-width="${3 * s}"/>` +
    brand.svg +
    cat.svg +
    card.svg;
  return compose(W, H, C.bone, [{ input: photo, left: m, top: m }], svg, over);
}

const MASCOTS = ["palas-full.png", "homay-full.png", "boz-full.png", "palas-full.png"];
function pickMascot(seed) {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return MASCOTS[h % MASCOTS.length];
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
  const { lines, size } = fit(headline, { maxW: colW, maxLines: 3, sizes: [66, 62, 58, 54, 50, 46, 42] });
  const hy = 190;
  let svg =
    `<rect x="${m}" y="${m}" width="${pw}" height="${ph}" rx="${R}" fill="none" stroke="${C.ink}" stroke-width="3"/>` +
    brand.svg +
    `<text x="${colRight}" y="160" text-anchor="end" direction="rtl" font-family="${FA}" font-size="24" fill="${C.red}">${esc(categoryLabel)}ِ امروزِ میزطوری</text>` +
    textLines({ lines, size, x: colRight, y: hy + size * 0.9 });
  let cx = colRight;
  const cy = Math.round(hy + lines.length * size * LH + 34);
  for (const c of factChips(facts)) {
    const p = pill({ x: cx, y: cy, h: 50, text: c.text, fill: c.fill, color: c.color, stroke: c.stroke, family: c.family || FA });
    svg += p.svg;
    cx -= p.w + 10;
  }
  const tm = await asset(pickMascot(headline), { height: 150 });
  const tLayer = { input: tm.buffer, left: colLeft - 6, top: H - 96 - tm.h + 8 };
  svg += `<line x1="${colLeft}" y1="${H - 92}" x2="${colRight}" y2="${H - 92}" stroke="${C.b400}" stroke-width="2"/>`;
  svg += `<text x="${colRight}" y="${H - 50}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="24" fill="${C.g40}">قسطی با دیجی‌پی · ۷ روز ضمانتِ بازگشت</text>`;
  return compose(W, H, C.bone, [{ input: photo, left: m, top: m }], svg, [brand.layer, tLayer]);
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
  y += t.lines.length * t.size * LH + 40;

  const rows = [];
  if (facts.colors?.length) rows.push({ icon: "palette", k: "رنگ‌ها", v: `${faDigits(facts.colors.length)} رنگ`, swatches: facts.colors });
  if (facts.sizesText) rows.push({ icon: "ruler", k: "سایز", v: facts.sizesText });
  if (facts.cuts?.length) rows.push({ icon: "shirt", k: "مدل", v: facts.cuts.slice(0, 4).join("، ") });
  if (facts.priceText) rows.push({ icon: "tag", k: "قیمت", v: facts.priceText });
  rows.push({ icon: "card", k: "پرداخت", v: "قسطی با دیجی‌پی" });
  rows.push({ icon: "shield", k: "خیالت راحت", v: "۷ روز ضمانتِ بازگشت" });

  // ردیف‌ها فضایِ بینِ عنوان و پایین (بالایِ ماسکوت/دکمه) رو یکنواخت پر می‌کنن
  const shown = rows.slice(0, 6);
  const rowH = Math.round(Math.min(150, Math.max(112, (H - 300 - y) / shown.length)));
  for (const r of shown) {
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

  const mascot = await asset(pickMascot(title), { height: 330 });
  const url = pill({ x: W - inset, y: H - inset - 64, h: 64, text: "miztore.com", fill: C.red, color: C.b50, family: LATIN });
  svg += url.svg;
  return compose(W, H, C.bone, [], svg, [brand.layer, { input: mascot.buffer, left: inset - 10, top: H - m - mascot.h - 6 }]);
}

// ---------------------------------------------------------------------------
// پستِ خدمات (بدونِ عکسِ محصول)
// ---------------------------------------------------------------------------
// پنلِ تصویریِ هر خدمت — فضایِ پایین‌راست رو با یه چیزِ واقعی و مرتبط پر می‌کنه
function servicePanelHeight(panel, w, s) {
  const id = panel.type;
  const pad = 28 * s;
  if (id === "colors") {
    const n = Object.keys(SWATCH).length - 1, r = 22 * s, gap = 14 * s;
    const cols = Math.max(4, Math.floor((w - pad * 2 + gap) / (r * 2 + gap)));
    return Math.ceil(n / cols) * (r * 2 + gap) - gap + pad * 2;
  }
  if (id === "sizes") return pad * 2 + 2 * 104 * s + 12 * s + 48 * s;
  if (id === "big") return pad * 2 + 96 * s + 30 * s + (panel.sub ? 2 * 34 * s * LH : 0);
  if (id === "list") return pad * 2 + (panel.items || []).length * 72 * s;
  return pad * 2 + 150 * s + 44 * s + 56 * s;
}

function servicePanel(panel, { x, y, w, h, s }) {
  const id = panel.type;
  let svg = `<rect x="${x - 9 * s}" y="${y + 9 * s}" width="${w}" height="${h}" rx="${22 * s}" fill="${C.ink}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${22 * s}" fill="${C.bone}" stroke="${C.ink}" stroke-width="${3 * s}"/>`;
  const pad = 28 * s;
  if (id === "colors") {
    const names = Object.keys(SWATCH).filter((n) => n !== "کرمی");
    const r = 22 * s, gap = 14 * s;
    const cols = Math.max(4, Math.floor((w - pad * 2 + gap) / (r * 2 + gap)));
    const rows = Math.ceil(names.length / cols);
    const gridH = rows * (r * 2 + gap) - gap;
    let yy = y + (h - gridH) / 2 + r;
    names.forEach((n, i) => {
      const c = i % cols, row = Math.floor(i / cols);
      const cx = x + w - pad - r - c * (r * 2 + gap);
      svg += `<circle cx="${cx}" cy="${yy + row * (r * 2 + gap)}" r="${r}" fill="${SWATCH[n]}" stroke="${C.ink}" stroke-opacity="0.5" stroke-width="${2 * s}"/>`;
    });
  } else if (id === "sizes") {
    // جدولِ سایزِ تیشرت اسلیم از خودِ سایت: عرضِ سینه (سانتی‌متر)
    const table = [["S", 47], ["M", 49], ["L", 51], ["XL", 54], ["XXL", 56], ["XXXL", 60]];
    const cols = 3, gap = 12 * s;
    const cw = (w - pad * 2 - gap * (cols - 1)) / cols, ch = 104 * s;
    table.forEach(([z, chest], i) => {
      const c = i % cols, row = Math.floor(i / cols);
      const cx = x + w - pad - cw - c * (cw + gap);
      const cy = y + pad + row * (ch + gap);
      const on = z === "L";
      svg += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="${14 * s}" fill="${on ? C.ink : C.b50}" stroke="${C.ink}" stroke-width="${2.5 * s}"/>`;
      svg += `<text x="${cx + cw / 2}" y="${cy + 46 * s}" text-anchor="middle" font-family="${LATIN}" font-size="${34 * s}" fill="${on ? C.b50 : C.ink}">${z}</text>`;
      svg += `<text x="${cx + cw / 2}" y="${cy + 84 * s}" text-anchor="middle" direction="rtl" font-family="${FA}" font-size="${24 * s}" fill="${on ? C.b200 : C.g40}">سینه ${faDigits(chest)}</text>`;
    });
    const foot = fit("عرضِ سینه، سانتی‌متر · تیشرت اسلیم", { maxW: w - pad * 2, maxLines: 1, sizes: [24, 22, 20, 18].map((v) => Math.round(v * s)) });
    svg += `<text x="${x + w - pad}" y="${y + h - pad * 0.8}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${foot.size}" fill="${C.g40}">${esc(foot.lines[0] || "")}</text>`;
  } else if (panel.type === "steps") {
    const big = fit(panel.big || "", { maxW: w - pad * 2, maxLines: 1, sizes: [64, 56, 48].map((v) => Math.round(v * s)) });
    svg += `<text x="${x + w - pad}" y="${y + pad + 64 * s}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${big.size}" fill="${C.red}">${esc(big.lines[0] || "")}</text>`;
    if (panel.sub) {
      const sub = fit(panel.sub, { maxW: w - pad * 2, maxLines: 1, sizes: [30, 27, 24, 21].map((v) => Math.round(v * s)) });
      svg += `<text x="${x + w - pad}" y="${y + pad + 150 * s}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${sub.size}" fill="${C.ink}">${esc(sub.lines[0] || "")}</text>`;
    }
    const steps = panel.steps || [];
    const last = steps.length - 1;
    let chipH = 56 * s;
    const stepsW = (hh) => steps.reduce((a, t) => a + textWidth(t, Math.round(hh * 0.44)) + hh * 0.9, 0) + last * 34 * s;
    while (chipH > 30 * s && stepsW(chipH) > w - pad * 2) chipH -= 4 * s;
    let cx = x + w - pad;
    const cy = y + h - pad - chipH;
    steps.forEach((t, i) => {
      const p = pill({ x: cx, y: cy, h: chipH, text: t, fill: i === last ? C.red : C.b50, color: i === last ? C.b50 : C.ink, stroke: i === last ? null : C.ink });
      svg += p.svg;
      cx -= p.w;
      if (i < last) {
        svg += `<text x="${cx - 12 * s}" y="${cy + chipH * 0.68}" text-anchor="end" font-family="${LATIN}" font-size="${30 * s}" fill="${C.g40}">‹</text>`;
        cx -= 34 * s;
      }
    });
  } else if (panel.type === "big") {
    const big = fit(panel.big || "", { maxW: w - pad * 2, maxLines: 1, sizes: [96, 84, 72, 60].map((v) => Math.round(v * s)) });
    svg += `<text x="${x + w - pad}" y="${y + pad + big.size * 0.95}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${big.size}" fill="${C.red}">${esc(big.lines[0] || "")}</text>`;
    if (panel.sub) {
      const sub = fit(panel.sub, { maxW: w - pad * 2, maxLines: 2, sizes: [34, 30, 27, 24].map((v) => Math.round(v * s)) });
      svg += textLines({ lines: sub.lines, size: sub.size, x: x + w - pad, y: y + h - pad - (sub.lines.length - 1) * sub.size * LH, lh: LH });
    }
  } else if (panel.type === "list") {
    const items = panel.items || [];
    const rowH = (h - pad * 2) / items.length;
    items.forEach((t, i) => {
      const cy = y + pad + rowH * i + rowH / 2;
      const r = 22 * s;
      const cx = x + w - pad - r;
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.ink}"/><path d="M${cx - 9 * s} ${cy} l${6 * s} ${6 * s} l${12 * s} ${-12 * s}" fill="none" stroke="${C.b50}" stroke-width="${4 * s}" stroke-linecap="round" stroke-linejoin="round"/>`;
      const f = fit(t, { maxW: w - pad * 2 - r * 2 - 18 * s, maxLines: 1, sizes: [34, 30, 27, 24].map((v) => Math.round(v * s)) });
      svg += `<text x="${cx - r - 16 * s}" y="${cy + f.size * 0.35}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${f.size}" fill="${C.ink}">${esc(f.lines[0] || "")}</text>`;
    });
  }
  return svg;
}

async function renderServicePost({ format, headline, body, cta, id, panel }) {
  panel = panel || { type: id === "digipay" ? "steps" : id, big: "دیجی‌پی", sub: "موقعِ پرداخت انتخابش کن", steps: ["سبد", "پرداخت", "دیجی‌پی"] };
  const F = FORMATS[format];
  if (!F) throw new Error(`فرمت ناشناخته: ${format}`);
  const { W, H } = F;
  const horizontal = W > H;
  const s = horizontal ? H / 1080 : W / 1080;
  const m = Math.round(26 * s),
    R = Math.round(30 * s);
  const inset = Math.round(84 * s);
  const icon = await asset("palas-mark.png", { height: Math.round(46 * s) });
  const topY = format === "story" ? Math.round(210 * s) : inset;
  const brand = brandPill({ right: W - inset, top: topY, h: Math.round(64 * s), icon });
  const bottomY = format === "story" ? H - Math.round(250 * s) : H - m - Math.round(30 * s);
  const mascotW0 = Math.round((horizontal ? 420 : 380) * s); // تخمینِ عرضِ ماسکوت برایِ ستونِ متنِ افقی
  const textMaxW = horizontal ? W - inset * 2 - mascotW0 - 40 * s : W - inset * 2;
  let hl = null, hs = 0;
  for (const sz of [104, 96, 88, 80, 72].map((v) => Math.round(v * s))) {
    const l = balanced(headline, sz, textMaxW);
    if (l) { hl = l; hs = sz; break; }
  }
  if (!hl) ({ lines: hl, size: hs } = fit(headline, { maxW: textMaxW, maxLines: 3, sizes: [72, 64, 56].map((v) => Math.round(v * s)) }));
  const b = fit(body, { maxW: textMaxW, maxLines: 4, sizes: [40, 38, 36, 34, 32].map((v) => Math.round(v * s)) });
  let y = topY + Math.round((horizontal ? 130 : format === "story" ? 250 : 150) * s);
  let svg =
    `<rect x="${m}" y="${m}" width="${W - m * 2}" height="${H - m * 2}" rx="${R}" fill="${C.b50}" stroke="${C.ink}" stroke-width="${3 * s}"/>` +
    brand.svg +
    `<text x="${W - inset}" y="${y}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${Math.round(32 * s)}" fill="${C.red}">خدماتِ میزطوری</text>`;
  y += Math.round(24 * s);
  svg += textLines({ lines: hl, size: hs, x: W - inset, y: y + hs, lh: LH });
  y += hl.length * hs * LH + Math.round(20 * s);
  svg += textLines({ lines: b.lines, size: b.size, x: W - inset, y: y + b.size, color: C.g20, lh: LH_BODY });
  y += b.lines.length * b.size * LH_BODY + Math.round(30 * s);
  const c = pill({ x: W - inset, y, h: Math.round(72 * s), text: cta, fill: C.red, color: C.b50 });
  svg += c.svg;
  svg += `<text x="${W - inset - c.w - Math.round(24 * s)}" y="${y + Math.round(47 * s)}" text-anchor="end" font-family="${LATIN}" font-size="${Math.round(28 * s)}" fill="${C.ink}">miztore.com</text>`;
  y += Math.round(72 * s) + Math.round(50 * s);

  // ماسکوت فضایِ خالیِ پایین رو پر می‌کنه (نه یه اندازه‌ی ثابت که نصفِ صفحه خالی بمونه)
  const pm = await sharp(path.join(ASSET_DIR, "palas-full.png")).metadata();
  const pAspect = pm.width / pm.height;
  let mascotH = horizontal
    ? Math.round(H - m * 2 - 40 * s)
    : Math.round(Math.min(Math.max(bottomY - y + 30 * s, 380 * s), (format === "story" ? 980 : 620) * s));
  if (!horizontal) mascotH = Math.round(Math.min(mascotH, ((W - inset * 2) * 0.44) / pAspect));
  else mascotH = Math.round(Math.min(mascotH, mascotW0 / pAspect));
  const mascot = await asset("palas-full.png", { height: mascotH });
  const mx = Math.round(inset - 20 * s);
  const my = Math.round(horizontal ? H - m - mascot.h - 6 * s : bottomY - mascot.h);
  {
    const px = mx + mascot.w + Math.round(24 * s);
    const pw = W - inset - px;
    const room = bottomY - y;
    const need = pw > 300 * s ? servicePanelHeight(panel, pw, s) : Infinity;
    if (need <= room) svg += servicePanel(panel, { x: px, y: Math.round(bottomY - need), w: pw, h: need, s });
  }
  return compose(W, H, C.bone, [], svg, [brand.layer, { input: mascot.buffer, left: mx, top: horizontal ? my : Math.max(my, Math.round(y - 40 * s)) }]);
}

// ---------------------------------------------------------------------------
// پست‌هایِ گروهی: شبکه‌یِ محصول (پرفروش‌ها/کالکشن/هدیه) و «این یا اون؟»
// کارتِ محصول هم‌زبانِ کارت‌هایِ فروشگاهِ سایته: عکس رویِ bone-200، خطِ مشکی،
// سایه‌یِ سخت، نوع + اسم + قیمت.
// ---------------------------------------------------------------------------
async function productImage(url, w, h) {
  const bytes = await fetchBytes(url);
  // عکس‌هایِ محصولِ سایت استودیویی‌ان؛ contain رویِ bone-200 تا کلِ لباس دیده بشه
  return sharp(bytes).resize(w, h, { fit: "contain", background: C.b200 }).flatten({ background: C.b200 }).png().toBuffer();
}

// کارت دو تکه SVG داره: under (سایه + بدنه، زیرِ عکس) و over (خط/متن، رویِ عکس)
async function productCard({ item, x, y, w, h, s, badge }) {
  const pad = Math.round(18 * s);
  const narrow = w < 330 * s;
  const nameFit = fit(item.shortName || item.name, { maxW: w - pad * 2, maxLines: 2, sizes: (narrow ? [26, 24, 22, 20] : [34, 31, 28, 25, 22]).map((v) => Math.round(v * s)) });
  const nameH = Math.round(nameFit.lines.length * nameFit.size * LH);
  const priceFit = item.priceText ? fit(item.priceText, { maxW: w - pad * 2, maxLines: 1, sizes: [26, 24, 22, 20, 18].map((v) => Math.round(v * s)) }) : null;
  const priceFs = priceFit ? priceFit.size : Math.round(26 * s);
  const textH = pad + Math.round(36 * s) + nameH + priceFs + pad;
  const imgH = Math.max(Math.round(80 * s), h - textH);
  const r = Math.round(16 * s);
  const img = await productImage(item.image, w, imgH);
  // فقط گوشه‌هایِ بالایِ عکس گِرد
  const mask = Buffer.from(`<svg width="${w}" height="${imgH}"><rect width="${w}" height="${imgH + r}" rx="${r}" fill="#fff"/></svg>`);
  const photo = await sharp(img).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const sh = Math.round(8 * s);
  const under =
    `<rect x="${x - sh}" y="${y + sh}" width="${w}" height="${h}" rx="${r}" fill="${C.ink}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${C.b50}"/>`;
  let over =
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${C.ink}" stroke-width="${3 * s}"/>` +
    `<line x1="${x}" y1="${y + imgH}" x2="${x + w}" y2="${y + imgH}" stroke="${C.ink}" stroke-width="${3 * s}"/>`;
  let ty = y + imgH + pad;
  if (item.kind)
    over += `<text x="${x + w - pad}" y="${ty + 18 * s}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${Math.round(20 * s)}" fill="${C.red}">${esc(item.kind)}</text>`;
  ty += Math.round(36 * s);
  over += textLines({ lines: nameFit.lines, size: nameFit.size, x: x + w - pad, y: ty + nameFit.size, lh: LH });
  ty += nameH;
  if (item.priceText)
    over += `<text x="${x + w - pad}" y="${ty + priceFs + 4 * s}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${priceFs}" fill="${C.ink}">${esc(item.priceText)}</text>`;
  if (badge) over += pill({ x: x + w - Math.round(12 * s), y: y + Math.round(12 * s), h: Math.round(46 * s), text: badge, fill: C.ink, color: C.b50 }).svg;
  return { under, over, layer: { input: photo, left: Math.round(x), top: Math.round(y) } };
}

async function gridLayout({ s, items, top, bottom, left, right, cols, badges }) {
  const gap = Math.round(26 * s);
  const rows = Math.ceil(items.length / cols);
  const cw = Math.floor((right - left - gap * (cols - 1)) / cols);
  const ch = Math.floor((bottom - top - gap * (rows - 1)) / rows);
  const layers = [];
  let under = "";
  let over = "";
  for (let i = 0; i < items.length; i++) {
    const c = i % cols;
    const rr = Math.floor(i / cols);
    const x = right - cw - c * (cw + gap); // راست‌به‌چپ
    const y = top + rr * (ch + gap);
    const card = await productCard({ item: items[i], x, y, w: cw, h: ch, s, badge: badges ? badges[i] : null });
    under += card.under;
    over += card.over;
    layers.push(card.layer);
  }
  return { under, over, layers };
}

function svgLayer(W, H, body) {
  return { input: svgToPng(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`, W), left: 0, top: 0 };
}

async function renderGrid({ format, eyebrow, title, items, badges }) {
  const { W, H } = FORMATS[format];
  const horizontal = W > H;
  const s = horizontal ? H / 1080 : W / 1080;
  const inset = Math.round(56 * s);
  const topY = format === "story" ? Math.round(200 * s) : Math.round(48 * s);
  const icon = await asset("palas-mark.png", { height: Math.round(46 * s) });
  const brand = brandPill({ right: W - inset, top: topY, h: Math.round(64 * s), icon });
  const mascot = horizontal ? null : await asset(pickMascot(title), { height: Math.round((format === "story" ? 230 : 190) * s) });
  const titleRight = horizontal ? W - inset - brand.w - Math.round(30 * s) : W - inset;
  const titleMaxW = titleRight - inset - (mascot ? mascot.w + Math.round(10 * s) : 0);
  const sizes = (format === "story" ? [92, 84, 76, 68] : horizontal ? [60, 54, 48] : [76, 70, 64, 58, 52]).map((v) => Math.round(v * s));
  let tl = null;
  let ts = sizes[sizes.length - 1];
  for (const sz of sizes) {
    const l = balanced(title, sz, titleMaxW);
    if (l) {
      tl = l;
      ts = sz;
      break;
    }
  }
  if (!tl) tl = fit(title, { maxW: titleMaxW, maxLines: 2, sizes: [ts] }).lines;
  let y = topY + Math.round((horizontal ? 0 : 100) * s);
  let svg = `<text x="${titleRight}" y="${y + 30 * s}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${Math.round(30 * s)}" fill="${C.red}">${esc(eyebrow)}</text>`;
  y += Math.round(44 * s);
  svg += textLines({ lines: tl, size: ts, x: titleRight, y: y + ts, lh: LH });
  y += Math.round(tl.length * ts * LH + 24 * s);

  const bottomSafe = format === "story" ? H - Math.round(250 * s) : H - Math.round(40 * s);
  const footerH = Math.round(96 * s);
  // مربعی (تلگرام) و افقی: یک ردیفِ چهارتایی؛ ۲×۲ اون‌جا عکسِ لباس رو خیلی کوچیک می‌کرد
  const cols = horizontal || W === H ? Math.min(4, items.length) : 2;
  const grid = await gridLayout({ s, items, top: y, bottom: bottomSafe - footerH, left: inset + Math.round(8 * s), right: W - inset, cols, badges });
  const url = pill({ x: W - inset, y: bottomSafe - Math.round(60 * s), h: Math.round(60 * s), text: "miztore.com", fill: C.red, color: C.b50, family: LATIN });
  const note = `<text x="${W - inset - url.w - Math.round(20 * s)}" y="${bottomSafe - Math.round(20 * s)}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${Math.round(26 * s)}" fill="${C.g40}">قسطی با دیجی‌پی · ۷ روز ضمانتِ بازگشت</text>`;
  const over = [brand.layer];
  if (mascot) over.push({ input: mascot.buffer, left: inset - Math.round(6 * s), top: Math.round(topY + 8 * s) });
  return compose(W, H, C.bone, [svgLayer(W, H, grid.under), ...grid.layers], brand.svg + svg + grid.over + url.svg + note, over);
}

// «این یا اون؟» — دو محصول، یه سؤال، دایره‌یِ «یا» وسط (برایِ نظرسنجی/کامنت)
async function renderVersus({ format, question, a, b }) {
  const { W, H } = FORMATS[format];
  const horizontal = W > H;
  const s = horizontal ? H / 1080 : W / 1080;
  const inset = Math.round(56 * s);
  const topY = format === "story" ? Math.round(200 * s) : Math.round(48 * s);
  const icon = await asset("palas-mark.png", { height: Math.round(46 * s) });
  const brand = brandPill({ right: W - inset, top: topY, h: Math.round(64 * s), icon });
  const qRight = horizontal ? W - inset - brand.w - Math.round(30 * s) : W - inset;
  const qFit = fit(question, { maxW: qRight - inset, maxLines: 2, sizes: (format === "story" ? [96, 86, 76] : horizontal ? [58, 52, 46] : [84, 76, 68, 60]).map((v) => Math.round(v * s)) });
  let y = topY + Math.round((horizontal ? 0 : 100) * s);
  let svg = `<text x="${qRight}" y="${y + 30 * s}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${Math.round(30 * s)}" fill="${C.red}">این یا اون؟</text>`;
  y += Math.round(44 * s);
  svg += textLines({ lines: qFit.lines, size: qFit.size, x: qRight, y: y + qFit.size, lh: LH });
  y += Math.round(qFit.lines.length * qFit.size * LH + 26 * s);
  const bottomSafe = format === "story" ? H - Math.round(430 * s) : H - Math.round(110 * s);
  const grid = await gridLayout({ s, items: [a, b], top: y, bottom: bottomSafe, left: inset + Math.round(8 * s), right: W - inset, cols: 2, badges: ["الف", "ب"] });
  const r = Math.round(54 * s);
  const cx = Math.round(W / 2 + 4 * s);
  const cy = Math.round(y + (bottomSafe - y) * 0.36);
  svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.red}" stroke="${C.ink}" stroke-width="${4 * s}"/><text x="${cx}" y="${cy + r * 0.32}" text-anchor="middle" direction="rtl" font-family="${FA}" font-size="${Math.round(44 * s)}" fill="${C.b50}">یا</text>`;
  svg += `<text x="${W / 2}" y="${bottomSafe + Math.round(66 * s)}" text-anchor="middle" direction="rtl" font-family="${FA}" font-size="${Math.round(32 * s)}" fill="${C.g40}">${format === "story" ? "تو نظرسنجیِ پایین جواب بده" : "جوابتو کامنت کن: الف یا ب؟"}</text>`;
  return compose(W, H, C.bone, [svgLayer(W, H, grid.under), ...grid.layers], brand.svg + grid.over + svg, [brand.layer]);
}

// سازگاری با کدِ قدیمی
function pickTemplateName() {
  return "frame";
}
const TEMPLATES = { frame: {} };

module.exports = { renderPost, renderDetail, renderInfo, renderServicePost, renderGrid, renderVersus, fetchBytes, FORMATS, pickTemplateName, TEMPLATES };

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
const { studioDesignBox } = require("./design-box.js");

// توکن‌ها بر اساسِ نقش: ink = رنگِ متن/خط، bone = بوم، b50 = سطحِ کارت. حالتِ تیره همین
// نقش‌ها رو برعکس می‌کنه. photo (پس‌زمینه‌یِ عکس‌هایِ استودیویی) و onRed همیشه ثابتن تا
// لباسِ مشکی رویِ بومِ مشکی گم نشه.
const LIGHT = {
  dark: false,
  ink: "#0B0B0B",
  bone: "#F4F1EA",
  b50: "#FBFAF6",
  b200: "#E8E4D9",
  b400: "#C2BDAF",
  red: "#C90000",
  g20: "#3C3C3C",
  g40: "#6D6D6D",
  shadow: "#0B0B0B",
  photo: "#E8E4D9",
  onRed: "#FBFAF6",
};
const DARK = {
  dark: true,
  ink: "#F4F1EA",
  bone: "#0E0E0E",
  b50: "#1A1A1A",
  b200: "#2B2B2B",
  b400: "#4A4A4A",
  red: "#E0201B",
  g20: "#D6D1C6",
  g40: "#A39E93",
  shadow: "#C90000", // سایه‌یِ سختِ قرمز به‌جایِ مشکی
  photo: "#E8E4D9",
  onRed: "#FBFAF6",
};
const C = { ...LIGHT };
// یک تم برایِ کلِ اجرا (هر اجرا یک پست می‌سازه)
function setTheme(name) {
  Object.assign(C, name === "dark" ? DARK : LIGHT);
}

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
  let buf = await sharp(path.join(ASSET_DIR, file)).resize({ height, width }).png().toBuffer();
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
    // عکسِ استودیوییِ محصول (لباس رویِ پس‌زمینه‌یِ شفاف): رویِ bone-200 (رنگِ کارت‌هایِ سایت)
    // و زوم رویِ خودِ طرح، تا طرح دیده بشه نه فقط شکلِ لباس. کارتِ متنِ پایین رویِ طرح نمی‌افته.
    const sbox = await studioDesignBox(photoBytes).catch(() => null);
    if (sbox) return studioCrop(photoBytes, sbox, w, h, { fill: 0.52, reserveBottom });
    photoBytes = await sharp(photoBytes).flatten({ background: C.photo }).jpeg({ quality: 95 }).toBuffer();
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
    // زوم به سمتِ طرح: تو عکس‌هایِ تمام‌قد طرح کوچیک دیده می‌شد. پنجره رو کوچیک‌تر می‌کنیم
    // تا طرح دستِ‌کم ~نصفِ عرضِ قاب رو بگیره — ولی نه کمتر از ۵۵٪ِ قابِ کامل (آدم و لباس
    // هنوز معلوم باشن) و نه آن‌قدر که عکس بیشتر از ۱.۶ برابر بزرگ و تار بشه.
    const maxW = winW;
    // صورتِ مدل هم باید تو قاب بمونه: از بالایِ سر تا زیرِ طرح بالایِ کارتِ متن جا بشه.
    // headTop رو Gemini می‌ده (null یعنی آدمی تو عکس نیست)؛ اگه نداد، حدودی بالایِ طرح فرض می‌شه.
    const headTop = box.headTop === null ? null : box.headTop !== undefined ? box.headTop * sh : Math.max(0, bt - (bb - bt) * 1.4);
    const needH = headTop === null ? 0 : (bb - headTop + sh * 0.07) / (1 - reserveBottom);
    const need = Math.max((br - bl) / 0.5, ((bb - bt) * a) / (0.86 * (1 - reserveBottom)), needH * a);
    const zw = Math.min(maxW, Math.max(need, maxW * 0.55, w / 1.6));
    if (zw < maxW) {
      winW = Math.round(zw);
      winH = Math.round(zw / a);
    }
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

// برش حولِ طرح برایِ عکس‌هایِ استودیویی؛ بیرونِ عکس با bone-200 پر می‌شه (هم‌رنگِ پس‌زمینه)
// fill: سهمِ طرح از عرضِ قاب. طرح تو ناحیه‌یِ بالایِ reserveBottom و کمی بالاتر از وسطش می‌شینه.
async function studioCrop(bytes, box, w, h, { fill = 0.6, reserveBottom = 0 } = {}) {
  const flat = await sharp(bytes).flatten({ background: C.photo }).png().toBuffer();
  const { width: sw, height: sh } = await sharp(flat).metadata();
  const a = w / h;
  const bl = box.left * sw,
    br = box.right * sw,
    bt = box.top * sh,
    bb = box.bottom * sh;
  const usable = 1 - reserveBottom;
  let winW = Math.max((br - bl) / fill, ((bb - bt) * a) / (0.84 * usable), Math.min(w / 1.35, Math.max(w / 1.7, sw * 0.62))); // دستِ‌کم ۶۲٪ِ عکس (لباس معلوم بمونه)، و حداکثر ۱.۷ برابر بزرگ‌نمایی (تار نشه)
  winW = Math.min(winW, Math.max(sw, sh * a) * 1.1);
  const winH = winW / a;
  const left = Math.round((bl + br) / 2 - winW / 2);
  const top = Math.round((bt + bb) / 2 - winH * usable * 0.5);
  const pad = Math.ceil(Math.max(0, -left, -top, left + winW - sw, top + winH - sh)) + 2;
  const ext = await sharp(flat).extend({ top: pad, bottom: pad, left: pad, right: pad, background: C.photo }).png().toBuffer();
  const buffer = await sharp(ext)
    .extract({ left: left + pad, top: top + pad, width: Math.round(winW), height: Math.round(winH) })
    .resize(w, h, { kernel: "lanczos3" })
    .jpeg({ quality: 95 })
    .toBuffer();
  const k = w / winW;
  return { buffer, design: { x: (bl - left) * k, y: (bt - top) * k, w: (br - bl) * k, h: (bb - bt) * k } };
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
    `<rect x="${x}" y="${top}" width="${w}" height="${h}" rx="${h / 2}" fill="${LIGHT.b50}" stroke="${C.dark ? LIGHT.b50 : LIGHT.ink}" stroke-width="${Math.max(2, h * 0.045)}"/>` +
    `<text x="${right - padX - iconW - gap}" y="${top + h * 0.66}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${fs}" fill="${LIGHT.ink}">میزطوری</text>`;
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
    `<rect x="${x - sh}" y="${y + sh}" width="${w}" height="${h}" rx="${20 * s}" fill="${C.shadow}"/>` +
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
    if (facts.priceText) chips.push({ text: facts.priceText, fill: C.red, color: C.onRed });
    if (facts.colors?.length > 1) chips.push({ text: `${faDigits(facts.colors.length)} رنگ`, fill: C.b50, color: C.ink, stroke: C.ink });
  }
  if (!chips.length) chips.push({ text: "miztore.com", fill: C.red, color: C.onRed, family: LATIN });
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
  const reserve = { post: 0.24, telegram: 0.3, story: 0.34 }[format] || 0.25;
  let fhP = fh; // ارتفاعِ قابِ عکس (در چیدمانِ «کارت رویِ لبه» کوتاه‌تر می‌شه)
  let { buffer, design } = await framePhoto(photoBytes, fw, fh, designBox, reserve, studio);
  let designAbs = design ? { x: design.x + m, y: design.y + m, w: design.w, h: design.h } : null;

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
    if (designBox && designBox.headTop !== null) {
      // آدم تو عکسه: کارتِ بالا صورت رو می‌پوشوند. به‌جاش قابِ عکس کوتاه‌تر می‌شه و کارت
      // رویِ لبه‌یِ پایینش می‌شینه (نصفش بیرونِ عکس)، تا هم صورت بمونه هم طرح.
      fhP = Math.round(card.y + card.h * 0.5 - m);
      const r2 = Math.min(0.5, (m + fhP - card.y + 14 * s) / fhP);
      ({ buffer, design } = await framePhoto(photoBytes, fw, fhP, designBox, r2, studio));
      designAbs = design ? { x: design.x + m, y: design.y + m, w: design.w, h: design.h } : null;
    } else if (overlap(topCard.rect, designAbs) < overlap(card.rect, designAbs)) card = topCard;
  }
  const photo = await roundedPhoto(buffer, fw, fhP, R);

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
    `<rect x="${m}" y="${m}" width="${fw}" height="${fhP}" rx="${R}" fill="none" stroke="${C.ink}" stroke-width="${3 * s}"/>` +
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
  svg += `<text x="${colRight}" y="${H - 50}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="24" fill="${C.g40}">قسطی با دیجی‌پی، ۷ روز ضمانتِ بازگشت</text>`;
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
  const url = pill({ x: W - inset, y: H - inset - 64, h: 64, text: "miztore.com", fill: C.red, color: C.onRed, family: LATIN });
  svg += url.svg;
  return compose(W, H, C.bone, [], svg, [brand.layer, { input: mascot.buffer, left: inset - 10, top: H - m - mascot.h - 6 }]);
}

// ---------------------------------------------------------------------------
// اسلایدِ دوم: یه عکسِ واقعیِ دیگه از همین طرح (مدل/رنگ/لباسِ دیگه) با کیفیتِ کامل
// (به‌جایِ «طرح از نزدیک» که بزرگ‌نماییِ یه تیکه از عکس بود و تار درمیومد)
// ---------------------------------------------------------------------------
async function renderAlt({ photoBytes, line, tag, designBox = null, format = "post" }) {
  const { W, H } = FORMATS[format];
  const m = 26,
    R = 30,
    inset = 58;
  // جمله تو یه نوارِ جدا زیرِ عکس (نه رویِ عکس) تا هیچ‌وقت رویِ طرح نیفته
  let t = line ? fit(line, { maxW: W - inset * 2 - 20, maxLines: 2, sizes: [50, 46, 42, 38] }) : null;
  if (t && t.lines.length > 1) t = { size: t.size, lines: balanced(line, t.size, W - inset * 2 - 20) }; // دو خطِ هم‌اندازه، نه یه کلمه‌یِ تنها
  const bandH = t ? Math.round(t.lines.length * t.size * LH + 70) : 0;
  const fw = W - m * 2,
    fh = H - m * 2 - bandH;
  // برش حولِ جایِ طرح (Gemini/design-box) تا طرح هیچ‌وقت بیرون نیفته؛ بدونِ جایِ طرح، رفتارِ امنِ
  // framePhoto. («attention»ِ sharp امتحان شد و رویِ کفشِ کنارِ لباس زوم کرد، پس نه.)
  let buffer;
  const meta = await sharp(photoBytes).metadata();
  const r0 = meta.width / meta.height;
  if (!designBox && r0 > fw / fh && 1 - fw / fh / r0 <= 0.35) {
    // جایِ طرح معلوم نیست ولی عکس عریضه: طرح معمولاً وسطه، پس برشِ وسط به‌جایِ حاشیه‌یِ تار
    buffer = await sharp(photoBytes).resize({ width: fw, height: fh, fit: "cover", position: "centre", kernel: "lanczos3" }).toBuffer();
  } else {
    buffer = (await framePhoto(photoBytes, fw, fh, designBox ? { ...designBox, headTop: null } : null)).buffer;
  }
  const mask = Buffer.from(`<svg width="${fw}" height="${fh}"><path d="M0 ${R} Q0 0 ${R} 0 H${fw - R} Q${fw} 0 ${fw} ${R} V${fh} H0 Z" fill="#fff"/></svg>`);
  const photo = await sharp(buffer).resize(fw, fh).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const icon = await asset("palas-mark.png", { height: 46 });
  const brand = brandPill({ right: W - inset, top: inset, h: 64, icon });
  // نوارِ پایین پس‌زمینه داره؛ قابِ کلی فقط خط (عکس زیرِ این لایه‌ست)
  let svg = `<path d="M${m} ${m + fh} H${W - m} V${H - m - R} Q${W - m} ${H - m} ${W - m - R} ${H - m} H${m + R} Q${m} ${H - m} ${m} ${H - m - R} Z" fill="${C.b50}"/>`;
  svg += `<rect x="${m}" y="${m}" width="${fw}" height="${H - m * 2}" rx="${R}" fill="none" stroke="${C.ink}" stroke-width="3"/>` + brand.svg;
  svg += `<line x1="${m}" y1="${m + fh}" x2="${W - m}" y2="${m + fh}" stroke="${C.ink}" stroke-width="3"/>`;
  if (t) svg += textLines({ lines: t.lines, size: t.size, x: W - inset, y: m + fh + 35 + t.size * 0.95 });
  if (tag) {
    const p = pill({ x: W - inset, y: m + fh - 80, h: 58, text: tag, fill: LIGHT.red, color: LIGHT.onRed });
    svg += p.svg;
  }
  return compose(W, H, C.bone, [{ input: photo, left: m, top: m }], svg, [brand.layer]);
}

// ---------------------------------------------------------------------------
// اسلایدِ رنگ و سایز: همه‌یِ رنگ‌هایِ همین محصول (با اسم) + جدولِ سایزِ خودِ سایت
// ---------------------------------------------------------------------------
const SIZE_CHART = require(path.join(__dirname, "..", "data", "size-chart.json"));
const faDigitsR = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

function sizeTable(table, { x, y, w }) {
  // x = لبه‌یِ راست؛ ستون‌ها از راست: سایز | عرضِ سینه | قد
  const rowH = 46;
  const cols = [0.3, 0.35, 0.35].map((f) => f * w);
  let svg = `<text x="${x}" y="${y + 30}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="28" fill="${C.red}">${esc(table.cut)}</text>`;
  const yy = y + 48;
  svg += `<rect x="${x - w}" y="${yy}" width="${w}" height="${rowH * (table.rows.length + 1)}" rx="16" fill="${C.b50}" stroke="${C.ink}" stroke-width="2.5"/>`;
  const cell = (ci, ri, text, { latin = false, size = 26, color = C.ink } = {}) => {
    const cx = x - cols.slice(0, ci).reduce((a, b) => a + b, 0) - cols[ci] / 2;
    return `<text x="${cx}" y="${yy + ri * rowH + rowH * 0.66}" text-anchor="middle" ${latin ? "" : 'direction="rtl"'} font-family="${latin ? LATIN : FA}" font-size="${size}" fill="${color}">${esc(text)}</text>`;
  };
  ["سایز", "عرض سینه", "قد"].forEach((h, ci) => (svg += cell(ci, 0, h, { color: C.g40, size: 22 })));
  table.rows.forEach(([z, chest, len], i) => {
    const ri = i + 1;
    svg += `<line x1="${x - w + 14}" y1="${yy + ri * rowH}" x2="${x - 14}" y2="${yy + ri * rowH}" stroke="${C.b200}" stroke-width="2"/>`;
    svg += cell(0, ri, z, { latin: true });
    svg += cell(1, ri, faDigitsR(chest));
    svg += cell(2, ri, faDigitsR(len));
  });
  return svg;
}

async function renderChart({ facts, category, title, format = "post" }) {
  const { W, H } = FORMATS[format];
  const m = 26,
    R = 30,
    inset = 84;
  const icon = await asset("palas-mark.png", { height: 46 });
  const brand = brandPill({ right: W - inset, top: inset, h: 64, icon });
  let svg = `<rect x="${m}" y="${m}" width="${W - m * 2}" height="${H - m * 2}" rx="${R}" fill="${C.bone}" stroke="${C.ink}" stroke-width="3"/>` + brand.svg;
  let y = 206;
  svg += `<text x="${W - inset}" y="${y}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="28" fill="${C.red}">رنگ و سایز</text>`;
  const t = fit(title || "رنگ و سایزتو از این‌جا انتخاب کن", { maxW: W - inset * 2, maxLines: 2, sizes: [58, 52, 46, 42] });
  svg += textLines({ lines: t.lines, size: t.size, x: W - inset, y: y + 20 + t.size });
  y += 20 + t.lines.length * t.size * LH + 18;

  // جدولِ سایز (پایین) — اول ارتفاعش حساب می‌شه تا رنگ‌ها بقیه‌یِ جا رو بگیرن
  const tables = SIZE_CHART[category] || [];
  const footH = 70;
  const cw = W - inset * 2;
  const tw = tables.length > 1 ? (cw - 28) / 2 : cw;
  const maxRows = Math.max(0, ...tables.map((tb) => tb.rows.length));
  const tableH = tables.length ? 48 + 46 * (maxRows + 1) : 0;
  const tableTop = H - m - footH - tableH - 24;

  const colors = (facts?.colors || []).filter((c) => c !== "کرمی" || !(facts.colors || []).includes("کرم"));
  if (colors.length) {
    svg += `<text x="${W - inset}" y="${y + 30}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="28" fill="${C.g20}">${faDigitsR(colors.length)} رنگ</text>`;
    const top = y + 54;
    const avail = tableTop - 30 - top;
    const cols = colors.length > 24 ? 7 : colors.length > 12 ? 6 : colors.length > 8 ? 5 : 4;
    const rows = Math.ceil(colors.length / cols);
    const cellW = cw / cols;
    // رنگِ کم → دایره و اسمِ درشت‌تر؛ کلِ بلوک وسطِ جایِ خالی می‌شینه (جایِ خالیِ بزرگ نمی‌مونه)
    const rowH = Math.min(190, avail / rows);
    const r = Math.max(14, Math.min(52, rowH * 0.3));
    const fs = Math.max(16, Math.min(30, rowH * 0.2));
    const blockTop = top + Math.max(0, (avail - rows * rowH) / 2);
    colors.forEach((name, i) => {
      const c = i % cols,
        row = Math.floor(i / cols);
      const cx = W - inset - cellW * c - cellW / 2;
      const cy = blockTop + row * rowH + r + 4;
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${SWATCH[name] || C.b400}" stroke="${C.ink}" stroke-opacity="0.55" stroke-width="2"/>`;
      // اسم کامل (مثلاً «سبز مغز پسته‌ای»)؛ اگه جا نشد کوچیک‌تر، و آخرش دو خط
      const sizes = [fs, fs - 2, fs - 4, fs - 6].map(Math.round).filter((v) => v >= 12);
      let f = fit(name, { maxW: cellW - 6, maxLines: 1, sizes });
      if (f.lines.join(" ") !== name) f = fit(name, { maxW: cellW - 6, maxLines: 2, sizes });
      f.lines.forEach((ln, li) => {
        svg += `<text x="${cx}" y="${cy + r + f.size + 4 + li * f.size * 1.15}" text-anchor="middle" direction="rtl" font-family="${FA}" font-size="${f.size}" fill="${C.g20}">${esc(ln)}</text>`;
      });
    });
  }

  let tx = W - inset;
  for (const tb of tables) {
    svg += sizeTable(tb, { x: tx, y: tableTop, w: tw });
    tx -= tw + 28;
  }
  if (!tables.length && facts?.sizesText) {
    svg += `<text x="${W - inset}" y="${tableTop + 60}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="40" fill="${C.ink}">سایز: ${esc(facts.sizesText)}</text>`;
  }

  // پایین: قیمت + پرداخت (بدونِ «·» که شبیهِ صفرِ فارسیه)
  const foot = [tables.length ? "اندازه‌ها به سانتی‌متر" : null, facts?.priceText || null, "قسطی با دیجی‌پی"].filter(Boolean).join("، ");
  const url = pill({ x: inset, y: H - m - footH + 6, h: 52, text: "miztore.com", fill: C.red, color: C.onRed, family: LATIN, anchor: "left" });
  const ff = fit(foot, { maxW: W - inset * 2 - url.w - 24, maxLines: 1, sizes: [26, 24, 22, 20] });
  svg += `<text x="${W - inset}" y="${H - m - footH + 42}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${ff.size}" fill="${C.g40}">${esc(ff.lines[0] || "")}</text>` + url.svg;
  return compose(W, H, C.bone, [], svg, [brand.layer]);
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
  if (id === "sizes") return pad * 2 + 2 * 84 * s + 12 * s + 48 * s;
  if (id === "big") return pad * 2 + 96 * s + 30 * s + (panel.sub ? 2 * 34 * s * LH : 0);
  if (id === "list") return pad * 2 + (panel.items || []).length * 72 * s;
  return pad * 2 + 150 * s + 44 * s + 56 * s;
}

function servicePanel(panel, { x, y, w, h, s }) {
  const id = panel.type;
  let svg = `<rect x="${x - 9 * s}" y="${y + 9 * s}" width="${w}" height="${h}" rx="${22 * s}" fill="${C.shadow}"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${22 * s}" fill="${C.bone}" stroke="${C.ink}" stroke-width="${3 * s}"/>`;
  const pad = 28 * s;
  if (id === "colors") {
    const names = Object.keys(SWATCH).filter((n) => n !== "کرمی");
    // دایره‌ها تا جایی که پنل جا داره بزرگ می‌شن (پنل فضایِ خالیِ زیرِ دکمه رو پر می‌کنه)
    const gap = 14 * s;
    const grid = (rr) => {
      const cols = Math.max(4, Math.floor((w - pad * 2 + gap) / (rr * 2 + gap)));
      return { cols, rows: Math.ceil(names.length / cols) };
    };
    let r = 22 * s;
    for (let rr = 40 * s; rr > 22 * s; rr -= 1 * s) {
      const g = grid(rr);
      if (g.rows * (rr * 2 + gap) - gap + pad * 2 <= h) {
        r = rr;
        break;
      }
    }
    const { cols, rows } = grid(r);
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
    const cw = (w - pad * 2 - gap * (cols - 1)) / cols;
    const ch = Math.max(84 * s, Math.min(170 * s, (h - pad * 2 - gap - 48 * s) / 2)); // خانه‌ها کشیده می‌شن تا پنل پر بشه
    table.forEach(([z, chest], i) => {
      const c = i % cols, row = Math.floor(i / cols);
      const cx = x + w - pad - cw - c * (cw + gap);
      const cy = y + pad + row * (ch + gap);
      const on = z === "L";
      svg += `<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="${14 * s}" fill="${on ? C.ink : C.b50}" stroke="${C.ink}" stroke-width="${2.5 * s}"/>`;
      const k = ch / (104 * s);
      const zs = 34 * s * Math.min(k, 1.35);
      const cs = 24 * s * Math.min(k, 1.25);
      const top = cy + (ch - (zs + cs + 14 * s * k)) / 2;
      svg += `<text x="${cx + cw / 2}" y="${top + zs * 0.8}" text-anchor="middle" font-family="${LATIN}" font-size="${zs}" fill="${on ? C.b50 : C.ink}">${z}</text>`;
      svg += `<text x="${cx + cw / 2}" y="${top + zs + 14 * s * k + cs * 0.75}" text-anchor="middle" direction="rtl" font-family="${FA}" font-size="${cs}" fill="${on ? C.b200 : C.g40}">سینه ${faDigits(chest)}</text>`;
    });
    const foot = fit("عرضِ سینه به سانتی‌متر، تیشرت اسلیم", { maxW: w - pad * 2, maxLines: 1, sizes: [24, 22, 20, 18].map((v) => Math.round(v * s)) });
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
      const p = pill({ x: cx, y: cy, h: chipH, text: t, fill: i === last ? C.red : C.b50, color: i === last ? C.onRed : C.ink, stroke: i === last ? null : C.ink });
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
  const c = pill({ x: W - inset, y, h: Math.round(72 * s), text: cta, fill: C.red, color: C.onRed });
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
    // پنل تا حدی کش میاد که فاصله‌یِ خالیِ زیرِ دکمه پر بشه (نه یه جعبه‌یِ کوچیک ته صفحه)
    const stretch = { sizes: 1.7, colors: 1.8, list: 1.5, big: 1.5, steps: 1.35 }[panel.type] || 1;
    const ph = Math.round(Math.min(room, need * stretch));
    if (need <= room) svg += servicePanel(panel, { x: px, y: Math.round(bottomY - ph), w: pw, h: ph, s });
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
  // عکس‌هایِ محصولِ سایت استودیویی‌ان؛ زوم رویِ طرح (سینه‌یِ لباس) تا طرح تو کارت دیده بشه
  const box = await studioDesignBox(bytes).catch(() => null);
  if (box) return (await studioCrop(bytes, box, w, h, { fill: 0.74 })).buffer;
  return sharp(bytes).resize(w, h, { fit: "contain", background: C.photo }).flatten({ background: C.photo }).png().toBuffer();
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
    `<rect x="${x - sh}" y="${y + sh}" width="${w}" height="${h}" rx="${r}" fill="${C.shadow}"/>` +
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
  const url = pill({ x: W - inset, y: bottomSafe - Math.round(60 * s), h: Math.round(60 * s), text: "miztore.com", fill: C.red, color: C.onRed, family: LATIN });
  const note = `<text x="${W - inset - url.w - Math.round(20 * s)}" y="${bottomSafe - Math.round(20 * s)}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${Math.round(26 * s)}" fill="${C.g40}">قسطی با دیجی‌پی، ۷ روز ضمانتِ بازگشت</text>`;
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
  svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.red}" stroke="${C.ink}" stroke-width="${4 * s}"/><text x="${cx}" y="${cy + r * 0.32}" text-anchor="middle" direction="rtl" font-family="${FA}" font-size="${Math.round(44 * s)}" fill="${C.onRed}">یا</text>`;
  svg += `<text x="${W / 2}" y="${bottomSafe + Math.round(66 * s)}" text-anchor="middle" direction="rtl" font-family="${FA}" font-size="${Math.round(32 * s)}" fill="${C.g40}">${format === "story" ? "تو نظرسنجیِ پایین جواب بده" : "جوابتو کامنت کن: الف یا ب؟"}</text>`;
  return compose(W, H, C.bone, [svgLayer(W, H, grid.under), ...grid.layers], brand.svg + grid.over + svg, [brand.layer]);
}

// ---------------------------------------------------------------------------
// «معرفیِ محصول»: عکسِ خودِ محصول (زوم رویِ طرح) + یه جنبه‌یِ واقعی از صفحه‌یِ
// محصول: رنگ‌ها (swatches)، سایزها (chips)، جنس و کیفیت (list)، مدل‌هایِ دوخت (cuts).
// ---------------------------------------------------------------------------
const SPOT_PAD = 26;

function swatchLayout(panel, w, s) {
  const names = panel.colors.filter((n) => SWATCH[n]);
  const labeled = names.length <= 10;
  const r = (labeled ? 30 : 21) * s;
  const gap = 14 * s;
  const fs = Math.round(21 * s);
  const cellW = labeled ? Math.max(r * 2, ...names.map((n) => textWidth(n, fs))) + 8 * s : r * 2;
  const cellH = r * 2 + (labeled ? 38 * s : 0);
  const cols = Math.max(3, Math.floor((w - SPOT_PAD * 2 * s + gap) / (cellW + gap)));
  const rows = Math.ceil(names.length / cols);
  return { names, labeled, r, gap, fs, cellW, cellH, cols, rows, h: SPOT_PAD * 2 * s + rows * cellH + (rows - 1) * gap };
}

function chipRows(items, w, s, h, family) {
  const gap = 12 * s;
  const rows = [[]];
  let used = 0;
  for (const t of items) {
    const cw = textWidth(t, Math.round(h * (family === LATIN ? 0.4 : 0.44)), family) + h * 0.9;
    if (used && used + gap + cw > w) {
      rows.push([]);
      used = 0;
    }
    rows[rows.length - 1].push(t);
    used += (used ? gap : 0) + cw;
  }
  return rows;
}

// متنِ ردیف‌ها بریده نمی‌شه: اول کوچیک‌تر، بعد دوخطی
function rowFit(text, maxW, s, big = 32) {
  const sizes = [big, big - 2, big - 4, big - 6, big - 8, big - 10].map((v) => Math.round(v * s));
  const one = fit(text, { maxW, maxLines: 1, sizes });
  if (wrap(text, one.size, maxW).length <= 1) return one;
  return fit(text, { maxW, maxLines: 3, sizes: sizes.slice(2) });
}
const listW = (w, s) => w - SPOT_PAD * 2 * s - 38 * s - 16 * s;
const listRowH = (t, w, s) => {
  const f = rowFit(t, listW(w, s), s);
  return Math.max(64 * s, f.lines.length * f.size * LH + 18 * s);
};
const cutPillW = (name, s) => textWidth(name, Math.round(52 * s * 0.44)) + 52 * s * 0.9;
const cutRowH = (rw, w, s) => {
  const f = rowFit(rw.desc, w - SPOT_PAD * 2 * s - cutPillW(rw.name, s) - 16 * s, s, 28);
  return Math.max(74 * s, f.lines.length * f.size * LH + 22 * s);
};

function spotPanelHeight(panel, w, s) {
  const pad = SPOT_PAD * 2 * s;
  if (panel.type === "swatches") return swatchLayout(panel, w, s).h;
  if (panel.type === "chips") return pad + chipRows(panel.items, w - pad, s, 64 * s, LATIN).length * 76 * s - 12 * s + (panel.foot ? 46 * s : 0);
  if (panel.type === "list") return pad + panel.items.reduce((a, t) => a + listRowH(t, w, s), 0);
  if (panel.type === "cuts") return pad + panel.rows.reduce((a, rw) => a + cutRowH(rw, w, s), 0);
  return 0;
}

function spotPanel(panel, { x, y, w, h, s }) {
  const pad = SPOT_PAD * s;
  let svg =
    `<rect x="${x - 9 * s}" y="${y + 9 * s}" width="${w}" height="${h}" rx="${22 * s}" fill="${C.shadow}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${22 * s}" fill="${C.b50}" stroke="${C.ink}" stroke-width="${3 * s}"/>`;
  if (panel.type === "swatches") {
    const L = swatchLayout(panel, w, s);
    L.names.forEach((n, i) => {
      const c = i % L.cols,
        row = Math.floor(i / L.cols);
      const cx = x + w - pad - L.cellW / 2 - c * (L.cellW + L.gap);
      const cy = y + pad + row * (L.cellH + L.gap) + L.r;
      svg += `<circle cx="${cx}" cy="${cy}" r="${L.r}" fill="${SWATCH[n]}" stroke="${C.ink}" stroke-opacity="0.55" stroke-width="${2 * s}"/>`;
      if (L.labeled) svg += `<text x="${cx}" y="${cy + L.r + 30 * s}" text-anchor="middle" direction="rtl" font-family="${FA}" font-size="${L.fs}" fill="${C.g40}">${esc(n)}</text>`;
    });
  } else if (panel.type === "chips") {
    const ch = 64 * s;
    chipRows(panel.items, w - pad * 2, s, ch, LATIN).forEach((row, ri) => {
      let cx = x + w - pad;
      row.forEach((t) => {
        const p = pill({ x: cx, y: y + pad + ri * 76 * s, h: ch, text: t, fill: C.b50, color: C.ink, stroke: C.ink, family: LATIN });
        svg += p.svg;
        cx -= p.w + 12 * s;
      });
    });
    if (panel.foot) {
      const f = fit(panel.foot, { maxW: w - pad * 2, maxLines: 1, sizes: [26, 24, 22, 20].map((v) => Math.round(v * s)) });
      svg += `<text x="${x + w - pad}" y="${y + h - pad * 0.9}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${f.size}" fill="${C.g40}">${esc(f.lines[0] || "")}</text>`;
    }
  } else if (panel.type === "list") {
    let ry = y + pad;
    panel.items.forEach((t) => {
      const rh = listRowH(t, w, s);
      const cy = ry + rh / 2;
      const r = 19 * s;
      const cx = x + w - pad - r;
      svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.red}"/><path d="M${cx - 8 * s} ${cy} l${5.5 * s} ${5.5 * s} l${10.5 * s} ${-10.5 * s}" fill="none" stroke="${C.onRed}" stroke-width="${3.6 * s}" stroke-linecap="round" stroke-linejoin="round"/>`;
      const f = rowFit(t, listW(w, s), s);
      const y0 = cy - ((f.lines.length - 1) * f.size * LH) / 2 + f.size * 0.36;
      svg += textLines({ lines: f.lines, size: f.size, x: cx - r - 16 * s, y: y0, lh: LH });
      ry += rh;
    });
  } else if (panel.type === "cuts") {
    let ry = y + pad;
    panel.rows.forEach((rw) => {
      const rh = cutRowH(rw, w, s);
      const p = pill({ x: x + w - pad, y: ry + rh / 2 - 26 * s, h: 52 * s, text: rw.name, fill: C.ink, color: C.b50 });
      svg += p.svg;
      const f = rowFit(rw.desc, w - pad * 2 - p.w - 16 * s, s, 28);
      const y0 = ry + rh / 2 - ((f.lines.length - 1) * f.size * LH) / 2 + f.size * 0.36;
      svg += textLines({ lines: f.lines, size: f.size, x: x + w - pad - p.w - 16 * s, y: y0, color: C.g20, lh: LH });
      ry += rh;
    });
  }
  return svg;
}

async function spotPhoto(bytes, w, h, fill = 0.5) {
  const box = await studioDesignBox(bytes).catch(() => null);
  if (box) return (await studioCrop(bytes, box, w, h, { fill })).buffer;
  return sharp(bytes).flatten({ background: C.photo }).resize(w, h, { fit: "cover", position: "attention" }).jpeg({ quality: 95 }).toBuffer();
}

function titleFit(text, maxW, sizes, maxLines) {
  for (const sz of sizes) {
    const l = balanced(text, sz, maxW);
    if (l) return { lines: l, size: sz };
  }
  return fit(text, { maxW, maxLines, sizes: [sizes[sizes.length - 1]] });
}

async function renderSpotlight({ format, photoBytes, kind, name, priceText, eyebrow, title, panel }) {
  const { W, H } = FORMATS[format];
  const split = W >= H; // مربعی/افقی: عکس چپ، متن راست
  const s = (split ? H : W) / 1080;
  const m = Math.round(26 * s),
    R = Math.round(30 * s),
    inset = Math.round(56 * s);
  const icon = await asset("palas-mark.png", { height: Math.round(46 * s) });
  const over = [];
  const under = [];
  let svg = "";
  const metaRow = (right, y, maxW) => {
    let out = "";
    let x = right;
    if (priceText) {
      const p = pill({ x, y, h: Math.round(50 * s), text: priceText, fill: C.red, color: C.onRed });
      out += p.svg;
      x -= p.w + Math.round(16 * s);
    }
    const nameW = Math.max(60, x - (right - maxW));
    const nsz = [30, 28, 26, 24, 22].map((v) => Math.round(v * s));
    let nm = name;
    if (wrap(nm, nsz[nsz.length - 1], nameW).length > 1) nm = nm.split("،")[0].trim();
    const f = fit(nm, { maxW: nameW, maxLines: 1, sizes: nsz });
    if (wrap(nm, f.size, nameW).length > 1) f.lines = [];
    out += `<text x="${x}" y="${y + Math.round(35 * s)}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${f.size}" fill="${C.g40}">${esc(f.lines[0] || "")}</text>`;
    return out;
  };

  if (!split) {
    const story = format === "story";
    const bottom = story ? H - Math.round(250 * s) : H - Math.round(44 * s);
    const pw = W - inset * 2;
    const ph = spotPanelHeight(panel, pw - Math.round(9 * s), s);
    const mascot = await asset(pickMascot(title), { height: Math.round((story ? 230 : 200) * s) });
    const tMaxW = pw - mascot.w - Math.round(12 * s);
    const t = titleFit(title, tMaxW, (story ? [88, 80, 72, 64, 58] : [72, 66, 60, 54, 50]).map((v) => Math.round(v * s)), 2);
    const gap = Math.round(30 * s);
    const textH = Math.round(44 * s) + Math.round(t.lines.length * t.size * LH) + Math.round(66 * s);
    const photoTop = m;
    const photoH = Math.round(bottom - ph - gap - textH - gap - photoTop);
    const fw = W - m * 2;
    const photo = await roundedPhoto(await spotPhoto(photoBytes, fw, photoH), fw, photoH, R);
    under.push({ input: photo, left: m, top: photoTop });
    svg += `<rect x="${m}" y="${photoTop}" width="${fw}" height="${photoH}" rx="${R}" fill="none" stroke="${C.ink}" stroke-width="${3 * s}"/>`;
    const pillTop = story ? Math.round(210 * s) : m + Math.round(26 * s);
    const brand = brandPill({ right: W - inset, top: pillTop, h: Math.round(64 * s), icon });
    svg += brand.svg + pill({ x: inset, y: pillTop + Math.round(6 * s), h: Math.round(52 * s), text: kind || "میزطوری", fill: C.ink, color: C.b50, anchor: "left" }).svg;
    over.push(brand.layer);
    let y = photoTop + photoH + gap;
    svg += `<text x="${W - inset}" y="${y + Math.round(30 * s)}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${Math.round(30 * s)}" fill="${C.red}">${esc(eyebrow)}</text>`;
    y += Math.round(44 * s);
    svg += textLines({ lines: t.lines, size: t.size, x: W - inset, y: y + t.size, lh: LH });
    y += Math.round(t.lines.length * t.size * LH) + Math.round(8 * s);
    svg += metaRow(W - inset, y, tMaxW);
    over.push({ input: mascot.buffer, left: inset - Math.round(8 * s), top: Math.round(y + 58 * s - mascot.h) });
    svg += spotPanel(panel, { x: inset + Math.round(9 * s), y: bottom - ph, w: pw - Math.round(9 * s), h: ph, s });
  } else {
    const pw0 = Math.round(W * (panel.type === "list" || panel.type === "cuts" ? 0.44 : 0.5)) - m; // متنِ بلندتر → ستونِ متن پهن‌تر
    const phH = H - m * 2;
    const photo = await roundedPhoto(await spotPhoto(photoBytes, pw0, phH, 0.8), pw0, phH, R);
    under.push({ input: photo, left: m, top: m });
    svg += `<rect x="${m}" y="${m}" width="${pw0}" height="${phH}" rx="${R}" fill="none" stroke="${C.ink}" stroke-width="${3 * s}"/>`;
    svg += pill({ x: m + Math.round(22 * s), y: m + Math.round(22 * s), h: Math.round(52 * s), text: kind || "میزطوری", fill: C.ink, color: C.b50, anchor: "left" }).svg;
    const colL = m + pw0 + Math.round(44 * s),
      colR = W - inset,
      cw = colR - colL;
    const brand = brandPill({ right: colR, top: inset, h: Math.round(64 * s), icon });
    svg += brand.svg;
    over.push(brand.layer);
    const ph = spotPanelHeight(panel, cw - Math.round(9 * s), s);
    const panelTop = H - inset - ph;
    let y = inset + Math.round(110 * s);
    const room = panelTop - Math.round(30 * s) - y - Math.round(44 * s) - Math.round(66 * s);
    let t = null;
    for (const sz of [66, 60, 54, 48].map((v) => Math.round(v * s))) {
      const bl = balanced(title, sz, cw);
      if (bl && bl.length * sz * LH <= room) {
        t = { lines: bl, size: sz };
        break;
      }
    }
    for (const sz of [66, 60, 54, 48, 44, 40].map((v) => Math.round(v * s))) {
      if (t) break;
      const tt = fit(title, { maxW: cw, maxLines: 3, sizes: [sz] });
      if (tt.lines.length * sz * LH <= room || sz <= 40 * s) {
        t = tt;
        break;
      }
    }
    svg += `<text x="${colR}" y="${y + Math.round(30 * s)}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${Math.round(30 * s)}" fill="${C.red}">${esc(eyebrow)}</text>`;
    y += Math.round(44 * s);
    svg += textLines({ lines: t.lines, size: t.size, x: colR, y: y + t.size, lh: LH });
    y += Math.round(t.lines.length * t.size * LH) + Math.round(8 * s);
    svg += metaRow(colR, y, cw);
    svg += spotPanel(panel, { x: colL + Math.round(9 * s), y: panelTop, w: cw - Math.round(9 * s), h: ph, s });
  }
  return compose(W, H, C.bone, under, svg, over);
}

// سازگاری با کدِ قدیمی
function pickTemplateName() {
  return "frame";
}
const TEMPLATES = { frame: {} };

module.exports = { setTheme, renderSpotlight, renderPost, renderDetail, renderInfo, renderAlt, renderChart, renderServicePost, renderGrid, renderVersus, fetchBytes, FORMATS, pickTemplateName, TEMPLATES };

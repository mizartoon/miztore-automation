/**
 * render.js — پیاده‌سازیِ کدیِ قالب «Bright Editorial» (همون سیستمِ فیگمای
 * Miztore Content Wireframes → MIZTORE — BRIGHT EDITORIAL REDESIGN). این
 * فایل جایگزینِ کاملِ قالبِ تیره‌ی قبلی‌ست؛ از این به بعد هر پستی از همین
 * قالب رد می‌شه.
 *
 * منبعِ طراحی: فایلِ فیگمای Miztore-Content-Wireframes (fileKey
 * rnz6DEitW8QkajI8r86fuk)، فریم‌های ۲۲:۳ (IG Post 4:5)، ۲۲:۲۷ (Telegram
 * 1:1) و ۲۲:۴۶ (Story 9:16) — همون سه فرمتی که این pipeline تولید می‌کنه.
 * مختصات/رنگ‌ها مستقیماً از همون فریم‌ها گرفته شده.
 *
 * چون این pipeline فقط یک عکسِ محصول + یک هوک + یک CTA + یک category داره
 * (نه محتوای جدا برای هر خونه‌ی تزئینیِ فیگما)، چند تا خونه‌ی هم‌نقش در
 * وایرفریم (مثلاً دو تا هدلاین، یا CTA pill + یک متنِ بزرگ‌ترِ مشابه) روی
 * هم تجمیع شدن تا هیچ فیلدی دو بار تکراری نشه: هوک اصلی → بزرگ‌ترین هدلاین
 * فرمت؛ CTA_POOL → کارت/بلاکِ رنگیِ برجسته (استیتمنتِ بولد)؛ category →
 * یک برچسبِ کوچیک؛ بقیه (عدد، «جدید»، تگ کانال) تزئینیِ ثابتن، چون داده‌ی
 * پویا براشون وجود نداره.
 *
 * قانون سخت‌گیرانه‌ی کاربر (بدون تغییر): طرح تیشرت هرگز نباید کراپ بشه —
 * fit:"inside" همیشه (کل عکس همیشه دیده می‌شه، نه crop-to-fill).
 */

const sharp = require("sharp");
const { Resvg } = require("@resvg/resvg-js");
const path = require("path");
const fs = require("fs");

const COLOR_INK = "#0B0B0B";
const COLOR_BONE = "#F4F1EA";
const COLOR_RED = "#C90000";
const COLOR_ORANGE = "#F29433";
const COLOR_YELLOW = "#FADE54";
const COLOR_BLUE = "#477ACC";

const FONT_DIR = path.join(__dirname, "..", "fonts");
const FONT_FILES = [
  "Tlesk-Thin.ttf",
  "Tlesk-Light.ttf",
  "Tlesk-Regular.ttf",
  "Tlesk-Medium.ttf",
  "Tlesk-Semibold.ttf",
  "Tlesk-Bold.ttf",
  "Tlesk-Extarbold.ttf",
  "Tlesk-Black.ttf",
].map((f) => path.join(FONT_DIR, f));

const PALLAS_SVG = fs.readFileSync(path.join(__dirname, "..", "assets", "pallas.svg"), "utf-8");
const PALLAS_ASPECT = 442 / 361;

async function fetchBytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`دانلود ${url} شکست خورد: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Telesk گلیف em-dash/en-dash (—/–) ندارد — قبل از escape با «،» جایگزین می‌شود
const escape = (s) =>
  String(s)
    .replace(/[—–]/g, "،")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// تخمینِ عرضِ هر حرفِ فارسیِ بولدِ تلسک — برای بج و wrap
const estCharWidth = (fontSize) => fontSize * 0.58;

// اگه هوکِ ژنراتور طولانی‌تر از حدِ معمول دربیاد (باید ۲-۵ کلمه باشه، ولی
// نمی‌شه صد در صد بهش تکیه کرد)، به‌جای اورفلو رفتن به فونتِ کوچیک‌تر
// سوییچ می‌کنیم تا همیشه توی محدوده‌ی مجاز بمونه.
function fitWrappedText(text, { sizes, maxWidth, maxLines }) {
  const totalWords = String(text).trim().split(/\s+/).filter(Boolean).length;
  for (const fontSize of sizes) {
    const lines = wrapText(text, fontSize, maxWidth, maxLines);
    const coveredWords = lines.join(" ").trim().split(/\s+/).filter(Boolean).length;
    if (coveredWords >= totalWords) return { lines, fontSize };
  }
  const fontSize = sizes[sizes.length - 1];
  return { lines: wrapText(text, fontSize, maxWidth, maxLines), fontSize };
}

function wrapText(text, fontSize, maxWidth, maxLines = 3) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const maxChars = Math.max(1, Math.floor(maxWidth / estCharWidth(fontSize)));
  const lines = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines);
}

// چند خط RTL راست‌چین روی هم — هر خط یه <text> جدا (نه tspan+dy) چون resvg
// در ترکیبِ direction="rtl" + چند tspan با dy گاهی گلیف‌ها رو قاطی می‌کنه.
// anchor می‌تونه "end" (راست‌چین) یا "middle" (وسط‌چین، برای بلاک‌های باریکِ
// عمودی) باشه.
function multilineText({ x, y, lines, fontSize, weight, color, anchor = "end", lineHeight = 1.18 }) {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * fontSize * lineHeight}" text-anchor="${anchor}" direction="rtl" font-family="Telesk" font-weight="${weight}" font-size="${fontSize}" fill="${color}">${escape(line)}</text>`
    )
    .join("");
}

function pill({ x, y, w, h, fill }) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}"/>`;
}

async function fitPhoto(photoBytes, boxW, boxH) {
  const resized = await sharp(photoBytes)
    .resize({ width: boxW, height: boxH, fit: "inside" })
    .toBuffer({ resolveWithObject: true });
  return { buffer: resized.data, w: resized.info.width, h: resized.info.height };
}

async function pallasPng(height) {
  const w = Math.round(height * PALLAS_ASPECT);
  return sharp(Buffer.from(PALLAS_SVG)).resize(w, height).png().toBuffer();
}

function renderSvgToPng(svg, width) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Telesk" },
  });
  return resvg.render().asPng();
}

// ---------------------------------------------------------------------------
// IG POST — 1080×1350  (منبع: فریم فیگمای «REDESIGN — IG POST 4:5»، ۲۲:۳)
// ---------------------------------------------------------------------------
async function renderPostFormat({ photoBytes, headline, cta, categoryLabel }) {
  const W = 1080, H = 1350;
  const photoBox = { x: 350, y: 320, w: 690, h: 650 };
  const photo = await fitPhoto(photoBytes, photoBox.w, photoBox.h);
  const photoX = photoBox.x + Math.round((photoBox.w - photo.w) / 2);
  const photoY = photoBox.y + Math.round((photoBox.h - photo.h) / 2);

  const ctaLines = wrapText(cta, 44, 300, 2);
  const { lines: headlineLines, fontSize: headlineSize } = fitWrappedText(headline, {
    sizes: [58, 50, 44],
    maxWidth: 690,
    maxLines: 2,
  });
  const headlineY = headlineLines.length > 1 ? 145 : 165;
  const pallasH = 68;
  const pallasW = Math.round(pallasH * PALLAS_ASPECT);
  const pallasX = 80;
  const pallasY = 1085 - pallasH - 16;

  const svg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="${COLOR_BONE}"/>

      <!-- گوشه‌ی قرمزِ تزئینی -->
      <rect x="830" y="0" width="250" height="250" rx="0" fill="${COLOR_RED}"/>

      <!-- مدال زردِ "جدید" -->
      <circle cx="195" cy="177" r="95" fill="${COLOR_YELLOW}"/>
      <text x="195" y="185" text-anchor="middle" font-family="Telesk" font-weight="800" font-size="30" fill="${COLOR_INK}">جدید</text>

      <!-- برچسبِ دسته -->
      ${pill({ x: 820, y: 235, w: 220, h: 34, fill: COLOR_INK })}
      <text x="930" y="258" text-anchor="middle" font-family="Telesk" font-weight="700" font-size="17" fill="${COLOR_BONE}">${escape(categoryLabel)}</text>

      <!-- هوک اصلی -->
      ${multilineText({ x: 1030, y: headlineY, lines: headlineLines, fontSize: headlineSize, weight: 900, color: COLOR_INK })}

      <!-- کارتِ CTA (مشکی + قرمز) -->
      <rect x="80" y="370" width="420" height="560" rx="32" fill="${COLOR_INK}"/>
      <rect x="108" y="398" width="364" height="504" rx="20" fill="${COLOR_RED}"/>
      ${multilineText({ x: 440, y: 500, lines: ctaLines, fontSize: 44, weight: 800, color: COLOR_BONE })}

      <!-- برچسبِ فروشگاه -->
      ${pill({ x: 830, y: 1015, w: 210, h: 44, fill: COLOR_INK })}
      <text x="935" y="1043" text-anchor="middle" font-family="Telesk" font-weight="700" font-size="19" fill="${COLOR_BONE}">فروشگاه میزطوری</text>

      <!-- دامنه -->
      ${pill({ x: 80, y: 1085, w: 230, h: 52, fill: COLOR_INK })}
      <text x="195" y="1118" text-anchor="middle" font-family="Telesk" font-weight="700" font-size="22" fill="${COLOR_BONE}">MIZTORE.COM</text>

      <!-- وردمارک -->
      <text x="1040" y="1160" text-anchor="end" font-family="Telesk" font-weight="900" font-size="60" fill="${COLOR_INK}">MIZTORE</text>
    </svg>
  `;

  const textPng = renderSvgToPng(svg, W);
  const pallas = await pallasPng(pallasH);

  return sharp({ create: { width: W, height: H, channels: 4, background: COLOR_BONE } })
    .composite([
      { input: textPng, left: 0, top: 0 },
      { input: photo.buffer, left: photoX, top: photoY },
      { input: pallas, left: pallasX, top: pallasY },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// TELEGRAM — 1080×1080  (منبع: فریم فیگمای «REDESIGN — TELEGRAM 1:1»، ۲۲:۲۷)
// ---------------------------------------------------------------------------
async function renderTelegramFormat({ photoBytes, headline, cta, categoryLabel }) {
  const W = 1080, H = 1080;
  const photoBox = { x: 65, y: 100, w: 650, h: 590 };
  const photo = await fitPhoto(photoBytes, photoBox.w, photoBox.h);
  const photoX = photoBox.x + Math.round((photoBox.w - photo.w) / 2);
  const photoY = photoBox.y + Math.round((photoBox.h - photo.h) / 2);

  const headlineLines = wrapText(headline, 46, 250, 4);
  const ctaLines = wrapText(cta, 46, 620, 2);
  const pallasH = 90;
  const pallasW = Math.round(pallasH * PALLAS_ASPECT);
  const pallasX = 790 + Math.round((150 - pallasW) / 2);
  const pallasY = 130;

  const svg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="${COLOR_BONE}"/>

      <!-- پنلِ مشکیِ کناری -->
      <rect x="750" y="0" width="330" height="${H}" fill="${COLOR_INK}"/>
      ${multilineText({ x: 1030, y: 300, lines: headlineLines, fontSize: 46, weight: 900, color: COLOR_BONE })}

      <!-- تگِ کانال -->
      ${pill({ x: 820, y: 820, w: 220, h: 40, fill: COLOR_BONE })}
      <text x="930" y="847" text-anchor="middle" font-family="Telesk" font-weight="700" font-size="17" fill="${COLOR_INK}">MIZTORE / TG</text>

      <!-- بلاکِ نارنجی + شماره -->
      <rect x="65" y="160" width="280" height="360" rx="24" fill="${COLOR_ORANGE}"/>
      <text x="205" y="365" text-anchor="middle" font-family="Telesk" font-weight="900" font-size="90" fill="${COLOR_INK}">۰۱</text>

      <!-- استیتمنتِ CTA -->
      ${multilineText({ x: 715, y: 780, lines: ctaLines, fontSize: 46, weight: 800, color: COLOR_INK })}
      <line x1="65" y1="850" x2="715" y2="850" stroke="${COLOR_INK}" stroke-width="2"/>

      <!-- برچسبِ دسته (بج قرمز) -->
      ${pill({ x: 525, y: 885, w: 190, h: 42, fill: COLOR_RED })}
      <text x="620" y="912" text-anchor="middle" font-family="Telesk" font-weight="700" font-size="18" fill="${COLOR_BONE}">${escape(categoryLabel)}</text>

      <!-- وردمارک -->
      <text x="715" y="1000" text-anchor="end" font-family="Telesk" font-weight="900" font-size="46" fill="${COLOR_INK}">MIZTORE</text>
    </svg>
  `;

  const textPng = renderSvgToPng(svg, W);
  const pallas = await pallasPng(pallasH);

  return sharp({ create: { width: W, height: H, channels: 4, background: COLOR_BONE } })
    .composite([
      { input: textPng, left: 0, top: 0 },
      { input: photo.buffer, left: photoX, top: photoY },
      { input: pallas, left: pallasX, top: pallasY },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// STORY — 1080×1920  (منبع: فریم فیگمای «REDESIGN — STORY 9:16»، ۲۲:۴۶)
// safe zone: بالای ۲۶۰px و پایینِ ۲۵۰px پوشیده می‌شه (نوار پروفایل/CTA
// اینستاگرام) — محتوای اصلی داخلِ همون بازه‌ی میانی می‌مونه.
// ---------------------------------------------------------------------------
async function renderStoryFormat({ photoBytes, headline, cta, categoryLabel }) {
  const W = 1080, H = 1920;
  const photoBox = { x: 380, y: 330, w: 650, h: 910 };
  const photo = await fitPhoto(photoBytes, photoBox.w, photoBox.h);
  const photoX = photoBox.x + Math.round((photoBox.w - photo.w) / 2);
  const photoY = photoBox.y + Math.round((photoBox.h - photo.h) / 2);

  const headlineLines = wrapText(headline, 56, 800, 2);
  const ctaLines = wrapText(cta, 34, 230, 4);
  const pallasH = 74;
  const pallasW = Math.round(pallasH * PALLAS_ASPECT);
  const pallasX = 1020 - pallasW;
  const pallasY = 1670 - pallasH - 20;

  const svg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="${COLOR_BONE}"/>

      <!-- نوارِ قرمزِ بالا -->
      <rect x="0" y="0" width="${W}" height="260" fill="${COLOR_RED}"/>
      ${multilineText({ x: 1030, y: 130, lines: headlineLines, fontSize: 56, weight: 900, color: COLOR_BONE })}

      <!-- بلاکِ آبی: استیتمنتِ CTA -->
      <rect x="60" y="390" width="290" height="500" rx="28" fill="${COLOR_BLUE}"/>
      ${multilineText({ x: 205, y: 570, lines: ctaLines, fontSize: 34, weight: 800, color: COLOR_BONE, anchor: "middle" })}

      <!-- برچسبِ دسته -->
      ${pill({ x: 60, y: 950, w: 290, h: 46, fill: COLOR_YELLOW })}
      <text x="205" y="980" text-anchor="middle" font-family="Telesk" font-weight="700" font-size="19" fill="${COLOR_INK}">${escape(categoryLabel)}</text>

      <!-- نوارِ مشکیِ پایین -->
      <rect x="0" y="1670" width="${W}" height="250" fill="${COLOR_INK}"/>
      <text x="1030" y="1770" text-anchor="end" font-family="Telesk" font-weight="900" font-size="52" fill="${COLOR_BONE}">MIZTORE</text>
      ${pill({ x: 70, y: 1735, w: 250, h: 54, fill: COLOR_BONE })}
      <text x="195" y="1770" text-anchor="middle" font-family="Telesk" font-weight="700" font-size="22" fill="${COLOR_INK}">MIZTORE.COM</text>
    </svg>
  `;

  const textPng = renderSvgToPng(svg, W);
  const pallas = await pallasPng(pallasH);

  return sharp({ create: { width: W, height: H, channels: 4, background: COLOR_BONE } })
    .composite([
      { input: textPng, left: 0, top: 0 },
      { input: photo.buffer, left: photoX, top: photoY },
      { input: pallas, left: pallasX, top: pallasY },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
}

const FORMAT_RENDERERS = {
  post: renderPostFormat,
  telegram: renderTelegramFormat,
  story: renderStoryFormat,
};

const FORMATS = {
  post: { canvasW: 1080, canvasH: 1350 },
  telegram: { canvasW: 1080, canvasH: 1080 },
  story: { canvasW: 1080, canvasH: 1920 },
};

async function renderPost({ photoBytes, headline, cta, categoryLabel, format }) {
  const renderer = FORMAT_RENDERERS[format];
  if (!renderer) throw new Error(`فرمت ناشناخته: ${format}`);
  return renderer({ photoBytes, headline, cta, categoryLabel: categoryLabel || "میزطوری" });
}

module.exports = { renderPost, fetchBytes, FORMATS };

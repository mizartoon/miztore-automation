/**
 * render.js — ترکیب عکس محصول + متن برند + پالاس (شخصیتِ اصلیِ برند) روی
 * یک بومِ ثابت. خروجی: بافر JPEG آماده‌ی پست.
 *
 * طبق Brand System جدید (جایگزینِ کاملِ بریفِ قدیمی): «قالب نباید فقط یک
 * مستطیل با متن و لوگو باشه» — برای همین به‌جای صرفاً وردمارکِ متنی، آیکونِ
 * خودِ پالاس هم تو گوشه‌ست، و CTA به‌جای متنِ ساده یه بج/استمپِ چرخیده‌ست.
 *
 * قانون سخت‌گیرانه‌ی کاربر (بدون تغییر): طرح تیشرت هرگز نباید کراپ بشه —
 * برای همین fit:"inside" (کل عکس همیشه دیده می‌شه، نه crop-to-fill).
 *
 * محدودیتِ واقعی: این عکس‌ها، عکسِ محصولاتِ از قبل تولیدشده‌ن، نه
 * illustration جدیدِ پالاس — پس پالاس این‌جا فقط به‌عنوانِ نشانِ برند/امضا
 * تو گوشه‌ست (دقیقاً همون نقشی که Brand System برای حضورِ حداقلیِ کاراکتر
 * تعریف کرده)، نه ادعای اینکه خودِ طرح روی تیشرت پالاسه.
 */

const sharp = require("sharp");
const { Resvg } = require("@resvg/resvg-js");
const path = require("path");
const fs = require("fs");

const COLOR_INK = "#0B0B0B";
const COLOR_BONE = "#F4F1EA";
const COLOR_RED = "#C90000";

const FONT_BLACK = path.join(__dirname, "..", "fonts", "Tlesk-Black.ttf");
const FONT_BOLD = path.join(__dirname, "..", "fonts", "Tlesk-Bold.ttf");
const PALLAS_SVG = fs.readFileSync(path.join(__dirname, "..", "assets", "pallas.svg"), "utf-8");

// دقیقاً مختصات وایرفریم‌های Figma (صفحه‌ی Wireframes)
const FORMATS = {
  post: {
    canvasW: 1080, canvasH: 1350,
    photoBox: { x: 60, y: 280, w: 960, h: 820 },
    headline: { x: 1020, y: 150, fontSize: 72 },
    cta: { x: 1020, y: 1255, fontSize: 42 },
    brand: { x: 60, y: 1255, fontSize: 28 },
    pallasHeight: 74,
  },
  telegram: {
    canvasW: 1080, canvasH: 1080,
    photoBox: { x: 60, y: 220, w: 960, h: 680 },
    headline: { x: 1020, y: 130, fontSize: 60 },
    cta: { x: 1020, y: 1015, fontSize: 36 },
    brand: { x: 60, y: 1015, fontSize: 24 },
    pallasHeight: 64,
  },
  // استوری اینستاگرام — طبق وایرفریم: بالای ۲۵۰px و پایین ۲۵۰px پوشیده
  // می‌شه (نوار پروفایل/CTA اینستاگرام)، پس متن داخل همون safe zone می‌مونه.
  story: {
    canvasW: 1080, canvasH: 1920,
    photoBox: { x: 60, y: 400, w: 960, h: 1100 },
    headline: { x: 1020, y: 330, fontSize: 64 },
    cta: { x: 1020, y: 1620, fontSize: 40 },
    brand: { x: 60, y: 1620, fontSize: 26 },
    pallasHeight: 74,
  },
};

async function fetchBytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`دانلود ${url} شکست خورد: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Telesk گلیف em-dash/en-dash (—/–) ندارد — قبل از escape با «،» جایگزین می‌شود
// تا هیچ‌وقت باکسِ خالی (tofu) روی عکسِ نهایی ظاهر نشود.
const escape = (s) =>
  String(s)
    .replace(/[—–]/g, "،")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

async function renderPost({ photoBytes, headline, cta, format }) {
  const cfg = FORMATS[format];
  if (!cfg) throw new Error(`فرمت ناشناخته: ${format}`);

  const photoMeta = await sharp(photoBytes)
    .resize({ width: cfg.photoBox.w, height: cfg.photoBox.h, fit: "inside" })
    .toBuffer({ resolveWithObject: true });
  const pw = photoMeta.info.width, ph = photoMeta.info.height;
  const photoX = cfg.photoBox.x + Math.round((cfg.photoBox.w - pw) / 2);
  const photoY = cfg.photoBox.y + Math.round((cfg.photoBox.h - ph) / 2);

  // پالاس: رسترایز جدا (SVG اصلی چندلایه‌ست، برای composite با sharp راحت‌تره
  // که همین‌جا به PNG تبدیلش کنیم، نه اینکه تو یه SVG بزرگ‌تر ادغامش کنیم)
  const pallasAspect = 442 / 361;
  const pallasH = cfg.pallasHeight;
  const pallasW = Math.round(pallasH * pallasAspect);
  const pallasPng = await sharp(Buffer.from(PALLAS_SVG)).resize(pallasW, pallasH).png().toBuffer();
  const pallasX = cfg.brand.x;
  const pallasY = cfg.brand.y - pallasH - 14;

  // بج/استمپِ CTA — به‌جای متنِ ساده، یه شکلِ چرخیده (طبقِ قانونِ برندِ
  // جدید: «templateها نباید فقط مستطیل با متن باشن؛ از badge/stamp استفاده کن»)
  const ctaText = escape(cta);
  const ctaFont = cfg.cta.fontSize;
  const estCharW = ctaFont * 0.62; // تخمینِ عرضِ هر حرفِ فارسیِ بولد تلسک
  const badgeW = Math.round(cta.length * estCharW + ctaFont * 1.6);
  const badgeH = Math.round(ctaFont * 1.9);
  const badgeRight = cfg.cta.x;
  const badgeLeft = badgeRight - badgeW;
  const badgeTop = cfg.cta.y - ctaFont * 1.25;
  const badgeCx = badgeLeft + badgeW / 2;
  const badgeCy = badgeTop + badgeH / 2;
  const badgeRotation = -4;

  const textSvg = `
    <svg width="${cfg.canvasW}" height="${cfg.canvasH}" xmlns="http://www.w3.org/2000/svg">
      <text x="${cfg.headline.x}" y="${cfg.headline.y}" text-anchor="end" direction="rtl"
            font-family="Telesk" font-weight="900" font-size="${cfg.headline.fontSize}" fill="${COLOR_BONE}">${escape(headline)}</text>

      <g transform="rotate(${badgeRotation} ${badgeCx} ${badgeCy})">
        <rect x="${badgeLeft}" y="${badgeTop}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}"
              fill="${COLOR_RED}" stroke="${COLOR_BONE}" stroke-width="2"/>
        <text x="${badgeCx}" y="${badgeCy + ctaFont * 0.32}" text-anchor="middle" direction="rtl"
              font-family="Telesk" font-weight="700" font-size="${ctaFont}" fill="${COLOR_BONE}">${ctaText}</text>
      </g>

      <text x="${cfg.brand.x}" y="${cfg.brand.y}" text-anchor="start"
            font-family="Telesk" font-weight="700" font-size="${cfg.brand.fontSize}" fill="${COLOR_BONE}" opacity="0.6">MIZTORE</text>
    </svg>
  `;

  const resvg = new Resvg(textSvg, {
    fitTo: { mode: "width", value: cfg.canvasW },
    font: { fontFiles: [FONT_BLACK, FONT_BOLD], loadSystemFonts: false, defaultFontFamily: "Telesk" },
  });
  const textPng = resvg.render().asPng();

  return sharp({
    create: { width: cfg.canvasW, height: cfg.canvasH, channels: 4, background: COLOR_INK },
  })
    .composite([
      { input: photoMeta.data, left: photoX, top: photoY },
      { input: textPng, left: 0, top: 0 },
      { input: pallasPng, left: pallasX, top: pallasY },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
}

module.exports = { renderPost, fetchBytes, FORMATS };

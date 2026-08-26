/**
 * render.js — ترکیب عکس محصول + متن برند روی یک بوم ثابت (دقیقاً همون
 * مختصاتِ وایرفریم‌های Figma). خروجی: بافر JPEG آماده‌ی پست.
 *
 * قانون سخت‌گیرانه‌ی کاربر: طرح تیشرت هرگز نباید کراپ شود — برای همین از
 * fit:"inside" استفاده می‌شود (کل عکس همیشه دیده می‌شود، نه crop-to-fill).
 */

const sharp = require("sharp");
const { Resvg } = require("@resvg/resvg-js");
const path = require("path");

const COLOR_INK = "#0B0B0B";
const COLOR_BONE = "#F4F1EA";
const COLOR_RED = "#C90000";

const FONT_BLACK = path.join(__dirname, "..", "fonts", "Tlesk-Black.ttf");
const FONT_BOLD = path.join(__dirname, "..", "fonts", "Tlesk-Bold.ttf");

// دقیقاً مختصات وایرفریم‌های Figma (صفحه‌ی Wireframes)
const FORMATS = {
  post: {
    canvasW: 1080, canvasH: 1350,
    photoBox: { x: 60, y: 280, w: 960, h: 820 },
    headline: { x: 1020, y: 150, fontSize: 72 },
    cta: { x: 1020, y: 1255, fontSize: 46 },
    brand: { x: 60, y: 1255, fontSize: 30 },
  },
  telegram: {
    canvasW: 1080, canvasH: 1080,
    photoBox: { x: 60, y: 220, w: 960, h: 680 },
    headline: { x: 1020, y: 130, fontSize: 60 },
    cta: { x: 1020, y: 1015, fontSize: 40 },
    brand: { x: 60, y: 1015, fontSize: 26 },
  },
};

async function fetchBytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`دانلود ${url} شکست خورد: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function renderPost({ photoBytes, headline, cta, format }) {
  const cfg = FORMATS[format];
  if (!cfg) throw new Error(`فرمت ناشناخته: ${format}`);

  const photoMeta = await sharp(photoBytes)
    .resize({ width: cfg.photoBox.w, height: cfg.photoBox.h, fit: "inside" })
    .toBuffer({ resolveWithObject: true });
  const pw = photoMeta.info.width, ph = photoMeta.info.height;
  const photoX = cfg.photoBox.x + Math.round((cfg.photoBox.w - pw) / 2);
  const photoY = cfg.photoBox.y + Math.round((cfg.photoBox.h - ph) / 2);

  // Telesk گلیف em-dash/en-dash (—/–) ندارد — قبل از escape با «،» جایگزین می‌شود
  // تا هیچ‌وقت باکسِ خالی (tofu) روی عکسِ نهایی ظاهر نشود.
  const escape = (s) =>
    String(s)
      .replace(/[—–]/g, "،")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const textSvg = `
    <svg width="${cfg.canvasW}" height="${cfg.canvasH}" xmlns="http://www.w3.org/2000/svg">
      <text x="${cfg.headline.x}" y="${cfg.headline.y}" text-anchor="end" direction="rtl"
            font-family="Telesk" font-weight="900" font-size="${cfg.headline.fontSize}" fill="${COLOR_BONE}">${escape(headline)}</text>
      <text x="${cfg.cta.x}" y="${cfg.cta.y}" text-anchor="end" direction="rtl"
            font-family="Telesk" font-weight="700" font-size="${cfg.cta.fontSize}" fill="${COLOR_RED}">${escape(cta)}</text>
      <text x="${cfg.brand.x}" y="${cfg.brand.y}" text-anchor="start"
            font-family="Telesk" font-weight="700" font-size="${cfg.brand.fontSize}" fill="${COLOR_BONE}" opacity="0.55">MIZTORE</text>
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
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
}

module.exports = { renderPost, fetchBytes, FORMATS };

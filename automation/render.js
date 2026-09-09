/**
 * render.js — قالب‌های پست. جهتِ طراحی (طبقِ آخرین فیدبکِ کاربر):
 * «کمی مینیمال، تمرکز روی خودِ محصول نه طراحیِ قالب.»
 *
 * یعنی: عکسِ محصول تا حدِ ممکن بزرگ، قابْ ساکت — بدون بلوک‌های رنگیِ بزرگ،
 * بدون کارتِ CTA که نصفِ عرض رو می‌خورد، بدون سه‌تا برچسبِ برندِ تکراری.
 * چیزی که می‌مونه: هوک، یک CTA، وردمارک، و یک کاراکترِ کوچیک به‌عنوان امضا.
 *
 * دقت: «مینیمال» این‌جا فقط دربارهٔ قابه، نه لحنِ نوشته — لحنِ کپشن طبقِ
 * brand system همچنان پرانرژی و شخصیت‌داره (به caption.js نگاه کن).
 *
 * سه خانواده که هنوز بینشون چرخش هست (کاربر: «از همه‌ش استفاده بشه»)، ولی
 * حالا هر سه مینیمال‌ن و فقط تویِ لهجه فرق دارن:
 *   - badge : بجِ چرخیده‌ی قرمزِ CTA + کاراکتر (پیش‌فرضِ اصلی)
 *   - chip  : نوارِ نازکِ قرمز پشتِ هوک + چیپِ دسته
 *   - plain : خالص‌ترین — فقط عکس، هوک، CTAِ متنی، وردمارک
 *
 * قانون سخت‌گیرانه‌ی کاربر (بدون تغییر): طرح تیشرت هرگز کراپ نمی‌شه —
 * fit:"inside" همیشه.
 */

const sharp = require("sharp");
const { Resvg } = require("@resvg/resvg-js");
const path = require("path");

const COLOR_INK = "#0B0B0B";
const COLOR_BONE = "#F4F1EA";
const COLOR_RED = "#C90000";

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

const ASSET_DIR = path.join(__dirname, "..", "assets");
// کاراکترهایی که کاربر به پروژه اضافه کرد (پالاس، همای، بز) — امضای کوچیکِ
// گوشه، نه عنصرِ غالب.
const CHARACTERS = ["palas-mark.png", "homay-mark.png", "boz-full.png"];

function pickCharacter() {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
}

async function characterPng(file, height) {
  const buffer = await sharp(path.join(ASSET_DIR, file)).resize({ height }).png().toBuffer();
  const meta = await sharp(buffer).metadata();
  return { buffer, w: meta.width, h: meta.height };
}

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

const estCharWidth = (fontSize) => fontSize * 0.58;

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

// هوک باید همیشه تویِ فضای خودش جا بشه — اگه با فونتِ کامل بیشتر از یک خط
// بشه، می‌ریم رویِ سایزِ کوچیک‌تر (نه اینکه بزرگ بمونه و بزنه رو عکس).
function fitHeadline(headline, { maxWidth, baseSize }) {
  const natural = wrapText(headline, baseSize, maxWidth, 99);
  if (natural.length <= 1) return { lines: natural, fontSize: baseSize };
  const smaller = Math.round(baseSize * 0.68);
  return { lines: wrapText(headline, smaller, maxWidth, 2), fontSize: smaller };
}

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

function rotatedCtaBadge({ cta, x, y, fontSize }) {
  const badgeW = Math.round(cta.length * fontSize * 0.62 + fontSize * 1.6);
  const badgeH = Math.round(fontSize * 1.9);
  const badgeLeft = x - badgeW;
  const badgeTop = y - fontSize * 1.25;
  const badgeCx = badgeLeft + badgeW / 2;
  const badgeCy = badgeTop + badgeH / 2;
  return `
    <g transform="rotate(-4 ${badgeCx} ${badgeCy})">
      <rect x="${badgeLeft}" y="${badgeTop}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}" fill="${COLOR_RED}"/>
      <text x="${badgeCx}" y="${badgeCy + fontSize * 0.32}" text-anchor="middle" direction="rtl"
            font-family="Telesk" font-weight="700" font-size="${fontSize}" fill="${COLOR_BONE}">${escape(cta)}</text>
    </g>
  `;
}

async function fitPhoto(photoBytes, boxW, boxH) {
  const resized = await sharp(photoBytes)
    .resize({ width: boxW, height: boxH, fit: "inside" })
    .toBuffer({ resolveWithObject: true });
  return { buffer: resized.data, w: resized.info.width, h: resized.info.height };
}

function renderSvgToPng(svg, width) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: "Telesk" },
  });
  return resvg.render().asPng();
}

async function compose(W, H, bg, layers) {
  return sharp({ create: { width: W, height: H, channels: 4, background: bg } })
    .composite(layers.filter(Boolean))
    .jpeg({ quality: 92 })
    .toBuffer();
}

// ---------------------------------------------------------------------------
// چیدمان — عکس بیشترین فضای ممکن رو می‌گیره، بقیه فقط حاشیه‌ن.
// twitter افقیه، پس چیدمانش ستونیه (عکس چپ، متن راست) نه پشته‌ای.
// ---------------------------------------------------------------------------
const LAYOUTS = {
  post: { W: 1080, H: 1350, pad: 60, headlineY: 148, headlineFs: 60, photo: { x: 60, y: 230, w: 960, h: 900 }, ctaY: 1240, brandY: 1290, charH: 104 },
  telegram: { W: 1080, H: 1080, pad: 56, headlineY: 126, headlineFs: 52, photo: { x: 56, y: 196, w: 968, h: 700 }, ctaY: 985, brandY: 1032, charH: 88 },
  story: { W: 1080, H: 1920, pad: 60, headlineY: 350, headlineFs: 62, photo: { x: 60, y: 430, w: 960, h: 1060 }, ctaY: 1580, brandY: 1636, charH: 112 },
  twitter: { W: 1200, H: 675, pad: 44, headlineY: 150, headlineFs: 44, photo: { x: 44, y: 44, w: 700, h: 587 }, textX: 1156, textLeft: 782, ctaY: 470, brandY: 604, charH: 74, horizontal: true },
};

async function renderProduct({ photoBytes, headline, cta, categoryLabel, format, variant }) {
  const L = LAYOUTS[format];
  if (!L) throw new Error(`فرمت ناشناخته: ${format}`);

  const photo = await fitPhoto(photoBytes, L.photo.w, L.photo.h);
  const photoX = L.photo.x + Math.round((L.photo.w - photo.w) / 2);
  const photoY = L.photo.y + Math.round((L.photo.h - photo.h) / 2);

  const textRight = L.horizontal ? L.textX : L.W - L.pad;
  const headlineMaxWidth = L.horizontal ? L.textX - L.textLeft : L.W - L.pad * 2;
  const { lines: headlineLines, fontSize: headlineFs } = fitHeadline(headline, {
    maxWidth: headlineMaxWidth,
    baseSize: L.headlineFs,
  });

  const useCharacter = variant !== "plain";
  const character = useCharacter ? await characterPng(pickCharacter(), L.charH) : null;
  const charX = L.horizontal ? L.textLeft : L.pad;
  const charY = L.brandY - L.charH - 10;
  const brandX = character ? charX + character.w + 18 : L.pad;

  const ctaFs = Math.round(L.headlineFs * 0.58);
  const ctaSvg =
    variant === "badge"
      ? rotatedCtaBadge({ cta, x: textRight, y: L.ctaY, fontSize: ctaFs })
      : `<text x="${textRight}" y="${L.ctaY}" text-anchor="end" direction="rtl"
             font-family="Telesk" font-weight="800" font-size="${ctaFs}" fill="${COLOR_RED}">${escape(cta)}</text>`;

  // لهجه‌ی chip: یه نوارِ نازکِ قرمز فقط پشتِ هوک (نه بلوکِ بزرگِ رنگی)
  const headlineBlockH = headlineLines.length * headlineFs * 1.18;
  const chipAccent =
    variant === "chip"
      ? `<rect x="0" y="${L.headlineY - headlineFs - 20}" width="${L.W}" height="${headlineBlockH + 42}" fill="${COLOR_RED}"/>`
      : "";
  const headlineColor = variant === "chip" ? COLOR_BONE : COLOR_INK;
  const categoryChip =
    variant === "chip"
      ? `${pill({ x: L.pad, y: L.brandY - 32, w: 180, h: 38, fill: COLOR_INK })}
         <text x="${L.pad + 90}" y="${L.brandY - 6}" text-anchor="middle" font-family="Telesk" font-weight="700" font-size="18" fill="${COLOR_BONE}">${escape(categoryLabel)}</text>`
      : `<text x="${brandX}" y="${L.brandY}" text-anchor="start" font-family="Telesk" font-weight="800" font-size="30" fill="${COLOR_INK}" opacity="0.75">MIZTORE</text>`;

  const svg = `
    <svg width="${L.W}" height="${L.H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${L.W}" height="${L.H}" fill="${COLOR_BONE}"/>
      ${chipAccent}
      ${multilineText({ x: textRight, y: L.headlineY, lines: headlineLines, fontSize: headlineFs, weight: 900, color: headlineColor })}
      ${ctaSvg}
      ${categoryChip}
    </svg>
  `;

  const textPng = renderSvgToPng(svg, L.W);
  return compose(L.W, L.H, COLOR_BONE, [
    { input: textPng, left: 0, top: 0 },
    { input: photo.buffer, left: photoX, top: photoY },
    character && variant !== "chip" ? { input: character.buffer, left: charX, top: charY } : null,
  ]);
}

// ---------------------------------------------------------------------------
// پستِ «خدمات» — بدون عکسِ محصول. همون منطقِ مینیمال: یه جمله‌ی بزرگ، یه
// توضیحِ کوتاه، یک CTA و کاراکتر. محتوا از services.js میاد (ثابت، نه AI).
// ---------------------------------------------------------------------------
async function renderServicePost({ format, headline, body, cta }) {
  const L = LAYOUTS[format];
  if (!L) throw new Error(`فرمت ناشناخته: ${format}`);

  const textRight = L.horizontal ? L.textX : L.W - L.pad;
  const maxWidth = L.horizontal ? L.textX - L.textLeft : L.W - L.pad * 2;

  const headlineFs = Math.round(L.headlineFs * 1.1);
  const headlineLines = wrapText(headline, headlineFs, maxWidth, 3);
  const bodyFs = Math.round(L.headlineFs * 0.5);
  const bodyLines = wrapText(body, bodyFs, maxWidth, 4);

  const headlineTop = L.horizontal ? 170 : Math.round(L.H * 0.32);
  const bodyTop = headlineTop + headlineLines.length * headlineFs * 1.18 + bodyFs * 1.4;

  const charH = Math.round(L.charH * 1.7);
  const character = await characterPng(pickCharacter(), charH);
  const charX = L.horizontal ? L.textLeft : L.pad;
  const charY = L.brandY - charH - 10;

  const ctaFs = Math.round(L.headlineFs * 0.58);

  const svg = `
    <svg width="${L.W}" height="${L.H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${L.W}" height="${L.H}" fill="${COLOR_BONE}"/>
      <rect x="0" y="0" width="${L.W}" height="14" fill="${COLOR_RED}"/>
      ${multilineText({ x: textRight, y: headlineTop, lines: headlineLines, fontSize: headlineFs, weight: 900, color: COLOR_INK })}
      ${multilineText({ x: textRight, y: bodyTop, lines: bodyLines, fontSize: bodyFs, weight: 500, color: COLOR_INK, lineHeight: 1.5 })}
      ${rotatedCtaBadge({ cta, x: textRight, y: L.ctaY, fontSize: ctaFs })}
      <text x="${charX + Math.round(charH * 0.9) + 18}" y="${L.brandY}" text-anchor="start" font-family="Telesk" font-weight="800" font-size="30" fill="${COLOR_INK}" opacity="0.75">MIZTORE</text>
    </svg>
  `;

  const textPng = renderSvgToPng(svg, L.W);
  return compose(L.W, L.H, COLOR_BONE, [
    { input: textPng, left: 0, top: 0 },
    { input: character.buffer, left: charX, top: charY },
  ]);
}

// ---------------------------------------------------------------------------
// رجیستری — هر سه مینیمال، فقط لهجه فرق داره. اضافه‌کردنِ خانواده‌ی بعدی
// فقط یه entry این‌جاست.
// ---------------------------------------------------------------------------
const TEMPLATES = {
  badge: { weight: 0.5, variant: "badge" },
  chip: { weight: 0.25, variant: "chip" },
  plain: { weight: 0.25, variant: "plain" },
};

function pickTemplateName() {
  const names = Object.keys(TEMPLATES);
  const total = names.reduce((sum, n) => sum + TEMPLATES[n].weight, 0);
  let r = Math.random() * total;
  for (const name of names) {
    r -= TEMPLATES[name].weight;
    if (r <= 0) return name;
  }
  return names[names.length - 1];
}

const FORMATS = {
  post: { canvasW: 1080, canvasH: 1350 },
  telegram: { canvasW: 1080, canvasH: 1080 },
  story: { canvasW: 1080, canvasH: 1920 },
  twitter: { canvasW: 1200, canvasH: 675 },
};

async function renderPost({ photoBytes, headline, cta, categoryLabel, format, templateName }) {
  const name = templateName && TEMPLATES[templateName] ? templateName : pickTemplateName();
  return renderProduct({
    photoBytes,
    headline,
    cta,
    categoryLabel: categoryLabel || "میزطوری",
    format,
    variant: TEMPLATES[name].variant,
  });
}

module.exports = { renderPost, renderServicePost, fetchBytes, FORMATS, pickTemplateName, TEMPLATES };

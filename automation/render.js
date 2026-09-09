/**
 * render.js — قالب‌های پست.
 *
 * جهتِ طراحیِ فعلی (طبقِ آخرین فیدبکِ کاربر، روی فریم‌های Figmaی v2 که خودش
 * ویرایش کرد): «عکس باید کاملاً پشتِ صفحه رو بگیره» — یعنی بدون حاشیه‌ی
 * بومِ خالی دورِ عکس. برای این‌که همزمان با قانونِ سخت‌گیرانه‌ی «طرح تیشرت
 * هرگز کراپ نمی‌شه» تناقض نداشته باشه، از تکنیکِ رایجِ ادیتوریال استفاده
 * شده: یک نسخه‌ی تارشده و بزرگ‌شده‌ی همون عکس، کل بومو پر می‌کنه (پس‌زمینه)،
 * و خودِ عکسِ کامل/بدون‌کراپ (fit:"inside") روش سوار می‌شه. نتیجه: صفحه از
 * لبه تا لبه پر از همون عکسه، ولی طرحِ چاپ‌شده هیچ‌وقت بریده نمی‌شه.
 *
 * خوانایی: چون متن حالا روی عکس می‌شینه (نه بومِ ساکتِ قبلی)، بالای هوک و
 * پایینِ CTA/برند یه نوارِ توپر (chip) دارن — دقیقاً همون چیزی که کاربر
 * خودش پیشنهاد داد: «یه شکل بنداز پشت نوشته‌ها که بشه خوند».
 *
 * تایپوگرافی: تبلیغ (Tabliq) — فونتِ فارسی‌ای که کاربر لایسنسش رو خریده —
 * برای هوک/CTAِ فارسی؛ چون گلیفِ لاتین نداره، وردمارکِ MIZTORE (لاتین)
 * همچنان با Telesk نوشته می‌شه.
 *
 * سه لهجه (کاربر: «از همه‌ش استفاده بشه») که فقط رنگِ نوار/نوعِ CTA فرق
 * می‌کنه، نه ساختار:
 *   - badge : نوارهای مشکی + بجِ چرخیده‌ی قرمزِ CTA
 *   - chip  : نوارِ بالا قرمز، نوارِ پایین مشکی، CTA متنی
 *   - plain : نوارهای استخوانی (روشن)، CTA قرمزِ متنی
 *
 * قانون سخت‌گیرانه‌ی کاربر (بدون تغییر): طرح تیشرت هرگز کراپ نمی‌شه —
 * خودِ عکس همیشه fit:"inside" می‌مونه، فقط پس‌زمینه‌ی تارش کراپ می‌شه.
 */

const sharp = require("sharp");
const { Resvg } = require("@resvg/resvg-js");
const path = require("path");

const COLOR_INK = "#0B0B0B";
const COLOR_BONE = "#F4F1EA";
const COLOR_RED = "#C90000";

const FONT_DIR = path.join(__dirname, "..", "fonts");
const FONT_FILENAMES = [
  "Tlesk-Thin.ttf",
  "Tlesk-Light.ttf",
  "Tlesk-Regular.ttf",
  "Tlesk-Medium.ttf",
  "Tlesk-Semibold.ttf",
  "Tlesk-Bold.ttf",
  "Tlesk-Extarbold.ttf",
  "Tlesk-Black.ttf",
  "Tabliq-Bold.ttf",
];
const FONT_FILES = FONT_FILENAMES.map((f) => path.join(FONT_DIR, f));

// خانواده‌ی فونت برای متنِ فارسی (هوک/CTA) در برابرِ وردمارکِ لاتین —
// اسمِ داخلیِ واقعیِ فایل‌ها (نه اسمِ فایل) رو باید بدیم، وگرنه resvg matchش
// نمی‌کنه: Tabliq-Bold.ttf داخلش «Tabliq Bold» است، Tlesk-*.ttf داخلش «Tlesk».
const FONT_FA = "Tabliq Bold";
const FONT_LATIN = "Tlesk";

const ASSET_DIR = path.join(__dirname, "..", "assets");
// کاراکترهایی که کاربر به پروژه اضافه کرد — امضای کوچیکِ گوشه، نه عنصرِ غالب.
// دوتای «badge-red» مربع‌ان، تویِ characterPng به دایره کراپ می‌شن.
const CHARACTERS = ["palas-mark.png", "homay-mark.png", "boz-full.png", "palas-badge-red.png", "homay-badge-red.png"];

function pickCharacter() {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
}

async function characterPng(file, height) {
  if (file.includes("badge-red")) {
    const square = await sharp(path.join(ASSET_DIR, file)).resize(height, height, { fit: "cover" }).toBuffer();
    const mask = Buffer.from(
      `<svg width="${height}" height="${height}"><circle cx="${height / 2}" cy="${height / 2}" r="${height / 2}" fill="#fff"/></svg>`
    );
    const buffer = await sharp(square).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
    return { buffer, w: height, h: height };
  }
  const buffer = await sharp(path.join(ASSET_DIR, file)).resize({ height }).png().toBuffer();
  const meta = await sharp(buffer).metadata();
  return { buffer, w: meta.width, h: meta.height };
}

async function fetchBytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`دانلود ${url} شکست خورد: HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// Tlesk گلیف em-dash/en-dash (—/–) ندارد — قبل از escape با «،» جایگزین می‌شود
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
// بشه، می‌ریم رویِ سایزِ کوچیک‌تر (نه اینکه بزرگ بمونه و بزنه بیرون).
function fitHeadline(headline, { maxWidth, baseSize }) {
  const natural = wrapText(headline, baseSize, maxWidth, 99);
  if (natural.length <= 1) return { lines: natural, fontSize: baseSize };
  const smaller = Math.round(baseSize * 0.68);
  return { lines: wrapText(headline, smaller, maxWidth, 2), fontSize: smaller };
}

function multilineText({ x, y, lines, fontSize, weight, color, anchor = "end", lineHeight = 1.18, fontFamily = FONT_FA }) {
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${y + i * fontSize * lineHeight}" text-anchor="${anchor}" direction="rtl" font-family="${fontFamily}" font-weight="${weight}" font-size="${fontSize}" fill="${color}">${escape(line)}</text>`
    )
    .join("");
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
            font-family="${FONT_FA}" font-weight="700" font-size="${fontSize}" fill="${COLOR_BONE}">${escape(cta)}</text>
    </g>
  `;
}

async function fitPhoto(photoBytes, boxW, boxH) {
  const resized = await sharp(photoBytes)
    .resize({ width: boxW, height: boxH, fit: "inside" })
    .toBuffer({ resolveWithObject: true });
  return { buffer: resized.data, w: resized.info.width, h: resized.info.height };
}

// پس‌زمینه‌ی تارشده که کل یک باکس (یا کلِ بوم) رو پر می‌کنه — فقط برای پرکردنِ
// فضا، هیچ‌وقت خودِ عکسِ اصلی/تیزِ روش نیست، پس کراپ‌شدنش مشکلی برای «طرح
// هرگز کراپ نشه» ایجاد نمی‌کنه (طرح جای دیگه، بدونِ کراپ، روش سوار می‌شه).
async function blurredCoverFill(photoBytes, W, H) {
  return sharp(photoBytes)
    .resize({ width: W, height: H, fit: "cover", position: "attention" })
    .blur(48)
    .modulate({ brightness: 0.62, saturation: 0.9 })
    .toBuffer();
}

function renderSvgToPng(svg, width) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: FONT_LATIN },
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
// سه لهجه — فقط رنگِ نوارها/نوعِ CTA فرق می‌کنه، ساختار یکیه.
// ---------------------------------------------------------------------------
const ACCENTS = {
  badge: { topBand: COLOR_INK, bottomBand: COLOR_INK, textColor: COLOR_BONE, cta: "badge" },
  chip: { topBand: COLOR_RED, bottomBand: COLOR_INK, textColor: COLOR_BONE, cta: "plain-bone" },
  plain: { topBand: COLOR_BONE, bottomBand: COLOR_BONE, textColor: COLOR_INK, cta: "plain-red" },
};

// ---------------------------------------------------------------------------
// چیدمان — نوارِ بالا (هوک) + عکسِ کامل وسط + نوارِ پایین (CTA/برند/کاراکتر).
// twitter افقیه: عکس چپ (با پس‌زمینه‌ی تارِ خودش)، ستونِ توپرِ راست برای متن.
// ---------------------------------------------------------------------------
const LAYOUTS = {
  post: { W: 1080, H: 1350, pad: 60, topBandH: 235, bottomBandH: 265, headlineFs: 58, charH: 96 },
  telegram: { W: 1080, H: 1080, pad: 56, topBandH: 195, bottomBandH: 210, headlineFs: 50, charH: 82 },
  story: { W: 1080, H: 1920, pad: 60, topBandH: 300, bottomBandH: 300, headlineFs: 60, charH: 104 },
  twitter: { W: 1200, H: 675, pad: 44, photo: { x: 40, y: 40, w: 680, h: 595 }, textX: 1156, textLeft: 760, headlineFs: 42, charH: 66, horizontal: true },
};

async function renderProduct({ photoBytes, headline, cta, categoryLabel, format, variant }) {
  const L = LAYOUTS[format];
  if (!L) throw new Error(`فرمت ناشناخته: ${format}`);
  const accent = ACCENTS[variant] || ACCENTS.badge;

  if (L.horizontal) return renderProductHorizontal({ photoBytes, headline, cta, categoryLabel, L, accent });

  const [bgFill, photo] = await Promise.all([
    blurredCoverFill(photoBytes, L.W, L.H),
    fitPhoto(photoBytes, L.W - L.pad * 2, L.H - L.topBandH - L.bottomBandH),
  ]);
  const photoX = Math.round((L.W - photo.w) / 2);
  const photoY = L.topBandH + Math.round((L.H - L.topBandH - L.bottomBandH - photo.h) / 2);

  const textRight = L.W - L.pad;
  const headlineMaxWidth = L.W - L.pad * 2;
  const { lines: headlineLines, fontSize: headlineFs } = fitHeadline(headline, {
    maxWidth: headlineMaxWidth,
    baseSize: L.headlineFs,
  });
  const headlineY = L.topBandH / 2 + (headlineLines.length > 1 ? -headlineFs * 0.55 : headlineFs * 0.3);

  const character = variant !== "chip" ? await characterPng(pickCharacter(), L.charH) : null;
  const charX = L.pad;
  const charY = Math.round(L.H - L.bottomBandH / 2 - L.charH / 2);
  const brandX = character ? charX + character.w + 18 : L.pad;
  const brandY = L.H - L.bottomBandH / 2 + 10;

  const ctaFs = Math.round(L.headlineFs * 0.56);
  const ctaY = L.H - L.bottomBandH / 2 - 8;
  let ctaSvg;
  if (accent.cta === "badge") {
    ctaSvg = rotatedCtaBadge({ cta, x: textRight, y: ctaY + ctaFs * 0.5, fontSize: ctaFs });
  } else {
    const ctaColor = accent.cta === "plain-red" ? COLOR_RED : COLOR_BONE;
    ctaSvg = `<text x="${textRight}" y="${ctaY}" text-anchor="end" direction="rtl"
        font-family="${FONT_FA}" font-weight="700" font-size="${ctaFs}" fill="${ctaColor}">${escape(cta)}</text>`;
  }

  const categoryBadge =
    variant === "chip"
      ? `<rect x="${L.pad}" y="${L.H - L.bottomBandH / 2 - 21}" width="180" height="42" rx="21" fill="${COLOR_RED}"/>
         <text x="${L.pad + 90}" y="${L.H - L.bottomBandH / 2 + 6}" text-anchor="middle" font-family="${FONT_FA}" font-weight="700" font-size="19" fill="${COLOR_BONE}">${escape(categoryLabel)}</text>`
      : "";

  const svg = `
    <svg width="${L.W}" height="${L.H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${L.W}" height="${L.topBandH}" fill="${accent.topBand}"/>
      <rect x="0" y="${L.H - L.bottomBandH}" width="${L.W}" height="${L.bottomBandH}" fill="${accent.bottomBand}"/>
      ${multilineText({ x: textRight, y: headlineY, lines: headlineLines, fontSize: headlineFs, weight: 800, color: accent.textColor })}
      ${ctaSvg}
      ${categoryBadge}
      ${
        variant !== "chip"
          ? `<text x="${brandX}" y="${brandY}" text-anchor="start" font-family="${FONT_LATIN}" font-weight="800" font-size="28" fill="${accent.textColor}" opacity="0.85">MIZTORE</text>`
          : ""
      }
    </svg>
  `;

  const textPng = renderSvgToPng(svg, L.W);
  return compose(L.W, L.H, COLOR_BONE, [
    { input: bgFill, left: 0, top: 0 },
    { input: textPng, left: 0, top: 0 },
    { input: photo.buffer, left: photoX, top: photoY },
    character && variant !== "chip" ? { input: character.buffer, left: charX, top: charY } : null,
  ]);
}

async function renderProductHorizontal({ photoBytes, headline, cta, categoryLabel, L, accent }) {
  const [bgFill, photo] = await Promise.all([
    blurredCoverFill(photoBytes, L.photo.w, L.photo.h),
    fitPhoto(photoBytes, L.photo.w - 24, L.photo.h - 24),
  ]);
  const photoX = L.photo.x + Math.round((L.photo.w - photo.w) / 2);
  const photoY = L.photo.y + Math.round((L.photo.h - photo.h) / 2);

  const headlineMaxWidth = L.textX - L.textLeft;
  const { lines: headlineLines, fontSize: headlineFs } = fitHeadline(headline, { maxWidth: headlineMaxWidth, baseSize: L.headlineFs });

  const character = accent !== ACCENTS.chip ? await characterPng(pickCharacter(), L.charH) : null;
  const charX = L.textLeft;
  const charY = Math.round(L.H - 90 - L.charH);
  const brandX = character ? charX + character.w + 16 : L.textLeft;

  const ctaFs = Math.round(L.headlineFs * 0.56);
  const ctaY = 300;
  let ctaSvg;
  if (accent.cta === "badge") {
    ctaSvg = rotatedCtaBadge({ cta, x: L.textX, y: ctaY, fontSize: ctaFs });
  } else {
    const ctaColor = accent.cta === "plain-red" ? COLOR_RED : COLOR_BONE;
    ctaSvg = `<text x="${L.textX}" y="${ctaY}" text-anchor="end" direction="rtl"
        font-family="${FONT_FA}" font-weight="700" font-size="${ctaFs}" fill="${ctaColor}">${escape(cta)}</text>`;
  }

  const svg = `
    <svg width="${L.W}" height="${L.H}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${L.W}" height="${L.H}" fill="${accent.bottomBand}"/>
      ${multilineText({ x: L.textX, y: 150, lines: headlineLines, fontSize: headlineFs, weight: 800, color: accent.textColor })}
      ${ctaSvg}
      <text x="${brandX}" y="${L.H - 70}" text-anchor="start" font-family="${FONT_LATIN}" font-weight="800" font-size="26" fill="${accent.textColor}" opacity="0.85">MIZTORE</text>
    </svg>
  `;

  const textPng = renderSvgToPng(svg, L.W);
  return compose(L.W, L.H, COLOR_BONE, [
    { input: textPng, left: 0, top: 0 },
    { input: bgFill, left: L.photo.x, top: L.photo.y },
    { input: photo.buffer, left: photoX, top: photoY },
    character ? { input: character.buffer, left: charX, top: charY } : null,
  ]);
}

// ---------------------------------------------------------------------------
// پستِ «خدمات» — بدون عکسِ محصول، پس بحثِ full-bleed/کراپ اصلاً مطرح نیست؛
// همون کارتِ توپرِ قبلی، فقط با فونتِ فارسیِ تبلیغ برای هوک/CTA.
// ---------------------------------------------------------------------------
async function renderServicePost({ format, headline, body, cta }) {
  const L = LAYOUTS[format];
  if (!L) throw new Error(`فرمت ناشناخته: ${format}`);

  const textRight = L.horizontal ? L.textX : L.W - L.pad;
  const maxWidth = L.horizontal ? L.textX - L.textLeft : L.W - L.pad * 2;

  const headlineFs = Math.round(L.headlineFs * 1.1);
  const headlineLines = wrapText(headline, headlineFs, maxWidth, 3);
  const bodyFs = Math.round(L.headlineFs * 0.48);
  const bodyLines = wrapText(body, bodyFs, maxWidth, 4);

  const headlineTop = L.horizontal ? 170 : Math.round(L.H * 0.3);
  const bodyTop = headlineTop + headlineLines.length * headlineFs * 1.18 + bodyFs * 1.4;

  const brandY = L.horizontal ? L.H - 70 : L.H - (L.bottomBandH || 220) / 2 + 10;
  const charH = Math.round((L.charH || 90) * 1.6);
  const character = await characterPng(pickCharacter(), charH);
  const charX = L.horizontal ? L.textLeft : L.pad;
  const charY = Math.round(brandY - charH + 6);

  const ctaFs = Math.round(L.headlineFs * 0.56);
  const ctaY = L.horizontal ? 300 : L.H - (L.bottomBandH || 220) / 2 - 8;

  const svg = `
    <svg width="${L.W}" height="${L.H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${L.W}" height="${L.H}" fill="${COLOR_BONE}"/>
      <rect x="0" y="0" width="${L.W}" height="14" fill="${COLOR_RED}"/>
      ${multilineText({ x: textRight, y: headlineTop, lines: headlineLines, fontSize: headlineFs, weight: 800, color: COLOR_INK })}
      ${multilineText({ x: textRight, y: bodyTop, lines: bodyLines, fontSize: bodyFs, weight: 500, color: COLOR_INK, lineHeight: 1.5, fontFamily: FONT_LATIN })}
      ${rotatedCtaBadge({ cta, x: textRight, y: ctaY, fontSize: ctaFs })}
      <text x="${charX + Math.round(charH * 0.9) + 18}" y="${brandY}" text-anchor="start" font-family="${FONT_LATIN}" font-weight="800" font-size="28" fill="${COLOR_INK}" opacity="0.75">MIZTORE</text>
    </svg>
  `;

  const textPng = renderSvgToPng(svg, L.W);
  return compose(L.W, L.H, COLOR_BONE, [
    { input: textPng, left: 0, top: 0 },
    { input: character.buffer, left: charX, top: charY },
  ]);
}

// ---------------------------------------------------------------------------
// رجیستری — هر سه لهجه یک ساختار دارن. اضافه‌کردنِ لهجه‌ی بعدی فقط یه
// entry این‌جا و تویِ ACCENTS لازم داره.
// ---------------------------------------------------------------------------
const TEMPLATES = {
  badge: { weight: 0.5 },
  chip: { weight: 0.25 },
  plain: { weight: 0.25 },
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
    variant: name,
  });
}

module.exports = { renderPost, renderServicePost, fetchBytes, FORMATS, pickTemplateName, TEMPLATES };

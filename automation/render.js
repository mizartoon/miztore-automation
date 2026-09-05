/**
 * render.js — سه خانواده‌ی قالب، انتخابِ تصادفیِ وزن‌دار بینشون هر پست:
 *
 *   - brightEditorial: قالبِ رنگی/کلاژیِ جدید (منبع: فریم‌های ۲۲:۳/۲۲:۲۷/۲۲:۴۶
 *     در فیگمای Miztore-Content-Wireframes، بخشِ «BRIGHT EDITORIAL REDESIGN»).
 *   - v2: قالبِ قدیمی‌ترِ بومِ روشن + بجِ چرخیده‌ی CTA + آیکونِ پالاس (منبع:
 *     فریم‌های «IG Post v2 / Telegram v2 / IG Story v2»، ۱۹:۲ / ۱۹:۵۹ / ۱۹:۱۱۶).
 *   - minimal: خیلی ساده — فقط عکس + هوکِ متنی + CTAِ متنی + وردمارک، بدون
 *     رنگ/بج/ماسکات (منبع: فریم‌های خامِ اولیه، ۱:۲ / ۱:۸ / ۳:۲).
 *
 * کاربر صریحاً خواسته: «از همه‌ش بصورت رندوم استفاده کن... پایینی‌ها
 * (v2) بیشتر استفاده بشه» و این‌که احتمالاً بعداً قالبِ بیشتری اضافه
 * می‌کنه — برای همین انتخاب از رویِ TEMPLATES (وزن‌دار) انجام می‌شه، نه
 * hardcode؛ اضافه‌کردنِ خانواده‌ی بعدی فقط یعنی یه entry جدید این‌جا.
 *
 * قانون سخت‌گیرانه‌ی کاربر (بدون تغییر، در هر سه قالب): طرح تیشرت هرگز
 * نباید کراپ بشه — fit:"inside" همیشه.
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

// چند خط RTL راست‌چین روی هم — هر خط یه <text> جدا (نه tspan+dy) چون resvg
// در ترکیبِ direction="rtl" + چند tspan با dy گاهی گلیف‌ها رو قاطی می‌کنه.
// anchor می‌تونه "end" (راست‌چین) یا "middle" (وسط‌چین) باشه.
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

async function compose(W, H, bg, layers) {
  return sharp({ create: { width: W, height: H, channels: 4, background: bg } })
    .composite(layers)
    .jpeg({ quality: 92 })
    .toBuffer();
}

// ===========================================================================
// خانواده‌ی ۱: brightEditorial — قالبِ رنگی/کلاژی (منبع: فریم‌های ۲۲:۳/۲۲:۲۷/۲۲:۴۶)
// ===========================================================================

async function brightEditorialPost({ photoBytes, headline, cta, categoryLabel }) {
  const W = 1080, H = 1350;
  const photoBox = { x: 350, y: 320, w: 690, h: 650 };
  const photo = await fitPhoto(photoBytes, photoBox.w, photoBox.h);
  const photoX = photoBox.x + Math.round((photoBox.w - photo.w) / 2);
  const photoY = photoBox.y + Math.round((photoBox.h - photo.h) / 2);

  const ctaLines = wrapText(cta, 44, 300, 2);
  // فقط ۷۰px بین بالای هوک و برچسبِ دسته هست (بالای برچسب y=235) — اگه
  // هوک به ۲ خط بشکنه، باید حتماً فونتِ کوچیک‌تر باشه وگرنه رویِ برچسب
  // می‌افته (باگِ واقعی که یه هوکِ ۴ کلمه‌ای نشونش داد: خطِ دوم رو برچسبِ
  // دسته می‌افتاد). به‌جای fitWrappedTextِ عمومی (که اگه توی ۲ خط جا بشه
  // حتی با فونتِ بزرگ قبولش می‌کنه)، این‌جا صریح دو حالته: تک‌خط = فونتِ
  // کامل، چندخط = همیشه کوچیک‌ترین سایز با فاصله‌ی امن.
  // maxLines بزرگ (نه ۱) تا واقعاً ببینیم در عرضِ هدف چند خط لازمه —
  // wrapText با maxLines=1 هیچ‌وقت truncate نمی‌کنه، فقط همه‌چیز رو تویِ
  // یک خط می‌چپونه (باگِ نسخه‌ی قبلی همین فایل: چک "آیا ۱ خط جواب داد؟"
  // همیشه true برمی‌گشت چون خودِ تابع کلمه‌ای رو حذف نمی‌کنه).
  const naturalLines = wrapText(headline, 58, 690, 99);
  let headlineLines, headlineSize, headlineY;
  if (naturalLines.length <= 1) {
    headlineLines = naturalLines;
    headlineSize = 58;
    headlineY = 165;
  } else {
    headlineLines = wrapText(headline, 40, 690, 2);
    headlineSize = 40;
    headlineY = 130;
  }
  const pallasH = 68;
  const pallasX = 80;
  const pallasY = 1085 - pallasH - 16;

  const svg = `
    <svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${W}" height="${H}" fill="${COLOR_BONE}"/>
      <rect x="830" y="0" width="250" height="250" rx="0" fill="${COLOR_RED}"/>
      <circle cx="195" cy="177" r="95" fill="${COLOR_YELLOW}"/>
      <text x="195" y="185" text-anchor="middle" font-family="Telesk" font-weight="800" font-size="30" fill="${COLOR_INK}">جدید</text>
      ${pill({ x: 820, y: 235, w: 220, h: 34, fill: COLOR_INK })}
      <text x="930" y="258" text-anchor="middle" font-family="Telesk" font-weight="700" font-size="17" fill="${COLOR_BONE}">${escape(categoryLabel)}</text>
      ${multilineText({ x: 1030, y: headlineY, lines: headlineLines, fontSize: headlineSize, weight: 900, color: COLOR_INK })}
      <rect x="80" y="370" width="420" height="560" rx="32" fill="${COLOR_INK}"/>
      <rect x="108" y="398" width="364" height="504" rx="20" fill="${COLOR_RED}"/>
      ${multilineText({ x: 440, y: 500, lines: ctaLines, fontSize: 44, weight: 800, color: COLOR_BONE })}
      ${pill({ x: 830, y: 1015, w: 210, h: 44, fill: COLOR_INK })}
      <text x="935" y="1043" text-anchor="middle" font-family="Telesk" font-weight="700" font-size="19" fill="${COLOR_BONE}">فروشگاه میزطوری</text>
      ${pill({ x: 80, y: 1085, w: 230, h: 52, fill: COLOR_INK })}
      <text x="195" y="1118" text-anchor="middle" font-family="Telesk" font-weight="700" font-size="22" fill="${COLOR_BONE}">MIZTORE.COM</text>
      <text x="1040" y="1160" text-anchor="end" font-family="Telesk" font-weight="900" font-size="60" fill="${COLOR_INK}">MIZTORE</text>
    </svg>
  `;

  const [textPng, pallas] = await Promise.all([renderSvgToPng(svg, W), pallasPng(pallasH)]);
  return compose(W, H, COLOR_BONE, [
    { input: textPng, left: 0, top: 0 },
    { input: photo.buffer, left: photoX, top: photoY },
    { input: pallas, left: pallasX, top: pallasY },
  ]);
}

async function brightEditorialTelegram({ photoBytes, headline, cta, categoryLabel }) {
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
      <rect x="750" y="0" width="330" height="${H}" fill="${COLOR_INK}"/>
      ${multilineText({ x: 1030, y: 300, lines: headlineLines, fontSize: 46, weight: 900, color: COLOR_BONE })}
      ${pill({ x: 820, y: 820, w: 220, h: 40, fill: COLOR_BONE })}
      <text x="930" y="847" text-anchor="middle" font-family="Telesk" font-weight="700" font-size="17" fill="${COLOR_INK}">MIZTORE / TG</text>
      <rect x="65" y="160" width="280" height="360" rx="24" fill="${COLOR_ORANGE}"/>
      <text x="205" y="365" text-anchor="middle" font-family="Telesk" font-weight="900" font-size="90" fill="${COLOR_INK}">۰۱</text>
      ${multilineText({ x: 715, y: 780, lines: ctaLines, fontSize: 46, weight: 800, color: COLOR_INK })}
      <line x1="65" y1="850" x2="715" y2="850" stroke="${COLOR_INK}" stroke-width="2"/>
      ${pill({ x: 525, y: 885, w: 190, h: 42, fill: COLOR_RED })}
      <text x="620" y="912" text-anchor="middle" font-family="Telesk" font-weight="700" font-size="18" fill="${COLOR_BONE}">${escape(categoryLabel)}</text>
      <text x="715" y="1000" text-anchor="end" font-family="Telesk" font-weight="900" font-size="46" fill="${COLOR_INK}">MIZTORE</text>
    </svg>
  `;

  const [textPng, pallas] = await Promise.all([renderSvgToPng(svg, W), pallasPng(pallasH)]);
  return compose(W, H, COLOR_BONE, [
    { input: textPng, left: 0, top: 0 },
    { input: photo.buffer, left: photoX, top: photoY },
    { input: pallas, left: pallasX, top: pallasY },
  ]);
}

async function brightEditorialStory({ photoBytes, headline, cta, categoryLabel }) {
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
      <rect x="0" y="0" width="${W}" height="260" fill="${COLOR_RED}"/>
      ${multilineText({ x: 1030, y: 130, lines: headlineLines, fontSize: 56, weight: 900, color: COLOR_BONE })}
      <rect x="60" y="390" width="290" height="500" rx="28" fill="${COLOR_BLUE}"/>
      ${multilineText({ x: 205, y: 570, lines: ctaLines, fontSize: 34, weight: 800, color: COLOR_BONE, anchor: "middle" })}
      ${pill({ x: 60, y: 950, w: 290, h: 46, fill: COLOR_YELLOW })}
      <text x="205" y="980" text-anchor="middle" font-family="Telesk" font-weight="700" font-size="19" fill="${COLOR_INK}">${escape(categoryLabel)}</text>
      <rect x="0" y="1670" width="${W}" height="250" fill="${COLOR_INK}"/>
      <text x="1030" y="1770" text-anchor="end" font-family="Telesk" font-weight="900" font-size="52" fill="${COLOR_BONE}">MIZTORE</text>
      ${pill({ x: 70, y: 1735, w: 250, h: 54, fill: COLOR_BONE })}
      <text x="195" y="1770" text-anchor="middle" font-family="Telesk" font-weight="700" font-size="22" fill="${COLOR_INK}">MIZTORE.COM</text>
    </svg>
  `;

  const [textPng, pallas] = await Promise.all([renderSvgToPng(svg, W), pallasPng(pallasH)]);
  return compose(W, H, COLOR_BONE, [
    { input: textPng, left: 0, top: 0 },
    { input: photo.buffer, left: photoX, top: photoY },
    { input: pallas, left: pallasX, top: pallasY },
  ]);
}

// ===========================================================================
// خانواده‌ی ۲: v2 — بومِ روشن + بجِ چرخیده‌ی CTA + پالاس (منبع: ۱۹:۲/۱۹:۵۹/۱۹:۱۱۶)
// ===========================================================================

function rotatedCtaBadge({ cta, x, y, fontSize }) {
  const ctaText = escape(cta);
  const estCharW = fontSize * 0.62;
  const badgeW = Math.round(cta.length * estCharW + fontSize * 1.6);
  const badgeH = Math.round(fontSize * 1.9);
  const badgeRight = x;
  const badgeLeft = badgeRight - badgeW;
  const badgeTop = y - fontSize * 1.25;
  const badgeCx = badgeLeft + badgeW / 2;
  const badgeCy = badgeTop + badgeH / 2;
  const rotation = -4;
  return `
    <g transform="rotate(${rotation} ${badgeCx} ${badgeCy})">
      <rect x="${badgeLeft}" y="${badgeTop}" width="${badgeW}" height="${badgeH}" rx="${badgeH / 2}"
            fill="${COLOR_RED}" stroke="${COLOR_BONE}" stroke-width="2"/>
      <text x="${badgeCx}" y="${badgeCy + fontSize * 0.32}" text-anchor="middle" direction="rtl"
            font-family="Telesk" font-weight="700" font-size="${fontSize}" fill="${COLOR_BONE}">${ctaText}</text>
    </g>
  `;
}

async function v2Format({ photoBytes, headline, cta, format }) {
  const CFG = {
    post: { W: 1080, H: 1350, photoBox: { x: 60, y: 280, w: 960, h: 820 }, headline: { x: 1020, y: 150, fs: 72 }, cta: { x: 1020, y: 1255, fs: 42 }, brand: { x: 60, y: 1255, fs: 28 }, pallasH: 74 },
    telegram: { W: 1080, H: 1080, photoBox: { x: 60, y: 220, w: 960, h: 680 }, headline: { x: 1020, y: 130, fs: 60 }, cta: { x: 1020, y: 1015, fs: 36 }, brand: { x: 60, y: 1015, fs: 24 }, pallasH: 64 },
    story: { W: 1080, H: 1920, photoBox: { x: 60, y: 400, w: 960, h: 1100 }, headline: { x: 1020, y: 330, fs: 64 }, cta: { x: 1020, y: 1620, fs: 40 }, brand: { x: 60, y: 1620, fs: 26 }, pallasH: 74 },
  }[format];

  const photo = await fitPhoto(photoBytes, CFG.photoBox.w, CFG.photoBox.h);
  const photoX = CFG.photoBox.x + Math.round((CFG.photoBox.w - photo.w) / 2);
  const photoY = CFG.photoBox.y + Math.round((CFG.photoBox.h - photo.h) / 2);

  const { lines: headlineLines, fontSize: headlineSize } = fitWrappedText(headline, {
    sizes: [CFG.headline.fs, CFG.headline.fs * 0.85, CFG.headline.fs * 0.72],
    maxWidth: CFG.photoBox.w,
    maxLines: 2,
  });
  const headlineY = headlineLines.length > 1 ? CFG.headline.y - headlineSize * 0.6 : CFG.headline.y;

  const pallasX = CFG.brand.x;
  const pallasY = CFG.brand.y - CFG.pallasH - 14;

  const svg = `
    <svg width="${CFG.W}" height="${CFG.H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${CFG.W}" height="${CFG.H}" fill="${COLOR_BONE}"/>
      ${multilineText({ x: CFG.headline.x, y: headlineY, lines: headlineLines, fontSize: headlineSize, weight: 900, color: COLOR_INK })}
      ${rotatedCtaBadge({ cta, x: CFG.cta.x, y: CFG.cta.y, fontSize: CFG.cta.fs })}
      <text x="${CFG.brand.x}" y="${CFG.brand.y}" text-anchor="start"
            font-family="Telesk" font-weight="700" font-size="${CFG.brand.fs}" fill="${COLOR_INK}" opacity="0.6">MIZTORE</text>
    </svg>
  `;

  const [textPng, pallas] = await Promise.all([renderSvgToPng(svg, CFG.W), pallasPng(CFG.pallasH)]);
  return compose(CFG.W, CFG.H, COLOR_BONE, [
    { input: textPng, left: 0, top: 0 },
    { input: photo.buffer, left: photoX, top: photoY },
    { input: pallas, left: pallasX, top: pallasY },
  ]);
}

// ===========================================================================
// خانواده‌ی ۳: minimal — فقط عکس + هوکِ متنی + CTAِ متنی + وردمارک (منبع: ۱:۲/۱:۸/۳:۲)
// ===========================================================================

async function minimalFormat({ photoBytes, headline, cta, format }) {
  const CFG = {
    post: { W: 1080, H: 1350, photoBox: { x: 60, y: 280, w: 960, h: 820 }, headline: { x: 1020, y: 150, fs: 56 }, cta: { x: 1020, y: 1240, fs: 34 }, brand: { x: 60, y: 1240, fs: 30 } },
    telegram: { W: 1080, H: 1080, photoBox: { x: 60, y: 220, w: 960, h: 680 }, headline: { x: 1020, y: 130, fs: 48 }, cta: { x: 1020, y: 990, fs: 30 }, brand: { x: 60, y: 990, fs: 26 } },
    story: { W: 1080, H: 1920, photoBox: { x: 60, y: 400, w: 960, h: 1100 }, headline: { x: 1020, y: 330, fs: 58 }, cta: { x: 1020, y: 1600, fs: 34 }, brand: { x: 60, y: 1600, fs: 28 } },
  }[format];

  const photo = await fitPhoto(photoBytes, CFG.photoBox.w, CFG.photoBox.h);
  const photoX = CFG.photoBox.x + Math.round((CFG.photoBox.w - photo.w) / 2);
  const photoY = CFG.photoBox.y + Math.round((CFG.photoBox.h - photo.h) / 2);

  const { lines: headlineLines, fontSize: headlineSize } = fitWrappedText(headline, {
    sizes: [CFG.headline.fs, CFG.headline.fs * 0.85, CFG.headline.fs * 0.72],
    maxWidth: CFG.photoBox.w,
    maxLines: 2,
  });
  const headlineY = headlineLines.length > 1 ? CFG.headline.y - headlineSize * 0.6 : CFG.headline.y;

  const svg = `
    <svg width="${CFG.W}" height="${CFG.H}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${CFG.W}" height="${CFG.H}" fill="${COLOR_BONE}"/>
      ${multilineText({ x: CFG.headline.x, y: headlineY, lines: headlineLines, fontSize: headlineSize, weight: 900, color: COLOR_INK })}
      <text x="${CFG.cta.x}" y="${CFG.cta.y}" text-anchor="end" direction="rtl"
            font-family="Telesk" font-weight="700" font-size="${CFG.cta.fs}" fill="${COLOR_RED}">${escape(cta)}</text>
      <text x="${CFG.brand.x}" y="${CFG.brand.y}" text-anchor="start"
            font-family="Telesk" font-weight="800" font-size="${CFG.brand.fs}" fill="${COLOR_INK}">MIZTORE</text>
    </svg>
  `;

  const textPng = renderSvgToPng(svg, CFG.W);
  return compose(CFG.W, CFG.H, COLOR_BONE, [
    { input: textPng, left: 0, top: 0 },
    { input: photo.buffer, left: photoX, top: photoY },
  ]);
}

// ===========================================================================
// رجیستری قالب‌ها — انتخابِ تصادفیِ وزن‌دار. برای اضافه‌کردنِ خانواده‌ی
// بعدی فقط یه entry جدید این‌جا لازمه.
// ===========================================================================

const TEMPLATES = {
  v2: {
    weight: 0.5,
    renderers: {
      post: (args) => v2Format({ ...args, format: "post" }),
      telegram: (args) => v2Format({ ...args, format: "telegram" }),
      story: (args) => v2Format({ ...args, format: "story" }),
    },
  },
  brightEditorial: {
    weight: 0.3,
    renderers: { post: brightEditorialPost, telegram: brightEditorialTelegram, story: brightEditorialStory },
  },
  minimal: {
    weight: 0.2,
    renderers: {
      post: (args) => minimalFormat({ ...args, format: "post" }),
      telegram: (args) => minimalFormat({ ...args, format: "telegram" }),
      story: (args) => minimalFormat({ ...args, format: "story" }),
    },
  },
};

function pickTemplateName() {
  const names = Object.keys(TEMPLATES);
  const totalWeight = names.reduce((sum, n) => sum + TEMPLATES[n].weight, 0);
  let r = Math.random() * totalWeight;
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
};

async function renderPost({ photoBytes, headline, cta, categoryLabel, format, templateName }) {
  const name = templateName || pickTemplateName();
  const template = TEMPLATES[name];
  if (!template) throw new Error(`قالبِ ناشناخته: ${name}`);
  const renderer = template.renderers[format];
  if (!renderer) throw new Error(`فرمت ناشناخته: ${format}`);
  return renderer({ photoBytes, headline, cta, categoryLabel: categoryLabel || "میزطوری" });
}

module.exports = { renderPost, fetchBytes, FORMATS, pickTemplateName, TEMPLATES };

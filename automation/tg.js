/**
 * tg.js — طراحیِ مخصوصِ کانالِ تلگرام (@miztor)، ۲۰۲۶-۱۱-۱۴.
 * خواسته‌ی کاربر: مینیمال؛ عکس تمام‌صفحه، لوگو پایین‌چپ، یک جمله‌ی خلاقانه، و نامِ محصول
 * به‌عنوان تیتر (کوچیک). متنِ بلند و لینک تو کپشن و دکمه‌ست. اندازه ۱۲۸۰×۱۶۰۰ (حدِ تلگرام).
 * فقط formatِ تلگرام؛ قالب‌هایِ دیگه‌یِ render.js دست‌نخورده‌ان.
 *
 * دو منبعِ محتوا:
 *   data/tg-posts.json  — عکس‌هایِ جدید (assets/tg) با متن و آیدیِ محصولِ دستی‌ و تأییدشده (اولویت)
 *   data/tg-notes.json  — یادداشتِ متنی بدونِ عکس و بدونِ اشاره به محصول
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { svgToPng, fit } = require("./render.js");
const { loadState, saveState } = require("./state.js");

const W = 1280;
const H = 1600;
const FA = "Tabliq Bold";
const MARGIN = 76;
const LOGO_H = 104;
const LOGO_PATH = path.join(__dirname, "..", "assets", "logo-white.png");
const DATA = path.join(__dirname, "..", "data");

// ي/ك عربی ممکنه از مدلِ متن یا سایت بیاد؛ فونت اون‌ها رو متفاوت می‌کشه
const norm = (s) => String(s).replace(/ي/g, "ی").replace(/ك/g, "ک");
const esc = (s) => norm(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function renderTg({ photoBytes, line, name }) {
  const x = W - MARGIN;
  const maxW = W - MARGIN * 2 - 260 - 40; // کنارِ لوگو جا بمونه
  const head = fit(norm(name), { maxW, maxLines: 2, sizes: [58, 54, 50, 46] });
  const kick = fit(norm(line), { maxW: 1000, maxLines: 2, sizes: [42, 40, 38] });
  const lhH = head.size * 1.45;
  const lhK = kick.size * 1.5;
  const headLast = H - 104;
  const headFirst = headLast - (head.lines.length - 1) * lhH;
  const kickLast = headFirst - lhH * 1.05;
  const kickFirst = kickLast - (kick.lines.length - 1) * lhK;

  const t = (s, y, size, op) =>
    `<text x="${x}" y="${y}" text-anchor="end" direction="rtl" font-family="${FA}" font-size="${size}" fill="#fff" fill-opacity="${op}">${esc(s)}</text>`;
  const texts = [
    ...kick.lines.map((s, i) => t(s, kickFirst + i * lhK, kick.size, 0.92)),
    ...head.lines.map((s, i) => t(s, headFirst + i * lhH, head.size, 1)),
  ].join("");
  const scrimH = Math.max(560, H - (kickFirst - kick.size) + 140);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs><linearGradient id="g" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.84"/><stop offset="0.55" stop-color="#000" stop-opacity="0.46"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient></defs><rect x="0" y="${H - scrimH}" width="${W}" height="${scrimH}" fill="url(#g)"/>${texts}</svg>`;

  const logo = await sharp(LOGO_PATH).resize({ height: LOGO_H }).png().toBuffer();
  return sharp(photoBytes)
    .resize(W, H, { fit: "cover", position: "centre" })
    .composite([
      { input: svgToPng(svg, W) },
      { input: logo, left: MARGIN, top: H - 92 - LOGO_H },
    ])
    .jpeg({ quality: 90 })
    .toBuffer();
}

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(DATA, f), "utf-8"));

// انتخابِ تصادفی از بینِ استفاده‌نشده‌ها؛ وقتی همه استفاده شدن از اول. dry-run چیزی مصرف نمی‌کنه.
function pickFrom(list, stateKey, idOf, dryRun) {
  const st = loadState();
  const used = new Set(st[stateKey] || []);
  let pool = list.filter((x) => !used.has(idOf(x)));
  if (!pool.length) {
    pool = list;
    st[stateKey] = [];
  }
  const item = pool[Math.floor(Math.random() * pool.length)];
  if (!dryRun) {
    st[stateKey] = [...(st[stateKey] || []), idOf(item)];
    saveState(st);
  }
  return item;
}

const pickNewPhoto = (dryRun) => pickFrom(readJson("tg-posts.json"), "tgUsed", (p) => p.file, dryRun);
const pickNote = (dryRun) => pickFrom(readJson("tg-notes.json"), "noteUsed", (n) => n, dryRun);

module.exports = { renderTg, pickNewPhoto, pickNote };

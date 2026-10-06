/**
 * reel.js — ریلزِ ۹:۱۶ از عکس‌هایِ واقعیِ صفحه‌یِ محصول.
 *
 * چرا (آدیتِ پیج، ۲۰۲۶-۱۰-۰۶): برنامه‌یِ یه ماهِ اینستاگرام صفر ریلز داشت، رقبا تقریباً فقط
 * ریلز می‌ذارن و تنها ریلِ اخیرِ میزطوری بیشترین لایکِ ۶ پستِ آخر رو گرفت. دو مدل:
 *   colors — «یه طرح، N رنگ»: هوک رویِ عکسِ رویِ تن (یا ماکاپ)، بعد ماکاپِ رنگ‌هایِ همین طرح
 *            تند پشتِ‌سرِهم (گالریِ سایت برایِ هر رنگ یه عکس با alt «… - رنگ» داره)، آخرش کارتِ خرید
 *   look   — عکس‌هایِ «روی تن»ِ همین طرح با زومِ آروم و سه جمله‌یِ کوتاه، آخرش کارتِ خرید
 * فریم‌ها با sharp/resvg (همون فونت و توکن‌هایِ render.js) ساخته می‌شن و ffmpeg ویدیوشون می‌کنه
 * (رویِ runnerِ گیت‌هاب نصبه). صدا: ترکِ سکوت — موقعِ انتشار تو اینستاگرام یه آهنگِ ترند بذار.
 * همه‌یِ عددها (رنگ، سایز، مدل، قیمت) از خودِ فروشگاه میان.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const sharp = require("sharp");
const { KIT, fetchBytes } = require("./render.js");
const store = require("./store.js");
const { writeCampaign } = require("./copywriter.js");
const { loadState, saveState } = require("./state.js");
const { instagramCaption, tweetText } = require("./social.js");

const { C, LIGHT, FA, LH, svgToPng, textWidth, fit, textLines, pill, brandPill, asset, esc, faDigits } = KIT;
const W = 1080;
const H = 1920;
const FPS = 30;
// رابطِ ریلزِ اینستاگرام بالا (برچسب/دوربین) و پایین (اسم، کپشن، دکمه‌ها) رو می‌پوشونه
const SAFE_TOP = 230;
const SAFE_BOTTOM = H - 400;
const API = "https://miztore.com/wp-json/wc/store/v1";
const WHITE = LIGHT.b50;

async function getJson(url, tries = 3) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "miztore-automation" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i >= tries - 1) throw err;
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
    }
  }
}

// ---------------------------------------------------------------------------
// انتخابِ محصول
// ---------------------------------------------------------------------------
const FIRST_COLORS = ["مشکی", "سفید", "قرمز", "سرمه‌ای"];

// عکس‌هایِ هر رنگ (alt: «تیشرت … - قرمز») و عکس‌هایِ رویِ تن (alt: «… روی تن - میزطوری»)
function mediaOf(p) {
  const colors = ((p.attributes || []).find((a) => a.taxonomy === "pa_color")?.terms || []).map((t) => t.name.trim());
  const byColor = new Map();
  const looks = [];
  for (const im of p.images || []) {
    const label = String(im.alt || im.name || "").trim();
    if (/روی\s*تن/.test(label)) {
      if (!looks.includes(im.src)) looks.push(im.src);
      continue;
    }
    const m = label.match(/\s[-–]\s*([^-–]+)$/);
    const c = m && m[1].trim();
    if (c && colors.includes(c) && !byColor.has(c)) byColor.set(c, im.src);
  }
  return { colors, byColor, looks };
}

async function pickReel(dryRun, forced) {
  const st = loadState();
  const rec = st.reel || { recent: [], lastVariant: null };
  const pool = (await store.pool(60)).filter((p) => p.kind && !rec.recent.includes(p.id));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (const p of pool.slice(0, 18)) {
    const raw = await getJson(`${API}/products/${p.id}`).catch(() => null);
    if (!raw) continue;
    const m = mediaOf(raw);
    const can = { look: m.looks.length >= 3, colors: m.byColor.size >= 8 };
    let variant = forced && can[forced] ? forced : null;
    if (!variant && !forced) variant = can.look && can.colors ? (rec.lastVariant === "look" ? "colors" : "look") : can.look ? "look" : can.colors ? "colors" : null;
    if (!variant) continue;
    const d = await store.productDetail(p.id).catch(() => null);
    if (!d) continue;
    if (!dryRun) {
      st.reel = { recent: [d.id, ...rec.recent].slice(0, 40), lastVariant: variant };
      saveState(st);
    }
    return { d, m, variant };
  }
  return null;
}

// ---------------------------------------------------------------------------
// فریم‌ها
// ---------------------------------------------------------------------------
// under: زیرِ لایه‌یِ SVG (عکس‌ها)، over: رویِ اون (آیکونِ پالاس داخلِ پیلِ برند)
async function frame(bg, layers, svg, over = []) {
  const all = [...layers.filter(Boolean)];
  if (svg) all.push({ input: svgToPng(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg}</svg>`, W), left: 0, top: 0 });
  all.push(...over.filter(Boolean));
  return sharp({ create: { width: W, height: H, channels: 3, background: bg } }).composite(all).jpeg({ quality: 92, chromaSubsampling: "4:4:4" }).toBuffer();
}

const centered = (args) => {
  const p0 = pill({ ...args, x: 0 });
  return pill({ ...args, x: Math.round((W + p0.w) / 2) });
};

// عکسِ استودیویی کامل (بدونِ برش)، تو قابِ گِرد با خطِ نازک — همه‌یِ رنگ‌ها دقیقاً هم‌جا می‌افتن
async function studioBox(bytes, x, y, w, h) {
  const r = 36;
  const inner = await sharp(bytes).resize(w, h, { fit: "contain", background: C.photo }).flatten({ background: C.photo }).png().toBuffer();
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`);
  const buf = await sharp(inner).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  return { layer: { input: buf, left: x, top: y }, svg: `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${C.ink}" stroke-width="3"/>` };
}

async function brandLayer() {
  const icon = await asset("palas-mark.png", { height: 46 });
  return brandPill({ right: W - 60, top: SAFE_TOP - 90, h: 64, icon });
}

// هوک: عکسِ تمام‌صفحه + سایه‌یِ بالا + تیترِ بزرگ + زیرتیترِ قرمز
async function hookFrame({ photoBytes, studio, headline, sub }) {
  const brand = await brandLayer();
  const layers = [];
  let svg = "";
  // تیتر و زیرتیتر بالا رویِ بومِ ساده؛ عکس زیرشون شروع می‌شه تا متن هیچ‌وقت رویِ صورت نیفته
  const t = fit(headline, { maxW: W - 160, maxLines: 3, sizes: [108, 100, 92, 84, 76, 68] });
  const y0 = SAFE_TOP + 40 + t.size;
  svg += textLines({ lines: t.lines, size: t.size, x: W / 2, y: y0, color: C.ink, anchor: "middle" });
  let y = y0 + (t.lines.length - 1) * t.size * LH + 50;
  if (sub && textWidth(sub, Math.round(84 * 0.44)) < W - 240) {
    svg += centered({ y, h: 84, text: sub, fill: C.red, color: C.onRed }).svg;
    y += 84;
  }
  const top = Math.round(y + 50);
  if (studio) {
    const box = await studioBox(photoBytes, 60, top, W - 120, Math.min(1000, H - 120 - top));
    layers.push(box.layer);
    svg += box.svg;
  } else {
    const ph = H - top;
    layers.push({ input: await sharp(photoBytes).resize(W, ph, { fit: "cover", position: sharp.strategy.attention }).toBuffer(), left: 0, top });
    svg += `<line x1="0" y1="${top}" x2="${W}" y2="${top}" stroke="${C.ink}" stroke-width="3"/>`;
  }
  return frame(C.bone, layers, svg + brand.svg, [brand.layer]);
}

async function colorFrame({ photoBytes, color, i, n }) {
  const brand = await brandLayer();
  const box = await studioBox(photoBytes, 60, SAFE_TOP + 40, W - 120, 1060);
  const counter = pill({ x: 60, y: SAFE_TOP - 84, h: 56, text: `${faDigits(i)} از ${faDigits(n)}`, fill: C.ink, color: C.b50, anchor: "left" });
  const name = centered({ y: SAFE_TOP + 40 + 1060 + 44, h: 108, text: color, fill: C.ink, color: C.b50 });
  return frame(C.bone, [box.layer], box.svg + brand.svg + counter.svg + name.svg, [brand.layer]);
}

async function lookFrame({ photoBytes, beat }) {
  const brand = await brandLayer();
  const photo = await sharp(photoBytes).resize(W, H, { fit: "cover", position: sharp.strategy.attention }).toBuffer();
  let svg = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="0.82" stop-color="#000" stop-opacity="0.72"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>`;
  if (beat) {
    const t = fit(beat, { maxW: W - 180, maxLines: 2, sizes: [84, 78, 72, 66, 60] });
    const yLast = SAFE_BOTTOM - 40;
    svg += textLines({ lines: t.lines, size: t.size, x: W / 2, y: yLast - (t.lines.length - 1) * t.size * LH, color: WHITE, anchor: "middle" });
  }
  return frame(C.bone, [{ input: photo, left: 0, top: 0 }], svg + brand.svg, [brand.layer]);
}

// کارتِ آخر: عکسِ محصول، اسم، واقعیت‌ها (از سایت)، «لینکِ خرید تو بیو»
async function endFrame({ d, photoBytes }) {
  const brand = await brandLayer();
  const box = await studioBox(photoBytes, 150, SAFE_TOP - 10, W - 300, 760);
  let svg = box.svg + brand.svg;
  let y = SAFE_TOP - 10 + 760 + 40;
  const name = fit(`${d.kind} «${d.shortName}»`, { maxW: W - 160, maxLines: 2, sizes: [72, 66, 60, 54, 48] });
  y += name.size;
  svg += textLines({ lines: name.lines, size: name.size, x: W / 2, y, anchor: "middle" });
  y += (name.lines.length - 1) * name.size * LH + 40;
  const chips = [];
  // Tabliq حروفِ لاتین نداره (S/XXXL با فونتِ جایگزین درمیاد)؛ پس تعدادِ سایزها به فارسی
  if (d.colorNames.length >= 2) chips.push({ text: `${faDigits(d.colorNames.length)} رنگ` });
  if (d.sizes.length >= 2) chips.push({ text: `${faDigits(d.sizes.length)} سایز` });
  if (d.cuts.length >= 2) chips.push({ text: `${faDigits(d.cuts.length)} مدلِ دوخت` });
  chips.push({ text: "قسطی با دیجی‌پی" });
  // چیپ‌ها تو ردیف‌هایِ وسط‌چین
  const h = 66;
  const gap = 16;
  const widths = chips.map((c) => pill({ x: 0, y: 0, h, ...c, fill: "none", color: C.ink }).w);
  const rows = [[]];
  let rowW = 0;
  chips.forEach((t, i) => {
    if (rowW && rowW + gap + widths[i] > W - 140) {
      rows.push([]);
      rowW = 0;
    }
    rows[rows.length - 1].push(i);
    rowW += (rowW ? gap : 0) + widths[i];
  });
  for (const row of rows) {
    const total = row.reduce((a, i) => a + widths[i], 0) + gap * (row.length - 1);
    let x = (W + total) / 2;
    for (const i of row) {
      svg += pill({ x, y, h, ...chips[i], fill: C.b50, color: C.ink, stroke: C.ink }).svg;
      x -= widths[i] + gap;
    }
    y += h + gap;
  }
  if (d.priceText) {
    y += 54;
    svg += `<text x="${W / 2}" y="${y}" text-anchor="middle" direction="rtl" font-family="${FA}" font-size="44" fill="${C.g40}">${esc(d.priceText)}</text>`;
  }
  svg += centered({ y: Math.min(SAFE_BOTTOM - 100, y + 50), h: 96, text: "لینکِ خرید تو بیوئه", fill: C.red, color: C.onRed }).svg;
  return frame(C.bone, [box.layer], svg, [brand.layer]);
}

// ---------------------------------------------------------------------------
// ویدیو
// ---------------------------------------------------------------------------
function hasFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// segments: [{ file, dur, zoom }] → mp4 (H.264، ۳۰fps، با ترکِ سکوت تا تلگرام گیف حسابش نکنه)
function encode(segments, outPath) {
  const args = ["-y", "-loglevel", "error"];
  for (const s of segments) args.push("-loop", "1", "-framerate", String(FPS), "-t", String(s.dur), "-i", s.file);
  const total = segments.reduce((a, s) => a + s.dur, 0);
  args.push("-f", "lavfi", "-t", String(total), "-i", "anullsrc=r=44100:cl=stereo");
  const parts = segments.map((s, i) => {
    const n = Math.round(s.dur * FPS);
    return s.zoom
      ? `[${i}:v]scale=${W * 2}:${H * 2},zoompan=z='min(1+0.0010*on,1.07)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS},trim=end_frame=${n},setsar=1[v${i}]`
      : `[${i}:v]scale=${W}:${H},fps=${FPS},trim=end_frame=${n},setsar=1[v${i}]`;
  });
  const filter = `${parts.join(";")};${segments.map((_, i) => `[v${i}]`).join("")}concat=n=${segments.length}:v=1:a=0,format=yuv420p[v]`;
  args.push("-filter_complex", filter, "-map", "[v]", "-map", `${segments.length}:a`, "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-r", String(FPS), "-c:a", "aac", "-b:a", "64k", "-shortest", "-movflags", "+faststart", outPath);
  execFileSync("ffmpeg", args, { stdio: ["ignore", "inherit", "inherit"] });
}

// ---------------------------------------------------------------------------
// اجرا (هم‌شکلِ خروجیِ campaigns.runCampaign، به‌اضافه‌یِ outputs.reel)
// ---------------------------------------------------------------------------
const FALLBACK = {
  colors: { headline: "کدوم رنگش مالِ توئه؟", beats: [] },
  look: { headline: "این طرح رو تن چه شکلیه؟", beats: ["برایِ کافه با رفقا", "برایِ روزایِ شلوغِ کاری", "برایِ وقتی می‌خوای دیده شی"] },
};

async function runReel(env, { dryRun, write, outDir }) {
  if (!hasFfmpeg()) throw new Error("ffmpeg نصب نیست");
  const picked = await pickReel(dryRun, env.REEL_VARIANT || null);
  if (!picked) throw new Error("محصولی با عکسِ رنگ‌ها یا عکسِ رویِ تن پیدا نشد");
  const { d, m, variant } = picked;

  const colorOrder = [...FIRST_COLORS.filter((c) => m.byColor.has(c)), ...[...m.byColor.keys()].filter((c) => !FIRST_COLORS.includes(c))];
  const colorsShown = colorOrder.slice(0, 12);
  const facts = [
    `${d.kind} «${d.shortName}»`,
    d.colorNames.length ? `${faDigits(d.colorNames.length)} رنگ: ${d.colorNames.slice(0, 12).join("، ")}${d.colorNames.length > 12 ? " و …" : ""}` : null,
    d.sizes.length ? `سایز: ${d.sizes.join("، ")}` : null,
    d.cuts.length ? `مدل‌ها: ${d.cuts.map((c) => c.name).join("، ")}` : null,
    d.priceText ? `قیمت: ${d.priceText}` : null,
    d.fabric.length ? `جنس: ${d.fabric.slice(0, 2).join("؛ ")}` : null,
    "خرید قسطی با دیجی‌پی، ۷ روز ضمانتِ بازگشت",
  ]
    .filter(Boolean)
    .join("\n");
  const copy =
    (await writeCampaign(env, { type: "reel", reel: { item: d, variant, count: faDigits(d.colorNames.length), facts } })) || {
      ...FALLBACK[variant],
      caption: `${d.kind} «${d.shortName}»\n${faDigits(d.colorNames.length)} رنگ${d.sizes.length ? `، سایز ${d.sizes[0]} تا ${d.sizes[d.sizes.length - 1]}` : ""}.`,
      source: "fallback",
    };
  const beats = (copy.beats && copy.beats.length >= 3 ? copy.beats : FALLBACK.look.beats).slice(0, 3);

  // فریم‌ها
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "reel-"));
  const segs = [];
  const put = async (buf, dur, zoom = false) => {
    const file = path.join(tmp, `f${String(segs.length).padStart(2, "0")}.jpg`);
    fs.writeFileSync(file, buf);
    segs.push({ file, dur, zoom });
    return buf;
  };
  const mainBytes = await fetchBytes(d.images[0]);
  let cover;
  if (variant === "colors") {
    const sub = `یه طرح، ${faDigits(d.colorNames.length)} رنگ`;
    cover = m.looks.length
      ? await hookFrame({ photoBytes: await fetchBytes(m.looks[0]), headline: copy.headline, sub })
      : await hookFrame({ photoBytes: await fetchBytes(m.byColor.get(colorsShown[0])), studio: true, headline: copy.headline, sub });
    await put(cover, 1.8, m.looks.length > 0);
    for (const [i, c] of colorsShown.entries()) {
      const bytes = await fetchBytes(m.byColor.get(c)).catch(() => null);
      if (bytes) await put(await colorFrame({ photoBytes: bytes, color: c, i: i + 1, n: colorsShown.length }), i === 0 ? 0.7 : 0.48);
    }
  } else {
    const looks = m.looks.slice(0, 4);
    cover = await hookFrame({ photoBytes: await fetchBytes(looks[0]), headline: copy.headline, sub: `${d.kind} «${d.shortName}»` });
    await put(cover, 2, true);
    for (const [i, src] of looks.slice(1, 4).entries()) {
      const bytes = await fetchBytes(src).catch(() => null);
      if (bytes) await put(await lookFrame({ photoBytes: bytes, beat: beats[i] }), 1.9, true);
    }
  }
  await put(await endFrame({ d, photoBytes: mainBytes }), 2.6);

  const coverRel = write("reel-cover", cover);
  const reelRel = coverRel.replace(/reel-cover-/, "reel-").replace(/\.jpe?g$/i, ".mp4");
  encode(segs, path.join(outDir, reelRel));
  fs.rmSync(tmp, { recursive: true, force: true });
  const secs = segs.reduce((a, s) => a + s.dur, 0);
  console.log(`🎬 ریلز (${variant}) — ${segs.length} فریم، ${secs.toFixed(1)} ثانیه: ${d.name}`);

  const line = `${d.kind} «${d.shortName}»`;
  return {
    key: `campaign/reel/${d.id}-${variant}`,
    category: variant === "colors" ? "ریلز: رنگ‌ها" : "ریلز: رویِ تن",
    outputs: { reel: reelRel, cover: coverRel, post: coverRel, story: coverRel, telegram: coverRel, twitter: coverRel, carousel: [coverRel] },
    headline: copy.headline,
    caption: `${copy.caption}\n\n${line} — ${d.link("tg")}`,
    instagramCaption: instagramCaption({ caption: copy.caption, type: "reel", focus: variant === "colors" ? "colors" : null, category: d.kind, extra: [line], topicText: `${d.name} ${(d.collections || []).join(" ")}` }),
    twitterCaption: tweetText({ tweet: copy.tweet, caption: copy.caption, link: d.link("x") }),
    buyUrlTelegram: d.link("tg"),
    buyUrlInstagram: d.link("ig"),
    buyUrlTwitter: d.link("x"),
    copySource: copy.source || "fallback",
    dryRun,
  };
}

module.exports = { runReel, mediaOf, hookFrame, colorFrame, lookFrame, endFrame };

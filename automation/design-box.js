/**
 * design-box.js — پیدا کردنِ جایِ طرحِ چاپ‌شده رویِ عکس‌هایِ استودیوییِ سایت
 * (لباسِ تک‌رنگ رویِ پس‌زمینه‌یِ شفاف/ساده)، بدونِ هوشِ مصنوعی.
 *
 * روش: ماسکِ لباس (آلفا، یا فاصله از رنگِ گوشه‌ها) → کمی کوچیک‌ترش می‌کنیم تا
 * لبه و سایه‌یِ دورِ لباس حساب نشه → رنگِ غالبِ پارچه (میانه) → پیکسل‌هایی که
 * از رنگِ پارچه خیلی فاصله دارن «طرح»ن → کادرِ دورشون (با حذفِ نقطه‌هایِ پرت).
 * خروجی مثلِ designBoxِ copywriter: { left, top, right, bottom } بینِ ۰ و ۱.
 */

const sharp = require("sharp");

const N = 320; // تحلیل رویِ نسخه‌یِ کوچیک؛ سریع و بی‌حساسیت به نویز

async function studioDesignBox(bytes) {
  const { data, info } = await sharp(bytes).resize(N, N, { fit: "inside" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]];
  const dist = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

  // ۱) ماسکِ لباس
  const corners = [0, w - 1, (h - 1) * w, h * w - 1].map(px);
  const transparentBg = corners.every((c) => c[3] < 20);
  if (!transparentBg && corners.some((c) => dist(c, corners[0]) > 30)) return null; // پس‌زمینه ساده نیست (عکسِ مدل)
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = px(i);
    mask[i] = transparentBg ? p[3] > 200 : dist(p, corners[0]) > 28 ? 1 : 0;
  }
  // ۲) کوچیک‌کردنِ ماسک (erosion) تا لبه‌ها حساب نشن
  const r = Math.max(2, Math.round(Math.min(w, h) * 0.025));
  const inner = new Uint8Array(w * h);
  const rowRun = new Uint16Array(w * h);
  for (let y = 0; y < h; y++) {
    let run = 0;
    for (let x = 0; x < w; x++) {
      run = mask[y * w + x] ? run + 1 : 0;
      rowRun[y * w + x] = run;
    }
  }
  // پیکسل داخلیه اگه یه مربعِ (2r+1) دورش کامل تو ماسک باشه (با اجراهایِ افقی تقریب زده می‌شه)
  for (let y = r; y < h - r; y++)
    for (let x = r; x < w - r; x++) {
      let ok = true;
      for (let dy = -r; dy <= r && ok; dy += Math.max(1, r >> 1)) if (rowRun[(y + dy) * w + x + r] < 2 * r + 1) ok = false;
      inner[y * w + x] = ok ? 1 : 0;
    }
  let area = 0;
  const rs = [],
    gs = [],
    bs = [];
  for (let i = 0; i < w * h; i++)
    if (inner[i]) {
      area++;
      if (area % 3 === 0) {
        rs.push(data[i * 4]);
        gs.push(data[i * 4 + 1]);
        bs.push(data[i * 4 + 2]);
      }
    }
  if (area < w * h * 0.08) return null;
  const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
  const fabric = [med(rs), med(gs), med(bs)];

  // ۳) پیکسل‌هایِ طرح: هم رنگش با پارچه فرق داره، هم لبه‌یِ تیز داره (چین و سایه‌یِ
  //    پارچه — مخصوصاً رویِ لباسِ سفید — نرم و بی‌لبه‌ست و حساب نمی‌شه)
  const lum = (i) => 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  const edge = (x, y) => {
    const i = y * w + x;
    return Math.max(Math.abs(lum(i + 1) - lum(i - 1)), Math.abs(lum(i + w) - lum(i - w)), dist(px(i + 1), px(i - 1)) * 0.6, dist(px(i + w), px(i - w)) * 0.6);
  };
  const xs = [],
    ys = [];
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (inner[i] && dist(px(i), fabric) > 60 && edge(x, y) > 50) {
        xs.push(x);
        ys.push(y);
      }
    }
  if (xs.length < area * 0.003) return null; // طرحی پیدا نشد (یا لباسِ ساده‌ست)
  // کادر از رویِ «تراکم»: ستون/ردیف‌هایی که فقط چند نقطه‌یِ پراکنده (چینِ پارچه) دارن حساب نمی‌شن
  const span = (vals, n) => {
    const cnt = new Uint32Array(n);
    for (const v of vals) cnt[v]++;
    const th = Math.max(2, Math.max(...cnt) * 0.06);
    let a = 0,
      b = n - 1;
    while (a < n && cnt[a] < th) a++;
    while (b > a && cnt[b] < th) b--;
    return [a, b];
  };
  let [left, right] = span(xs, w);
  let [top, bottom] = span(ys, h);
  const padX = (right - left) * 0.04 + 2,
    padY = (bottom - top) * 0.04 + 2;
  const box = {
    left: Math.max(0, (left - padX) / w),
    right: Math.min(1, (right + padX) / w),
    top: Math.max(0, (top - padY) / h),
    bottom: Math.min(1, (bottom + padY) / h),
  };
  if (box.right - box.left < 0.06 || box.bottom - box.top < 0.04) return null;
  return box;
}

module.exports = { studioDesignBox };

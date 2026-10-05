/**
 * occasions.js — تقویمِ مناسبت‌ها برایِ پست‌هایِ مناسبتی (شب یلدا، ولنتاین، نوروز).
 *
 * فقط «تقویم» اینجاست؛ محصولاتِ هر مناسبت از دسته‌یِ «occasions» سایت میاد
 * (store.occasionItems) و با کلیدواژه‌یِ اسمِ محصول جدا می‌شه. اگه برایِ یه مناسبت
 * محصولی تو سایت نباشه، پستش ساخته نمی‌شه (کمپین خطا می‌ده و ربات پستِ محصول می‌سازه).
 *
 * شمارشِ روزهایِ مانده واقعیتِ تقویمه، نه فشارِ ساختگی: «۷۷ روز تا شب یلدا».
 * تاریخ‌هایِ شمسی با تقویمِ پارسیِ Intl حساب می‌شن (منطقه‌یِ زمانیِ تهران)، پس نیازی به جدولِ دستی نیست.
 */

const TZ = "Asia/Tehran";
const fa = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);

const OCCASIONS = [
  { key: "yalda", name: "شب یلدا", persian: [9, 30], lead: 21, keywords: ["یلدا"], todayText: "امشب شب یلداست", tomorrowText: "فردا شب یلداست" },
  { key: "valentine", name: "ولنتاین", gregorian: [2, 14], lead: 14, keywords: ["ولنتاین"], todayText: "امروز ولنتاینه", tomorrowText: "فردا ولنتاینه" },
  { key: "nowruz", name: "نوروز", persian: [1, 1], lead: 25, keywords: ["نوروز"], todayText: "امروز نوروزه", tomorrowText: "فردا نوروزه" },
];

// «امروز» به وقتِ تهران، به‌صورتِ نیمه‌شبِ UTC (برایِ تفریقِ روزها)
function tehranToday(now) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const persianParts = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { timeZone: "UTC", month: "numeric", day: "numeric" });

// نزدیک‌ترین تاریخِ آینده (یا امروز) برایِ یه مناسبت، به‌صورتِ نیمه‌شبِ UTC
function nextDate(occ, today) {
  if (occ.gregorian) {
    const [gm, gd] = occ.gregorian;
    let t = new Date(Date.UTC(today.getUTCFullYear(), gm - 1, gd));
    if (t < today) t = new Date(Date.UTC(today.getUTCFullYear() + 1, gm - 1, gd));
    return t;
  }
  const [pm, pd] = occ.persian;
  for (let i = 0; i < 400; i++) {
    const x = new Date(today.getTime() + i * 864e5);
    const [m, d] = persianParts.format(x).split("/").map(Number);
    if (m === pm && d === pd) return x;
  }
  return null;
}

function labelFor(occ, daysLeft) {
  if (daysLeft === 0) return occ.todayText;
  if (daysLeft === 1) return occ.tomorrowText;
  return `${fa(daysLeft)} روز تا ${occ.name}`;
}

function describe(occ, now) {
  const today = tehranToday(now);
  const date = nextDate(occ, today);
  if (!date) return null;
  const daysLeft = Math.round((date - today) / 864e5);
  return { occ, daysLeft, date: date.toISOString().slice(0, 10), label: labelFor(occ, daysLeft) };
}

// مناسبتی که الان تو پنجره‌یِ تبلیغشه (lead روز مونده تا خودِ روز)، نزدیک‌ترین
function activeOccasion(now = new Date()) {
  const act = OCCASIONS.map((o) => describe(o, now)).filter((x) => x && x.daysLeft <= x.occ.lead);
  act.sort((a, b) => a.daysLeft - b.daysLeft);
  return act[0] || null;
}

// برایِ تست (CONTENT_TYPE=occasion): اگه الان هیچ مناسبتی تو پنجره نیست، نزدیک‌ترینِ آینده
function nextOccasion(now = new Date()) {
  const all = OCCASIONS.map((o) => describe(o, now)).filter(Boolean);
  all.sort((a, b) => a.daysLeft - b.daysLeft);
  return all;
}

module.exports = { OCCASIONS, activeOccasion, nextOccasion };

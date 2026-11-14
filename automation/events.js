/**
 * events.js — پست‌هایِ مناسبتی با طراحیِ تازه‌یِ تلگرام (۲۰۲۶-۱۱-۱۴، خواسته‌ی کاربر: «یک هفته قبل از
 * آخر و اولِ ماه، یلدا، بلک‌فرایدی و مراسمِ مشابه که فرصتِ خوبِ فروشه»).
 *
 * قاعده‌ها:
 *  - پنجره: ۷ روز مونده تا خودِ مناسبت. آخر/اولِ ماه: ۳ روزِ آخرِ ماه تا روزِ دومِ ماهِ بعد.
 *  - هیچ درصدِ تخفیف یا کدِ تخفیفی ساخته نمی‌شه؛ فقط شمارشِ معکوس و دعوت به دیدنِ طرح‌ها.
 *    (تخفیفِ واقعی رو کاربر تعیین می‌کنه؛ بعد اضافه‌ش می‌کنیم.)
 *  - روزِ مناسبت‌هایِ قمری (روزِ مادر/پدر) هر سال جابه‌جا می‌شن و اینجا نیستن.
 *  - تاریخ‌هایِ شمسی با تقویمِ پارسیِ Intl (منطقه‌یِ تهران) حساب می‌شن.
 * خروجی: activeEvent() → { key, name, daysLeft, label, chance, prefer, caption() } یا null.
 */
const TZ = "Asia/Tehran";
const fa = (s) => String(s).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
const LEAD = 7;

function tehranToday(now) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
const persianParts = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { timeZone: "UTC", month: "numeric", day: "numeric" });
const persianMD = (date) => persianParts.format(date).split("/").map(Number);
const addDays = (d, n) => new Date(d.getTime() + n * 864e5);

// جمعه‌یِ چهارمِ نوامبر (بلک‌فرایدی)
function blackFriday(year) {
  const dow = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  return new Date(Date.UTC(year, 10, 1 + ((5 - dow + 7) % 7) + 21));
}
function nextGregorian(today, m, d) {
  let t = new Date(Date.UTC(today.getUTCFullYear(), m - 1, d));
  if (t < today) t = new Date(Date.UTC(today.getUTCFullYear() + 1, m - 1, d));
  return t;
}
function nextPersian(today, pm, pd) {
  for (let i = 0; i < 400; i++) {
    const x = addDays(today, i);
    const [m, d] = persianMD(x);
    if (m === pm && d === pd) return x;
  }
  return null;
}

// idهایِ محصولِ data/tg-posts.json که به مناسبت می‌خورن (اولویت، نه اجبار)
const EVENTS = [
  {
    key: "blackfriday",
    name: "بلک‌فرایدی",
    date: (today) => {
      const b = blackFriday(today.getUTCFullYear());
      return b < today ? blackFriday(today.getUTCFullYear() + 1) : b;
    },
    now: "امروز بلک‌فرایدیه",
    tomorrow: "فردا بلک‌فرایدیه",
    prefer: [],
    captions: [
      "بلک‌فرایدی نزدیکه. از الان لیستِ طرح‌هایی که دوست داری رو بساز تا روزِ اصلی دنبالشون نگردی.",
      "همه دارن لیست می‌سازن. تو هم یه نگاه به طرح‌ها بنداز و بذار توی لیستِ خودت.",
      "بلک‌فرایدی یعنی فرصتِ برداشتنِ همون هودی‌ای که مدت‌هاست توی ذهنته.",
    ],
  },
  {
    key: "yalda",
    name: "شب یلدا",
    date: (today) => nextPersian(today, 9, 30),
    now: "امشب شب یلداست",
    tomorrow: "فردا شب یلداست",
    prefer: [62150],
    captions: [
      "یلدا بدونِ انار و حافظ؟ نمی‌شه. برای بلندترین شبِ سال یه چیزِ گرم بپوش.",
      "شبِ یلدا نزدیکه. هدیه‌ای که این شب بدی، تا آخرِ زمستون پوشیده می‌شه.",
      "بلندترین شب، گرم‌ترین پلیور. فقط یه انار کم داری.",
    ],
  },
  {
    key: "valentine",
    name: "ولنتاین",
    date: (today) => nextGregorian(today, 2, 14),
    now: "امروز ولنتاینه",
    tomorrow: "فردا ولنتاینه",
    prefer: [64706, 8789],
    captions: [
      "ولنتاین نزدیکه. بهترین هدیه همونیه که طرف واقعاً می‌پوشه.",
      "برای کسی که دوستش داری، لباسی انتخاب کن که یه شعر یا یه شوخیِ مشترک پشتش باشه.",
    ],
  },
  {
    key: "nowruz",
    name: "نوروز",
    date: (today) => nextPersian(today, 1, 1),
    now: "امروز نوروزه",
    tomorrow: "فردا نوروزه",
    prefer: [],
    captions: [
      "سالِ نو نزدیکه. یه چیزِ تازه برای شروعِ سال انتخاب کن.",
      "نوروز یعنی لباسِ نو. همین‌جا یه نگاهی بنداز.",
    ],
  },
  {
    key: "newyear",
    name: "سالِ نوِ میلادی",
    date: (today) => nextGregorian(today, 1, 1),
    now: "امروز اولِ ژانویه‌ست",
    tomorrow: "فردا اولِ ژانویه‌ست",
    prefer: [],
    captions: [
      "یه سالِ دیگه تموم شد. برای شروعِ سالِ تازه یه هودیِ تازه بد نیست.",
    ],
  },
];

const MONTH_END_CAPTIONS = [
  "آخرِ ماهه و حسابِ بانکی در حالِ دعاست. ولی لیستِ خریدِ اولِ ماه رو می‌شه از همین حالا ساخت.",
  "آخرِ ماه یعنی صبر؛ اولِ ماه یعنی لیستی که از قبل آماده کرده‌ای.",
];
const MONTH_START_CAPTIONS = [
  "اولِ ماهه. اگه از اون هودی خوشت اومده بود، حالا وقتشه.",
  "ماهِ تازه شروع شد. یه چیزِ خوب برای خودت بردار.",
];

const pick = (a) => a[Math.floor(Math.random() * a.length)];

function chanceFor(daysLeft) {
  return daysLeft === 0 ? 1 : daysLeft <= 2 ? 0.85 : 0.6;
}

function describeEvent(ev, today) {
  const date = ev.date(today);
  if (!date) return null;
  const daysLeft = Math.round((date - today) / 864e5);
  const label = daysLeft === 0 ? ev.now : daysLeft === 1 ? ev.tomorrow : `${fa(daysLeft)} روز تا ${ev.name}`;
  return { key: ev.key, name: ev.name, daysLeft, label, chance: chanceFor(daysLeft), prefer: ev.prefer, caption: () => pick(ev.captions) };
}

// آخر/اولِ ماه (شمسی): ۳ روزِ آخر تا روزِ دومِ ماهِ بعد
function monthBoundary(today) {
  const [, d] = persianMD(today);
  if (d <= 2) return { key: "monthstart", name: "اولِ ماه", daysLeft: 0, label: "اولِ ماهه", chance: 0.6, prefer: [], caption: () => pick(MONTH_START_CAPTIONS) };
  for (let n = 1; n <= 3; n++) {
    if (persianMD(addDays(today, n))[1] === 1) {
      const label = n === 1 ? "امروز آخرِ ماهه" : `${fa(n - 1)} روز تا آخرِ ماه`;
      return { key: "monthend", name: "آخرِ ماه", daysLeft: n - 1, label, chance: 0.6, prefer: [], caption: () => pick(MONTH_END_CAPTIONS) };
    }
  }
  return null;
}

// همه‌یِ مناسبت‌هایِ داخلِ پنجره، نزدیک‌ترین اول
function activeEvents(now = new Date()) {
  const today = tehranToday(now);
  const list = EVENTS.map((e) => describeEvent(e, today)).filter((x) => x && x.daysLeft <= LEAD);
  const mb = monthBoundary(today);
  if (mb) list.push(mb);
  return list.sort((a, b) => a.daysLeft - b.daysLeft);
}
const activeEvent = (now) => activeEvents(now)[0] || null;

// برایِ تست (CONTENT_TYPE=event): اگه چیزی تو پنجره نیست، نزدیک‌ترینِ آینده
function nearestEvent(now = new Date()) {
  const today = tehranToday(now);
  const all = EVENTS.map((e) => describeEvent(e, today)).filter(Boolean).sort((a, b) => a.daysLeft - b.daysLeft);
  return all[0] || null;
}

module.exports = { activeEvent, activeEvents, nearestEvent };

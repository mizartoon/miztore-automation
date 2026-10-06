/**
 * social.js — نسخه‌یِ اینستاگرام و X از رویِ متنِ پایه.
 *
 * بازنگریِ ۲۰۲۶-۱۰-۰۶ بعد از آدیتِ پیج (نرخِ تعامل ~۰.۰۶٪، تقریباً صفر کامنت):
 *  - هر پست فقط «یک» درخواست از مخاطب: یا بفرست برایِ کسی (send بیشترین سیگنالِ الگوریتمه)،
 *    یا سیو کن، یا کلمه‌یِ کلیدی تو کامنت. قبلاً یه سؤال + «کامنت بذار …» با هم می‌اومد.
 *  - کلمه‌هایِ کلیدی فقط همونایی‌ان که «پاسخِ هوشمندِ» نوین‌هاب براشون دایرکت می‌فرسته
 *    (قیمت، سایز، رنگ، هدیه، سفارش، قسط)، تا قولی که می‌دیم واقعاً عمل بشه.
 *  - هشتگ: به‌جایِ همون ۴ تا هشتگِ ثابت رویِ همه‌یِ پست‌ها، برند + نوعِ لباس + تا ۳ هشتگِ
 *    موضوعی که از اسمِ طرح/کالکشن/مناسبت درمیاد.
 *  - X: یه توییتِ مستقلِ توییتری (فیلدِ tweet از copywriter)، نه خطِ اولِ کپشنِ اینستاگرام.
 */

const pick = (a) => a[Math.floor(Math.random() * a.length)];

// کلمه‌یِ کلیدی ← چیزی که پاسخِ هوشمندِ نوین‌هاب واقعاً می‌فرسته
const KEYWORDS = {
  قیمت: "قیمت‌ها",
  سایز: "جدولِ سایز",
  رنگ: "رنگ‌بندی",
  هدیه: "راهنمایِ انتخابِ کادو",
  سفارش: "روشِ سفارش",
  قسط: "شرایطِ خریدِ قسطی",
};
const keywordAsk = (kw) => `👇 کامنت بذار «${kw}» تا ${KEYWORDS[kw]} برات دایرکت بیاد.`;

const SHARE = [
  "بفرستش برایِ رفیقی که این طرح دقیقاً خودشه.",
  "اینو بفرست برایِ همون کسی که اول به ذهنت رسید.",
  "بفرستش برایِ کسی که باید اینو ببینه.",
  "یه نفر هست که باید اینو ببینه؛ بفرست براش.",
];
const SAVE = ["سیوش کن که موقعِ خریدِ کادو یادت بمونه.", "سیوش کن، بعداً دنبالش نگرد.", "سیوش کن برایِ وقتی که دنبالِ یه کادویِ درست‌وحسابی می‌گردی."];

// وزنِ هر نوع درخواست برایِ هر نوعِ پست
const ASK_MIX = {
  product: { keyword: 0.45, share: 0.35, save: 0.2 },
  spotlight: { keyword: 0.5, share: 0.3, save: 0.2 },
  reel: { share: 0.5, keyword: 0.3, save: 0.2 },
  gift: { save: 0.4, keyword: 0.4, share: 0.2 },
  occasion: { save: 0.4, keyword: 0.4, share: 0.2 },
  collection: { share: 0.5, save: 0.25, keyword: 0.25 },
  bestsellers: { share: 0.5, save: 0.25, keyword: 0.25 },
  sale: { keyword: 1 },
};
const KEYWORD_FOR = {
  gift: ["هدیه"],
  occasion: ["هدیه"],
  collection: ["سفارش"],
  bestsellers: ["سفارش"],
  sale: ["قیمت"],
  colors: ["رنگ"],
  sizes: ["سایز"],
};

function igAsk(type, focus) {
  const mix = ASK_MIX[type];
  if (!mix) return null; // versus/service: خودِ پست سؤال یا اطلاعاتِ کامل داره
  let r = Math.random();
  let kind = "share";
  for (const [k, w] of Object.entries(mix)) if ((r -= w) < 0) {
    kind = k;
    break;
  }
  if (kind === "share") return pick(SHARE);
  if (kind === "save") return pick(SAVE);
  const kws = KEYWORD_FOR[focus] || KEYWORD_FOR[type] || ["رنگ", "سایز", "قیمت", "قسط"];
  return keywordAsk(pick(kws));
}

// خطِ آخرِ کپشن معمولاً «کارِ خرید» ـه (لینک تو بیو/دایرکت بده/از سایت سفارش بده)؛ تو اینستاگرام
// جاش یه درخواستِ واحد میاد، پس اگه خطِ آخر از این جنس بود حذف می‌شه.
const BUY_LINE = /(بیو|سایت|دایرکت|سفارش|لینک|کامنت)/;
function stripBuyLine(caption) {
  const lines = String(caption || "").trim().split("\n");
  if (lines.length >= 2 && BUY_LINE.test(lines[lines.length - 1])) lines.pop();
  return lines.join("\n").trim();
}

const CATEGORY_TAGS = {
  tshirt: ["#تیشرت_طرحدار"],
  longsleeve: ["#آستین_بلند"],
  hoodie: ["#هودی"],
  pullover: ["#پلیور"],
  croptop: ["#کراپ_تاپ"],
  تیشرت: ["#تیشرت_طرحدار"],
  هودی: ["#هودی"],
  پلیور: ["#پلیور"],
  "توت‌بگ": ["#توت_بگ"],
};
const TOPIC_TAGS = [
  [/کلاه ?قرمزی|پسرخاله|ببعی|آقای ?مجری/, ["#کلاه_قرمزی", "#نوستالژی"]],
  [/حسنی|عمو ?پورنگ|نوار ?کاست|دهه ?(شصت|هفتاد|۶۰|۷۰)|نوستالژی/, ["#نوستالژی", "#دهه_شصتی"]],
  [/گربه|پیشی|پالاس/, ["#گربه", "#گربه_دوست"]],
  [/خوشنویسی|نستعلیق|دستخط|کالیگراف|طلاکوب/, ["#خوشنویسی"]],
  [/شعر|حافظ|مولانا|مولوی|سعدی|خیام|سهراب|فروغ|شاملو|بیت|غزل|اخوان/, ["#شعر_فارسی"]],
  [/فیلم|سینما|کیارستمی|فیکشن|وال ?استریت|دیالوگ|سریال/, ["#سینما"]],
  [/آهنگ|ترانه|خواننده|راک|هایده|گوگوش|شبپره|موسیقی|بمرانی|کویین/, ["#موسیقی"]],
  [/هدیه|کادو/, ["#ایده_کادو"]],
  [/یلدا/, ["#یلدا"]],
  [/نوروز|عید/, ["#نوروز"]],
  [/ولنتاین|عاشق/, ["#ولنتاین"]],
  [/مینیاتور|تصویرسازی|ایلاستریشن/, ["#تصویرسازی"]],
];
function hashtags(category, topicText) {
  const tags = ["#میزطوری", "#Miztore", ...(CATEGORY_TAGS[category] || [])];
  const topics = [];
  for (const [re, t] of TOPIC_TAGS) if (re.test(topicText || "")) topics.push(...t);
  for (const t of topics) if (!tags.includes(t) && tags.length < 6) tags.push(t);
  if (tags.length < 4) tags.push("#پوشاک_ایرانی");
  return tags.join(" ");
}

/**
 * کپشنِ اینستاگرام: متنِ پایه (بدونِ خطِ خرید) + [خطِ محصول/لیست] + یک درخواست + هشتگ‌ها
 *   type: product|spotlight|reel|gift|occasion|collection|bestsellers|sale|versus|service
 *   focus: برایِ spotlight (colors|sizes|…)
 *   extra: خط‌هایِ اضافه (اسمِ محصول، لیستِ محصولات)
 *   linkLine: «لینکش تو بیو» (وقتی درخواست کلمه‌یِ کلیدی نیست)
 */
function instagramCaption({ caption, type, focus, category, extra = [], topicText = "", keepBuyLine = false }) {
  const body = keepBuyLine ? String(caption || "").trim() : stripBuyLine(caption);
  const ask = igAsk(type, focus);
  const parts = [body];
  if (extra.length) parts.push(extra.join("\n"));
  if (ask && !ask.includes("کامنت")) parts.push(`لینکش تو بیوئه.\n${ask}`);
  else if (ask) parts.push(ask);
  else if (!keepBuyLine) parts.push("لینکش تو بیوئه.");
  parts.push(hashtags(category, `${topicText} ${caption}`));
  return parts.filter(Boolean).join("\n\n");
}

// توییت: اگه copywriter یه توییتِ مستقل داده همون، وگرنه خطِ اولِ کپشن. + #میزطوری + لینک، زیرِ ۲۸۰
// (لینک رو X همیشه ۲۳ حساب می‌کنه). بلند بود، سرِ آخرین «،»/«.»/«؛» یا فاصله بریده می‌شه.
function tweetText({ tweet, caption, link }) {
  const tail = `\n\n#میزطوری\n${link}`;
  const budget = 280 - (tail.length - link.length + 23) - 2;
  let line = String(tweet || "").trim() || String(caption || "").split("\n")[0].trim();
  if (line.length > budget) {
    const cut = line.slice(0, budget);
    const at = Math.max(cut.lastIndexOf("،"), cut.lastIndexOf("."), cut.lastIndexOf("؛"));
    line = at > budget * 0.5 ? cut.slice(0, at).trim() : cut.slice(0, cut.lastIndexOf(" ")).trim() + "…";
  }
  return line + tail;
}

module.exports = { instagramCaption, tweetText, hashtags, stripBuyLine, igAsk };

/**
 * services.js — پست‌های «خدمات»، نه محصول. همه ادعایِ واقعیِ فروشگاهن (از
 * سایت/توضیحاتِ محصول)، پس متنشون ثابت و کنترل‌شده‌ست، نه تولیدِ آزادِ AI.
 * `panel` نوعِ کارتِ تصویریِ پایینِ پست رو مشخص می‌کنه (render.js).
 * چیزهایی که از سایت خونده می‌شن (سقفِ ارسالِ رایگان، قیمتِ طرحِ دلخواه) موقعِ
 * اجرا پر می‌شن؛ اگه خونده نشد، اون پست کنار گذاشته می‌شه.
 */

// weight: شانسِ نسبیِ انتخاب (پیش‌فرض ۱). ۲۰۲۶-۰۹-۲۵ (کاربر): اولویتِ اول «طرح‌هایِ
// اختصاصی که فقط میزطوری داره»، بعد تنوعِ رنگ و سایز (با همه چیز ست می‌شه، از لاغر و
// بچه تا سایزهایِ بزرگ)، و «بهترین انتخاب برایِ هدیه».
const SERVICE_POSTS = [
  {
    id: "exclusive",
    weight: 3,
    headline: "این طرح‌ها رو جای دیگه نمی‌بینی",
    body: "شعر، خوشنویسی، تصویرسازی و شخصیت‌هایی که فقط این‌جا رو لباس می‌شینن؛ طرح‌ها اختصاصیِ خودمونه.",
    cta: "طرح‌ها رو ببینم",
    panel: { type: "big", big: "فقط میزطوری", sub: "جای دیگه پیدا نمی‌شه" },
  },
  {
    id: "exclusive-2",
    weight: 3,
    headline: "طرحی که تو خیابون تکراری نمی‌شه",
    body: "هر طرح اختصاصیِ میزطوریه و فقط همین‌جا چاپ می‌شه. شعر، ترانه، نوستالژی، تصویرسازی؛ هر کدوم یه داستان.",
    cta: "برم سراغِ طرح‌ها",
    panel: { type: "list", items: ["طرح‌های اختصاصیِ میزطوری", "شعر، ترانه و خوشنویسی", "تصویرسازی و شخصیت‌ها"] },
  },
  {
    id: "match",
    weight: 2,
    headline: "با همه چیز ست می‌شه",
    body: "هر طرح تو کلی رنگ مختلف موجوده؛ رنگی رو بردار که با لباسای خودت جوره.",
    cta: "رنگِ خودمو پیدا کنم",
    panel: { type: "list", items: ["با جین و کتونی", "زیرِ کت یا اورشرت", "با شلوارِ پارچه‌ای"] },
  },
  {
    id: "gift",
    weight: 2,
    headline: "دنبالِ هدیه‌ای که یادش بمونه؟",
    body: "یه طرح که به سلیقه‌ش بخوره، تو رنگ و سایزی که می‌خواد. اگه سایز جور نشد، ۷ روز ضمانتِ بازگشت داری.",
    cta: "یه هدیه پیدا کنم",
    panel: { type: "steps", big: "بی‌تکرار", sub: "طرحی که جای دیگه پیدا نمی‌شه", steps: ["طرح", "رنگ و سایز", "کادو"] },
  },
  {
    id: "digipay",
    headline: "قسطی؟ آره، با دیجی‌پی",
    body: "نیازی نیست همه‌ی پول رو یه‌جا بدی. با دیجی‌پی قسطی بخر، همین امروز بپوش.",
    cta: "قسطی بخرم",
    panel: { type: "steps", big: "دیجی‌پی", sub: "موقعِ پرداخت انتخابش کن", steps: ["سبد", "پرداخت", "دیجی‌پی"] },
  },
  {
    id: "colors",
    weight: 1.5,
    headline: "یه رنگ که بسنده نیست",
    body: "هر طرح تو چندتا رنگ مختلف موجوده، پس با هر چی که داری ست می‌شه. رنگِ خودتو تو سایت پیدا کن.",
    cta: "رنگارو ببینم",
    panel: { type: "colors" },
  },
  {
    id: "sizes",
    weight: 2,
    headline: "سایزت حتماً هست",
    body: "از هیکل‌های لاغر و بچه‌ها تا سایزهای بزرگ؛ برای هر اندازه‌ای یه سایزِ درست داریم.",
    cta: "سایزمو پیدا کنم",
    panel: { type: "sizes" },
  },
  {
    id: "custom",
    needs: "custom",
    headline: "طرحِ خودتو بپوش",
    body: "عکس یا طرحِ خودتو آپلود کن، رو تیشرت، هودی، پلیور یا حتی لباسِ بچه‌گونه چاپش می‌کنیم.",
    cta: "طرحمو بفرستم",
    panel: { type: "steps", big: "طرحِ دلخواه", sub: "{price}", steps: ["آپلودِ طرح", "انتخابِ لباس", "چاپ و ارسال"] },
  },
  {
    id: "shipping",
    needs: "shipping",
    headline: "ارسالش با ما",
    body: "{shipping}. سبدتو پر کن و هزینه‌ی ارسال رو فراموش کن.",
    cta: "برم سراغِ سبد",
    panel: { type: "big", big: "ارسالِ رایگان", sub: "{shippingShort}" },
  },
  {
    id: "returns",
    headline: "خیالت راحت باشه",
    body: "هر خریدی از میزطوری ۷ روز ضمانتِ بازگشت داره. با خیالِ راحت انتخاب کن.",
    cta: "بریم خرید",
    panel: { type: "big", big: "۷ روز", sub: "ضمانتِ بازگشتِ کالا" },
  },
  {
    id: "care",
    headline: "چاپت سال‌ها سالم می‌مونه",
    body: "چاپِ دیجیتالِ مستقیم رو پارچه‌ی پنبه‌ای؛ زبر نیست و ماندگاره. فقط این سه تا یادت باشه:",
    cta: "طرح‌ها رو ببینم",
    panel: { type: "list", items: ["با آبِ سرد بشور", "پشت‌ورو بشور", "بدونِ سفیدکننده"] },
  },
];

// ctx: { shipping, custom } — مقادیرِ زنده از سایت
function pickServicePost(ctx = {}) {
  const usable = SERVICE_POSTS.filter((p) => !p.needs || (p.needs === "shipping" ? ctx.shipping : ctx.custom));
  const forced = process.env.SERVICE_ID && usable.find((x) => x.id === process.env.SERVICE_ID); // برای تست
  let r = Math.random() * usable.reduce((a, x) => a + (x.weight || 1), 0);
  const chosen = forced || usable.find((x) => (r -= x.weight || 1) < 0) || usable[0];
  const p = JSON.parse(JSON.stringify(chosen));
  const fill = (s) =>
    String(s)
      .replace("{shipping}", ctx.shipping || "")
      .replace("{shippingShort}", (ctx.shipping || "").replace(/^ارسال رایگان\s*(برای)?\s*/, ""))
      .replace("{price}", (ctx.custom && ctx.custom.priceText) || "");
  p.body = fill(p.body);
  if (p.panel) for (const k of ["sub", "big"]) if (p.panel[k]) p.panel[k] = fill(p.panel[k]);
  return p;
}

function buildServiceCaption(service) {
  return `${service.body}\n\n${service.cta}.`;
}

module.exports = { SERVICE_POSTS, pickServicePost, buildServiceCaption };

/**
 * services.js — پست‌های «خدمات»، نه محصول. همه ادعایِ واقعیِ فروشگاهن (از
 * سایت/توضیحاتِ محصول)، پس متنشون ثابت و کنترل‌شده‌ست، نه تولیدِ آزادِ AI.
 * `panel` نوعِ کارتِ تصویریِ پایینِ پست رو مشخص می‌کنه (render.js).
 * چیزهایی که از سایت خونده می‌شن (سقفِ ارسالِ رایگان، قیمتِ طرحِ دلخواه) موقعِ
 * اجرا پر می‌شن؛ اگه خونده نشد، اون پست کنار گذاشته می‌شه.
 */

const SERVICE_POSTS = [
  {
    id: "digipay",
    headline: "قسطی؟ آره، با دیجی‌پی",
    body: "نیازی نیست همه‌ی پول رو یه‌جا بدی. با دیجی‌پی قسطی بخر، همین امروز بپوش.",
    cta: "قسطی بخرم",
    panel: { type: "steps", big: "دیجی‌پی", sub: "موقعِ پرداخت انتخابش کن", steps: ["سبد", "پرداخت", "دیجی‌پی"] },
  },
  {
    id: "colors",
    headline: "یه رنگ که بسنده نیست",
    body: "هر طرح تو چندتا رنگ مختلف موجوده. رنگِ خودتو تو سایت پیدا کن.",
    cta: "رنگارو ببینم",
    panel: { type: "colors" },
  },
  {
    id: "sizes",
    headline: "سایزت حتماً هست",
    body: "از کوچیک تا بزرگ، سایزبندیِ کامل داریم. بهونه‌ی سایز نداشتن دیگه جواب نمی‌ده.",
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
  const p = JSON.parse(JSON.stringify(usable[Math.floor(Math.random() * usable.length)]));
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

/**
 * extra-stories.js — استوری‌هایِ بیشتر برایِ هر روزِ یه بسته‌یِ نوین‌هاب (month/plan.json):
 *   story-2.jpg (۱۷:۳۰) : یه پستِ خدمات/برتریِ میزطوری در قالبِ استوری (هر روز یکی دیگه)
 *   story-3.jpg (۲۰:۰۰) : «پستِ جدید» — پستِ همون شب وسطِ استوری
 *   story-4.jpg (۲۲:۳۰) : رنگ و سایزِ محصولِ همون روز (فقط روزهایی که محصول معلومه)
 * بدونِ AI؛ همه‌یِ اطلاعات از سایت. خروجی کنارِ بقیه‌یِ فایل‌هایِ هر روز + plan.json.extraStories
 *   node scripts/extra-stories.js D:/pictures/novinhub/month
 */
const fs = require("fs");
const path = require("path");
const R = require("../automation/render.js");
const store = require("../automation/store.js");
const { pickServicePost } = require("../automation/services.js");
const { getProductFacts } = require("../automation/product-facts.js");

const DIR = process.argv[2];
const plan = JSON.parse(fs.readFileSync(path.join(DIR, "plan.json"), "utf-8"));
const links = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "product-links.json"), "utf-8"));
const KIND_CAT = { تیشرت: "tshirt", هودی: "hoodie", پلیور: "pullover" };

const TEASER = [
  "پستِ امشب رو دیدی؟ بزن روش",
  "تازه گذاشتیمش، یه نگاه بنداز",
  "امشب اینو گذاشتیم، نظرت چیه؟",
  "بزن رو پست، بقیه‌ش اونجاست",
  "یه چیزِ تازه تو پیجمون هست",
  "اینو دیدی؟ تا آخر ورق بزن",
  "پستِ امشب، مخصوصِ تو",
];
// «ورق بزن» فقط وقتی پست چنداسلایدیه
const teaserLine = (i, n) => { const pool = n > 1 ? TEASER : TEASER.filter((t) => !/ورق|بقیه/.test(t)); return pool[i % pool.length]; };
const CHART = ["رنگشو خودت انتخاب کن", "سایزت هست، رنگت هم هست", "با کدوم رنگ ست‌ش می‌کنی؟", "از لاغر تا درشت، سایزت اینجاست", "قبل از سفارش یه نگاه بنداز"];

// ساعتِ تهران → یونیکس (UTC+3:30)
const at = (day, h, m) => Math.floor(Date.parse(`${day}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00+03:30`) / 1000);

(async () => {
  const [shipping, custom] = await Promise.all([store.shippingNote().catch(() => null), store.customDesign().catch(() => null)]);
  let recent = [];
  let lastTheme = "dark";
  for (const [i, x] of plan.entries()) {
    const dir = path.join(DIR, x.folder);
    const theme = lastTheme === "light" ? "dark" : Math.random() < 0.2 ? "light" : "dark";
    lastTheme = theme;
    R.setTheme(theme);
    const extra = [];

    // ۱) خدمات — نه همونی که پستِ امروزه، نه تکرارِ چند روزِ اخیر
    if (x.type === "service") recent = [x.key.split("/")[1], ...recent];
    const svc = pickServicePost({ shipping, custom, recent });
    recent = [svc.id, ...recent.filter((r) => r !== svc.id)].slice(0, 6);
    fs.writeFileSync(path.join(dir, "story-2.jpg"), await R.renderServicePost({ format: "story", ...svc }));
    extra.push({ file: "story-2.jpg", at: at(x.day, 17, 30), what: `service:${svc.id}` });

    // ۲) «پستِ جدید»
    const post = fs.readFileSync(path.join(dir, x.slides[0]));
    fs.writeFileSync(path.join(dir, "story-3.jpg"), await R.renderStoryTeaser({ postBytes: post, line: teaserLine(i, x.slides.length) }));
    extra.push({ file: "story-3.jpg", at: at(x.day, 20, 0), what: "teaser" });

    // ۳) رنگ و سایز — فقط وقتی محصولِ مشخصی پشتِ پسته
    let facts = null,
      category = null;
    const spot = /^campaign\/spotlight\/(\d+)/.exec(x.key || "");
    if (spot) {
      const d = await store.productDetail(Number(spot[1])).catch(() => null);
      if (d) {
        facts = { colors: d.colorNames, sizesText: d.sizes.length ? `${d.sizes[0]} تا ${d.sizes[d.sizes.length - 1]}` : null, priceText: d.priceText };
        category = KIND_CAT[d.kind];
      }
    } else if (x.key && links[x.key]) {
      category = x.key.split("/")[0];
      facts = await getProductFacts({ productUrl: links[x.key], category });
      if (facts && facts.scope !== "product") facts = null;
    }
    if (facts && (facts.colors || []).length >= 3) {
      fs.writeFileSync(path.join(dir, "story-4.jpg"), await R.renderChart({ facts, category, title: CHART[i % CHART.length], format: "story" }));
      extra.push({ file: "story-4.jpg", at: at(x.day, 22, 30), what: "chart" });
    }
    x.extraStories = extra;
    console.log(`${x.folder}: ${extra.map((e) => e.what).join(", ")} (${theme})`);
  }
  fs.writeFileSync(path.join(DIR, "plan.json"), JSON.stringify(plan, null, 2));
})();

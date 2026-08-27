/**
 * build-product-links.js — از design-identification.json (کلید: اسم قدیمی)
 * + rename-map.json (قدیم→جدید) + product-catalog.json (id→permalink) یک
 * نگاشتِ نهاییِ «اسم فایلِ جدید → لینک محصول یا null» می‌سازه که generate.js
 * موقع پست کردن ازش استفاده می‌کنه.
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const identification = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "design-identification.json"), "utf-8"));
const renameMap = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "rename-map.json"), "utf-8"));
const catalog = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "product-catalog.json"), "utf-8"));

const productById = new Map(catalog.map((p) => [p.id, p]));
const links = {};

for (const [oldFile, info] of Object.entries(identification)) {
  const oldKey = `tshirt/${oldFile}`;
  const newKey = renameMap[oldKey] || oldKey;
  if (info.matchedProductId && productById.has(info.matchedProductId)) {
    links[newKey] = productById.get(info.matchedProductId).permalink;
  } else {
    links[newKey] = null; // fallback به لینک دسته‌بندی، تو generate.js
  }
}

fs.writeFileSync(path.join(DATA_DIR, "product-links.json"), JSON.stringify(links, null, 2));
const matched = Object.values(links).filter(Boolean).length;
console.log(`✅ product-links.json نوشته شد: ${Object.keys(links).length} کلید، ${matched} تا لینک مستقیم دارن.`);

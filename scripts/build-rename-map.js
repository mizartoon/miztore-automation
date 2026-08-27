const fs = require("fs");
const path = require("path");

const OUT_PATH = path.join(__dirname, "..", "data", "design-identification.json");
const MAP_PATH = path.join(__dirname, "..", "data", "rename-map.json");

function slugify(text) {
  return String(text || "")
    .replace(/[.,،!؟?()«»"'٬:]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join("-");
}

function main() {
  const data = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"));
  const files = Object.keys(data).sort();

  const usedNames = new Map(); // baseName -> count
  const mapping = {}; // oldKey (e.g. "tshirt/tshirt-0001.jpg") -> newKey

  for (const file of files) {
    const v = data[file];
    let base = v.matchedProductId ? slugify(v.matchedProductName) : v.fallbackSlug;
    if (!base) base = file.replace(/\.jpg$/, ""); // نادر: نه match نه fallback

    const count = usedNames.get(base) || 0;
    usedNames.set(base, count + 1);
    const finalBase = count === 0 ? base : `${base}-${count + 1}`;

    mapping[`tshirt/${file}`] = `tshirt/${finalBase}.jpg`;
  }

  fs.writeFileSync(MAP_PATH, JSON.stringify(mapping, null, 2));
  console.log(`✅ ${Object.keys(mapping).length} نگاشت نوشته شد در ${MAP_PATH}`);

  // چند نمونه برای چک سریع
  const sample = Object.entries(mapping).slice(0, 10);
  for (const [o, n] of sample) console.log(o, "->", n);
}

main();

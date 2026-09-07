/**
 * design-lookup.js — وصل‌کردنِ کلیدِ فعلیِ عکس (اسمِ فارسی‌شده، همونی که
 * state.json/pools استفاده می‌کنن) به توضیحِ واقعیِ طرح (متنِ چاپ‌شده +
 * موضوعِ تصویر) که قبلاً یه‌بار با Gemini Vision استخراج شده بود
 * (scripts/identify-designs.js → data/design-identification.json).
 *
 * چرا این وصله لازمه: design-identification.json با اسمِ قدیمی/عددی
 * ("tshirt-0001.jpg") ایندکس شده، ولی pipeline از اسمِ جدید/فارسی‌شده
 * استفاده می‌کنه. rename-map.json (اسمِ قدیمی → اسمِ جدید) پلِ بینشونه.
 *
 * هدف: کپشن دیگه فقط بر اساسِ category (تیشرت/هودی) نباشه — بلکه واقعاً
 * درباره‌ی همون طرحِ خاص (شوخی/شخصیتِ رویِ تیشرت) بنویسه، نه یه متنِ
 * ژنریکِ تکراری برای هر عکس.
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

let reverseRenameMap = null;
let designIdentification = null;

function load() {
  if (reverseRenameMap) return;
  reverseRenameMap = {};
  try {
    const renameMap = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "rename-map.json"), "utf-8"));
    for (const [oldPath, newPath] of Object.entries(renameMap)) {
      reverseRenameMap[newPath] = oldPath.split("/").pop();
    }
  } catch {
    // فایل نبود یا خراب بود — یعنی هیچ عکسی lookup پیدا نمی‌کنه، بدون کرش
  }
  try {
    designIdentification = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "design-identification.json"), "utf-8"));
  } catch {
    designIdentification = {};
  }
}

/**
 * key: همون چیزی که pickNextImage برمی‌گردونه، مثلاً
 *      "tshirt/مثنوی-مولوی-دنیا-همه-هیچ.jpg"
 * خروجی: { visibleText, visualSubject } یا null (اگه پیدا نشد/illegible بود)
 */
function getDesignInfo(key) {
  load();
  const oldFilename = reverseRenameMap[key];
  if (!oldFilename) return null;
  const entry = designIdentification[oldFilename];
  if (!entry || entry.illegible) return null;
  if (!entry.visibleText && !entry.visualSubject) return null;
  return { visibleText: entry.visibleText || null, visualSubject: entry.visualSubject || null };
}

module.exports = { getDesignInfo };

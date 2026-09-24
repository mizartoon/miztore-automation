/**
 * design-notes.js — یادداشت‌هایِ صاحبِ برند دربارهِ ریشه‌یِ طرح‌ها (data/design-notes.json).
 * تشخیصِ ماشینی ریشه‌یِ طرح رو نمی‌دونه (مثلاً «استمرار» تیکه‌ای از آهنگِ بمرانیه)،
 * پس فقط همین یادداشت‌ها به مدل گفته می‌شن.
 */
const fs = require("fs");
const path = require("path");

const NOTES_PATH = path.join(__dirname, "..", "data", "design-notes.json");
const notes = fs.existsSync(NOTES_PATH) ? JSON.parse(fs.readFileSync(NOTES_PATH, "utf-8")).notes || [] : [];

const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[-_،,.]/g, " ")
    .replace(/‌/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// هر تعداد متن (اسمِ فایل، اسمِ محصول…) → یادداشتِ اولین طرحی که match داره، یا null
function findDesignNote(...texts) {
  const hay = texts.map(norm).join(" | ");
  for (const n of notes) if ((n.match || []).some((m) => norm(m) && hay.includes(norm(m)))) return n.note;
  return null;
}

module.exports = { findDesignNote };

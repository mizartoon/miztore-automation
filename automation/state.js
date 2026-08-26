/**
 * state.js — چرخش دسته‌بندی + دیدوپ، این‌بار روی یک فایل state.json که خودِ
 * GitHub Action بعد از هر اجرا commit می‌کند (به‌جای Cloudflare KV — همون
 * منطق src/library.js نسخه‌ی Worker، فقط storage عوض شده).
 */

const fs = require("fs");
const path = require("path");

const STATE_PATH = path.join(__dirname, "..", "state.json");

function loadState() {
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickNextImage() {
  const state = loadState();
  const categories = state.categories;
  if (!categories || categories.length === 0) {
    throw new Error("state.json: categories خالی است.");
  }

  const cursor = state.rotationCursor || 0;

  for (let step = 0; step < categories.length; step++) {
    const idx = (cursor + step) % categories.length;
    const category = categories[idx];

    let pool = state.pools[category];
    if (!pool) {
      console.warn(`[state] pool برای ${category} وجود ندارد، رد شد.`);
      continue;
    }

    if (pool.length === 0) {
      const manifest = state.manifests[category] || [];
      if (manifest.length === 0) {
        console.warn(`[state] manifest برای ${category} خالی است، رد شد.`);
        continue;
      }
      pool = shuffle(manifest);
    }

    const key = pool.shift();
    state.pools[category] = pool;
    state.rotationCursor = (idx + 1) % categories.length;
    saveState(state);

    return { key, category };
  }

  return null;
}

function requeueImage(category, key) {
  const state = loadState();
  state.pools[category] = state.pools[category] || [];
  state.pools[category].unshift(key);
  saveState(state);
}

function markUsed(key) {
  const state = loadState();
  state.used = state.used || {};
  state.used[key] = new Date().toISOString();
  saveState(state);
}

module.exports = { pickNextImage, requeueImage, markUsed, loadState, saveState };

/**
 * remap-state.js — بعد از rename کردنِ فایل‌ها تو miztore-library، همون
 * تغییرِ اسم رو تو state.json (manifests, pools, used) هم اعمال می‌کنه —
 * وگرنه دیدوپ به فایل‌هایی اشاره می‌کنه که دیگه با اون اسم وجود ندارن.
 */

const fs = require("fs");
const path = require("path");

const MAP_PATH = path.join(__dirname, "..", "data", "rename-map.json");
const STATE_PATH = path.join(__dirname, "..", "state.json");

function remapKey(key, map) {
  return map[key] || key; // اگه تو mapping نبود (مثلاً همون یکی که خطا خورد)، دست‌نخورده می‌مونه
}

function main() {
  const map = JSON.parse(fs.readFileSync(MAP_PATH, "utf-8"));
  const state = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));

  let remapped = 0, missing = 0;

  for (const category of Object.keys(state.manifests)) {
    state.manifests[category] = state.manifests[category].map((k) => {
      const nk = remapKey(k, map);
      if (nk !== k) remapped++;
      else if (!map[k]) missing++;
      return nk;
    });
  }

  for (const category of Object.keys(state.pools)) {
    state.pools[category] = state.pools[category].map((k) => remapKey(k, map));
  }

  const newUsed = {};
  for (const [k, v] of Object.entries(state.used || {})) {
    newUsed[remapKey(k, map)] = v;
  }
  state.used = newUsed;

  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n");
  console.log(`✅ remap شد. ${remapped} کلید تغییر کرد، ${missing} کلید در mapping نبود (دست‌نخورده موند).`);
  console.log("manifests.tshirt count:", state.manifests.tshirt.length);
  console.log("pools.tshirt count:", state.pools.tshirt.length);
  console.log("used count:", Object.keys(state.used).length);
}

main();

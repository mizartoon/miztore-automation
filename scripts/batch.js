/**
 * batch.js — ساختِ یه ماه محتوایِ اینستاگرام/توییتر یک‌جا (برایِ زمان‌بندی در نوین‌هاب).
 * هر دور همون automation/generate.js رو اجرا می‌کنه (همون ترکیبِ محتوا، تم، متنِ AI،
 * کاروسل)، ولی چیزی منتشر نمی‌کنه؛ خروجی‌ها تو batch/NN/ و متن‌ها تو batch/manifest.json.
 * عکس‌هایِ محصول مصرف‌شده حساب می‌شن (تو pool برنمی‌گردن) تا پستِ روزانه‌یِ تلگرام
 * همون‌ها رو تکرار نکنه.
 *   BATCH_COUNT=30 node scripts/batch.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { markUsed } = require("../automation/state.js");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "batch");
const N = Number(process.env.BATCH_COUNT || 30);
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const manifest = [];

for (let i = 1; i <= N; i++) {
  const dir = path.join(OUT, String(i).padStart(2, "0"));
  fs.mkdirSync(dir, { recursive: true });
  try {
    execFileSync("node", [path.join(ROOT, "automation", "generate.js")], {
      cwd: ROOT,
      stdio: "inherit",
      env: { ...process.env, DRY_RUN: "false", GITHUB_RUN_ID: `${process.env.GITHUB_RUN_ID || Date.now()}-b${i}` },
      timeout: 8 * 60 * 1000,
    });
    const r = JSON.parse(fs.readFileSync(path.join(ROOT, "automation", "last-run.json"), "utf-8"));
    if (!r.ok) throw new Error(r.reason || "not ok");
    const copy = (rel, name) => {
      if (!rel) return null;
      fs.copyFileSync(path.join(ROOT, rel), path.join(dir, name));
      return name;
    };
    const slides = (r.outputs.carousel && r.outputs.carousel.length ? r.outputs.carousel : [r.outputs.post]).map((rel, k) => copy(rel, `post-${k + 1}.jpg`));
    const entry = {
      n: i,
      dir: path.basename(dir),
      type: r.templateName || "product",
      key: r.key || null,
      headline: r.headline,
      slides,
      story: copy(r.outputs.story, "story.jpg"),
      twitter: copy(r.outputs.twitter || r.outputs.post, "twitter.jpg"),
      instagramCaption: r.instagramCaption || r.caption,
      twitterCaption: r.twitterCaption || r.caption,
      link: r.buyUrlInstagram || null,
    };
    manifest.push(entry);
    if (r.key && !/^(service|campaign)\//.test(r.key)) markUsed(r.key);
    console.log(`📦 ${i}/${N}: ${entry.type} — ${entry.headline}`);
  } catch (e) {
    console.error(`❌ دورِ ${i}: ${e.message}`);
  }
  fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  sleep(3000);
}
console.log(`✅ ${manifest.length} از ${N} پست ساخته شد.`);

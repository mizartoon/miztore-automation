const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const MAP_PATH = path.join(__dirname, "..", "data", "rename-map.json");
const REPO_DIR = "C:\\Users\\DEARUS~1\\AppData\\Local\\Temp\\lib-rename";

function main() {
  const mapping = JSON.parse(fs.readFileSync(MAP_PATH, "utf-8"));
  const entries = Object.entries(mapping);

  let done = 0, skipped = 0;
  for (const [oldRel, newRel] of entries) {
    const oldAbs = path.join(REPO_DIR, oldRel);
    const newAbs = path.join(REPO_DIR, newRel);

    if (!fs.existsSync(oldAbs)) {
      skipped++;
      continue;
    }
    if (oldRel === newRel) continue;

    execFileSync("git", ["mv", "-f", oldRel, newRel], { cwd: REPO_DIR });
    done++;
    if (done % 100 === 0) console.log(`  ${done} rename شد...`);
  }

  console.log(`\n✅ ${done} فایل rename شد، ${skipped} پیدا نشد.`);
}

main();

const fs = require("fs");
const manifest = JSON.parse(
  fs.readFileSync("C:\\Users\\Dear User\\Downloads\\miztore-content-pipeline\\scripts\\manifest.json", "utf-8")
);

const alreadyPosted = [
  "tshirt/tshirt-0001.jpg",
  "tshirt/tshirt-0002.jpg",
  "tshirt/tshirt-0004.jpg",
  "tshirt/tshirt-0050.jpg",
  "tshirt/tshirt-0100.jpg",
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const tshirtManifest = manifest.tshirt;
const remainingPool = shuffle(tshirtManifest.filter((k) => !alreadyPosted.includes(k)));

const used = {};
for (const k of alreadyPosted) used[k] = new Date().toISOString();

const state = {
  categories: ["tshirt"],
  rotationCursor: 0,
  manifests: { tshirt: tshirtManifest },
  pools: { tshirt: remainingPool },
  used,
};

fs.writeFileSync("state.json", JSON.stringify(state, null, 2) + "\n");
console.log("state.json written. pool size:", remainingPool.length);

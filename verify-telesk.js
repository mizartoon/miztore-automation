const fs = require("fs");
const path = require("path");
const { renderPost } = require("./automation/render.js");

async function main() {
  const photoBytes = fs.readFileSync(
    "C:\\Users\\Dear User\\Downloads\\miztore-content-pipeline\\library-staging\\tshirt\\tshirt-0001.jpg"
  );

  const buf = await renderPost({
    photoBytes,
    headline: "فضانورد با مثنوی مولوی",
    cta: "ببرش",
    format: "post",
  });

  fs.writeFileSync(path.join(__dirname, "verify-telesk-output.jpg"), buf);
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

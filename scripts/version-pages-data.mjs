import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const directory = process.argv[2] ?? "_site";
let html = await readFile(`${directory}/index.html`, "utf8");
const versions = await Promise.all(["data.js", "price-data.js"].map(async (file) => {
  const content = await readFile(`${directory}/${file}`);
  return [file, createHash("sha256").update(content).digest("hex").slice(0, 16)];
}));
for (const [file, version] of versions) {
  html = html.replace(new RegExp(`src="${file.replace(".", "\\.")}\\?v=[^"\\s]+`, "g"), `src="${file}?v=${version}`);
}
await writeFile(`${directory}/index.html`, html);

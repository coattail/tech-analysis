import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const directory = process.argv[2] ?? "_site";
const content = await readFile(`${directory}/data.js`);
const version = createHash("sha256").update(content).digest("hex").slice(0, 16);
const html = await readFile(`${directory}/index.html`, "utf8");
await writeFile(`${directory}/index.html`, html.replace(/src="data\.js\?v=[^"\s]+/g, `src="data.js?v=${version}`));

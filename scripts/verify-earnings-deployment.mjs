import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

async function fetchPublic(url, fetcher) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

async function verifyAsset(base, html, file, expected, fetcher) {
  const version = createHash("sha256").update(expected).digest("hex").slice(0, 16);
  const escaped = file.replace(".", "\\.");
  const asset = html.match(new RegExp(`<script\\b[^>]*\\bsrc="(${escaped}\\?v=[^"]+)"`))?.[1];
  if (asset !== `${file}?v=${version}`) {
    throw new Error(`Public HTML references the wrong ${file} version: ${asset ?? "missing"}`);
  }
  const actual = await fetchPublic(new URL(asset, base), fetcher);
  if (!Buffer.from(await actual.arrayBuffer()).equals(expected)) {
    throw new Error(`Public ${file} does not match the deployed dataset`);
  }
}

async function verifyPublicAssets(base, assets, fetcher) {
  const html = await (await fetchPublic(new URL(`?verify=${Date.now()}`, base), fetcher)).text();
  await Promise.all(Object.entries(assets).map(([file, expected]) => verifyAsset(base, html, file, expected, fetcher)));
}

export function verifyPublicPriceAsset(base, expected, fetcher = fetch) {
  return verifyPublicAssets(base, { "price-data.js": expected }, fetcher);
}

export function verifyPublicEarningsAsset(base, expected, fetcher = fetch) {
  return verifyPublicAssets(base, { "data.js": expected }, fetcher);
}

async function main(url) {
  const base = `${url.replace(/\/$/, "")}/`;
  const [earnings, prices] = await Promise.all([readFile("data.js"), readFile("price-data.js")]);
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      await verifyPublicAssets(base, { "data.js": earnings, "price-data.js": prices }, fetch);
      console.log("Verified public page references and contents for both data assets");
      return;
    } catch (error) {
      if (attempt === 6) throw error;
      await new Promise(resolve => setTimeout(resolve, 10_000));
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv[2]);
}

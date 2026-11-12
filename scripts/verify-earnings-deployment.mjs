import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import vm from "node:vm";
import { COMPANY_SOURCES, parseDataJs } from "./auto-refresh-data.mjs";

function fingerprint(data) {
  return Object.fromEntries(COMPANY_SOURCES.map(({id}) => {
    const c = data.companies[id];
    const p = Object.keys(c?.revenue ?? {}).filter(p => Number.isFinite(c.revenue[p]) && Number.isFinite(c.earnings?.[p])).sort().at(-1);
    return [id, JSON.stringify([p, ...["revenue", "earnings", "operatingIncome", "reportDates", "periodEndDates", "operatingCashFlow", "capex"].map(k => c?.[k]?.[p] ?? null)])];
  }));
}
async function fetchPublic(url, fetcher = fetch) {
  const response = await fetcher(url, { signal: AbortSignal.timeout(20_000), cache: "no-store" });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response;
}

export async function verifyPublicPriceAsset(base, expected, fetcher = fetch) {
  const version = createHash("sha256").update(expected).digest("hex").slice(0, 16);
  const html = await (await fetchPublic(new URL(`?verify=${Date.now()}`, base), fetcher)).text();
  const asset = html.match(/<script\b[^>]*\bsrc="(price-data\.js\?v=[^"]+)"/)?.[1];
  if (asset !== `price-data.js?v=${version}`) {
    throw new Error(`Public HTML references the wrong price-data.js version: ${asset ?? "missing"}`);
  }
  const actual = await fetchPublic(new URL(asset, base), fetcher);
  if (!Buffer.from(await actual.arrayBuffer()).equals(expected)) {
    throw new Error("Public price-data.js does not match the deployed dataset");
  }
}

async function verifyPublicEarnings(base, expected) {
  const response = await fetchPublic(new URL(`data.js?verify=${Date.now()}`, base));
  const context = { window: {} };
  vm.runInNewContext(await response.text(), context, { timeout: 3000 });
  const actual = fingerprint(context.window.FINANCIAL_SOURCE_DATA);
  const mismatch = Object.keys(expected).filter(id => actual[id] !== expected[id]);
  if (mismatch.length) throw new Error(`Public quarterly data differs: ${mismatch.join(", ")}`);
}

async function main(url) {
  const base = `${url.replace(/\/$/, "")}/`;
  const expectedEarnings = fingerprint(parseDataJs(await readFile("data.js", "utf8")));
  const expectedPrice = await readFile("price-data.js");
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      await Promise.all([
        verifyPublicEarnings(base, expectedEarnings),
        verifyPublicPriceAsset(base, expectedPrice),
      ]);
      console.log(`Verified public price asset and latest quarterly data for ${COMPANY_SOURCES.length} companies`);
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

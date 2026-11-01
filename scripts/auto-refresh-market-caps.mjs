#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { COMPANY_SOURCES, parseDataJs, formatDataJs } from './auto-refresh-data.mjs';
const exec = promisify(execFile);
export function parseMarketCap(html) {
  const match = html.match(/id:"marketcap",title:"Market Cap",value:"[^"]*",hover:"([\d,]+)"/);
  const value = Number(match?.[1].replaceAll(',', ''));
  if (!Number.isFinite(value) || value <= 0) throw new Error('Market capitalization is missing or invalid');
  return value;
}
async function run() {
  const dataPath = new URL('../data.js', import.meta.url);
  const data = parseDataJs(await readFile(dataPath, 'utf8'));
  const caps = { ...(data.meta.marketCaps ?? {}) };
  const failures = [];
  for (let i = 0; i < COMPANY_SOURCES.length; i += 4) {
    await Promise.all(COMPANY_SOURCES.slice(i, i + 4).map(async company => {
      const url = `https://stockanalysis.com/stocks/${company.slug}/statistics/`;
      try {
        const { stdout } = await exec('curl', ['-L', '-sS', '--fail', '--compressed', '--connect-timeout', '10', '--max-time', '25', '--retry', '1', url], { maxBuffer: 5 * 1024 * 1024 });
        const value = parseMarketCap(stdout);
        caps[company.id] = { value, currency: 'USD', source: url, retrievedAt: new Date().toISOString() };
        console.log(company.ticker, value);
      } catch (error) { failures.push(`${company.id}: ${error.message}`); }
    }));
  }
  if (failures.length) throw new Error(`Market-cap update incomplete; prior files preserved: ${failures.join('; ')}`);
  data.meta.marketCaps = caps;
  if (process.argv.includes('--dry-run')) return;
  await writeFile(dataPath, formatDataJs(data));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run().catch(error => { console.error(error.message); process.exitCode = 1; });

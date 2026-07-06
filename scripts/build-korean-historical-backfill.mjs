#!/usr/bin/env node

import { mkdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const OUTPUT_PATH = new URL("../data/korean-historical-backfill.json", import.meta.url);
const TEMP_DIR = new URL("../tmp/pdfs/korean-historical-backfill/", import.meta.url);

const SAMSUNG_PDFS = {
  "2011Q1": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20110429_conference_eng.pdf",
  "2011Q2": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20110729_conference_eng.pdf",
  "2011Q3": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20111028_conference_eng.pdf",
  "2011Q4": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20120127_conference_eng.pdf",
  "2012Q1": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20120429_conference_eng.pdf",
  "2012Q2": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20120727_conference_eng.pdf",
  "2012Q3": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20121026_conference_eng.pdf",
  "2012Q4": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20130125_conference_eng.pdf",
  "2013Q1": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20130426_conference_eng.pdf",
  "2013Q2": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20130726_conference_eng.pdf",
  "2013Q3": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20131025_conference_eng.pdf",
  "2013Q4": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20140124_conference_eng.pdf",
  "2014Q1": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20140429_conference_eng.pdf",
  "2014Q2": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20140731_conference_eng.pdf",
  "2014Q3": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20141030_conference_eng.pdf",
  "2014Q4": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20150129_conference_eng.pdf",
  "2015Q1": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20150429_conference_eng.pdf",
  "2015Q2": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20150730_conference_eng.pdf",
  "2015Q3": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20151029_conference_eng.pdf",
  "2015Q4": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20160128_conference_eng.pdf",
  "2016Q1": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20160428_conference_eng.pdf",
  "2016Q2": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20160728_conference_eng.pdf",
  "2016Q3": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20161027_conference_eng.pdf",
  "2016Q4": "https://images.samsung.com/is/content/samsung/assets/global/ir/docs/20170124_conference_eng.pdf",
  "2017Q1": "https://images.samsung.com/is/content/samsung/p5/global/ir/docs/2017_1Q_Earnings_Release_Samsung_Electronics.pdf",
  "2017Q2": "https://images.samsung.com/is/content/samsung/p5/global/ir/docs/2017_2Q_Earnings_Release_Samsung_Electronics.pdf",
  "2017Q3": "https://images.samsung.com/is/content/samsung/p5/global/ir/docs/2017_3Q_Earnings_Release_Samsung_Electronics.pdf",
  "2017Q4": "https://images.samsung.com/is/content/samsung/p5/global/ir/docs/2017_4Q_Earnings_Release_Samsung_Electronics.pdf",
};

const QUARTER_WORDS = [null, "first", "second", "third"];

function getSkHynixUrl(year, quarter) {
  let slug;
  if (quarter < 4) {
    const prefix = year === 2011 ? "hynix-semiconductor-inc" : "sk-hynix-inc";
    slug = `${prefix}-reports-${QUARTER_WORDS[quarter]}-quarter-${year}-results`;
  } else if (year === 2011) {
    slug = "hynix-semiconductor-inc-reports-fiscal-year-2011-and-fourth-quarter-results";
  } else if (year === 2012) {
    slug = "sk-hynix-inc-reports-fourth-quarter-and-fiscal-year-2012-results";
  } else {
    slug = `sk-hynix-inc-reports-fiscal-year-${year}-and-fourth-quarter-results`;
  }
  return `https://news.skhynix.com/${slug}/`;
}

function quarterEndDate(period) {
  const [, year, quarter] = /^(\d{4})Q([1-4])$/.exec(period);
  return `${year}-${["03-31", "06-30", "09-30", "12-31"][Number(quarter) - 1]}`;
}

function parseNumber(raw) {
  const normalized = String(raw || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&minus;|&#8722;/gi, "-")
    .replace(/[△▲]/g, "-")
    .replace(/,/g, "")
    .trim();
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function extractSamsungTrillion(text, label) {
  const match = text.match(new RegExp(`^\\s*${label}\\s+([△▲-]?\\s*[\\d,.]+)`, "mi"));
  const value = parseNumber(match?.[1]);
  if (!Number.isFinite(value)) throw new Error(`三星 PDF 缺少 ${label}`);
  return Math.round(value * 1e12);
}

async function fetchBuffer(url) {
  const response = await fetch(url, { headers: { "user-agent": "Tech-Analysis-Historical-Backfill/1.0" } });
  if (!response.ok) throw new Error(`请求失败 ${response.status}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function fetchSamsungRows() {
  const rows = [];
  for (const [period, sourceUrl] of Object.entries(SAMSUNG_PDFS)) {
    const pdfPath = new URL(`samsung-${period}.pdf`, TEMP_DIR);
    await writeFile(pdfPath, await fetchBuffer(sourceUrl));
    const { stdout } = await execFileAsync("pdftotext", ["-layout", fileURLToPath(pdfPath), "-"], {
      maxBuffer: 10 * 1024 * 1024,
    });
    const revenue = extractSamsungTrillion(stdout, "Sales");
    const grossProfit = extractSamsungTrillion(stdout, "Gross Profit");
    const netIncome = extractSamsungTrillion(stdout, "Net (?:profit|Income)");
    rows.push({ period, dateKey: quarterEndDate(period), revenue, netIncome, grossProfit, sourceUrl });
    console.log(`三星 ${period}`);
  }
  return rows;
}

function extractSkHynixBillion(tableHtml, label) {
  const match = tableHtml.match(new RegExp(`<th[^>]*>\\s*${label}\\s*</th>\\s*<td[^>]*>([\\s\\S]*?)</td>`, "i"));
  const value = parseNumber(match?.[1]);
  if (!Number.isFinite(value)) throw new Error(`SK 海力士表格缺少 ${label}`);
  return Math.round(value * 1e9);
}

function extractSkHynixNarrativeAmount(html, pattern) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#8217;|&rsquo;/gi, " ")
    .replace(/\s+/g, " ");
  const match = text.match(pattern);
  const value = parseNumber(match?.[1]);
  const unit = String(match?.[2] || "").toLowerCase();
  if (!Number.isFinite(value) || !unit) return null;
  return Math.round(value * (unit === "trillion" ? 1e12 : 1e9));
}

async function fetchSkHynixRows() {
  const rows = [];
  for (let year = 2011; year <= 2017; year += 1) {
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      const period = `${year}Q${quarter}`;
      const sourceUrl = getSkHynixUrl(year, quarter);
      const response = await fetch(sourceUrl, { headers: { "user-agent": "Tech-Analysis-Historical-Backfill/1.0" } });
      if (!response.ok) throw new Error(`请求失败 ${response.status}: ${sourceUrl}`);
      const html = await response.text();
      const section = html.match(new RegExp(`<h3[^>]*>[^<]*${year}\\s*Q${quarter}\\s*Earnings</h3>[\\s\\S]*?<table[^>]*>([\\s\\S]*?)</table>`, "i"));
      const quarterWord = [null, "first", "second", "third", "fourth"][quarter];
      const revenue = section
        ? extractSkHynixBillion(section[1], "Revenue")
        : extractSkHynixNarrativeAmount(
          html,
          new RegExp(`consolidated ${quarterWord} quarter revenue[^.]{0,120}?(?:was|totaled|amounted to) ([\\d.]+) (trillion|billion) won`, "i"),
        );
      const netIncome = section
        ? extractSkHynixBillion(section[1], "Net (?:Income|Loss)")
        : (
          extractSkHynixNarrativeAmount(
            html,
            /Net income for (?:the )?quarter[^.]{0,100}?(?:(?:was|amounted to|totaled) )?([\d.]+) (trillion|billion) won/i,
          ) ?? extractSkHynixNarrativeAmount(
            html,
            /Net income[^.]{0,100}?(?:(?:was|amounted to|totaled) )?([\d.]+) (trillion|billion) won/i,
          )
        );
      if (!Number.isFinite(revenue) || !Number.isFinite(netIncome)) {
        throw new Error(`SK 海力士缺少 ${period} 季度数据: ${sourceUrl}`);
      }
      rows.push({ period, dateKey: quarterEndDate(period), revenue, netIncome, grossProfit: null, sourceUrl });
      console.log(`SK 海力士 ${period}`);
    }
  }
  return rows;
}

async function run() {
  await rm(TEMP_DIR, { recursive: true, force: true });
  await mkdir(TEMP_DIR, { recursive: true });
  const [samsungRows, skHynixRows] = await Promise.all([fetchSamsungRows(), fetchSkHynixRows()]);
  const payload = {
    meta: {
      source: "Samsung Electronics IR earnings releases + SK hynix Newsroom earnings releases",
      note: "Quarterly reported values in KRW. Samsung gross profit is sourced from official earnings-release income statements; SK hynix historical newsroom tables do not disclose gross profit.",
    },
    companies: {
      samsung: { reportingCurrency: "KRW", rows: samsungRows },
      "sk-hynix": { reportingCurrency: "KRW", rows: skHynixRows },
    },
  };
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await rm(TEMP_DIR, { recursive: true, force: true });
  console.log(`完成写入 ${fileURLToPath(OUTPUT_PATH)}`);
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

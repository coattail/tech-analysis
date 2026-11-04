// AMD's Newsroom publishes HTML statements before CompanyFacts/data vendors.
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ordinals = ["first", "second", "third", "fourth"];
const text = html => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/g, " ")
  .replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();
const date = value => {
  const stamp = value ? Date.parse(`${value} UTC`) : NaN;
  return Number.isFinite(stamp) ? new Date(stamp).toISOString().slice(0, 10) : null;
};
const amount = value => {
  const clean = value?.replace(/[$,\s]/g, "");
  if (clean === "—" || clean === "–") return 0;
  if (!/^\(?-?\d+(?:\.\d+)?\)?$/.test(clean ?? "")) return null;
  return Number(clean.replace(/[()]/g, "")) * (clean.startsWith("(") ? -1 : 1) / 1000;
};

export function parseAmdEarnings(html, { quarter, filingDate, sourceUrl }) {
  const [year, q] = quarter.split("Q").map(Number);
  const title = `AMD Reports ${ordinals[q - 1]} Quarter ${year} Financial Results`;
  if (!text(html).toLowerCase().includes(title.toLowerCase())) throw Error("AMD release title mismatch");
  const published = html.match(/"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})/)?.[1];
  if (!published || published !== filingDate) throw Error("AMD release filing date mismatch");
  function statement(heading) {
    const index = html.indexOf(heading);
    if (index < 0) throw Error(`AMD statement missing: ${heading}`);
    const fragment = html.slice(index).match(/^[\s\S]*?<table\b[^>]*>([\s\S]*?)<\/table>/i);
    if (!fragment || !/Millions/i.test(text(fragment[0].split(/<table/i)[0]))) throw Error("AMD statement units missing");
    const rows = [...fragment[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row =>
      [...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(cell => text(cell[1])));
    return rows;
  }
  const income = statement("CONDENSED CONSOLIDATED STATEMENTS OF OPERATIONS");
  const balance = statement("CONDENSED CONSOLIDATED BALANCE SHEETS");
  const cash = statement("CONDENSED CONSOLIDATED STATEMENTS OF CASH FLOWS");
  const periodEnd = date(income[1]?.[1]);
  if (!/Three Months Ended/i.test(income[0]?.join(" ") ?? "")
    || !/Three Months Ended/i.test(cash[0]?.join(" ") ?? "")
    || !periodEnd || periodEnd > filingDate
    || `${periodEnd.slice(0, 4)}Q${Math.ceil(Number(periodEnd.slice(5, 7)) / 3)}` !== quarter
    || date(balance[0]?.[1]) !== periodEnd || date(cash[1]?.[1]) !== periodEnd) {
    throw Error("AMD statement period mismatch; refusing cumulative or misaligned values");
  }
  const rowValue = (rows, label) => amount(rows.find(row => row[0].toLowerCase() === label.toLowerCase())?.[1]);
  const entry = {
    revenueBn: rowValue(income, "Net revenue"), grossProfitBn: rowValue(income, "Gross profit"),
    operatingIncomeBn: rowValue(income, "Operating income"), netIncomeBn: rowValue(income, "Net income"),
    netAssetsBn: rowValue(balance, "Total stockholders' equity"),
    operatingCashFlowBn: rowValue(cash, "Net cash provided by operating activities"),
    capexBn: rowValue(cash, "Purchases of property and equipment"),
    statementCurrency: "USD", statementValueMode: "quarterly", statementSpanQuarters: 1,
    periodEnd, statementFilingDate: filingDate, statementSourceUrl: sourceUrl,
  };
  if (entry.capexBn !== null) entry.capexBn = -entry.capexBn;
  if (![entry.revenueBn, entry.grossProfitBn, entry.operatingIncomeBn, entry.netIncomeBn,
    entry.netAssetsBn, entry.operatingCashFlowBn, entry.capexBn].every(Number.isFinite)
    || entry.revenueBn <= 0 || entry.grossProfitBn < 0 || entry.grossProfitBn > entry.revenueBn || entry.capexBn < 0) {
    throw Error("AMD statement has missing or invalid amounts");
  }
  return entry;
}

async function fetchHtml(url) {
  const { stdout } = await execFileAsync("curl", ["-L", "-sS", "--fail", "--compressed", "--retry", "2",
    "--connect-timeout", "10", "--max-time", "45", "-A", "Tech-Analysis/1.0 (+https://github.com/coattail/tech-analysis)", url],
  { maxBuffer: 5 * 1024 * 1024 });
  return stdout;
}

export async function enrichAmdRelease(releases, fetcher = fetchHtml) {
  const check = releases.report.find(row => row.companyId === "amd" && row.needsUpdate);
  if (!check || check.release?.entry) return false;
  const filingDate = check.remoteFilingDate;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(filingDate ?? "")) throw Error("AMD release date missing");
  const year = Number(filingDate.slice(0, 4)), q = Math.floor((Number(filingDate.slice(5, 7)) - 1) / 3);
  const quarter = check.remoteQuarter || `${q ? year : year - 1}Q${q || 4}`;
  if (!/^\d{4}Q[1-4]$/.test(quarter)) throw Error("AMD release quarter invalid");
  const sourceUrl = `https://newsroom.amd.com/news/amd-reports-${ordinals[Number(quarter.at(-1)) - 1]}-quarter-${quarter.slice(0, 4)}-earnings/`;
  const entry = parseAmdEarnings(await fetcher(sourceUrl), { quarter, filingDate, sourceUrl });
  check.release = { ...check.release, quarter, entry };
  check.remoteQuarter = quarter;
  delete check.sourceWarning;
  delete check.release.parseError;
  return true;
}

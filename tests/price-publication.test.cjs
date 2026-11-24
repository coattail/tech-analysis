const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const {
  getLatestCompletedMarketDate, getPriorSessionDuringClosePublication,
  parseNasdaqClosedQuote, parseNasdaqHistoricalClose, verifyLatestClose,
} = require("../price-refresh-helpers.cjs");

const date = "2026-11-11";
const nasdaq = (symbol, close) => ({
  status: { rCode: 200 },
  data: { symbol, tradesTable: { rows: [
    { date: "11/10/2026", close: "$168.89" },
    { date: "11/11/2026", close },
  ] } },
});

test("requires a Nasdaq close for the requested symbol and session", () => {
  assert.equal(parseNasdaqHistoricalClose(nasdaq("NVDA", "$173.73"), "NVDA", date), 173.73);
  assert.equal(parseNasdaqHistoricalClose(nasdaq("BRK/B", "$588.24"), "BRK.B", date), 588.24);
  assert.equal(parseNasdaqHistoricalClose(nasdaq("ASML", "$1,534.42"), "ASML", date), 1534.42);
  assert.throws(() => parseNasdaqHistoricalClose(nasdaq("NVDA", "$173.73"), "AAPL", date), /Nasdaq/);
  assert.throws(() => parseNasdaqHistoricalClose(nasdaq("NVDA", "$173.73"), "NVDA", "2026-11-12"), /Nasdaq/);
  assert.throws(() => parseNasdaqHistoricalClose(nasdaq("NVDA", "N/A"), "NVDA", date), /Nasdaq/);
});

test("Nasdaq quote fallback accepts only the dated, closed primary market quote", () => {
  const payload = { status: { rCode: 200 }, data: { symbol: "NVDA", marketStatus: "Closed",
    primaryData: { lastSalePrice: "$173.73", lastTradeTimestamp: "Nov 11, 2026", isRealTime: false },
    secondaryData: { lastSalePrice: "$176.59" },
  } };
  assert.equal(parseNasdaqClosedQuote(payload, "NVDA", date), 173.73);
  assert.throws(() => parseNasdaqClosedQuote(payload, "AAPL", date), /Nasdaq/);
  assert.throws(() => parseNasdaqClosedQuote(payload, "NVDA", "2026-11-12"), /Nasdaq/);
  payload.data.primaryData.lastTradeTimestamp = "Nov 11, 2026 3:59 PM ET";
  assert.throws(() => parseNasdaqClosedQuote(payload, "NVDA", date), /Nasdaq/);
  payload.data.primaryData.lastTradeTimestamp = "Nov 11, 2026";
  payload.data.marketStatus = "Open";
  assert.throws(() => parseNasdaqClosedQuote(payload, "NVDA", date), /Nasdaq/);
});

test("blocks a same-date intraday quote and pins a verified endpoint to the official close", () => {
  const intraday = { [date]: 176.59 };
  assert.throws(() => verifyLatestClose(intraday, date, 173.73), /176\.59.*173\.73/);
  assert.equal(intraday[date], 176.59);
  assert.throws(() => verifyLatestClose({}, date, 173.73), /缺失/);
  const daily = { "2026-11-10": 168.88999, [date]: 173.72999 };
  assert.deepEqual(verifyLatestClose(daily, date, 173.73), {
    "2026-11-10": 168.88999, [date]: 173.73,
  });
  assert.equal(verifyLatestClose({ [date]: 521.13 }, date, 521.125)[date], 521.125);
});

test("the close publication window follows the actual New York session, including half days", () => {
  const cases = {
    "2026-11-23T22:04:09Z": "2026-11-20",
    "2026-11-23T23:30:00Z": null,
    "2026-08-24T22:25:00Z": "2026-08-21",
    "2026-11-27T20:29:59Z": "2026-11-25",
    "2026-11-27T20:30:00Z": null,
  };
  for (const [time, previous] of Object.entries(cases)) {
    const now = new Date(time);
    assert.equal(getPriorSessionDuringClosePublication(now, getLatestCompletedMarketDate(now)), previous, time);
  }
});

test("an entirely pending close retains verified prices only during the publication window", t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pending-price-"));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const scripts = path.join(directory, "scripts");
  fs.mkdirSync(scripts);
  for (const file of ["price-refresh-helpers.cjs", "stockanalysis-price-helpers.cjs", "scripts/auto-refresh-price-data.mjs"]) {
    fs.copyFileSync(path.join(__dirname, "..", file), path.join(directory, file));
  }
  const mock = path.join(directory, "nasdaq.cjs");
  fs.writeFileSync(mock, `
    const NativeDate = Date;
    const now = NativeDate.parse(process.env.TEST_CLOCK);
    global.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [now])); }
      static now() { return now; }
    };
    global.fetch = async url => {
      if (process.env.TEST_RESPONSE === "malformed") return Response.json({});
      const data = String(url).includes("/historical")
        ? { symbol: "NVDA", tradesTable: { rows: [{ date: "11/20/2026", close: "$170.00" }] } }
        : { symbol: "NVDA", marketStatus: "After Hours",
            primaryData: { lastSalePrice: "$171", isRealTime: true, lastTradeTimestamp: "Nov 23, 2026 5:04 PM ET" } };
      return Response.json({ status: { rCode: 200 }, data });
    };
  `);
  const file = path.join(directory, "price-data.js");
  const output = path.join(directory, "step-output");
  const cases = [
    ["2026-11-23T22:04:09Z", "pending", "2026-11-20", 0, true],
    ["2026-11-24T01:15:00Z", "pending", "2026-11-20", 1, false],
    ["2026-11-23T22:04:09Z", "malformed", "2026-11-20", 1, false],
    ["2026-11-23T22:04:09Z", "pending", "2026-11-19", 1, false],
  ];
  for (const [clock, response, prior, status, deferred] of cases) {
    const snapshot = `window.STOCK_PRICE_SOURCE_DATA = ${JSON.stringify({
      companies: { nvidia: { verifiedCloseDate: prior, daily: { [prior]: 170 } } },
    })};\n`;
    fs.writeFileSync(file, snapshot);
    fs.writeFileSync(output, "");
    const result = spawnSync(process.execPath, ["--require", mock, path.join(scripts, "auto-refresh-price-data.mjs"),
      "--company", "nvidia", "--allow-partial", "--defer-pending-close"], {
      encoding: "utf8", env: { ...process.env, TEST_CLOCK: clock, TEST_RESPONSE: response, GITHUB_OUTPUT: output },
    });
    assert.equal(result.status, status, result.stderr);
    assert.equal(fs.readFileSync(output, "utf8"), `pending=nvidia\ndeferred=${deferred}\n`);
    assert.equal(fs.readFileSync(file, "utf8"), snapshot);
  }
});

test("checks both the public page's price version and the content fetched at its script URL", async () => {
  const { verifyPublicPriceAsset } = await import("../scripts/verify-earnings-deployment.mjs");
  const base = "https://example.test/tech-analysis/";
  const expected = Buffer.from("expected price file");
  const version = createHash("sha256").update(expected).digest("hex").slice(0, 16);
  const page = key => `<script defer src="price-data.js?v=${key}"></script>`;
  const fetchAsset = (key, body) => async url => {
    if (url.pathname === "/tech-analysis/") return new Response(page(key));
    assert.equal(url.href, `${base}price-data.js?v=${version}`);
    return new Response(body);
  };

  await verifyPublicPriceAsset(base, expected, fetchAsset(version, expected));
  await assert.rejects(verifyPublicPriceAsset(base, expected, fetchAsset("old", expected)), /wrong price-data\.js version/);
  await assert.rejects(verifyPublicPriceAsset(base, expected, fetchAsset(version, "stale prices")), /does not match/);
});

test("verifies the earnings asset the browser loads, including all metric bytes", async () => {
  const { verifyPublicEarningsAsset } = await import("../scripts/verify-earnings-deployment.mjs");
  const base = "https://example.test/tech-analysis/";
  const expected = Buffer.from("all financial metrics");
  const version = createHash("sha256").update(expected).digest("hex").slice(0, 16);
  const fetcher = (key, body) => async url => {
    if (url.pathname === "/tech-analysis/") return new Response(`<script defer src="data.js?v=${key}"></script>`);
    assert.equal(url.href, `${base}data.js?v=${version}`);
    return new Response(body);
  };
  await verifyPublicEarningsAsset(base, expected, fetcher(version, expected));
  await assert.rejects(verifyPublicEarningsAsset(base, expected, fetcher("previous", expected)), /wrong data\.js version/);
  await assert.rejects(verifyPublicEarningsAsset(base, expected, fetcher(version, "stale equity or cash flow")), /does not match/);
});

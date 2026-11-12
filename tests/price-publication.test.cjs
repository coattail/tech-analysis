const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const test = require("node:test");
const { parseNasdaqHistoricalClose, verifyLatestClose } = require("../price-refresh-helpers.cjs");

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

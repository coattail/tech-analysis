function normalizeAdjustedCloseRows(rows) {
  if (!Array.isArray(rows)) return {};

  return Object.fromEntries(
    rows
      .map((row) => ({
        date: String(row?.date || ""),
        rawValue: row?.adjustedClose,
        value: Number(row?.adjustedClose),
      }))
      .filter((row) => row.rawValue !== null
        && row.rawValue !== ""
        && /^\d{4}-\d{2}-\d{2}$/.test(row.date)
        && Number.isFinite(row.value))
      .sort((left, right) => left.date.localeCompare(right.date))
      .map((row) => [row.date, row.value]),
  );
}

function normalizeYahooChartPayload(payload) {
  const result = payload?.chart?.result?.[0];
  const timestamps = result?.timestamp;
  const adjustedCloses = result?.indicators?.adjclose?.[0]?.adjclose;
  if (!Array.isArray(timestamps) || !Array.isArray(adjustedCloses)) return {};

  const rows = timestamps.map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().slice(0, 10),
    adjustedClose: adjustedCloses[index],
  }));

  return normalizeAdjustedCloseRows(rows);
}

function formatUnixDateInTimeZone(timestamp, timeZone = "UTC") {
  const numericTimestamp = Number(timestamp);
  if (!Number.isFinite(numericTimestamp)) return null;

  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(numericTimestamp * 1000));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    if (!values.year || !values.month || !values.day) return null;
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return null;
  }
}

function getLatestPriceDate(daily) {
  if (!daily || typeof daily !== "object") return null;
  return Object.keys(daily)
    .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort()
    .at(-1) || null;
}

function getYahooExpectedLatestDate(payload) {
  const meta = payload?.chart?.result?.[0]?.meta;
  if (!meta) return null;
  return formatUnixDateInTimeZone(
    meta.regularMarketTime,
    meta.exchangeTimezoneName || "UTC",
  );
}

function assessYahooChartFreshness(payload, daily = normalizeYahooChartPayload(payload)) {
  const latestDate = getLatestPriceDate(daily);
  const expectedDate = getYahooExpectedLatestDate(payload);
  return {
    latestDate,
    expectedDate,
    isFresh: Boolean(latestDate && expectedDate && latestDate >= expectedDate),
  };
}

module.exports = {
  assessYahooChartFreshness,
  formatUnixDateInTimeZone,
  getLatestPriceDate,
  getYahooExpectedLatestDate,
  normalizeAdjustedCloseRows,
  normalizeYahooChartPayload,
};

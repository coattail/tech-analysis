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

module.exports = { normalizeAdjustedCloseRows, normalizeYahooChartPayload };

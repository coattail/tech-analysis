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
    date: formatUnixDateInTimeZone(timestamp, result.meta?.exchangeTimezoneName || "America/New_York"),
    adjustedClose: adjustedCloses[index],
  }));

  return normalizeAdjustedCloseRows(rows);
}

const DAY_MS = 86_400_000;
const marketClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});

function weekdayInMonth(year, month, weekday, occurrence) {
  const first = new Date(Date.UTC(year, month, 1));
  return 1 + (weekday - first.getUTCDay() + 7) % 7 + (occurrence - 1) * 7;
}

function observedHoliday(year, month, day, observeSaturday = true) {
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCDay() === 6 && observeSaturday) return date.getTime() - DAY_MS;
  if (date.getUTCDay() === 0) return date.getTime() + DAY_MS;
  return date.getTime();
}

function goodFriday(year) {
  // Gregorian computus for the modern US exchange calendar (1900–2099).
  const lunar = (19 * (year % 19) + 24) % 30;
  const offset = (2 * (year % 4) + 4 * (year % 7) + 6 * lunar + 5) % 7;
  const correction = offset === 6 && (lunar === 29 || (lunar === 28 && year % 19 > 10)) ? 7 : 0;
  return Date.UTC(year, 2, 22 + lunar + offset - correction - 2);
}

function isMarketHoliday(date) {
  const year = date.getUTCFullYear();
  const lastMay = new Date(Date.UTC(year, 4, 31));
  const memorialDay = 31 - (lastMay.getUTCDay() + 6) % 7;
  return [
    observedHoliday(year, 0, 1, false),
    Date.UTC(year, 0, weekdayInMonth(year, 0, 1, 3)),
    Date.UTC(year, 1, weekdayInMonth(year, 1, 1, 3)),
    goodFriday(year),
    Date.UTC(year, 4, memorialDay),
    observedHoliday(year, 5, 19),
    observedHoliday(year, 6, 4),
    Date.UTC(year, 8, weekdayInMonth(year, 8, 1, 1)),
    Date.UTC(year, 10, weekdayInMonth(year, 10, 4, 4)),
    observedHoliday(year, 11, 25),
  ].includes(date.getTime());
}

function getLatestCompletedMarketDate(now = new Date()) {
  const { year, month, day, hour } = Object.fromEntries(
    marketClock.formatToParts(now).map(({ type, value }) => [type, Number(value)]),
  );
  const date = new Date(Date.UTC(year, month - 1, day));
  const earlyClose = (month === 11 && day === weekdayInMonth(year, 10, 4, 4) + 1)
    || (month === 7 && day === 3) || (month === 12 && day === 24);
  if (hour < (earlyClose ? 13 : 16)) date.setUTCDate(date.getUTCDate() - 1);
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6 || isMarketHoliday(date)) {
    date.setUTCDate(date.getUTCDate() - 1);
  }
  return date.toISOString().slice(0, 10);
}

const exchangeDateFormatters = new Map();

function formatUnixDateInTimeZone(timestamp, timeZone = "UTC") {
  const numericTimestamp = Number(timestamp);
  if (!Number.isFinite(numericTimestamp)) return null;

  try {
    if (!exchangeDateFormatters.has(timeZone)) {
      exchangeDateFormatters.set(timeZone, new Intl.DateTimeFormat("en-CA", {
        timeZone, year: "numeric", month: "2-digit", day: "2-digit",
      }));
    }
    const date = new Date(numericTimestamp * 1000);
    const { year, month, day } = Object.fromEntries(exchangeDateFormatters.get(timeZone)
      .formatToParts(date).map(({ type, value }) => [type, value]));
    return `${year}-${month}-${day}`;
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

function keepCompletedPrices(daily, expectedDate) {
  return Object.fromEntries(Object.entries(daily).filter(([date]) => date <= expectedDate));
}

function assessYahooChartFreshness(daily, expectedDate) {
  const latestDate = getLatestPriceDate(daily);
  return {
    latestDate,
    expectedDate,
    isFresh: Boolean(latestDate && latestDate === expectedDate),
  };
}

function parseNasdaqHistoricalClose(payload, symbol, date) {
  const [year, month, day] = date.split("-");
  const rows = payload?.data?.tradesTable?.rows;
  const row = Array.isArray(rows) ? rows.find(item => item?.date === `${month}/${day}/${year}`) : null;
  const close = typeof row?.close === "string" ? Number(row.close.replace(/^\$/, "").replaceAll(",", "")) : NaN;
  const returnedSymbol = payload?.data?.symbol?.replaceAll("/", ".");
  if (payload?.status?.rCode !== 200 || returnedSymbol !== symbol || !Number.isFinite(close) || close <= 0) {
    throw new Error(`Nasdaq 缺少 ${symbol} 在 ${date} 的有效收盘价`);
  }
  return close;
}

function parseNasdaqClosedQuote(payload, symbol, date) {
  const data = payload?.data;
  const quote = data?.primaryData;
  const [year, month, day] = date.split("-");
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(month) - 1];
  const close = Number(String(quote?.lastSalePrice ?? "").replace(/^\$/, "").replaceAll(",", ""));
  if (payload?.status?.rCode !== 200 || data?.symbol?.replaceAll("/", ".") !== symbol
    || data?.marketStatus !== "Closed" || quote?.isRealTime !== false
    || quote.lastTradeTimestamp !== `${monthName} ${Number(day)}, ${year}` || !Number.isFinite(close) || close <= 0) {
    throw new Error(`Nasdaq 缺少 ${symbol} 在 ${date} 的已收盘报价`);
  }
  return close;
}

function verifyLatestClose(daily, date, officialClose) {
  const candidate = daily[date];
  // Allow half-cent display rounding and provider floating-point noise.
  const tolerance = 0.005 + officialClose * 1e-7;
  if (!Number.isFinite(officialClose) || officialClose <= 0 || !Number.isFinite(candidate) || candidate <= 0
      || Math.abs(candidate - officialClose) > tolerance) {
    throw new Error(`${date} 收盘价对账失败：股价来源 ${candidate ?? "缺失"}，Nasdaq ${officialClose}`);
  }
  daily[date] = officialClose;
  return daily;
}

module.exports = {
  assessYahooChartFreshness,
  formatUnixDateInTimeZone,
  getLatestCompletedMarketDate,
  getLatestPriceDate,
  keepCompletedPrices,
  normalizeAdjustedCloseRows,
  normalizeYahooChartPayload,
  parseNasdaqClosedQuote,
  parseNasdaqHistoricalClose,
  verifyLatestClose,
};

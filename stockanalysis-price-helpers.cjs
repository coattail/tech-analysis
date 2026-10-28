// Parse only the provider's history objects; never evaluate downloaded JavaScript.
function parseStockAnalysisPrices(html) {
  const block = String(html).match(/data:\[(\{t:[\s\S]*?\})\],/);
  if (!block) throw new Error('StockAnalysis history data is missing');
  const daily = {};
  for (const match of block[1].matchAll(/\{([^{}]+)\}/g)) {
    const date = match[1].match(/\bt:"(\d{4}-\d{2}-\d{2})"/)?.[1];
    const priceText = match[1].match(/\ba:([0-9]+(?:\.[0-9]+)?)(?=[,} ]|$)/)?.[1];
    const price = Number(priceText);
    if (date && priceText && Number.isFinite(price) && price > 0) daily[date] = price;
  }
  const dates = Object.keys(daily).sort();
  const expected = String(html).match(/\btd:"(\d{4}-\d{2}-\d{2})"/)?.[1];
  if (!dates.length || !expected || dates.at(-1) !== expected) {
    throw new Error('StockAnalysis adjusted-close history is incomplete or stale');
  }
  return Object.fromEntries(dates.map(date => [date, daily[date]]));
}
module.exports = { parseStockAnalysisPrices };

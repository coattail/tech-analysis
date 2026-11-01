// Cash-flow histories use duration, never the filing's fiscal-period label:
// a 10-K can contain a six- or nine-month comparative cash-flow fact tagged FY.
export const CASH_FLOW_CONCEPTS = {
  operatingCashFlow: [
    'NetCashProvidedByUsedInOperatingActivities', 'CashFlowsFromUsedInOperatingActivities',
    'NetCashProvidedByUsedInOperatingActivitiesContinuingOperations',
    'CashFlowsFromUsedInOperatingActivitiesContinuingOperations',
  ],
  capex: [
    'PaymentsToAcquirePropertyPlantAndEquipment', 'PurchaseOfPropertyPlantAndEquipment',
    'PurchaseOfPropertyPlantAndEquipmentClassifiedAsInvestingActivities',
    'PaymentsToAcquireProductiveAssets', 'PaymentsToAcquireOtherPropertyPlantAndEquipment',
    'PurchaseOfPropertyPlantAndEquipmentIntangibleAssetsOtherThanGoodwillInvestmentPropertyAndOtherNoncurrentAssets',
  ],
};
export const HISTORICAL_CIKS = {
  alphabet: [1288776], avgo: [1441634, 1649338], exxon: [34088],
};
const span = (start, end) => (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
const nextDay = date => new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10);
export function cashFlowPeriod(date) {
  let year = Number(date.slice(0, 4)), month = Number(date.slice(5, 7));
  if ([1, 4, 7, 10].includes(month) && Number(date.slice(8, 10)) <= 7) {
    month -= 1;
    if (!month) { month = 12; year -= 1; }
  }
  return `${year}Q${Math.ceil(month / 3)}`;
}
const allowedForm = form => /^(10-[QK](\/A)?|20-F(\/A)?|6-K|S-1(\/A)?|F-1(\/A)?|424B4)$/.test(form);
const isBetter = (a, b) => !b || a.priority > b.priority
  || (a.priority === b.priority && (a.filed > b.filed || (a.filed === b.filed && a.method === 'reported-quarter')));

export function buildCashFlowFacts(payload, currency, { allowNetCapex = false, normalizeNetCapexSign = false, periodEndDates = {} } = {}) {
  const output = {};
  const groups = { ...CASH_FLOW_CONCEPTS,
    capitalizedSoftware: ['PaymentsToAcquireSoftware', 'PaymentsToDevelopSoftware'],
    capitalizedIntangibles: ['PaymentsToAcquireIntangibleAssets'],
  };
  for (const [metric, aliases] of Object.entries(groups)) {
    const concepts = [...aliases, ...(metric === 'capex' && allowNetCapex ? ['PaymentsForProceedsFromProductiveAssets'] : [])];
    const raw = [];
    for (const [namespace, tags] of Object.entries(payload.facts ?? {})) {
      if (!['us-gaap', 'ifrs-full'].includes(namespace)) continue;
      for (const [index, concept] of concepts.entries()) {
        for (const r of tags[concept]?.units?.[currency] ?? []) {
          if (!r.start || !r.end || !Number.isFinite(r.val) || !allowedForm(r.form)) continue;
          const expectedEnd = periodEndDates[cashFlowPeriod(r.end)];
          if (expectedEnd && expectedEnd !== r.end) continue;
          const days = span(r.start, r.end);
          if (days < 45 || days > 390) continue;
          let value = normalizeNetCapexSign && concept === 'PaymentsForProceedsFromProductiveAssets' ? Math.abs(r.val) : r.val;
          if (/ContinuingOperations$/.test(concept)) {
            const discontinuedName = namespace === 'us-gaap'
              ? 'CashProvidedByUsedInOperatingActivitiesDiscontinuedOperations'
              : 'CashFlowsFromUsedInOperatingActivitiesDiscontinuedOperations';
            const disc = tags[discontinuedName]?.units?.[currency] ?? [];
            const matching = disc.filter(d => d.start === r.start && d.end === r.end).sort((a, b) => b.filed.localeCompare(a.filed));
            if (matching.length) value += matching[0].val;
            // Do not assume discontinued flows are zero where the issuer disclosed them.
            else if (disc.some(d => d.start?.slice(0, 4) === r.start.slice(0, 4) && d.val !== 0)) continue;
          }
          raw.push({ value, startDate: r.start, endDate: r.end, filed: r.filed ?? '',
            accession: r.accn, concept, currency, priority: concepts.length - index, days,
            method: 'reported-quarter', basis: /PaymentsForProceeds/.test(concept) ? 'net-capital-spending' : 'reported-cash-flow' });
        }
      }
    }
    // Retain the best observation for every duration, including comparative periods.
    const intervals = new Map();
    for (const fact of raw) {
      const key = `${fact.startDate}:${fact.endDate}`;
      if (isBetter(fact, intervals.get(key))) intervals.set(key, fact);
    }
    const facts = [...intervals.values()];
    const quarterly = new Map();
    const put = fact => {
      const p = cashFlowPeriod(fact.endDate);
      if (isBetter(fact, quarterly.get(p))) quarterly.set(p, fact);
    };
    for (const fact of facts) {
      if (fact.days <= 120) { put(fact); continue; }
      const previous = facts.filter(p => p.startDate === fact.startDate && p.endDate < fact.endDate
        && span(nextDay(p.endDate), fact.endDate) >= 45 && span(nextDay(p.endDate), fact.endDate) <= 120)
        .sort((a, b) => b.endDate.localeCompare(a.endDate) || b.priority - a.priority)[0];
      if (!previous) continue;
      // Duration differencing is valid across a tag rename only for the same metric and fiscal start.
      put({ ...fact, value: fact.value - previous.value, startDate: nextDay(previous.endDate),
        method: 'cumulative-difference', components: [previous, fact] });
    }
    output[metric] = quarterly;
  }
  for (const [period, base] of output.capex) {
    if (/PropertyPlantAndEquipmentIntangibleAssets/.test(base.concept)) continue;
    const software = output.capitalizedSoftware.get(period);
    const intangible = output.capitalizedIntangibles.get(period);
    // Acquired software is a subset of acquired intangible assets; development costs are separate.
    const extra = [software?.concept.startsWith('PaymentsToAcquireSoftware') && intangible ? null : software, intangible]
      .filter(fact => fact && fact.endDate === base.endDate && fact.startDate === base.startDate);
    if (extra.length) output.capex.set(period, { ...base,
      value: base.value + extra.reduce((sum, fact) => sum + fact.value, 0),
      concept: [base.concept, ...extra.map(fact => fact.concept)].join(' + '),
      basis: 'cash-capital-spending-including-capitalized-intangibles',
      capitalComponents: [base, ...extra],
    });
  }
  return output;
}

export function parseQuarterlyHistory(text, metric) {
  const name = metric === 'capex' ? 'CAPEX' : 'Cash From Operations';
  const heading = new RegExp(`### [^\\n]*Quarterly ${name} History`);
  const start = String(text).search(heading);
  if (start < 0) throw new Error('Quarterly history heading missing; annual/TTM tables must not be imported');
  const block = String(text).slice(start).split(/Show Full History|L\d+: ###? /)[0];
  const rows = [];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const pattern = /L\d+:\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\s*(?:\|\s*)?(-?\$\s*-?[\d,.]+)\s*([KMBT]?)/g;
  for (const m of block.matchAll(pattern)) {
    const month = months.indexOf(m[1]) + 1, year = Number(m[2]);
    const scale = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[m[4]] ?? 1;
    const value = Math.round(Number(m[3].replace(/[$,\s]/g, '')) * scale);
    const precision = scale / (10 ** ((m[3].split('.')[1] ?? '').length));
    const dateKey = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    rows.push({ period: `${year}Q${Math.ceil(month / 3)}`, dateKey, [metric]: value, precision });
  }
  // Some aggregators print a zero series when CapEx has never been disclosed.
  if (metric === 'capex' && rows.length > 4 && rows.every(r => r.capex === 0)) return [];
  return rows;
}

export function buildCoverage(data, history, before = null) {
  const result = { definition: 'Expected reported quarters from first actual revenue (no earlier than 2005Q1) through latest actual revenue; cash flow is never interpolated or filled from annual averages.', companies: {} };
  for (const [id, company] of Object.entries(data.companies)) {
    const actual = Object.keys(company.revenue).filter(p => Number.isFinite(company.revenue[p])
      && !(company.forecastFlags?.revenue ?? []).includes(p)).sort();
    const expected = data.periods.filter(p => p >= (actual[0] < '2005Q1' ? '2005Q1' : actual[0]) && p <= actual.at(-1));
    const record = { first: expected[0], last: expected.at(-1), expected: expected.length, metrics: {} };
    for (const metric of ['operatingCashFlow','capex','freeCashFlow']) {
      const missing = expected.filter(p => !Number.isFinite(company[metric]?.[p]));
      record.metrics[metric] = { present: expected.length - missing.length, missing,
        ...(before ? { filled: expected.filter(p => !Number.isFinite(before.companies[id]?.[metric]?.[p]) && Number.isFinite(company[metric]?.[p])).length } : {}) };
      if (missing.length) record.metrics[metric].reason = ['jpmorgan','bankofamerica'].includes(id) && metric !== 'operatingCashFlow'
        ? 'Comparable cash CapEx not separately disclosed; aggregator zero placeholders were rejected.'
        : id === 'chronoscale' ? 'Standalone cloud-business carve-out quarter not available; legacy Ekso business under the same CIK was excluded.'
        : 'No verified standalone quarter available in SEC facts, provider history, or published overrides.';
      const keys = Object.keys(company[metric] ?? {}).filter(p => Number.isFinite(company[metric][p])).sort();
      history.companies[id].coverage[metric] = { count: keys.length, first: keys[0] ?? null, last: keys.at(-1) ?? null };
    }
    result.companies[id] = record;
  }
  return result;
}

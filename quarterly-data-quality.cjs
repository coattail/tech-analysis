const audit = require("./data/quarterly-data-audit.json");

const FLOW_METRICS = ["revenue", "earnings", "operatingIncome"];

function previousYear(period) {
  return `${Number(period.slice(0, 4)) - 1}${period.slice(4)}`;
}

// Corrections are explicitly sourced observations, never inferred from equal
// bar heights. In particular, two legitimately equal quarters must stay equal.
function applyAuditedQuarterlyCorrections(companyId, company, periods) {
  const rows = audit.companies[companyId] || {};
  const changes = [];
  const set = (metric, period, value) => {
    company[metric] ||= {};
    if (Object.is(company[metric][period], value)) return;
    changes.push({ companyId, metric, period, before: company[metric][period] ?? null, after: value });
    company[metric][period] = value;
  };
  for (const [period, row] of Object.entries(rows)) {
    for (const metric of [...FLOW_METRICS, "netAssets", "grossMargin"]) {
      if (Object.hasOwn(row, metric)) set(metric, period, row[metric]);
    }
    if (Number.isFinite(row.grossProfit) && company.revenue?.[period] > 0) {
      set("grossMargin", period, row.grossProfit / company.revenue[period] * 100);
    }
    if (row.periodEndDate) {
      const previousEnd = company.periodEndDates?.[period];
      set("periodEndDates", period, row.periodEndDate);
      // A report date belonging to the overwritten observation is not evidence
      // for the replacement quarter. Keep it empty unless independently sourced.
      if (previousEnd !== row.periodEndDate && !row.reportDate) set("reportDates", period, null);
    }
    if (row.reportDate) set("reportDates", period, row.reportDate);
    if (Object.hasOwn(row, "earnings") || Object.hasOwn(row, "netAssets")) {
      const earnings = company.earnings?.[period];
      const equity = company.netAssets?.[period];
      set("roe", period, Number.isFinite(earnings) && Number.isFinite(equity) && equity !== 0
        ? earnings / equity * 100 : null);
    }
    for (const metric of [...FLOW_METRICS, "grossMargin"]) {
      const flag = metric === "earnings" ? "netIncome" : metric;
      if (company.forecastFlags?.[flag]) {
        company.forecastFlags[flag] = company.forecastFlags[flag].filter((entry) => entry !== period);
      }
    }
  }
  // Recalculate both the corrected quarter and its following year's YoY point.
  for (const period of periods) {
    const prior = previousYear(period);
    if (!Object.hasOwn(rows, period) && !Object.hasOwn(rows, prior)) continue;
    const current = company.revenue?.[period];
    const base = company.revenue?.[prior];
    set("revenueGrowth", period, Number.isFinite(current) && Number.isFinite(base) && base !== 0
      ? (current - base) / Math.abs(base) * 100 : null);
  }
  return changes;
}

function findRepeatedQuarterlyValues(data, metrics = FLOW_METRICS) {
  const findings = [];
  const periods = [...data.periods].sort();
  for (const [companyId, company] of Object.entries(data.companies)) {
    for (const metric of metrics) {
      for (let index = 1; index < periods.length; index += 1) {
        const left = periods[index - 1];
        const right = periods[index];
        const ordinal = (period) => Number(period.slice(0, 4)) * 4 + Number(period.at(-1));
        if (ordinal(right) !== ordinal(left) + 1) continue;
        const value = company[metric]?.[left];
        if (!Number.isFinite(value) || value === 0 || value !== company[metric]?.[right]) continue;
        findings.push({ companyId, metric, periods: [left, right], value });
      }
    }
  }
  return findings;
}

function findUnreviewedFlatFlows(data) {
  return findRepeatedQuarterlyValues(data).filter((finding) => !audit.verifiedRepeats.some((review) => (
    review.companyId === finding.companyId && review.metric === finding.metric &&
    review.value === finding.value && review.periods.join() === finding.periods.join() && review.sources.length > 0
  )));
}

function applyAuditedBackfillRows(companyId, rows) {
  return rows.map((row) => {
    const correction = audit.companies[companyId]?.[row.period];
    if (!correction) return row;
    const next = { ...row };
    for (const [field, target] of [["revenue", "revenue"], ["earnings", "netIncome"], ["grossProfit", "grossProfit"]]) {
      if (Object.hasOwn(correction, field)) next[target] = correction[field];
    }
    if (correction.periodEndDate) next.dateKey = correction.periodEndDate;
    if (Number.isFinite(correction.grossProfit) && next.revenue > 0) {
      next.grossMarginPct = correction.grossProfit / next.revenue * 100;
    }
    next.auditSources = correction.sources;
    return next;
  });
}

module.exports = { audit, FLOW_METRICS, applyAuditedQuarterlyCorrections, applyAuditedBackfillRows, findRepeatedQuarterlyValues, findUnreviewedFlatFlows };

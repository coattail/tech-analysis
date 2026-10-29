#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { audit, applyAuditedQuarterlyCorrections, applyAuditedBackfillRows, findRepeatedQuarterlyValues, findUnreviewedFlatFlows } = require("../quarterly-data-quality.cjs");
const dataPath = path.join(__dirname, "../data.js");
const raw = fs.readFileSync(dataPath, "utf8");
const prefix = "window.FINANCIAL_SOURCE_DATA =";
if (!raw.trimStart().startsWith(prefix)) throw new Error("Unexpected data.js format");
const data = JSON.parse(raw.slice(raw.indexOf(prefix) + prefix.length).trim().replace(/;\s*$/, ""));
const changes = Object.entries(data.companies).flatMap(([id, company]) => (
  applyAuditedQuarterlyCorrections(id, company, data.periods)
));
const unreviewed = findUnreviewedFlatFlows(data);
const backfillPath = path.join(__dirname, "../data/historical-sec-backfill.json");
const backfill = JSON.parse(fs.readFileSync(backfillPath, "utf8"));
const backfillChanges = [];
for (const [id, company] of Object.entries(backfill.companies)) {
  const corrected = applyAuditedBackfillRows(id, company.rows);
  if (JSON.stringify(corrected) !== JSON.stringify(company.rows)) backfillChanges.push(id);
  company.rows = corrected;
}
if (process.argv.includes("--write")) {
  if (unreviewed.length) throw new Error(`Review the remaining repeated flows before writing: ${JSON.stringify(unreviewed)}`);
  data.meta.quarterlyDataAudit = {
    auditedOn: audit.auditedOn,
    companiesAudited: Object.keys(data.companies).length,
    sourceFile: "data/quarterly-data-audit.json",
    methodology: audit.scope,
  };
  fs.writeFileSync(dataPath, `${prefix} ${JSON.stringify(data, null, 2)};\n`);
  fs.writeFileSync(backfillPath, JSON.stringify(backfill, null, 2) + "\n");
}
console.log(JSON.stringify({ companiesAudited: Object.keys(data.companies).length, changes, backfillChanges, remainingRepeatedFlows: findRepeatedQuarterlyValues(data), unreviewed }, null, 2));
if (unreviewed.length || (process.argv.includes("--check") && (changes.length || backfillChanges.length))) process.exitCode = 1;

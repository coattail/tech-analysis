const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { computeYearOverYearGrowth } = require("../financial-metrics.js");

test("computes quarterly profit growth against the same quarter one year earlier", () => {
  const labels = ["2025Q1", "2025Q2", "2025Q3", "2025Q4", "2026Q1"];
  const earnings = new Map([
    ["2025Q1", 100],
    ["2025Q2", 120],
    ["2025Q3", 130],
    ["2025Q4", 140],
    ["2026Q1", 150],
  ]);

  const growth = computeYearOverYearGrowth(labels, earnings, 4);

  assert.equal(growth.get("2025Q4"), null);
  assert.equal(growth.get("2026Q1"), 50);
});

test("uses the absolute prior profit as denominator across losses and profits", () => {
  const labels = ["2024", "2025", "2026"];
  const earnings = new Map([
    ["2024", -20],
    ["2025", -10],
    ["2026", 10],
  ]);

  const growth = computeYearOverYearGrowth(labels, earnings, 1);

  assert.equal(growth.get("2025"), 50);
  assert.equal(growth.get("2026"), 200);
});

test("leaves profit growth empty when the comparison value is missing or zero", () => {
  const labels = ["2023", "2024", "2025", "2026"];
  const earnings = new Map([
    ["2023", null],
    ["2024", 10],
    ["2025", 0],
    ["2026", 20],
  ]);

  const growth = computeYearOverYearGrowth(labels, earnings, 1);

  assert.equal(growth.get("2024"), null);
  assert.equal(growth.get("2025"), -100);
  assert.equal(growth.get("2026"), null);
});

test("wires bilingual profit growth into all dashboard frequencies", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");

  assert.match(html, /name="metric" value="profitGrowth"/);
  assert.match(html, /data-i18n="profitGrowth">利润增速<\/span>/);
  assert.match(script, /profitGrowth: "Profit Growth"/);
  assert.match(script, /quarterly\.profitGrowth\.set\(company\.id, quarterProfitGrowth\)/);
  assert.match(script, /annual\.profitGrowth\.set\(company\.id, annualProfitGrowth\)/);
  assert.match(script, /rollingAnnual\.profitGrowth\.set\(company\.id, rollingProfitGrowth\)/);
});

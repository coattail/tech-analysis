const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  FIXED_COMPANY_IDS,
  perceptualColorDistance,
  resolveSeriesColors,
} = require("../series-colors.js");

function loadCompanyColors() {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  return [...script.matchAll(/\{ id: "([^"]+)", name: "[^"]+", ticker: "[^"]+", color: "(#[\da-f]{6})"(?:, deepColor: "(#[\da-f]{6})")?/gi)]
    .map((match) => ({ id: match[1], brandColor: match[3] || match[2] }));
}

test("keeps MAG7 colors fixed in every focused comparison", () => {
  const companies = loadCompanyColors();
  const companyMap = new Map(companies.map((company) => [company.id, company]));

  for (const fixedId of FIXED_COMPANY_IDS) {
    const fixed = companyMap.get(fixedId);
    const peer = companyMap.get("oracle");
    const colors = resolveSeriesColors([fixed, peer]);
    assert.equal(colors[fixedId], fixed.brandColor, `${fixedId} should retain its representative color`);
  }
});

test("keeps every MAG7 fixed color pair above the stricter separation floor", () => {
  const fixedCompanies = loadCompanyColors().filter((company) => FIXED_COMPANY_IDS.has(company.id));
  const expectedColors = {
    nvidia: "#9be000",
    alphabet: "#fbbc04",
    apple: "#7b8490",
    microsoft: "#00b7c3",
    amazon: "#c45500",
    meta: "#0064e0",
    tsla: "#ff3b5c",
  };
  assert.deepEqual(Object.fromEntries(fixedCompanies.map((company) => [company.id, company.brandColor])), expectedColors);

  for (let leftIndex = 0; leftIndex < fixedCompanies.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < fixedCompanies.length; rightIndex += 1) {
      const left = fixedCompanies[leftIndex];
      const right = fixedCompanies[rightIndex];
      const distance = perceptualColorDistance(left.brandColor, right.brandColor);
      assert.ok(
        distance >= 0.14,
        `${left.id}/${right.id} fixed colors should remain clearly separated (distance ${distance})`,
      );
    }
  }
});

test("uses the color-vision-friendly blue-orange pair for two non-MAG7 companies", () => {
  const colors = resolveSeriesColors([
    { id: "oracle", brandColor: "#f45d48" },
    { id: "salesforce", brandColor: "#1fb6ff" },
  ]);

  assert.deepEqual(colors, {
    oracle: "#4db6ff",
    salesforce: "#ffb000",
  });
});

test("renders a company logo instead of a color dot for every company option", () => {
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  const createToggleBody = script.match(/function createToggle\(company\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  const stylesheet = fs.readFileSync(path.join(__dirname, "../style.css"), "utf8");

  assert.match(createToggleBody, /logo\.className = "company-option-logo"/);
  assert.match(createToggleBody, /image\.src = company\.logoPath/);
  assert.match(createToggleBody, /--company-logo-mask/);
  assert.match(createToggleBody, /--company-logo-color/);
  assert.doesNotMatch(createToggleBody, /color-dot|FIXED_COMPANY_IDS/);
  assert.match(stylesheet, /\.company-option-logo-mark/);
  assert.doesNotMatch(stylesheet, /\.color-dot/);
});

test("keeps every possible two-company selection visually distinct", () => {
  const companies = loadCompanyColors();
  assert.equal(companies.length, 44);

  for (let leftIndex = 0; leftIndex < companies.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < companies.length; rightIndex += 1) {
      const left = companies[leftIndex];
      const right = companies[rightIndex];
      const colors = resolveSeriesColors([left, right]);
      const distance = perceptualColorDistance(colors[left.id], colors[right.id]);
      assert.ok(
        distance >= 0.09,
        `${left.id}/${right.id} colors should be perceptually separated (distance ${distance})`,
      );
    }
  }
});

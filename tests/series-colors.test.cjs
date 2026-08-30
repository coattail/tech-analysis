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
    alphabet: "#ff9500",
    apple: "#7b8490",
    microsoft: "#2563eb",
    amazon: "#a94700",
    meta: "#c026d3",
    tsla: "#ff3b5c",
  };
  assert.deepEqual(Object.fromEntries(fixedCompanies.map((company) => [company.id, company.brandColor])), expectedColors);
  assert.equal(expectedColors.nvidia, "#9be000", "NVIDIA should retain its current lime green");
  assert.equal(expectedColors.apple, "#7b8490", "Apple should retain its current slate gray");
  const script = fs.readFileSync(path.join(__dirname, "../script.js"), "utf8");
  assert.match(script, /id: "nvidia"[^\n]*color: "#9be000"/);
  assert.match(script, /id: "apple"[^\n]*color: "#4b5563", deepColor: "#7b8490"/);

  for (let leftIndex = 0; leftIndex < fixedCompanies.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < fixedCompanies.length; rightIndex += 1) {
      const left = fixedCompanies[leftIndex];
      const right = fixedCompanies[rightIndex];
      const distance = perceptualColorDistance(left.brandColor, right.brandColor);
      assert.ok(
        distance >= 0.18,
        `${left.id}/${right.id} fixed colors should remain clearly separated (distance ${distance})`,
      );
    }
  }

  assert.ok(perceptualColorDistance(expectedColors.alphabet, expectedColors.amazon) >= 0.24);
  assert.ok(perceptualColorDistance(expectedColors.alphabet, expectedColors.nvidia) >= 0.22);
  assert.ok(perceptualColorDistance(expectedColors.microsoft, expectedColors.meta) >= 0.24);
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
  assert.match(createToggleBody, /image\.src = optionLogoPath/);
  assert.match(createToggleBody, /--company-logo-mask/);
  assert.match(createToggleBody, /--company-logo-color/);
  assert.match(createToggleBody, /--company-logo-color-deep/);
  assert.match(createToggleBody, /company\.optionLogoPath \|\| company\.logoPath/);
  assert.match(createToggleBody, /company\.optionLogoDeepColor/);
  assert.match(createToggleBody, /company\.optionLogoFit === "symbol"/);
  assert.match(createToggleBody, /company-option-logo--\$\{company\.optionLogoFit\}/);
  assert.match(createToggleBody, /"#f5f7fa"/);
  assert.doesNotMatch(createToggleBody, /color-dot|FIXED_COMPANY_IDS/);
  assert.match(stylesheet, /\.company-option-logo-mark/);
  assert.match(stylesheet, /\.company-option-logo\s*\{[^}]*background:\s*transparent/);
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

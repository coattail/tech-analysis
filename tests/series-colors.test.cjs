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

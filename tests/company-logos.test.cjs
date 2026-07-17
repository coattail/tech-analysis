const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

function getCompanyEntries() {
  const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
  const companiesBlock = script.match(/const COMPANIES = \[([\s\S]*?)\];/)?.[1] ?? "";
  return [...companiesBlock.matchAll(/\{ id: "([^"]+)", name: "([^"]+)", ticker: "([^"]+)", color: "([^"]+)"([^}]*)\}/g)]
    .map((match) => ({
      id: match[1],
      name: match[2],
      ticker: match[3],
      extra: match[5],
      logoPath: match[5].match(/logoPath: "([^"]+)"/)?.[1] ?? null,
      logoColor: match[5].match(/logoColor: "([^"]+)"/)?.[1] ?? null,
      preserveLightLogoColors: /preserveLightLogoColors: true/.test(match[5]),
    }));
}

function parseViewBox(svg, companyId) {
  const [, rawViewBox = ""] = svg.match(/<svg\b[^>]*\bviewBox="([^"]+)"/i) ?? [];
  assert.ok(rawViewBox, `${companyId} logo should declare a viewBox`);

  const values = rawViewBox.trim().split(/[\s,]+/).map(Number);
  assert.equal(values.length, 4, `${companyId} logo viewBox should have four numeric values`);
  assert.ok(values.every(Number.isFinite), `${companyId} logo viewBox should be numeric`);
  assert.ok(values[2] > 0 && values[3] > 0, `${companyId} logo viewBox should have positive size`);

  return {
    minX: values[0],
    minY: values[1],
    width: values[2],
    height: values[3],
  };
}

function readAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}="([^"]+)"`, "i"))?.[1] ?? null;
}

function nearlyEqual(actual, expected) {
  return Math.abs(actual - expected) <= Math.max(0.01, Math.abs(expected) * 0.001);
}

function hasFullCanvasPath(tag, viewBox) {
  const d = readAttribute(tag, "d")?.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  if (!d) return false;

  const relativeBox = d.match(/^M\s*0\s+0\s*h\s*([-+]?\d*\.?\d+)\s*v\s*([-+]?\d*\.?\d+)\s*H\s*0\s*V\s*0\s*z$/i);
  if (relativeBox) {
    return nearlyEqual(Number(relativeBox[1]), viewBox.width)
      && nearlyEqual(Number(relativeBox[2]), viewBox.height)
      && nearlyEqual(viewBox.minX, 0)
      && nearlyEqual(viewBox.minY, 0);
  }

  const absoluteBox = d.match(/^M\s*0\s+0\s*H\s*([-+]?\d*\.?\d+)\s*V\s*([-+]?\d*\.?\d+)\s*H\s*0\s*Z$/i);
  if (absoluteBox) {
    return nearlyEqual(Number(absoluteBox[1]), viewBox.width)
      && nearlyEqual(Number(absoluteBox[2]), viewBox.height)
      && nearlyEqual(viewBox.minX, 0)
      && nearlyEqual(viewBox.minY, 0);
  }

  return false;
}

function hasStandaloneBoxPath(tag) {
  const d = readAttribute(tag, "d")?.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  if (!d) return false;

  const number = "([-+]?\\d*\\.?\\d+)";
  const box = d.match(new RegExp(
    `^M\\s*${number}\\s+${number}\\s*h\\s*${number}\\s*v\\s*${number}\\s*H\\s*${number}\\s*V\\s*${number}\\s*z$`,
    "i",
  ));
  if (!box) return false;

  const [, startX, startY, width, height, endX, endY] = box.map(Number);
  return width !== 0
    && height !== 0
    && nearlyEqual(endX, startX)
    && nearlyEqual(endY, startY);
}

function hasFullCanvasRect(tag, viewBox) {
  const width = readAttribute(tag, "width");
  const height = readAttribute(tag, "height");
  if (width === "100%" && height === "100%") return true;

  const x = Number(readAttribute(tag, "x") ?? 0);
  const y = Number(readAttribute(tag, "y") ?? 0);
  const numericWidth = Number(width);
  const numericHeight = Number(height);
  if (![x, y, numericWidth, numericHeight].every(Number.isFinite)) return false;

  return nearlyEqual(x, viewBox.minX)
    && nearlyEqual(y, viewBox.minY)
    && nearlyEqual(numericWidth, viewBox.width)
    && nearlyEqual(numericHeight, viewBox.height);
}

test("every company uses a local SVG logo asset with a transparent canvas", async (t) => {
  const companies = getCompanyEntries();

  assert.equal(companies.length, 44);
  for (const company of companies) {
    await t.test(company.id, () => {
      assert.ok(company.logoPath, `${company.id} should declare logoPath`);
      assert.match(company.logoPath, /^assets\/logos\/[a-z0-9-]+\.svg(?:\?v=[a-z0-9-]+)?$/);
      assert.match(company.logoPath, /\?v=(?:20260629-visible-area-v4|20260717-brand-colors-v5)$/);
      assert.match(company.logoColor, /^#[0-9a-f]{6}$/i, `${company.id} should declare an audited light-theme brand color`);

      const assetPath = company.logoPath.split("?")[0];
      const svg = fs.readFileSync(path.join(__dirname, "..", assetPath), "utf8");
      assert.match(svg, /<svg\b/);
      assert.doesNotMatch(svg, /^\s+<\?xml/);
      const viewBox = parseViewBox(svg, company.id);
      assert.doesNotMatch(svg, /preserveAspectRatio="none"/);

      for (const pathTag of svg.match(/<path\b[^>]*>/gi) ?? []) {
        assert.equal(hasFullCanvasPath(pathTag, viewBox), false, `${company.id} logo should not include a full-canvas path`);
        assert.equal(hasStandaloneBoxPath(pathTag), false, `${company.id} logo should not include a standalone box path`);
      }

      for (const rectTag of svg.match(/<rect\b[^>]*>/gi) ?? []) {
        assert.equal(hasFullCanvasRect(rectTag, viewBox), false, `${company.id} logo should not include a full-canvas rect`);
      }
    });
  }
});

test("light mode preserves every audited original-color logo palette", () => {
  const expectedPalettes = {
    alphabet: ["#34a853", "#4285f4", "#ea4335", "#fbbc05"],
    microsoft: ["#00a4ef", "#737373", "#7fba00", "#f25022", "#ffb900"],
    amazon: ["#221f1f", "#ff9900"],
    walmart: ["#0071ce", "#ffc220"],
    mastercard: ["#eb001b", "#f79e1b", "#ff5f00"],
    costco: ["#005daa", "#e31837"],
    bankofamerica: ["#012169", "#e31837"],
    caterpillar: ["#000000", "#ffcd11"],
    chevron: ["#0054a6", "#e21836"],
    cloudflare: ["#f48120", "#faad3d"],
    adobe: ["#eb1000"],
  };
  const companies = getCompanyEntries();
  const preservedIds = companies
    .filter((company) => company.preserveLightLogoColors)
    .map((company) => company.id)
    .sort();

  assert.deepEqual(preservedIds, Object.keys(expectedPalettes).sort());

  for (const company of companies.filter((item) => item.preserveLightLogoColors)) {
    const assetPath = company.logoPath.split("?")[0];
    const svg = fs.readFileSync(path.join(__dirname, "..", assetPath), "utf8");
    const actualPalette = [...new Set(
      [...svg.matchAll(/#[0-9a-f]{6}/gi)].map((match) => match[0].toLowerCase()),
    )].sort();

    assert.deepEqual(actualPalette, expectedPalettes[company.id], `${company.id} should retain its audited original palette`);
  }
});

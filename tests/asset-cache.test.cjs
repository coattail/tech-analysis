const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

test("cache-busts the stylesheet after sidebar layout fixes", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

  assert.match(html, /style\.css\?v=20260629-semiconductor-panel/);
});

test("keeps the latest cache key for unchanged company-selection behavior", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const expectedVersion = "20260629-contiguous-range";

  for (const asset of ["company-selection.js"]) {
    assert.match(
      html,
      new RegExp(`${asset.replace(".", "\\.")}\\?v=${expectedVersion}`),
      `${asset} should use the latest cache-busting version`,
    );
  }

  assert.doesNotMatch(html, /v=20260519-generate-applies/);
  assert.doesNotMatch(html, /v=20260519-nvidia-default/);
  assert.doesNotMatch(html, /v=20260519-switch-refresh/);
  assert.doesNotMatch(html, /v=20260519-rebuild-chart/);
  assert.doesNotMatch(html, /v=20260521-tooltip-metric-scope/);
  assert.doesNotMatch(html, /v=20260604-bar-spacing/);
  assert.doesNotMatch(html, /v=20260604-date-axis"/);
  assert.doesNotMatch(html, /v=20260604-date-axis-center/);
  assert.doesNotMatch(html, /v=20260604-report-date-axis"/);
  assert.doesNotMatch(html, /v=20260604-report-date-axis-tight-padding/);
  assert.doesNotMatch(html, /v=20260604-near-bar-tooltips/);
  assert.doesNotMatch(html, /v=20260604-uniform-quarter-bars/);
  assert.doesNotMatch(html, /v=20260604-tooltip-caret-target/);
  assert.doesNotMatch(html, /v=20260604-bar-priority-tooltip/);
  assert.doesNotMatch(html, /v=20260605-tooltip-smart-bar-anchor/);
});

test("cache-busts generated datasets after completing historical coverage", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const expectedVersion = "20260629-nebius-cutoff";

  for (const asset of ["data.js", "price-data.js"]) {
    assert.match(
      html,
      new RegExp(`${asset.replace(".", "\\.")}\\?v=${expectedVersion}`),
      `${asset} should use the full-history cache version`,
    );
  }
});

test("cache-busts chart scripts after normalizing visible logo area", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

  for (const [asset, expectedVersion] of [
    ["price-comparison.js", "20260628-unified-zero-axis"],
    ["logo-layout.js", "20260629-visible-area"],
    ["script.js", "20260629-semiconductor-panel"],
  ]) {
    assert.match(
      html,
      new RegExp(`${asset.replace(".", "\\.")}\\?v=${expectedVersion}`),
      `${asset} should use the latest chart cache version`,
    );
  }
});

test("publishes every local script referenced by the page", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const workflow = fs.readFileSync(path.join(__dirname, "..", ".github/workflows/pages.yml"), "utf8");
  const localScripts = [...html.matchAll(/<script defer src="([^":]+?\.js)\?v=/g)]
    .map((match) => match[1])
    .filter((asset) => !asset.startsWith("http"));

  for (const script of localScripts) {
    assert.match(
      workflow,
      new RegExp(`\\b${script.replace(".", "\\.")}\\b`),
      `${script} should be copied into the Pages artifact`,
    );
  }
});

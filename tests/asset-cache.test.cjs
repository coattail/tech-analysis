const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

test("cache-busts the stylesheet after sidebar layout fixes", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

  assert.match(html, /style\.css\?v=20260620-sidebar-actions/);
});

test("keeps the latest cache key for unchanged company-selection behavior", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const expectedVersion = "20260605-tooltip-near-target-bar";

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

test("cache-busts generated datasets after expanding coverage", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const expectedVersion = "20260628-add-enterprise-cloud";

  for (const asset of ["data.js", "price-data.js"]) {
    assert.match(
      html,
      new RegExp(`${asset.replace(".", "\\.")}\\?v=${expectedVersion}`),
      `${asset} should use the expanded-coverage cache version`,
    );
  }
});

test("cache-busts the chart script after stabilizing price-comparison quarter slots", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const expectedVersion = "20260628-stable-price-slots";

  for (const asset of ["script.js"]) {
    assert.match(
      html,
      new RegExp(`${asset.replace(".", "\\.")}\\?v=${expectedVersion}`),
      `${asset} should use the stable price-comparison cache version`,
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

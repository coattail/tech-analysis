const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

test("cache-busts local assets that changed chart baseline behavior", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const expectedVersion = "20260521-nvidia-q1-fy2027";

  for (const asset of ["data.js", "price-comparison.js", "company-selection.js", "script.js"]) {
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

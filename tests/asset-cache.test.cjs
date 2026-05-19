const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

test("cache-busts local assets that changed the default chart and switching behavior", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const expectedVersion = "20260519-switch-refresh";

  for (const asset of ["data.js", "price-comparison.js", "company-selection.js", "script.js"]) {
    assert.match(
      html,
      new RegExp(`${asset.replace(".", "\\.")}\\?v=${expectedVersion}`),
      `${asset} should use the latest cache-busting version`,
    );
  }

  assert.doesNotMatch(html, /v=20260519-generate-applies/);
  assert.doesNotMatch(html, /v=20260519-nvidia-default/);
});

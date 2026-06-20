const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

test("allows the company toggle list to shrink inside the sticky sidebar", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");
  const toggleListRule = css.match(/\.toggle-list\s*\{[^}]+\}/)?.[0] ?? "";

  assert.match(
    toggleListRule,
    /min-height:\s*0\s*;/,
    "the company list must not force a fixed minimum height that can overlap sidebar actions",
  );
});

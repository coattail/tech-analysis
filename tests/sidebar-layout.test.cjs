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

test("uses a two-by-two category grid with one company column per card", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");
  const contentRule = css.match(/\.content-panel\s*\{[^}]+\}/)?.[0] ?? "";
  const toggleListRule = css.match(/\.toggle-list\s*\{[^}]+\}/)?.[0] ?? "";
  const categoryListRule = css.match(/\.company-category-list\s*\{[^}]+\}/)?.[0] ?? "";

  assert.match(contentRule, /grid-template-columns:\s*minmax\(440px, 500px\)/);
  assert.match(toggleListRule, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(categoryListRule, /grid-template-columns:\s*1fr/);
});

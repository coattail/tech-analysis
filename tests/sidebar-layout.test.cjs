const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

test("allows the company toggle list to shrink inside the sidebar", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");
  const toggleListRule = css.match(/\.toggle-list\s*\{[^}]+\}/)?.[0] ?? "";

  assert.match(
    toggleListRule,
    /min-height:\s*0\s*;/,
    "the company list must not force a fixed minimum height that can overlap sidebar actions",
  );
  assert.match(toggleListRule, /overflow-x:\s*hidden/);
});

test("stretches the desktop company sidebar to the chart panel bottom", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");
  const desktopRule = css.match(/@media \(min-width:\s*981px\) \{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.match(desktopRule, /\.control-panel\s*\{[^}]*position:\s*relative/);
  assert.match(desktopRule, /align-self:\s*stretch/);
  assert.match(desktopRule, /height:\s*100%/);
  assert.match(desktopRule, /max-height:\s*none/);
  assert.match(desktopRule, /overflow:\s*hidden/);
});

test("narrows the sidebar and uses two company columns in every category", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");
  const contentRule = css.match(/\.content-panel\s*\{[^}]+\}/)?.[0] ?? "";
  const toggleListRule = css.match(/\.toggle-list\s*\{[^}]+\}/)?.[0] ?? "";
  const categoryListRule = css.match(/\.company-category-list\s*\{[^}]+\}/)?.[0] ?? "";
  const otherCardRule = css.match(/\.company-category-card\[data-category="other"\]\s*\{[^}]+\}/)?.[0] ?? "";
  const otherListRule = css.match(/\.company-category-card\[data-category="other"\]\s+\.company-category-list\s*\{[^}]+\}/)?.[0] ?? "";

  assert.match(contentRule, /grid-template-columns:\s*minmax\(330px, 375px\)/);
  assert.match(toggleListRule, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(categoryListRule, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(otherCardRule, /grid-column:\s*1 \/ -1/);
  assert.match(otherListRule, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
});

test("stacks category cards when the narrowed sidebar cannot fit two columns", () => {
  const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");

  assert.match(css, /\.company-control-group\s*\{[^}]*container-type:\s*inline-size/);
  assert.match(css, /@container\s*\(max-width:\s*560px\)\s*\{[\s\S]*?\.toggle-list\s*\{[^}]*grid-template-columns:\s*1fr/);
  assert.match(css, /\.toggle-item\s*\{[^}]*min-width:\s*0[^}]*overflow:\s*hidden/);
  assert.match(css, /\.toggle-item\s*\{[^}]*grid-template-columns:\s*auto 36px minmax\(0, 1fr\)/);
  assert.match(css, /\.company-option-logo--symbol[\s\S]*?width:\s*24px;[\s\S]*?height:\s*18px;/);
  assert.match(css, /\.company-option-logo--wide-symbol[\s\S]*?width:\s*30px;[\s\S]*?height:\s*18px;/);
  assert.match(css, /\.toggle-item \.company-option-name\s*\{[^}]*font-size:\s*clamp\(/);
  assert.match(css, /\.toggle-item small\s*\{[^}]*font:\s*600 clamp\(/);
});

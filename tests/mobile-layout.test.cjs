const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");
const stackedCss = css.match(/@media \(max-width: 980px\) \{([\s\S]*?)\n\}\n\n@media \(max-width: 700px\)/)?.[1] ?? "";
const mobileCss = css.match(/@media \(max-width: 700px\) \{([\s\S]*?)\n\}\n\n@media \(max-width: 380px\)/)?.[1] ?? "";

test("uses safe-area aware mobile viewport and page spacing", () => {
  assert.match(html, /viewport-fit=cover/);
  assert.match(mobileCss, /padding-top:\s*env\(safe-area-inset-top/);
  assert.match(mobileCss, /\.layout\s*\{[^}]*width:\s*100%[^}]*padding:\s*10px 8px 18px/);
});

test("keeps the mobile company picker in normal flow without action overlap", () => {
  assert.match(stackedCss, /\.company-control-group\s*\{[^}]*flex:\s*none/);
  assert.match(stackedCss, /\.toggle-list\s*\{[^}]*flex:\s*0 0 auto[^}]*max-height:\s*min\(52svh, 520px\)[^}]*overflow-y:\s*auto/);
  assert.match(mobileCss, /\.company-control-group\s*\{[^}]*flex:\s*none/);
  assert.match(mobileCss, /\.toggle-list\s*\{[^}]*flex:\s*0 0 auto[^}]*max-height:\s*min\(52svh, 520px\)[^}]*overflow-y:\s*auto/);
  assert.match(mobileCss, /\.control-actions\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
});

test("uses compact mobile controls and a bounded chart canvas", () => {
  assert.match(mobileCss, /\.chart-side-tools\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(mobileCss, /\.chart-summary\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(mobileCss, /\.metric-toolbar\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(mobileCss, /\.chart-wrap\s*\{[^}]*height:\s*clamp\(390px, 118vw, 510px\)/);
});

const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");
const landscapeTabletCss = css.match(/@media \(min-width: 981px\) and \(max-width: 1100px\) \{([\s\S]*?)\n\}\n\n@media \(min-width: 701px\)/)?.[1] ?? "";
const portraitTabletCss = css.match(/@media \(min-width: 701px\) and \(max-width: 980px\) \{([\s\S]*?)\n\}\n\n@media \(max-width: 980px\)/)?.[1] ?? "";
const stackedCss = css.match(/@media \(max-width: 980px\) \{([\s\S]*?)\n\}\n\n@media \(max-width: 700px\)/)?.[1] ?? "";
const mobileCss = css.match(/@media \(max-width: 700px\) \{([\s\S]*?)\n\}\n\n@media \(max-width: 380px\)/)?.[1] ?? "";
const narrowMobileCss = css.match(/@media \(max-width: 380px\) \{([\s\S]*?)\n\}\n\n@media \(hover: none\)/)?.[1] ?? "";

test("uses safe-area aware mobile viewport and page spacing", () => {
  assert.match(html, /viewport-fit=cover/);
  assert.match(mobileCss, /padding-top:\s*env\(safe-area-inset-top/);
  assert.match(mobileCss, /\.layout\s*\{[^}]*width:\s*100%[^}]*padding:\s*10px 8px 18px/);
});

test("keeps the mobile company picker in normal flow without action overlap", () => {
  assert.match(stackedCss, /\.company-control-group\s*\{[^}]*flex:\s*none/);
  assert.match(stackedCss, /\.toggle-list\s*\{[^}]*flex:\s*0 0 auto[^}]*max-height:\s*min\(52svh, 520px\)[^}]*overflow-y:\s*auto/);
  assert.match(mobileCss, /\.company-control-group\s*\{[^}]*flex:\s*none/);
  assert.match(mobileCss, /\.toggle-list\s*\{[^}]*flex:\s*0 0 auto[^}]*max-height:\s*min\(38svh, 380px\)[^}]*overflow-y:\s*auto/);
  assert.match(mobileCss, /\.control-actions\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
});

test("uses compact mobile controls and a bounded chart canvas", () => {
  assert.match(mobileCss, /\.chart-side-tools\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(mobileCss, /\.chart-summary\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(mobileCss, /\.metric-toolbar\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(mobileCss, /\.chart-wrap\s*\{[^}]*height:\s*clamp\(390px, 118vw, 510px\)/);
});

test("keeps landscape tablet columns inside the available width", () => {
  assert.match(landscapeTabletCss, /\.content-panel\s*\{[^}]*grid-template-columns:\s*minmax\(286px, 310px\) minmax\(0, 1fr\)/);
  assert.match(landscapeTabletCss, /\.chart-head\s*\{[^}]*flex-direction:\s*column/);
  assert.match(landscapeTabletCss, /\.metric-toolbar\s*\{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/);
});

test("uses the tablet width to place settings beside the company picker", () => {
  assert.match(portraitTabletCss, /\.control-panel\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*minmax\(200px, 0\.55fr\) minmax\(0, 1\.45fr\)/);
  assert.match(portraitTabletCss, /grid-template-rows:\s*auto auto 1fr/);
  assert.match(portraitTabletCss, /grid-template-areas:[^;]*"header company"[^;]*"frequency company"[^;]*"foot company"/);
  assert.match(portraitTabletCss, /\.company-control-group\s*\{[^}]*grid-area:\s*company/);
});

test("uses touch-friendly controls and a shorter mobile company list", () => {
  assert.match(stackedCss, /\.frequency-switch \.segment-item span,[\s\S]*?\.company-search input\s*\{[^}]*min-height:\s*44px/);
  assert.match(mobileCss, /\.frequency-switch\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(mobileCss, /\.toggle-list\s*\{[^}]*max-height:\s*min\(38svh, 380px\)/);
});

test("keeps English mobile controls readable on narrow screens", () => {
  assert.match(mobileCss, /\.frequency-switch \.segment-item span,[\s\S]*?\.chart-actions button\s*\{[^}]*overflow-wrap:\s*anywhere[^}]*white-space:\s*normal/);
  assert.match(narrowMobileCss, /\.frequency-switch\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(narrowMobileCss, /\.frequency-switch \.segment-item:last-child\s*\{[^}]*grid-column:\s*1 \/ -1/);
});

test("uses touch-safe chart controls and honors reduced-motion preferences", () => {
  assert.match(css, /@media \(hover: none\) and \(pointer: coarse\) \{[\s\S]*?\.range-sliders input\[type="range"\]\s*\{[^}]*touch-action:\s*pan-y/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?transition-duration:\s*0\.01ms !important/);
});

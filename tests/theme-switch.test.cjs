const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const script = fs.readFileSync(path.join(__dirname, "..", "script.js"), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "style.css"), "utf8");

test("starts every visit in dark mode and provides an accessible theme switch", () => {
  assert.match(html, /id="themeToggle"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /<html lang="zh-CN" data-theme="deep">/);
  assert.match(html, /<body data-theme="deep">/);
  assert.match(script, /function initTheme\(\)\s*\{\s*setTheme\("deep", \{ refresh: false \}\);\s*\}/);
  assert.doesNotMatch(html, /localStorage\.getItem\("tech-analysis-theme"\)/);
  assert.doesNotMatch(script, /localStorage\.setItem\("tech-analysis-theme"/);
  assert.match(script, /setTheme\(getActiveTheme\(\) === "light" \? "deep" : "light"\)/);
  assert.match(script, /themeToggleEl\.setAttribute\("aria-label", nextThemeLabel\)/);
  assert.match(css, /\.chart-actions #downloadBtn\s*\{[^}]*grid-column:\s*1 \/ -1/);
});

test("defines a complete light palette for the page and chart", () => {
  assert.match(css, /html\[data-theme="light"\] body/);
  assert.match(css, /--chart-axis-color:\s*#43566f/);
  assert.match(css, /--chart-tooltip-bg:\s*rgba\(255, 255, 255, 0\.98\)/);
  assert.match(css, /--chart-wrap-bg:\s*#ffffff/);
  assert.match(css, /--chart-logo-color:\s*#000000/);
  assert.match(css, /--chart-overlay-color:\s*#000000/);
  assert.match(css, /--chart-export-bg:\s*#ffffff/);
  assert.match(css, /data-theme="light"[^}]*body[^}]*\) \.chart-wrap::before\s*\{[^}]*background:\s*none/);
  assert.match(css, /data-theme="light"[^}]*body[^}]*\) \.chart-wrap::after\s*\{[^}]*background:\s*none/);
  assert.match(css, /\.chart-panel\s*\{/);
  assert.match(css, /\.control-panel\s*\{/);
  assert.match(css, /\.chart-wrap\s*\{/);
});

test("adapts chart series and overlays for a light background", () => {
  assert.match(script, /tuneSeriesColorForLightTheme/);
  assert.match(script, /getRelativeLuminance/);
  assert.match(script, /getSeriesColor\(company\)/);
  assert.match(script, /id: "apple"[^\n]*color: "#4b5563"[^\n]*deepColor: "#7b8490"/);
  assert.match(script, /company\.deepColor \|\| company\.color/);
  assert.match(script, /borderColor: seriesColor/);
  assert.match(script, /backgroundColor: seriesColor/);
  assert.match(script, /overlayColor:\s*css\.getPropertyValue\("--chart-overlay-color"\)/);
  assert.match(script, /watermarkColor:\s*css\.getPropertyValue\("--chart-watermark-color"\)/);
  assert.match(script, /getPropertyValue\("--chart-export-bg"\)/);
  assert.match(script, /const logoColor = isLightTheme[\s\S]*?company\.logoColor \|\| getChartThemeTokens\(\)\.logoColor/);
  assert.match(script, /const useOriginalLogoColors = company\.preserveLogoColors\s*\|\| \(isLightTheme && !company\.logoIsMask\)/);
  assert.match(script, /useOriginalLogoColors[\s\S]*?drawOriginalLogo/);
  assert.match(script, /useOriginalLogoColors[\s\S]*?drawMonochromeLogo/);
  assert.match(script, /id: "nvidia"[^\n]*logoIsMask: true, logoColor: "#76b900"/);
});

test("picker keeps asset colors in light mode unless its own asset is a mask", () => {
  assert.match(script, /const optionLogoIsMask = company\.optionLogoPath \? company\.optionLogoIsMask : company\.logoIsMask/);
  assert.match(script, /if \(preserveOptionLogoColors \|\| !optionLogoIsMask\) \{/);
  assert.match(script, /logo\.classList\.toggle\("preserve-light-logo-colors", !preserveOptionLogoColors\)/);
  assert.match(css, /data-theme="light"[^{}]* \.company-option-logo\.preserve-light-logo-colors \.company-option-logo-mark\s*\{\s*display: none/);
  assert.match(css, /data-theme="light"[^{}]* \.company-option-logo\.preserve-light-logo-colors img\s*\{\s*display: block/);
});

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("loads the chart runtime from deployed assets before the application", () => {
  const scripts = [...html.matchAll(/<script\b([^>]*)\bsrc="([^"]+)"[^>]*>/g)];
  const chartIndex = scripts.findIndex(([, , src]) => src.includes("chart.umd"));
  const appIndex = scripts.findIndex(([, , src]) => /^script\.js(?:\?|$)/.test(src));
  assert.ok(chartIndex >= 0 && appIndex > chartIndex);
  assert.match(scripts[chartIndex][1], /\bdefer\b/);
  assert.match(scripts[appIndex][1], /\bdefer\b/);

  const src = scripts[chartIndex][2];
  assert.match(src, /^assets\//);
  assert.ok(fs.existsSync(path.join(root, src)));
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/pages.yml"), "utf8");
  assert.match(workflow, /cp -R assets _site\//);
});

test("the bundled browser runtime provides the existing chart and tooltip APIs", () => {
  const context = vm.createContext({});
  const src = scriptsChartSource();
  vm.runInContext(fs.readFileSync(path.join(root, src), "utf8"), context);
  assert.equal(typeof context.Chart, "function");
  assert.equal(context.Chart.version, "4.4.1");
  assert.ok(context.Chart.registry.getController("bar"));
  assert.ok(context.Chart.registry.getController("line"));
  assert.equal(typeof context.Chart.Interaction.modes.nearest, "function");
  assert.equal(typeof context.Chart.Tooltip.positioners.nearest, "function");
  assert.match(fs.readFileSync(path.join(root, path.dirname(src), "LICENSE.md"), "utf8"), /MIT License/);
});

function scriptsChartSource() {
  return [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*>/g)]
    .map((match) => match[1])
    .find((src) => src.includes("chart.umd"));
}

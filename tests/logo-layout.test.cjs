const test = require("node:test");
const assert = require("node:assert/strict");
const { calculateVisibleLogoLayout } = require("../logo-layout.js");

test("matches the visible area of the current Nvidia logo", () => {
  const layout = calculateVisibleLogoLayout({
    sourceWidth: 24,
    sourceHeight: 24,
    bounds: { x: 0, y: 0, width: 24, height: 24 },
    targetVisibleArea: 62 * 62,
    maxVisibleWidth: 170,
    maxVisibleHeight: 62,
  });

  assert.ok(Math.abs(layout.visibleWidth - 62) < 0.001);
  assert.ok(Math.abs(layout.visibleHeight - 62) < 0.001);
});

test("ignores transparent padding when normalizing logo area", () => {
  const layout = calculateVisibleLogoLayout({
    sourceWidth: 200,
    sourceHeight: 100,
    bounds: { x: 60, y: 40, width: 80, height: 20 },
    targetVisibleArea: 62 * 62,
    maxVisibleWidth: 170,
    maxVisibleHeight: 62,
  });

  assert.ok(Math.abs(layout.visibleWidth * layout.visibleHeight - 62 * 62) < 0.001);
  assert.ok(layout.offsetX < 0);
  assert.ok(layout.offsetY < 0);
});

test("caps unusually wide visible marks without changing their aspect ratio", () => {
  const layout = calculateVisibleLogoLayout({
    sourceWidth: 240,
    sourceHeight: 20,
    bounds: { x: 0, y: 0, width: 240, height: 20 },
    targetVisibleArea: 62 * 62,
    maxVisibleWidth: 170,
    maxVisibleHeight: 62,
  });

  assert.equal(layout.visibleWidth, 170);
  assert.ok(Math.abs(layout.visibleWidth / layout.visibleHeight - 12) < 0.001);
});

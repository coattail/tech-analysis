(function initLogoLayoutUtils(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.LogoLayoutUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createLogoLayoutUtils() {
  function positiveNumber(value, fallback) {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function calculateVisibleLogoLayout({
    sourceWidth,
    sourceHeight,
    bounds,
    targetVisibleArea,
    maxVisibleWidth = Infinity,
    maxVisibleHeight = Infinity,
  }) {
    const safeSourceWidth = positiveNumber(sourceWidth, 1);
    const safeSourceHeight = positiveNumber(sourceHeight, 1);
    const safeBounds = {
      x: Number.isFinite(bounds?.x) ? bounds.x : 0,
      y: Number.isFinite(bounds?.y) ? bounds.y : 0,
      width: positiveNumber(bounds?.width, safeSourceWidth),
      height: positiveNumber(bounds?.height, safeSourceHeight),
    };
    const safeArea = positiveNumber(targetVisibleArea, 1);

    let scale = Math.sqrt(safeArea / (safeBounds.width * safeBounds.height));
    const visibleWidth = safeBounds.width * scale;
    const visibleHeight = safeBounds.height * scale;
    scale *= Math.min(
      1,
      positiveNumber(maxVisibleWidth, Infinity) / visibleWidth,
      positiveNumber(maxVisibleHeight, Infinity) / visibleHeight,
    );

    return {
      drawWidth: safeSourceWidth * scale,
      drawHeight: safeSourceHeight * scale,
      visibleWidth: safeBounds.width * scale,
      visibleHeight: safeBounds.height * scale,
      offsetX: -safeBounds.x * scale,
      offsetY: -(safeBounds.y + safeBounds.height / 2) * scale,
      scale,
    };
  }

  return { calculateVisibleLogoLayout };
});

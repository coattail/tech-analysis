(function attachSeriesColors(globalScope) {
  const FIXED_COMPANY_IDS = new Set([
    "nvidia",
    "alphabet",
    "apple",
    "microsoft",
    "amazon",
    "meta",
    "tsla",
  ]);

  // Blue-orange is the primary comparison pair because it stays distinguishable
  // across the common red-green color-vision deficiencies. Remaining colors are
  // assigned greedily for focused views containing three to eight companies.
  const ACCESSIBLE_COMPARISON_PALETTE = [
    "#4db6ff",
    "#ffb000",
    "#a78bfa",
    "#2dd4bf",
    "#ff6b8a",
    "#84cc16",
    "#f97316",
    "#e879f9",
  ];
  const MAX_DYNAMIC_COMPANIES = ACCESSIBLE_COMPARISON_PALETTE.length;

  function parseHexColor(hexColor) {
    const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hexColor ?? "");
    if (!match) return null;
    return match.slice(1).map((part) => Number.parseInt(part, 16) / 255);
  }

  function rgbToOklab(hexColor) {
    const rgb = parseHexColor(hexColor);
    if (!rgb) return null;
    const [red, green, blue] = rgb.map((channel) => (
      channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4
    ));
    const l = 0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue;
    const m = 0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue;
    const s = 0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue;
    const lRoot = Math.cbrt(l);
    const mRoot = Math.cbrt(m);
    const sRoot = Math.cbrt(s);
    return [
      0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot,
      1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot,
      0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot,
    ];
  }

  function perceptualColorDistance(leftColor, rightColor) {
    const left = rgbToOklab(leftColor);
    const right = rgbToOklab(rightColor);
    if (!left || !right) return 0;
    return Math.hypot(
      left[0] - right[0],
      left[1] - right[1],
      left[2] - right[2],
    );
  }

  function chooseMostDistinctColor(assignedColors, usedColors) {
    const available = ACCESSIBLE_COMPARISON_PALETTE.filter((color) => !usedColors.has(color));
    if (available.length === 0) return null;
    if (assignedColors.length === 0) return available[0];

    return available
      .map((color, paletteIndex) => ({
        color,
        paletteIndex,
        distance: Math.min(...assignedColors.map((assigned) => (
          perceptualColorDistance(color, assigned)
        ))),
      }))
      .sort((left, right) => (
        right.distance - left.distance || left.paletteIndex - right.paletteIndex
      ))[0].color;
  }

  function resolveSeriesColors(companies, options = {}) {
    const entries = Array.isArray(companies)
      ? companies.filter((company) => company?.id && parseHexColor(company.brandColor))
      : [];
    const fixedIds = options.fixedIds instanceof Set ? options.fixedIds : FIXED_COMPANY_IDS;
    const colors = Object.fromEntries(entries.map((company) => [company.id, company.brandColor]));

    // Single-series identity and dense-chart stability matter more than dynamic
    // separation. Focused views are where adaptive color selection adds value.
    if (entries.length <= 1 || entries.length > MAX_DYNAMIC_COMPANIES) return colors;

    const assignedColors = [];
    const usedColors = new Set();
    entries.forEach((company) => {
      if (!fixedIds.has(company.id)) return;
      assignedColors.push(company.brandColor);
      usedColors.add(company.brandColor.toLowerCase());
    });

    const dynamicEntries = entries.filter((company) => !fixedIds.has(company.id));
    if (entries.length === 2 && dynamicEntries.length === 2) {
      colors[dynamicEntries[0].id] = ACCESSIBLE_COMPARISON_PALETTE[0];
      colors[dynamicEntries[1].id] = ACCESSIBLE_COMPARISON_PALETTE[1];
      return colors;
    }

    dynamicEntries.forEach((company) => {
      const color = chooseMostDistinctColor(assignedColors, usedColors) || company.brandColor;
      colors[company.id] = color;
      assignedColors.push(color);
      usedColors.add(color.toLowerCase());
    });

    return colors;
  }

  const api = {
    ACCESSIBLE_COMPARISON_PALETTE,
    FIXED_COMPANY_IDS,
    perceptualColorDistance,
    resolveSeriesColors,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  globalScope.SeriesColorUtils = api;
})(typeof window !== "undefined" ? window : globalThis);

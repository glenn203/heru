// OKLCH → sRGB conversion and WCAG contrast. Zero dependencies.
// Shared by the token build (hex fallbacks) and the token tests (contrast).

/** Parse "oklch(L C H)" (L as 0–1). */
export function parseOklch(str) {
  const m =
    /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)$/.exec(
      str,
    );
  if (!m) throw new Error(`Not an oklch() value: ${str}`);
  return m.slice(1, 4).map(Number);
}

/** OKLCH → linear sRGB (unclamped). */
function toLinearRgb([L, C, H]) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const clamp = (x) => Math.min(1, Math.max(0, x));
const encode = (x) =>
  x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;

/** Is the colour inside the sRGB gamut (small tolerance)? */
export const inSrgb = (str) =>
  toLinearRgb(parseOklch(str)).every((c) => c >= -1e-4 && c <= 1 + 1e-4);

const alphaHex = (str) => {
  const a = /\/\s*([\d.]+)/.exec(str);
  return a
    ? Math.round(Number(a[1]) * 255)
        .toString(16)
        .padStart(2, '0')
    : '';
};

/** sRGB hex (#rrggbb, or #rrggbbaa with alpha) (clipped to gamut). */
export function oklchToHex(str) {
  return (
    '#' +
    toLinearRgb(parseOklch(str))
      .map((c) =>
        Math.round(clamp(encode(clamp(c))) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('') +
    alphaHex(str)
  );
}

/** WCAG 2 relative luminance of the gamut-clipped colour. */
export function luminance(str) {
  const [r, g, b] = toLinearRgb(parseOklch(str)).map(clamp);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

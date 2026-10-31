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

/** OKLCH → linear sRGB (unclamped; components outside 0..1 are wide-gamut). */
export function toLinearRgb([L, C, H]) {
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

const EPS = 1e-4;
const inUnit = (rgb) => rgb.every((c) => c >= -EPS && c <= 1 + EPS);

/** Linear sRGB to linear Display P3 (both D65). */
const toLinearP3 = ([r, g, b]) => [
  0.8224621 * r + 0.177538 * g,
  0.0331941 * r + 0.9668058 * g,
  0.0170827 * r + 0.0723974 * g + 0.9105199 * b,
];

/** Is the colour inside the sRGB gamut (small tolerance)? */
export const inSrgb = (str) => inUnit(toLinearRgb(parseOklch(str)));

/** Is the colour inside the Display P3 gamut (small tolerance)? */
export const inP3 = (str) => inUnit(toLinearP3(toLinearRgb(parseOklch(str))));

const fmt = (n) => String(Number(n.toFixed(4)));
const alphaPart = (str) => {
  const a = /\/\s*([\d.]+)/.exec(str);
  return a ? ` / ${a[1]}` : '';
};

/**
 * Map an oklch() colour into a gamut by lowering chroma at constant lightness
 * and hue (the CSS Color 4 approach, without the final clip step). Colours
 * already inside the gamut are returned unchanged.
 */
export function mapToGamut(str, gamut = 'srgb') {
  const test = gamut === 'p3' ? inP3 : inSrgb;
  if (test(str)) return str;
  const [L, C, H] = parseOklch(str);
  let [lo, hi] = [0, C];
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (test(`oklch(${L} ${mid} ${H})`)) lo = mid;
    else hi = mid;
  }
  return `oklch(${fmt(L)} ${fmt(Math.floor(lo * 1e4) / 1e4)} ${fmt(H)}${alphaPart(str)})`;
}

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
    toLinearRgb(parseOklch(mapToGamut(str)))
      .map((c) =>
        Math.round(clamp(encode(clamp(c))) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('') +
    alphaHex(str)
  );
}

/**
 * WCAG 2 relative luminance of the colour as an sRGB screen shows it (the
 * gamut-mapped value, which is also what the hex fallback encodes).
 */
export function luminance(str) {
  const [r, g, b] = toLinearRgb(parseOklch(mapToGamut(str))).map(clamp);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Luminance (Y) of the colour exactly as written, with no gamut mapping. For a
 * Display P3 colour this is what a wide-gamut screen emits. Linear sRGB
 * components outside 0..1 still describe the same XYZ, so the weights hold.
 */
export function luminanceP3(str) {
  const [r, g, b] = toLinearRgb(parseOklch(str));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const ratio = (p, q) => {
  const [x, y] = [p, q].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

/** WCAG 2 contrast on an sRGB screen (gamut-mapped values / hex fallback). */
export function contrast(a, b) {
  return ratio(luminance(a), luminance(b));
}

/** WCAG 2 contrast on a Display P3 screen (colours as written). */
export function contrastP3(a, b) {
  return ratio(luminanceP3(a), luminanceP3(b));
}

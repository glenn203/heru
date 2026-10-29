// Node test: run with `node --test test/tokens.test.mjs`
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const resolved = JSON.parse(
  readFileSync(
    new URL('../tokens/prism.tokens.resolved.json', import.meta.url),
    'utf8',
  ),
);
// Off the 4px grid by design: hairlines, the focus ring, and the odd radius ramp.
const OFF_GRID = new Set([
  'border.width',
  'focus.ring-width',
  'focus.ring-offset',
  'focus.ring-blur',
  'focus.halo-width',
]);

for (const [mode, tokens] of Object.entries(resolved.modes)) {
  test(`${mode}: every dimension is a multiple of 4px`, () => {
    for (const [key, t] of Object.entries(tokens)) {
      if (t.type !== 'dimension' || OFF_GRID.has(key)) continue;
      if (key.startsWith('radius.')) continue;
      if (key.startsWith('font.size') || key.endsWith('font-size')) continue; // font sizes are 2px-steps by design
      assert.equal(t.value % 4, 0, `${key} = ${t.value}px in ${mode}`);
    }
  });
  test(`${mode}: small controls meet the 24px WCAG 2.2 target size`, () => {
    assert.ok(tokens['control.height.sm'].value >= 24);
  });
}

test('control.height.md is 24/36/48 across compact/default/comfortable', () => {
  assert.deepEqual(
    ['compact', 'default', 'comfortable'].map(
      (m) => resolved.modes[m]['control.height.md'].value,
    ),
    [24, 36, 48],
  );
});

test('control.height.sm is 24/32/40 across compact/default/comfortable', () => {
  assert.deepEqual(
    ['compact', 'default', 'comfortable'].map(
      (m) => resolved.modes[m]['control.height.sm'].value,
    ),
    [24, 32, 40],
  );
});

// ---------- Color ----------
const { contrast, inSrgb } = await import('../scripts/oklch.mjs');
const color = (k) => resolved.modes.default[`color.${k}`].value;
const pairs = [
  ['text', 'bg', 4.5],
  ['text', 'surface', 4.5],
  ['text-muted', 'bg', 4.5],
  ['text-muted', 'surface', 4.5],
  ['on-accent', 'accent', 4.5],
  ['on-accent', 'accent-hover', 4.5],
  ['on-accent', 'accent-active', 4.5],
  ['error-text', 'bg', 4.5],
  ['border-strong', 'bg', 3],
  ['focus-ring', 'bg', 3],
  ['error', 'bg', 3],
  ['border-strong', 'bg', 3], // outline button border (non-text)
  ['border-strong', 'surface', 3], // interactive card edge on a surface page (M2)
  ['text', 'surface', 4.5], // borderless card text
];
for (const [fg, bg, min] of pairs) {
  test(`contrast: color-${fg} on color-${bg} >= ${min}:1`, () => {
    const ratio = contrast(color(fg), color(bg));
    assert.ok(ratio >= min, `${ratio.toFixed(2)}:1`);
  });
}

test('every color is inside the sRGB gamut and has a hex fallback', () => {
  for (const [key, t] of Object.entries(resolved.modes.default)) {
    if (t.type !== 'color') continue;
    assert.ok(inSrgb(t.value), `${key} ${t.value} is out of sRGB`);
    assert.match(t.hex, /^#[0-9a-f]{6}([0-9a-f]{2})?$/);
  }
});

test('radius ramp is odd px (plus none and full)', () => {
  for (const [key, t] of Object.entries(resolved.modes.default)) {
    if (
      !key.startsWith('radius.') ||
      key === 'radius.none' ||
      key === 'radius.full'
    )
      continue;
    assert.equal(t.value % 2, 1, `${key} = ${t.value}`);
    assert.equal(key, `radius.${t.value}`, 'radius-N must equal N px');
  }
});

test('only slate and red ramps exist', () => {
  const ramps = new Set(
    Object.keys(resolved.modes.default)
      .filter((k) => /^color\.[a-z]+\.\d+$/.test(k))
      .map((k) => k.split('.')[1]),
  );
  assert.deepEqual([...ramps].sort(), ['red', 'slate']);
});

test('focus ring: 1px gap + 2px ring + 1px halo; reach fits the space-1 label gap', () => {
  const d = resolved.modes.default;
  assert.equal(d['focus.ring-offset'].value, 1);
  assert.equal(d['focus.ring-width'].value, 2);
  assert.equal(d['focus.halo-width'].value, 1);
  const extent =
    d['focus.ring-offset'].value +
    d['focus.ring-width'].value +
    d['focus.halo-width'].value;
  assert.ok(d['space.1'].value >= extent, `extent ${extent}px`);
  assert.ok(d['space.2'].value > extent);
});

test('elevation: three shared levels, slate-based, urgent tinted from error red', () => {
  const t = resolved.modes.default;
  for (const level of ['default', 'hover', 'urgent']) {
    const e = t[`elevation.${level}`];
    assert.ok(e, `elevation.${level} exists`);
    assert.equal(e.type, 'shadow');
    assert.equal(e.cssVar, `--prism-elevation-${level}`);
    assert.match(e.value, /oklch\(/);
  }
  assert.match(t['elevation.default'].value, / 260 \//); // slate hue
  assert.match(t['elevation.hover'].value, / 260 \//);
  assert.match(t['elevation.urgent'].value, / 27 \//); // error red hue
  const css = readFileSync(
    new URL('../src/tokens/tokens.css', import.meta.url),
    'utf8',
  );
  for (const level of ['default', 'hover', 'urgent'])
    assert.ok(css.includes(`--prism-elevation-${level}:`));
});

test('components consume elevation tokens, no hard-coded shadows', () => {
  for (const f of ['../src/select/select.ts', '../src/option/option.ts']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!/box-shadow/.test(src), `${f} must not set box-shadow`);
  }
  const theme = readFileSync(
    new URL('../src/theme/theme.css', import.meta.url),
    'utf8',
  );
  const block = theme.slice(theme.indexOf('/* ---------- Select'));
  assert.ok(!/box-shadow:[^;]*inset/.test(block), 'no inside-border focus');
  assert.ok(
    !/box-shadow:\s*var\(--prism-elevation-urgent/.test(theme),
    'elevation-urgent is reserved, unused',
  );
  // elevation-hover is reserved for the raised card at rest (Card page, Chuck).
  const cardAt = theme.indexOf('/* ---------- Card');
  assert.ok(
    !/var\(--prism-elevation-hover/.test(theme.slice(0, cardAt)),
    'elevation-hover is reserved for the raised card, nowhere else',
  );
  assert.ok(
    [...theme.slice(cardAt).matchAll(/var\(--prism-elevation-hover/g)]
      .length === 1,
    'only prism-card[raised] uses elevation-hover',
  );
  for (const m of block.matchAll(/box-shadow:\s*([^;]+);/g))
    assert.ok(
      /var\(--prism-elevation-(default|hover)|--prism-focus-ring|--prism-color-focus-ring|^none$/.test(
        m[1].trim(),
      ),
      `unexpected shadow: ${m[1]}`,
    );
});

test('error box: lighter fill (10% red over white) keeps status text >= 4.5:1', () => {
  const t = resolved.modes.default;
  assert.match(t['color.error-surface'].value, /\/ 0\.08\)$/);
  const rgb = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const a = hex.length > 7 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
    return c.map((v) => v * a + 255 * (1 - a));
  };
  const lum = (c) => {
    const l = c.map((v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  };
  const a = lum(rgb(t['color.error-surface'].hex));
  const b = lum(rgb(t['color.on-error-surface'].hex));
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  assert.ok(ratio >= 4.5, `ratio ${ratio}`);
});

test('focus ring total reach (offset + ring + halo) is at most 4px', () => {
  const t = resolved.modes.default;
  const reach =
    t['focus.ring-offset'].value +
    t['focus.ring-width'].value +
    t['focus.halo-width'].value;
  assert.ok(reach <= 4, `reach ${reach}px`);
});

// ---------- Motion (token names provisional — Technical Writer) ----------
const parseLinear = (css) => {
  const m = /^linear\(([^()]*)\)$/.exec(css);
  assert.ok(m, `not a linear(): ${css.slice(0, 40)}`);
  return m[1].split(',').map((s) => {
    const n = Number(s.trim());
    assert.ok(Number.isFinite(n), `bad stop "${s}"`);
    return n;
  });
};
test('durations are 120 / 200 / 320ms', () => {
  const d = resolved.modes.default;
  assert.deepEqual(
    ['fast', 'default', 'slow'].map((k) => d[`duration.${k}`].value),
    ['120ms', '200ms', '320ms'],
  );
});
test('ease.standard is a cubic-bezier', () => {
  assert.deepEqual(
    resolved.modes.default['ease.standard'].value,
    [0.2, 0, 0, 1],
  );
});
for (const name of ['spring', 'spring-bouncy']) {
  test(`ease.${name}: valid linear(), starts at 0, ends at 1, has a cubic-bezier fallback`, () => {
    const t = resolved.modes.default[`ease.${name}`];
    const stops = parseLinear(t.value);
    assert.ok(stops.length >= 10);
    assert.equal(stops[0], 0);
    assert.equal(stops.at(-1), 1);
    assert.match(t.fallback, /^cubic-bezier\([^)]+\)$/);
  });
}
test('ease.spring is critically damped: monotonic, never overshoots', () => {
  const t = resolved.modes.default['ease.spring'];
  const s = parseLinear(t.value);
  for (let i = 1; i < s.length; i++)
    assert.ok(s[i] >= s[i - 1], `dip at stop ${i}`);
  assert.ok(Math.max(...s) <= 1);
  assert.ok(t.spring.dampingRatio >= 1);
});
test('ease.spring-bouncy overshoots 3–5% and settles back', () => {
  const t = resolved.modes.default['ease.spring-bouncy'];
  const peak = Math.max(...parseLinear(t.value));
  assert.ok(peak >= 1.03 && peak <= 1.05, `peak ${peak}`);
  assert.ok(t.spring.overshoot >= 0.03 && t.spring.overshoot <= 0.05);
});
test('spring settle times match their duration tokens (±10%)', () => {
  const d = resolved.modes.default;
  for (const [k, dur] of [
    ['spring', 'default'],
    ['spring-bouncy', 'slow'],
  ]) {
    const want = parseFloat(d[`duration.${dur}`].value);
    const got = d[`ease.${k}`].spring.settleMs;
    assert.ok(
      Math.abs(got - want) / want <= 0.1,
      `${k}: ${got}ms vs ${want}ms`,
    );
  }
});
test('tokens.css: springs ship linear() with an @supports cubic-bezier fallback', () => {
  const css = readFileSync(
    new URL('../src/tokens/tokens.css', import.meta.url),
    'utf8',
  );
  assert.match(css, /--prism-ease-spring: linear\(/);
  assert.match(
    css,
    /@supports not \(animation-timing-function: linear\(0, 1\)\)[\s\S]*--prism-ease-spring: cubic-bezier/,
  );
});
test('theme: reduced motion zeroes durations and flattens springs', () => {
  const css = readFileSync(
    new URL('../src/theme/theme.css', import.meta.url),
    'utf8',
  );
  const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
  for (const k of ['fast', 'default', 'slow'])
    assert.match(rm, new RegExp(`--prism-duration-${k}: 0\\.01ms`));
  assert.match(rm, /--prism-ease-spring: linear;/);
  assert.match(rm, /--prism-ease-spring-bouncy: linear;/);
  // No spring on colour, border or the error box.
  assert.doesNotMatch(
    css,
    /(background-color|border-color|color) var\([^)]*\) var\(--prism-ease-spring/,
  );
  assert.doesNotMatch(css, /prism-error-in[^;]*spring/);
});

// ---------- Semantic layer + shared state layer ----------
import { readFileSync as rf } from 'node:fs';
const { parseOklch, oklchToHex } = await import('../scripts/oklch.mjs');
const tok = (k) => resolved.modes.default[k].value;
const srgb = (str) => {
  const h = oklchToHex(str);
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};
const lumRgb = (c) => {
  const l = c.map((v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const ratio = (a, b) => {
  const [x, y] = [lumRgb(a), lumRgb(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
/** color-mix(in oklch, a, b p%) for opaque a/b (shorter hue arc). */
const mixOklch = (a, b, p) => {
  const [l1, c1, h1] = parseOklch(a);
  const [l2, c2, h2] = parseOklch(b);
  const ha = c1 === 0 ? h2 : h1;
  const hb = c2 === 0 ? h1 : h2;
  let d = hb - ha;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  const h = (ha + d * p + 360) % 360;
  return `oklch(${l1 + (l2 - l1) * p} ${c1 + (c2 - c1) * p} ${h})`;
};
/** Transparent surface: on-colour at p alpha composited over the page bg. */
const veil = (on, page, p) => {
  const [o, b] = [srgb(on), srgb(page)];
  return o.map((v, i) => v * p + b[i] * (1 - p));
};
const pct = (k) => parseFloat(tok(`state.${k}`)) / 100;
const STATES = {
  hover: pct('hover'),
  pressed: pct('pressed'),
  selected: pct('selected'),
  'selected+hover': pct('selected') + pct('hover') / 2,
};
export const STATE_CONTRAST = [];

test('state tokens: hover 8%, pressed 12%, selected 12–16%', () => {
  assert.equal(tok('state.hover'), '8%');
  assert.equal(tok('state.pressed'), '12%');
  const sel = pct('selected');
  assert.ok(sel >= 0.12 && sel <= 0.16, `selected ${sel}`);
});

const SURFACES = [
  ['button (solid)', 'color.accent', 'color.on-accent', 'oklch'],
  ['option', 'color.bg', 'color.text', 'oklch'],
  ['outline button', null, 'color.text', 'veil'],
  ['icon button', null, 'color.text', 'veil'],
];
for (const [name, bgKey, onKey, mode] of SURFACES)
  for (const [state, p] of Object.entries(STATES))
    test(`state contrast: ${name} ${state} — text on fill >= 4.5:1`, () => {
      const on = tok(onKey);
      const fill =
        mode === 'oklch'
          ? srgb(mixOklch(tok(bgKey), on, p))
          : veil(on, tok('color.bg'), p);
      const r = ratio(srgb(on), fill);
      console.log(`  ${name} ${state}: ${r.toFixed(2)}:1`);
      assert.ok(r >= 4.5, `${r.toFixed(2)}:1`);
    });

test('outline button: border >= 3:1 and label >= 4.5:1 on bg', () => {
  const bg = srgb(tok('color.bg'));
  const border = ratio(srgb(tok('color.border-strong')), bg);
  const label = ratio(srgb(tok('color.text')), bg);
  console.log(
    `  outline border ${border.toFixed(2)}:1, label ${label.toFixed(2)}:1`,
  );
  assert.ok(border >= 3);
  assert.ok(label >= 4.5);
});

test('on-error-surface pairs with error-surface; error-status-text is its alias', () => {
  assert.equal(tok('color.error-status-text'), tok('color.on-error-surface'));
  assert.equal(tok('color.error-surface'), 'oklch(0.586 0.226 21.3 / 0.08)');
  assert.equal(tok('color.on-error-surface'), 'oklch(0.368 0.148 25)');
  const r = ratio(
    srgb(tok('color.on-error-surface')),
    veil(tok('color.red.500'), tok('color.bg'), 0.08),
  );
  assert.ok(r >= 4.5, `${r}`);
});

test('elevation and focus halo are built from roles with exact former values', () => {
  assert.equal(tok('color.shadow'), tok('color.slate.950'));
  assert.equal(tok('color.shadow-urgent'), tok('color.red.600'));
  assert.equal(tok('focus.halo'), 'oklch(0.554 0.035 260 / 0.12)');
  assert.equal(
    tok('elevation.default'),
    '0 1px 2px oklch(0.129 0.03 260 / 0.06), 0 4px 12px -2px oklch(0.129 0.03 260 / 0.12)',
  );
  const css = rf(new URL('../src/tokens/tokens.css', import.meta.url), 'utf8');
  assert.match(
    css,
    /--prism-elevation-default: 0 1px 2px color-mix\(in oklch, var\(--prism-color-shadow\)/,
  );
  assert.match(
    css,
    /@supports not \(color: color-mix\(in oklch, red, blue\)\) \{[\s\S]*--prism-elevation-default: 0 1px 2px oklch\(/,
  );
});

test('theme + component styles: no raw palette refs, no colour literals', () => {
  const files = [
    '../src/theme/theme.css',
    ...[
      'button/button',
      'option/option',
      'select/select',
      'text-input/text-input',
      'password-input/password-input',
      'search-input/search-input',
      'otp-input/otp-input',
      'text-area/text-area',
      'internal/text-control',
      'internal/state-layer',
      'internal/field-chrome',
      'internal/control-styles',
      'internal/icons',
    ].map((f) => `../src/${f}.ts`),
  ];
  for (const f of files) {
    const src = rf(new URL(f, import.meta.url), 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    assert.doesNotMatch(
      src,
      /--prism-color-(slate|red)-\d/,
      `${f}: raw palette ref`,
    );
    assert.doesNotMatch(
      src,
      /\b(oklch|oklab|rgba?|hsla?|lab|lch)\(/,
      `${f}: colour literal`,
    );
    const hexes = src.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    assert.deepEqual(
      hexes.filter((h) => h !== '#000'),
      [],
      `${f}: hex literal`,
    );
  }
});

// ---------- Full contrast matrix (state layer) ----------
// Every fg/bg pair on every state fill. Text >= 4.5:1, borders/icons >= 3:1.
// Disabled is exempt per WCAG 1.4.3/1.4.11 but its numbers are reported.
const MATRIX_STATES = { rest: 0, ...STATES };
/** sRGB (0..1, gamma) -> oklch() string (Ottosson). */
const toOklch = (rgb) => {
  const [r, g, b] = rgb.map((v) =>
    v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return `oklch(${L} ${Math.hypot(A, B)} ${((Math.atan2(B, A) * 180) / Math.PI + 360) % 360})`;
};
// bgKey may be [roleA, roleB, pct, space?] for an opaque color-mix() base.
// 'srgb' = roleB at pct alpha composited over roleA (what a veil renders).
const baseOf = (bgKey) =>
  !Array.isArray(bgKey)
    ? tok(bgKey)
    : bgKey[3] === 'srgb'
      ? toOklch(veil(tok(bgKey[1]), tok(bgKey[0]), bgKey[2]))
      : mixOklch(tok(bgKey[0]), tok(bgKey[1]), bgKey[2]);
// State layer = alpha overlay: the on-colour at p alpha composited (srgb)
// over the opaque resting fill, or over color-bg for transparent surfaces.
const fillOf = (bgKey, onKey, p) =>
  veil(tok(onKey), bgKey ? baseOf(bgKey) : tok('color.bg'), p);
// [surface, bg role (null = transparent on color-bg), on role, [fg role, kind]]
const MATRIX = [
  ['button', 'color.accent', 'color.on-accent', [['color.on-accent', 'text']]],
  [
    'secondary',
    ['color.bg', 'color.accent', 0.08],
    'color.accent',
    [['color.accent', 'text']],
  ],
  [
    'ghost',
    null,
    'color.text',
    [
      ['color.text', 'text'],
      ['color.text-muted', 'text'],
    ],
  ],
  [
    'destructive',
    ['color.bg', 'color.error-surface-base', 0.08, 'srgb'],
    'color.on-error-surface',
    [['color.on-error-surface', 'text']],
  ],
  [
    'outline',
    null,
    'color.text',
    [
      ['color.text', 'text'],
      ['color.text-muted', 'text'],
      ['color.border-strong', 'border'],
    ],
  ],
  [
    'option',
    'color.bg',
    'color.text',
    [
      ['color.text', 'text'],
      ['color.text-muted', 'text'],
      ['color.text', 'icon'], // check mark
    ],
  ],
  [
    'icon button',
    null,
    'color.text',
    [
      ['color.text-muted', 'icon'], // resting icon colour
      ['color.text', 'icon'], // hover icon colour
    ],
  ],
  // Card family (M1). Cards are not interactive yet, so these rows also stand
  // in for the controls placed on them: the surface is the base the overlay of
  // a ghost button or icon button composites over.
  [
    'card (bordered, raised)',
    'color.bg',
    'color.text',
    [
      ['color.text', 'text'], // title, content
      ['color.text-muted', 'text'], // description, footer meta
      ['color.text-muted', 'icon'], // icon button resting icon
    ],
  ],
  [
    'card (borderless)',
    'color.surface',
    'color.text',
    [
      ['color.text', 'text'],
      ['color.text-muted', 'text'],
      ['color.text-muted', 'icon'],
    ],
  ],
  ['menu item', 'color.bg', 'color.text', [['color.text', 'text']]],
];
export const MATRIX_RESULTS = [];
for (const [surface, bgKey, onKey, pairs] of MATRIX)
  for (const [state, p] of Object.entries(MATRIX_STATES))
    for (const [fg, kind] of pairs) {
      const min = kind === 'text' ? 4.5 : 3;
      const r = ratio(srgb(tok(fg)), fillOf(bgKey, onKey, p));
      MATRIX_RESULTS.push({ surface, state, fg, kind, r });
      test(`matrix: ${surface} ${state} — ${fg.slice(6)} (${kind}) >= ${min}:1 [${r.toFixed(2)}]`, () => {
        assert.ok(r >= min, `${surface} ${state} ${fg}: ${r.toFixed(2)}:1`);
      });
    }

test('matrix report: disabled (exempt) numbers', () => {
  const surf = srgb(tok('color.surface'));
  const rows = [
    [
      'button disabled: text-muted on surface',
      ratio(srgb(tok('color.text-muted')), surf),
    ],
    [
      'button disabled: border on bg',
      ratio(srgb(tok('color.border')), srgb(tok('color.bg'))),
    ],
    [
      'destructive rest vs error box over bg: max sRGB channel diff (0-255)',
      Math.max(
        ...srgb(
          baseOf(['color.bg', 'color.error-surface-base', 0.08, 'srgb']),
        ).map(
          (v, i) =>
            Math.abs(
              v -
                veil(tok('color.error-surface-base'), tok('color.bg'), 0.08)[i],
            ) * 255,
        ),
      ),
    ],
    [
      'ghost disabled: text-muted on bg',
      ratio(srgb(tok('color.text-muted')), srgb(tok('color.bg'))),
    ],
    [
      'option disabled: text-muted on bg',
      ratio(srgb(tok('color.text-muted')), srgb(tok('color.bg'))),
    ],
  ];
  for (const [k, r] of rows) console.log(`  [exempt] ${k}: ${r.toFixed(2)}:1`);
});

test('resting focus ring has no blur (no sub-pixel fringe)', () => {
  const theme = readFileSync(
    new URL('../src/theme/theme.css', import.meta.url),
    'utf8',
  );
  assert.ok(
    !/0 0 var\(--prism-focus-ring-blur\) 0 var\(--prism-color-focus-ring\)/.test(
      theme,
    ),
    'resting ring layer must be 0 0 0 0',
  );
});

// Node test: run with `node --test test/tokens.test.mjs`
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const resolved = JSON.parse(
  readFileSync(
    new URL('../tokens/heru.tokens.resolved.json', import.meta.url),
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

test('focus ring: 3px ring, 2px offset, 3px halo; extent + 2px clearance fits the space-3 field gap', () => {
  const d = resolved.modes.default;
  assert.equal(d['focus.ring-width'].value, 3);
  assert.equal(d['focus.ring-offset'].value, 2);
  assert.equal(d['focus.halo-width'].value, 3);
  const extent =
    d['focus.ring-offset'].value +
    d['focus.ring-width'].value +
    d['focus.halo-width'].value;
  assert.ok(
    d['space.3'].value >= extent + 2,
    `extent ${extent}px vs gap ${d['space.3'].value}px`,
  );
});

test('elevation: three shared levels, slate-based, urgent tinted from error red', () => {
  const t = resolved.modes.default;
  for (const level of ['default', 'hover', 'urgent']) {
    const e = t[`elevation.${level}`];
    assert.ok(e, `elevation.${level} exists`);
    assert.equal(e.type, 'shadow');
    assert.equal(e.cssVar, `--heru-elevation-${level}`);
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
    assert.ok(css.includes(`--heru-elevation-${level}:`));
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
  assert.ok(!/inset/.test(block), 'no inside-border focus');
  assert.ok(
    !/box-shadow:\s*var\(--heru-elevation-urgent/.test(theme),
    'elevation-urgent is reserved, unused',
  );
  for (const m of block.matchAll(/box-shadow:\s*([^;]+);/g))
    assert.ok(
      /var\(--heru-elevation-(default|hover)|--heru-focus-ring|^none$/.test(
        m[1].trim(),
      ),
      `unexpected shadow: ${m[1]}`,
    );
});

test('attached error box text is >= 4.5:1 on its surface (alpha over white)', () => {
  const t = resolved.modes.default;
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
  const b = lum(rgb(t['color.error-status-text'].hex));
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  assert.ok(ratio >= 4.5, `ratio ${ratio}`);
});

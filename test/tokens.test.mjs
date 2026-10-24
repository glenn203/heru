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
const OFF_GRID = new Set(['border.width', 'radius.full']);

for (const [mode, tokens] of Object.entries(resolved.modes)) {
  test(`${mode}: every dimension is a multiple of 4px`, () => {
    for (const [key, t] of Object.entries(tokens)) {
      if (t.type !== 'dimension' || OFF_GRID.has(key)) continue;
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

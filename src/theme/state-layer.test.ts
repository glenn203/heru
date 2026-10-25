import { expect, test, type Locator, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mount } from '../../test/fixture.js';

const withTheme = async (page: Page) => {
  await page.addStyleTag({ path: 'src/tokens/tokens.css' });
  await page.addStyleTag({ path: 'src/theme/theme.css' });
};
const MARKUP = `
  <heru-button id="solid" type="button">Save</heru-button>
  <heru-button id="outline" variant="outline" type="button">Cancel</heru-button>
  <heru-button id="off" type="button" disabled>Off</heru-button>
  <heru-button id="off-outline" variant="outline" type="button" disabled>Off</heru-button>
  <heru-password-input label="Password" value="pw"></heru-password-input>
  <heru-test-row id="row">Row</heru-test-row>
  <heru-test-row id="row-sel" selected>Selected row</heru-test-row>
  <heru-test-row id="row-off" disabled>Disabled row</heru-test-row>
  <p id="away" style="margin-top:40px">away</p>`;

/** Computed style of a host's part. */
const partStyle = (host: Locator, part: string, prop: string) =>
  host.evaluate(
    (el, [part, prop]: [string, string]) =>
      getComputedStyle(
        el.shadowRoot!.querySelector(`[part~="${part}"]`)!,
      ).getPropertyValue(prop),
    [part, prop] as [string, string],
  );
/** What the browser computes for an expression (probe element). */
const probe = (page: Page, expr: string) =>
  page.evaluate((expr) => {
    const p = document.createElement('div');
    p.style.backgroundColor = expr;
    document.body.append(p);
    const v = getComputedStyle(p).backgroundColor;
    p.remove();
    return v;
  }, expr);
const mix = (bg: string, on: string, state: string) =>
  `color-mix(in oklch, ${bg}, ${on} var(--heru-state-${state}))`;
const SOLID = [
  'var(--heru-color-accent)',
  'var(--heru-color-on-accent)',
] as const;
const VEIL = ['transparent', 'var(--heru-color-text)'] as const;

async function setup(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(page, MARKUP);
  await withTheme(page);
}

test('button (solid): rest, hover, pressed fills are the shared oklch mixes; border follows fill', async ({
  page,
}) => {
  await setup(page);
  const b = page.locator('#solid');
  expect(await partStyle(b, 'base', 'background-color')).toBe(
    await probe(page, SOLID[0]),
  );
  await b.hover();
  const hover = await partStyle(b, 'base', 'background-color');
  expect(hover).toBe(await probe(page, mix(...SOLID, 'hover')));
  expect(await partStyle(b, 'base', 'border-top-color')).toBe(hover);
  await page.mouse.down();
  expect(await partStyle(b, 'base', 'background-color')).toBe(
    await probe(page, mix(...SOLID, 'pressed')),
  );
  await page.mouse.up();
});

test('outline: transparent rest, veil on hover/pressed, border unchanged, same focus ring', async ({
  page,
}) => {
  await setup(page);
  const o = page.locator('#outline');
  const border = await partStyle(o, 'base', 'border-top-color');
  expect(border).toBe(await probe(page, 'var(--heru-color-border-strong)'));
  expect(await partStyle(o, 'base', 'background-color')).toBe(
    'rgba(0, 0, 0, 0)',
  );
  await o.hover();
  expect(await partStyle(o, 'base', 'background-color')).toBe(
    await probe(page, mix(...VEIL, 'hover')),
  );
  expect(await partStyle(o, 'base', 'border-top-color')).toBe(border);
  await page.mouse.down();
  expect(await partStyle(o, 'base', 'background-color')).toBe(
    await probe(page, mix(...VEIL, 'pressed')),
  );
  expect(await partStyle(o, 'base', 'border-top-color')).toBe(border);
  await page.mouse.up();
  // Focus ring identical for solid and outline (keyboard focus).
  await page.mouse.move(0, 0);
  await page.locator('#solid').focus();
  await page.keyboard.press('Tab'); // → outline
  const ringOutline = await partStyle(o, 'base', 'box-shadow');
  await page.keyboard.press('Shift+Tab'); // → solid
  const ringSolid = await partStyle(
    page.locator('#solid'),
    'base',
    'box-shadow',
  );
  expect(ringOutline).toBe(ringSolid);
  expect(ringSolid).toMatch(/4px/);
});

test('veil equals srgb on-colour veil (one formula for solid + transparent)', async ({
  page,
}) => {
  await setup(page);
  // Paint both onto a canvas and compare RGBA bytes (serialisations differ).
  const px = (expr: string) =>
    page.evaluate((c) => {
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      return [...ctx.getImageData(0, 0, 1, 1).data];
    }, expr);
  const a = await px(await probe(page, mix(...VEIL, 'hover')));
  const b = await px(
    await probe(
      page,
      'color-mix(in srgb, var(--heru-color-text) var(--heru-state-hover), transparent)',
    ),
  );
  a.forEach((v, i) => expect(Math.abs(v - (b[i] ?? 0))).toBeLessThanOrEqual(1));
});

test('disabled: no hover or pressed change (button, outline, generic row)', async ({
  page,
}) => {
  await setup(page);
  for (const id of ['#off', '#off-outline', '#row-off']) {
    const el = page.locator(id);
    const rest = await partStyle(el, 'base', 'background-color');
    await el.hover({ force: true });
    expect(await partStyle(el, 'base', 'background-color'), id).toBe(rest);
    await page.mouse.down();
    expect(await partStyle(el, 'base', 'background-color'), id).toBe(rest);
    await page.mouse.up();
    await page.mouse.move(0, 0);
  }
});

test('icon button (password toggle): veil on hover/pressed, selected (revealed) fill', async ({
  page,
}) => {
  await setup(page);
  const host = page.locator('heru-password-input');
  const toggle = host.getByRole('button', { name: 'Show password' });
  expect(await partStyle(host, 'toggle', 'background-color')).toBe(
    'rgba(0, 0, 0, 0)',
  );
  await toggle.hover();
  expect(await partStyle(host, 'toggle', 'background-color')).toBe(
    await probe(page, mix(...VEIL, 'hover')),
  );
  await toggle.click(); // aria-pressed=true → selected (+hover)
  await page.mouse.move(0, 0);
  expect(await partStyle(host, 'toggle', 'background-color')).toBe(
    await probe(page, mix(...VEIL, 'selected')),
  );
});

test('generic consumer (test row): selected and selected+hover, non-colour cue present', async ({
  page,
}) => {
  await setup(page);
  await page.addStyleTag({
    content: `heru-test-row::part(base){--_bg:var(--heru-color-bg);--_on:var(--heru-color-text)}`,
  });
  const sel = page.locator('#row-sel');
  const bg = 'var(--heru-color-bg)';
  const on = 'var(--heru-color-text)';
  expect(await partStyle(sel, 'base', 'background-color')).toBe(
    await probe(page, mix(bg, on, 'selected')),
  );
  await sel.hover();
  expect(await partStyle(sel, 'base', 'background-color')).toBe(
    await probe(
      page,
      `color-mix(in oklch, ${bg}, ${on} calc(var(--heru-state-selected) + var(--heru-state-hover)))`,
    ),
  );
  await expect(sel).toContainText('✓'); // selected is never colour-only
  const row = page.locator('#row');
  await row.hover();
  expect(await partStyle(row, 'base', 'background-color')).toBe(
    await probe(page, mix(bg, on, 'hover')),
  );
});

test('option: selected uses the stronger selected mix and keeps the check mark', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(
    page,
    `<heru-select label="Fruit" value="apple"><heru-option value="apple">Apple</heru-option><heru-option value="pear">Pear</heru-option></heru-select>`,
  );
  await withTheme(page);
  await page.getByRole('combobox').click();
  await page.mouse.move(0, 0);
  await page.getByRole('combobox').press('ArrowDown'); // active → pear
  const apple = page.locator('heru-option[value="apple"]');
  expect(await partStyle(apple, 'base', 'background-color')).toBe(
    await probe(
      page,
      mix('var(--heru-color-bg)', 'var(--heru-color-text)', 'selected'),
    ),
  );
  expect(await partStyle(apple, 'check', 'visibility')).toBe('visible');
});

test('hover is gated by @media (hover: hover): touch devices get no sticky hover', async ({
  browser,
}) => {
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await setup(page);
  const b = page.locator('#solid');
  const rest = await partStyle(b, 'base', 'background-color');
  expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(
    false,
  );
  await b.hover();
  expect(await partStyle(b, 'base', 'background-color')).toBe(rest);
  await ctx.close();
  const src = readFileSync('src/internal/state-layer.ts', 'utf8');
  expect(src).toMatch(/@media \(hover: hover\) \{[\s\S]*:hover/);
});

test('fallback: color-mix() unsupported paths exist (utility + tokens)', () => {
  const util = readFileSync('src/internal/state-layer.ts', 'utf8');
  expect(util).toMatch(
    /@supports not \(color: color-mix\(in oklch, red, blue\)\)/,
  );
  for (const v of ['--_bg-hover', '--_bg-pressed', '--_bg-selected'])
    expect(util).toContain(v);
  const theme = readFileSync('src/theme/theme.css', 'utf8');
  for (const v of ['--_bg-hover', '--_bg-pressed', '--_bg-selected'])
    expect(theme).toContain(v);
  const tokens = readFileSync('src/tokens/tokens.css', 'utf8');
  expect(tokens).toMatch(
    /@supports not \(color: color-mix\(in oklch, red, blue\)\)/,
  );
});

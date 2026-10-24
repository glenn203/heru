import { expect, test, type Page } from '@playwright/test';
import { mount } from '../../test/fixture.js';

const heights = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-probe]')].map((el) => {
      const target = el.shadowRoot!.querySelector<HTMLElement>(
        el.localName === 'heru-button' ? '[part="base"]' : '[part="input"]',
      )!;
      return target.getBoundingClientRect().height;
    }),
  );

const grid = (size: string) =>
  ['compact', 'default', 'comfortable']
    .map(
      (d) =>
        `<div data-heru-density="${d}"><heru-button data-probe size="${size}">B</heru-button><heru-text-field data-probe size="${size}" label="F"></heru-text-field></div>`,
    )
    .join('');

const withTokens = async (page: Page, markup: string) => {
  await mount(page, markup);
  await page.addStyleTag({ url: '/src/tokens/tokens.css' });
};

test('md height is 24/36/48 in compact/default/comfortable', async ({
  page,
}) => {
  await withTokens(page, grid('md'));
  expect(await heights(page)).toEqual([24, 24, 36, 36, 48, 48]);
});

test('sm height is 24/32/40 in compact/default/comfortable', async ({
  page,
}) => {
  await withTokens(page, grid('sm'));
  expect(await heights(page)).toEqual([24, 24, 32, 32, 40, 40]);
});

test('lg height is 32/44/56 in compact/default/comfortable', async ({
  page,
}) => {
  await withTokens(page, grid('lg'));
  expect(await heights(page)).toEqual([32, 32, 44, 44, 56, 56]);
});

test('nested density overrides the ancestor', async ({ page }) => {
  await withTokens(
    page,
    `<div data-heru-density="comfortable"><heru-button data-probe>A</heru-button><section data-heru-density="compact"><heru-button data-probe>B</heru-button></section></div>`,
  );
  expect(await heights(page)).toEqual([48, 24]);
});

test('works without tokens.css (default-density fallbacks)', async ({
  page,
}) => {
  await mount(
    page,
    `<heru-button data-probe size="sm">A</heru-button><heru-button data-probe>B</heru-button><heru-text-field data-probe size="lg" label="F"></heru-text-field>`,
  );
  expect(await heights(page)).toEqual([32, 36, 44]);
});

test('size reflects and defaults to md', async ({ page }) => {
  await mount(page, `<heru-button>A</heru-button>`);
  expect(await page.locator('heru-button').getAttribute('size')).toBe('md');
});

test('theme: label and description sit outside the 6px focus ring', async ({
  page,
}) => {
  await mount(
    page,
    `<heru-text-field label="Email"><span slot="description">Help</span></heru-text-field>`,
  );
  await page.addStyleTag({ url: '/src/tokens/tokens.css' });
  await page.addStyleTag({ url: '/src/theme/theme.css' });
  const gaps = await page.evaluate(() => {
    const root = document.querySelector('heru-text-field')!.shadowRoot!;
    const box = (p: string) =>
      root.querySelector(`[part="${p}"]`)!.getBoundingClientRect();
    return [
      box('input').top - box('label').bottom,
      box('description').top - box('input').bottom,
    ];
  });
  for (const gap of gaps) expect(gap).toBeGreaterThanOrEqual(6);
});

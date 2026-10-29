import { expect, test, type Page } from '@playwright/test';
import { mount } from '../../test/fixture.js';
import { expected, near, painted, PCT } from '../../test/paint.js';

interface Win {
  picked?: string;
  hit?: string;
  hits?: Record<string, boolean>;
}

const setup = async (page: Page, markup: string) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await mount(page, markup);
  await page.addStyleTag({ path: 'src/tokens/tokens.css' });
  await page.addStyleTag({ path: 'src/theme/theme.css' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  return errors;
};
const MARKUP = `<prism-icon-button id="b" label="Refresh">r</prism-icon-button>
  <prism-icon-button id="off" label="Off" disabled>x</prism-icon-button>
  <prism-icon-button id="tg" label="Pin" pressed>p</prism-icon-button>`;

test('the label is the accessible name; the icon is not', async ({ page }) => {
  await setup(page, MARKUP);
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
});

test('a missing label is a dev error', async ({ page }) => {
  const errors = await setup(page, `<prism-icon-button>x</prism-icon-button>`);
  await page.waitForTimeout(50);
  expect(errors.some((e) => e.includes('`label` is required'))).toBe(true);
});

test('square at the control height, follows density, 24px minimum at compact sm', async ({
  page,
}) => {
  await setup(
    page,
    ['compact', 'default', 'comfortable']
      .map(
        (d) =>
          `<div data-prism-density="${d}"><prism-icon-button id="${d}-md" label="a">a</prism-icon-button><prism-icon-button id="${d}-sm" size="sm" label="b">b</prism-icon-button></div>`,
      )
      .join(''),
  );
  const size = (id: string) =>
    page.locator(`#${id}`).evaluate((el) => {
      const r = el.getBoundingClientRect();
      return [r.width, r.height];
    });
  expect(await size('default-md')).toEqual([36, 36]);
  expect(await size('compact-md')).toEqual([24, 24]);
  expect(await size('comfortable-md')).toEqual([48, 48]);
  expect(await size('compact-sm')).toEqual([24, 24]);
});

test('click fires; disabled swallows clicks and is not focusable', async ({
  page,
}) => {
  await setup(page, MARKUP);
  await page.evaluate(() => {
    for (const id of ['b', 'off'])
      document
        .getElementById(id)!
        .addEventListener(
          'click',
          () => (((window as unknown as Win).hits ??= {})[id] = true),
        );
  });
  await page.locator('#b').click();
  await page.locator('#off').click({ force: true });
  expect(await page.evaluate(() => (window as unknown as Win).hits?.b)).toBe(
    true,
  );
  expect(
    await page.evaluate(() => (window as unknown as Win).hits?.off),
  ).toBeUndefined();
  await expect(page.getByRole('button', { name: 'Off' })).toBeDisabled();
});

test('toggle: aria-pressed flips', async ({ page }) => {
  await setup(page, MARKUP);
  const b = page.getByRole('button', { name: 'Pin' });
  await expect(b).toHaveAttribute('aria-pressed', 'true');
  await b.click();
  await expect(b).toHaveAttribute('aria-pressed', 'false');
});

test('ghost state layer: transparent at rest, 8% on hover, 12% pressed', async ({
  page,
}) => {
  await setup(page, MARKUP);
  const host = page.locator('#b');
  const on = ['transparent', 'var(--prism-color-text)'] as const;
  for (const state of ['rest', 'hover', 'pressed'] as const) {
    if (state === 'hover') await host.hover();
    if (state === 'pressed') await page.mouse.down();
    const got = await painted(host, 'base');
    const want = await expected(page, on[0], on[1], PCT[state]);
    expect(near(got, want), `${state}: ${got.join()} vs ${want.join()}`).toBe(
      true,
    );
  }
  await page.mouse.up();
});

test('keyboard focus shows the shared ring; rest has zero-spread layers', async ({
  page,
}) => {
  await setup(page, MARKUP);
  const shadow = () =>
    page
      .locator('#b')
      .evaluate(
        (el) =>
          getComputedStyle(el.shadowRoot!.querySelector('[part="base"]')!)
            .boxShadow,
      );
  expect(await shadow()).not.toMatch(/[1-9]\d*px/);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(100);
  expect(await shadow()).toMatch(/4px/);
});

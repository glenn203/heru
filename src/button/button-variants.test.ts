import { expect, test, type Locator, type Page } from '@playwright/test';
import { mount } from '../../test/fixture.js';

const V = ['primary', 'secondary', 'ghost', 'outline', 'destructive'] as const;
const BG: Record<(typeof V)[number], [string, string]> = {
  primary: ['var(--heru-color-accent)', 'var(--heru-color-on-accent)'],
  secondary: [
    'color-mix(in oklch, var(--heru-color-bg), var(--heru-color-accent) 8%)',
    'var(--heru-color-accent)',
  ],
  ghost: ['transparent', 'var(--heru-color-text)'],
  outline: ['transparent', 'var(--heru-color-text)'],
  destructive: ['var(--heru-color-danger)', 'var(--heru-color-on-danger)'],
};

async function setup(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(
    page,
    V.map(
      (
        v,
      ) => `<heru-button id="${v}" variant="${v}" type="button">${v}</heru-button>
      <heru-button id="${v}-off" variant="${v}" type="button" disabled>off</heru-button>`,
    ).join('') +
      `<heru-button id="unset" type="button">x</heru-button><p id="away" style="margin-top:40px">away</p>`,
  );
  await page.addStyleTag({ path: 'src/tokens/tokens.css' });
  await page.addStyleTag({ path: 'src/theme/theme.css' });
}
const css = (h: Locator, prop: string) =>
  h.evaluate(
    (el, p) =>
      getComputedStyle(
        el.shadowRoot!.querySelector('[part=base]')!,
      ).getPropertyValue(p),
    prop,
  );
const probe = (page: Page, expr: string, prop = 'background-color') =>
  page.evaluate(
    ([e, p]) => {
      const d = document.createElement('div');
      d.style.setProperty(p, e);
      document.body.append(d);
      const v = getComputedStyle(d).getPropertyValue(p);
      d.remove();
      return v;
    },
    [expr, prop] as [string, string],
  );

test('unset variant renders identically to primary', async ({ page }) => {
  await setup(page);
  expect(await css(page.locator('#unset'), 'background-color')).toBe(
    await css(page.locator('#primary'), 'background-color'),
  );
});

for (const v of V) {
  test.describe(`variant=${v}`, () => {
    test('rest fill and text colour come from its roles', async ({ page }) => {
      await setup(page);
      const b = page.locator(`#${v}`);
      expect(await css(b, 'background-color')).toBe(
        await probe(page, BG[v][0]),
      );
      expect(await css(b, 'color')).toBe(await probe(page, BG[v][1], 'color'));
    });

    test('hover and pressed use the shared state layer', async ({ page }) => {
      await setup(page);
      const b = page.locator(`#${v}`);
      const [bg, on] = BG[v];
      await b.hover();
      await expect
        .poll(() => css(b, 'background-color'))
        .toBe(
          await probe(
            page,
            `color-mix(in oklch, ${bg}, ${on} var(--heru-state-hover))`,
          ),
        );
      const box = (await b.boundingBox())!;
      await page.mouse.move(box.x + 5, box.y + 5);
      await page.mouse.down();
      await expect
        .poll(() => css(b, 'background-color'))
        .toBe(
          await probe(
            page,
            `color-mix(in oklch, ${bg}, ${on} var(--heru-state-pressed))`,
          ),
        );
      await page.mouse.up();
    });

    test('same focus ring as every other variant', async ({ page }) => {
      await setup(page);
      await page.keyboard.press('Tab');
      for (let i = 0; i < V.indexOf(v) * 1; i++)
        await page.keyboard.press('Tab');
      const b = page.locator(`#${v}`);
      await expect(b).toBeFocused();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      const ring = await css(b, 'box-shadow');
      await page.locator('#primary').focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      expect(ring).toBe(await css(page.locator('#primary'), 'box-shadow'));
      expect(ring).not.toContain('0px 0px 0px 0px');
    });

    test('disabled is inert: no state change, not focusable, no click', async ({
      page,
    }) => {
      await setup(page);
      const b = page.locator(`#${v}-off`);
      const rest = await css(b, 'background-color');
      await b.hover({ force: true });
      expect(await css(b, 'background-color')).toBe(rest);
      expect(await css(b, 'color')).toBe(
        await probe(page, 'var(--heru-color-text-muted)', 'color'),
      );
      if (v === 'ghost') {
        expect(rest).toBe(await probe(page, 'transparent'));
      }
      let clicked = false;
      await b.evaluate((el) =>
        el.addEventListener('click', () => (document.body.dataset.c = '1')),
      );
      await b.click({ force: true });
      clicked = await page.evaluate(() => document.body.dataset.c === '1');
      expect(clicked).toBe(false);
      await b.focus();
      await expect(b).not.toBeFocused();
    });
  });
}

test('ghost has no visible border; outline keeps a border-strong border', async ({
  page,
}) => {
  await setup(page);
  expect(await css(page.locator('#ghost'), 'border-top-color')).toBe(
    await probe(page, 'transparent', 'border-top-color'),
  );
  expect(await css(page.locator('#outline'), 'border-top-color')).toBe(
    await probe(page, 'var(--heru-color-border-strong)', 'border-top-color'),
  );
});

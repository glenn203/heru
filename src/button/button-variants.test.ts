import { expect, test, type Locator, type Page } from '@playwright/test';
import { mount } from '../../test/fixture.js';
import { expected, near, painted, PCT } from '../../test/paint.js';

const V = ['primary', 'secondary', 'ghost', 'outline', 'destructive'] as const;
const BG: Record<(typeof V)[number], [string, string]> = {
  primary: ['var(--prism-color-accent)', 'var(--prism-color-on-accent)'],
  secondary: [
    'color-mix(in oklch, var(--prism-color-bg), var(--prism-color-accent) 8%)',
    'var(--prism-color-accent-text)',
  ],
  ghost: ['transparent', 'var(--prism-color-text)'],
  outline: ['transparent', 'var(--prism-color-text)'],
  destructive: [
    'color-mix(in srgb, var(--prism-color-bg), var(--prism-color-error-surface-base) 8%)',
    'var(--prism-color-on-error-surface)',
  ],
};

async function setup(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(
    page,
    V.map(
      (
        v,
      ) => `<prism-button id="${v}" variant="${v}" type="button">${v}</prism-button>
      <prism-button id="${v}-off" variant="${v}" type="button" disabled>off</prism-button>`,
    ).join('') +
      V.map(
        (v) =>
          `<prism-button id="${v}-on" variant="${v}" type="button" pressed>on</prism-button>`,
      ).join('') +
      `<prism-button id="unset" type="button">x</prism-button><p id="away" style="margin-top:40px">away</p>`,
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
      const wanthover = await expected(page, bg, on, PCT.hover);
      await expect
        .poll(async () => near(await painted(b, 'base'), wanthover))
        .toBe(true);
      expect(await css(b, 'background-color')).toBe(await probe(page, bg));
      const box = (await b.boundingBox())!;
      await page.mouse.move(box.x + 5, box.y + 5);
      await page.mouse.down();
      const wantpressed = await expected(page, bg, on, PCT.pressed);
      await expect
        .poll(async () => near(await painted(b, 'base'), wantpressed))
        .toBe(true);
      expect(await css(b, 'background-color')).toBe(await probe(page, bg));
      await page.mouse.up();
    });

    test('a pressed toggle paints the selected and selected+hover layers and underlines its label', async ({
      page,
    }) => {
      await setup(page);
      const b = page.locator(`#${v}-on`);
      const [bg, on] = BG[v];
      await page.mouse.move(0, 0);
      await expect(b).toHaveAttribute('pressed', '');
      const sel = await expected(page, bg, on, PCT.selected);
      await expect
        .poll(async () => near(await painted(b, 'base'), sel))
        .toBe(true);
      expect(await css(b, 'text-decoration-line')).toBe('underline');
      await b.hover();
      const selHover = await expected(page, bg, on, PCT['selected+hover']);
      await expect
        .poll(async () => near(await painted(b, 'base'), selHover))
        .toBe(true);
      // The unpressed twin has neither the layer nor the underline.
      expect(await css(page.locator(`#${v}`), 'text-decoration-line')).toBe(
        'none',
      );
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
        await probe(page, 'var(--prism-color-text-muted)', 'color'),
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
    await probe(page, 'var(--prism-color-border-strong)', 'border-top-color'),
  );
});

test('destructive rest fill equals the error box (error-surface) over bg', async ({
  page,
}) => {
  await setup(page);
  const box = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const x = c.getContext('2d')!;
    const cs = getComputedStyle(document.documentElement);
    x.fillStyle = cs.getPropertyValue('--prism-color-bg');
    x.fillRect(0, 0, 1, 1);
    const p = document.createElement('div');
    p.style.color = 'var(--prism-color-error-surface)';
    document.body.append(p);
    x.fillStyle = getComputedStyle(p).color;
    p.remove();
    x.fillRect(0, 0, 1, 1);
    return [...x.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  });
  const btn = await page.locator('#destructive').evaluate((el) => {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    const x = c.getContext('2d')!;
    x.fillStyle = getComputedStyle(
      el.shadowRoot!.querySelector('[part=base]')!,
    ).backgroundColor;
    x.fillRect(0, 0, 1, 1);
    return [...x.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  });
  console.log('error box', box, 'button', btn);
  btn.forEach((v, i) => expect(Math.abs(v - box[i]!)).toBeLessThanOrEqual(1));
});

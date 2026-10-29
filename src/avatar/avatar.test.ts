import { expect, test, type Page } from '@playwright/test';
import { mount } from '../../test/fixture.js';

async function setup(page: Page, markup: string) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await mount(page, markup);
  await page.addStyleTag({ path: 'src/tokens/tokens.css' });
  await page.addStyleTag({ path: 'src/theme/theme.css' });
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 60))),
  );
  return errors;
}

const PIC =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="red"/></svg>',
  );

test('initials: first and last word, upper case, at most two', async ({
  page,
}) => {
  const names = ['Iris Vale', 'iris', 'Iris Mae de la Vale'];
  await setup(
    page,
    names
      .map((n, i) => `<prism-avatar id="a${i}" name="${n}"></prism-avatar>`)
      .join(''),
  );
  const got = await page.evaluate(() =>
    [...document.querySelectorAll('prism-avatar')].map(
      (el) => el.shadowRoot!.querySelector('[part="initials"]')!.textContent,
    ),
  );
  expect(got).toEqual(['IV', 'I', 'IV']);
});

test.describe('prism-avatar', () => {
  test('role img named by `name`, with initials', async ({ page }) => {
    const errors = await setup(
      page,
      '<prism-avatar name="Iris Vale"></prism-avatar>',
    );
    expect(errors).toEqual([]);
    await expect(page.getByRole('img', { name: 'Iris Vale' })).toHaveCount(1);
    expect(
      await page
        .locator('prism-avatar')
        .evaluate(
          (el) =>
            el.shadowRoot!.querySelector('[part="initials"]')!.textContent,
        ),
    ).toBe('IV');
  });

  test('sizes are 24 / 32 / 40 / 48 / 64px; circle by default, square on request', async ({
    page,
  }) => {
    await setup(
      page,
      ['xs', 'sm', 'md', 'lg', 'xl']
        .map(
          (s) =>
            `<prism-avatar id="${s}" name="Rowan Thorne" size="${s}"></prism-avatar>`,
        )
        .join('') +
        '<prism-avatar id="sq" name="Rowan Thorne" shape="square"></prism-avatar>',
    );
    const px = async (id: string) =>
      Math.round(
        await page
          .locator(`#${id}`)
          .evaluate((el) => el.getBoundingClientRect().width),
      );
    expect([
      await px('xs'),
      await px('sm'),
      await px('md'),
      await px('lg'),
      await px('xl'),
    ]).toEqual([24, 32, 40, 48, 64]);
    const radius = (id: string) =>
      page
        .locator(`#${id}`)
        .evaluate(
          (el) =>
            getComputedStyle(el.shadowRoot!.querySelector('[part="base"]')!)
              .borderTopLeftRadius,
        );
    expect(await radius('md')).toBe('50%');
    expect(await radius('sq')).not.toBe('50%');
  });

  test('a picture shows; a broken one falls back to initials', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-avatar id="ok" name="Quill Mercer" src="${PIC}"></prism-avatar><prism-avatar id="bad" name="Quill Mercer" src="/nope.png"></prism-avatar>`,
    );
    await page.waitForTimeout(300);
    const has = (id: string, part: string) =>
      page
        .locator(`#${id}`)
        .evaluate(
          (el, p) => !!el.shadowRoot!.querySelector(`[part="${p}"]`),
          part,
        );
    expect(await has('ok', 'image')).toBe(true);
    expect(await has('bad', 'image')).toBe(false);
    expect(await has('bad', 'initials')).toBe(true);
  });

  test('decorative hides it from assistive tech', async ({ page }) => {
    await setup(
      page,
      '<prism-avatar name="Iris Vale" decorative></prism-avatar>',
    );
    await expect(page.getByRole('img', { name: 'Iris Vale' })).toHaveCount(0);
    expect(
      await page
        .locator('prism-avatar')
        .evaluate((el) =>
          el
            .shadowRoot!.querySelector('[part="base"]')!
            .getAttribute('aria-hidden'),
        ),
    ).toBe('true');
  });

  test('no name and not decorative is a dev error', async ({ page }) => {
    const errors = await setup(page, '<prism-avatar></prism-avatar>');
    expect(errors.some((e) => e.includes('`name` is required'))).toBe(true);
  });
});

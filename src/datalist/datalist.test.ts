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

const LIST = (
  attrs = '',
) => `<div style="width:360px"><prism-datalist id="d" label="Host details" ${attrs}>
  <prism-datalist-item label="OS">Windows Server 2022</prism-datalist-item>
  <prism-datalist-item label="Sensor">7.14.2</prism-datalist-item>
  <prism-datalist-item label="IP address"><prism-tag>192.0.2.42</prism-tag></prism-datalist-item>
</prism-datalist></div>`;

test.describe('prism-datalist', () => {
  test('a named list of list items; each label is a term and each value a definition', async ({
    page,
  }) => {
    const errors = await setup(page, LIST());
    expect(errors).toEqual([]);
    await expect(page.getByRole('list', { name: 'Host details' })).toHaveCount(
      1,
    );
    await expect(page.getByRole('listitem')).toHaveCount(3);
    await expect(page.getByRole('term')).toHaveCount(3);
    await expect(page.getByRole('definition')).toHaveCount(3);
    await expect(page.getByRole('term').first()).toHaveText('OS');
  });

  test('horizontal: labels share one column so values line up', async ({
    page,
  }) => {
    await setup(page, LIST());
    const xs = await page.evaluate(() =>
      [...document.querySelectorAll('prism-datalist-item')].map(
        (i) =>
          i.shadowRoot!.querySelector('[part="value"]')!.getBoundingClientRect()
            .left,
      ),
    );
    expect(new Set(xs.map(Math.round)).size).toBe(1);
  });

  test('vertical: the label sits above its value', async ({ page }) => {
    await setup(page, LIST('orientation="vertical"'));
    const r = await page.evaluate(() => {
      const i = document.querySelector('prism-datalist-item')!;
      const l = i
        .shadowRoot!.querySelector('[part="label"]')!
        .getBoundingClientRect();
      const v = i
        .shadowRoot!.querySelector('[part="value"]')!
        .getBoundingClientRect();
      return {
        above: l.bottom <= v.top + 1,
        sameX: Math.round(l.left) === Math.round(v.left),
      };
    });
    expect(r).toEqual({ above: true, sameX: true });
  });

  test('a value can hold other components', async ({ page }) => {
    await setup(page, LIST());
    await expect(page.locator('prism-datalist-item prism-tag')).toBeVisible();
  });

  test('an item with no label is a dev error', async ({ page }) => {
    const errors = await setup(
      page,
      '<prism-datalist label="x"><prism-datalist-item>v</prism-datalist-item></prism-datalist>',
    );
    expect(errors.some((e) => e.includes('`label` is required'))).toBe(true);
  });
});

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

test.describe('prism-progress', () => {
  test('role progressbar with valuemin, valuemax, valuenow and a name', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      '<prism-progress label="Storage used" value="60"></prism-progress>',
    );
    expect(errors).toEqual([]);
    const bar = page.getByRole('progressbar', { name: 'Storage used' });
    await expect(bar).toHaveAttribute('aria-valuemin', '0');
    await expect(bar).toHaveAttribute('aria-valuemax', '100');
    await expect(bar).toHaveAttribute('aria-valuenow', '60');
  });

  test('the fill length follows value and max', async ({ page }) => {
    await setup(
      page,
      '<div style="width:200px"><prism-progress id="p" label="Setup" value="3" max="5"></prism-progress></div>',
    );
    const w = await page.locator('#p').evaluate((el) => {
      const track = el.shadowRoot!.querySelector('[part="track"]')!;
      const fill = el.shadowRoot!.querySelector('[part="fill"]')!;
      return (
        fill.getBoundingClientRect().width /
        (track.getBoundingClientRect().width - 2)
      );
    });
    expect(w).toBeCloseTo(0.6, 1);
  });

  test('values are clamped to 0..max', async ({ page }) => {
    await setup(
      page,
      '<prism-progress id="a" label="A" value="150"></prism-progress><prism-progress id="b" label="B" value="-5"></prism-progress>',
    );
    await expect(page.getByRole('progressbar', { name: 'A' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
    await expect(page.getByRole('progressbar', { name: 'B' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    );
  });

  test('show-value writes the percent, or value-text (also the aria-valuetext)', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-progress id="a" label="Storage" value="60" show-value></prism-progress><prism-progress id="b" label="Setup" value="3" max="5" value-text="3 of 5 steps" show-value></prism-progress>',
    );
    const text = (id: string) =>
      page
        .locator(`#${id}`)
        .evaluate(
          (el) => el.shadowRoot!.querySelector('[part="value"]')!.textContent,
        );
    expect(await text('a')).toBe('60%');
    expect(await text('b')).toBe('3 of 5 steps');
    await expect(
      page.getByRole('progressbar', { name: 'Setup' }),
    ).toHaveAttribute('aria-valuetext', '3 of 5 steps');
  });

  test('indeterminate: no valuenow, a state, and the stripe stops under reduced motion', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-progress id="p" label="Loading"></prism-progress>',
    );
    const bar = page.getByRole('progressbar', { name: 'Loading' });
    expect(await bar.getAttribute('aria-valuenow')).toBeNull();
    const anim = () =>
      page
        .locator('#p')
        .evaluate(
          (el) =>
            getComputedStyle(el.shadowRoot!.querySelector('[part="fill"]')!)
              .animationName,
        );
    expect(await anim()).toBe('prism-progress-slide');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await anim()).toBe('none');
  });

  test('the label is visible; hide-label keeps the name but hides it from sight', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-progress id="a" label="Visible" value="10"></prism-progress><prism-progress id="b" label="Hidden" value="10" hide-label></prism-progress>',
    );
    await expect(page.getByText('Visible')).toBeVisible();
    const w = await page
      .locator('#b')
      .evaluate(
        (el) =>
          el
            .shadowRoot!.querySelector('[part="label"]')!
            .getBoundingClientRect().width,
      );
    expect(w).toBeLessThanOrEqual(1);
    await expect(page.getByRole('progressbar', { name: 'Hidden' })).toHaveCount(
      1,
    );
  });

  test('a bar with no label is a dev error', async ({ page }) => {
    const errors = await setup(
      page,
      '<prism-progress value="5"></prism-progress>',
    );
    expect(errors.some((e) => e.includes('`label` is required'))).toBe(true);
  });

  test('fill and track are painted and differ', async ({ page }) => {
    await setup(
      page,
      '<prism-progress id="p" label="X" value="50" tone="success"></prism-progress>',
    );
    const c = await page.locator('#p').evaluate((el) => {
      const f = getComputedStyle(
        el.shadowRoot!.querySelector('[part="fill"]')!,
      ).backgroundColor;
      const t = getComputedStyle(
        el.shadowRoot!.querySelector('[part="track"]')!,
      ).backgroundColor;
      return { f, t };
    });
    expect(c.f).not.toBe(c.t);
    expect(c.f).not.toBe('rgba(0, 0, 0, 0)');
  });
});

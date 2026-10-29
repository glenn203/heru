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
const box = (page: Page, sel: string) =>
  page.locator(sel).evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el.shadowRoot!.querySelector('[part="base"]')!);
    return { w: r.width, h: r.height, bg: cs.backgroundColor, color: cs.color };
  });

test.describe('prism-badge', () => {
  test('count: the number, inside the control it counts, which reads "Alerts 48"', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      '<prism-button id="b" variant="ghost">Alerts <prism-badge count="48"></prism-badge></prism-button>',
    );
    expect(errors).toEqual([]);
    await expect(page.getByRole('button', { name: 'Alerts 48' })).toHaveCount(
      1,
    );
  });

  test('over the cap it shows 99+ and says "more than 99" to a screen reader', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-button variant="ghost">Hosts <prism-badge id="b" count="128"></prism-badge></prism-button>',
    );
    const r = await page.locator('#b').evaluate((el) => {
      const base = el.shadowRoot!.querySelector('[part="base"]')!;
      return {
        visible: base.querySelector('[aria-hidden="true"]')!.textContent,
        spoken: base.querySelector('.visually-hidden')!.textContent,
      };
    });
    expect(r).toEqual({ visible: '99+', spoken: 'more than 99' });
    await expect(
      page.getByRole('button', { name: 'Hosts more than 99' }),
    ).toHaveCount(1);
  });

  test('the cap is a prop', async ({ page }) => {
    await setup(page, '<prism-badge id="b" count="12" max="9"></prism-badge>');
    expect(
      await page.locator('#b').evaluate((el) => el.shadowRoot!.textContent),
    ).toContain('9+');
  });

  test('a zero count is hidden unless show-zero', async ({ page }) => {
    await setup(
      page,
      '<prism-badge id="a" count="0"></prism-badge><prism-badge id="b" count="0" show-zero></prism-badge>',
    );
    expect((await box(page, '#a')).w).toBe(0);
    expect((await box(page, '#b')).w).toBeGreaterThan(0);
  });

  test('status: the word, a dot, tones follow the status', async ({ page }) => {
    await setup(
      page,
      ['live', 'running', 'stopped']
        .map(
          (s) =>
            `<prism-badge id="${s}" job="status" status="${s}"></prism-badge>`,
        )
        .join(''),
    );
    for (const [s, word] of [
      ['live', 'Live'],
      ['running', 'Running'],
      ['stopped', 'Stopped'],
    ] as const) {
      const r = await page.locator(`#${s}`).evaluate((el) => ({
        text: el
          .shadowRoot!.querySelector('[part="base"]')!
          .textContent!.trim(),
        dot: !!el.shadowRoot!.querySelector('[part="dot"][aria-hidden="true"]'),
        tone: el.getAttribute('data-prism-tone'),
      }));
      expect(r.text).toBe(word);
      expect(r.dot).toBe(true);
    }
    await expect(page.locator('#live')).toHaveAttribute(
      'data-prism-tone',
      'success',
    );
    await expect(page.locator('#running')).toHaveAttribute(
      'data-prism-tone',
      'info',
    );
    await expect(page.locator('#stopped')).toHaveAttribute(
      'data-prism-tone',
      'neutral',
    );
    const [l, r, s] = [
      await box(page, '#live'),
      await box(page, '#running'),
      await box(page, '#stopped'),
    ];
    expect(new Set([l.bg, r.bg, s.bg]).size).toBe(3);
  });

  test('Live pulses its dot; reduced motion stops it', async ({ page }) => {
    await setup(
      page,
      '<prism-badge id="b" job="status" status="live"></prism-badge>',
    );
    const anim = () =>
      page
        .locator('#b')
        .evaluate(
          (el) =>
            getComputedStyle(el.shadowRoot!.querySelector('[part="dot"]')!)
              .animationName,
        );
    expect(await anim()).toBe('prism-badge-pulse');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await anim()).toBe('none');
  });

  test('a custom prefix icon replaces the dot', async ({ page }) => {
    await setup(
      page,
      '<prism-badge id="b" job="status" status="running"><svg slot="icon" id="i" width="16" height="16" aria-hidden="true"></svg></prism-badge>',
    );
    await expect(page.locator('#i')).toBeVisible();
  });

  test('status without a value is a dev error', async ({ page }) => {
    const errors = await setup(
      page,
      '<prism-badge job="status"></prism-badge>',
    );
    expect(errors.some((e) => e.includes('`status` is required'))).toBe(true);
  });

  test('tone overrides the default', async ({ page }) => {
    await setup(
      page,
      '<prism-badge id="b" count="3" tone="danger"></prism-badge>',
    );
    await expect(page.locator('#b')).toHaveAttribute(
      'data-prism-tone',
      'danger',
    );
  });
});

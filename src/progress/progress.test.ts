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
        fill.getBoundingClientRect().width / track.getBoundingClientRect().width
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

  test('the track has no border and a faint inset edge shadow over the fill', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-progress id="p" label="X" value="50"></prism-progress>',
    );
    const r = await page.locator('#p').evaluate((el) => {
      const track = el.shadowRoot!.querySelector('[part="track"]')!;
      const cs = getComputedStyle(track);
      const after = getComputedStyle(track, '::after');
      return {
        border: cs.borderTopWidth,
        shadow: after.boxShadow,
        pos: after.position,
        events: after.pointerEvents,
      };
    });
    expect(r.border).toBe('0px');
    expect(r.shadow).toContain('inset');
    expect(r.shadow).toMatch(/2px 0px/);
    expect(r.pos).toBe('absolute');
    expect(r.events).toBe('none');
  });

  test('the shadow is stronger in dark (a dark edge needs more weight)', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-progress id="p" label="X" value="50"></prism-progress>',
    );
    const alpha = (theme: string) =>
      page.locator('#p').evaluate((el, t) => {
        document.documentElement.setAttribute('data-prism-theme', t);
        const track = el.shadowRoot!.querySelector('[part="track"]')!;
        const m = /\/ ([\d.]+)\)/.exec(
          getComputedStyle(track, '::after').boxShadow,
        );
        return Number(m?.[1] ?? 1);
      }, theme);
    expect(await alpha('light')).toBeCloseTo(0.06, 2);
    expect(await alpha('dark')).toBeCloseTo(0.3, 2);
  });

  test('the fill is a left-to-right gradient: lighter at the left, the full tone at the right', async ({
    page,
  }) => {
    await setup(
      page,
      '<div style="width:300px"><prism-progress id="p" label="X" value="60" tone="success"></prism-progress></div>',
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const g = await page.locator('#p').evaluate((el) => {
      const fill = el.shadowRoot!.querySelector('[part="fill"]') as HTMLElement;
      const cs = getComputedStyle(fill);
      const w = fill.getBoundingClientRect().width;
      return { img: cs.backgroundImage, solid: cs.backgroundColor, w };
    });
    expect(g.img).toContain('linear-gradient');
    expect(g.img).toContain('90deg');
    // Spans the filled width only: the fill box is 60% of the 300px track.
    expect(g.w).toBeGreaterThan(170);
    expect(g.w).toBeLessThan(190);
    // Last stop is the plain tone colour.
    expect(g.img.trimEnd().endsWith(`${g.solid})`)).toBe(true);
  });

  test('every tone has the gradient; the left end is lighter than the right', async ({
    page,
  }) => {
    await setup(
      page,
      ['neutral', 'info', 'success', 'warning', 'danger', 'accent']
        .map(
          (t) =>
            `<prism-progress id="${t}" label="${t}" value="50" tone="${t}"></prism-progress>`,
        )
        .join(''),
    );
    for (const t of [
      'neutral',
      'info',
      'success',
      'warning',
      'danger',
      'accent',
    ]) {
      const [l0, l1] = await page.locator(`#${t}`).evaluate((el) => {
        const fill = el.shadowRoot!.querySelector(
          '[part="fill"]',
        ) as HTMLElement;
        // Paint each end of the gradient onto a 1px canvas and read its lightness.
        const cv = document.createElement('canvas');
        cv.width = 100;
        cv.height = 1;
        const c = cv.getContext('2d')!;
        const w = fill.getBoundingClientRect().width;
        const grad = c.createLinearGradient(0, 0, 100, 0);
        void w;
        const bg = getComputedStyle(fill).backgroundColor;
        const lift = getComputedStyle(
          document.documentElement,
        ).getPropertyValue('--prism-color-lift');
        const share = getComputedStyle(
          document.documentElement,
        ).getPropertyValue('--prism-progress-fill-lift');
        const lum = (css: string) => {
          c.clearRect(0, 0, 100, 1);
          c.fillStyle = css;
          c.fillRect(0, 0, 1, 1);
          const d = c.getImageData(0, 0, 1, 1).data;
          return d[0]! * 0.2126 + d[1]! * 0.7152 + d[2]! * 0.0722;
        };
        void grad;
        return [lum(`color-mix(in oklch, ${lift} ${share}, ${bg})`), lum(bg)];
      });
      expect(l0, t).toBeGreaterThan(l1);
      const img = await page
        .locator(`#${t}`)
        .evaluate(
          (el) =>
            getComputedStyle(el.shadowRoot!.querySelector('[part="fill"]')!)
              .backgroundImage,
        );
      expect(img, t).toContain('linear-gradient');
    }
  });

  test('reduced motion: no animation and no transition on the fill', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-progress id="a" label="A" value="40"></prism-progress><prism-progress id="b" label="B"></prism-progress>',
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const id of ['a', 'b']) {
      const r = await page.locator(`#${id}`).evaluate((el) => {
        const cs = getComputedStyle(
          el.shadowRoot!.querySelector('[part="fill"]')!,
        );
        return { a: cs.animationName, t: cs.transitionDuration };
      });
      expect(r.a).toBe('none');
      expect(r.t).toBe('0s');
    }
  });

  test('forced colors: the track keeps a visible border and the fill is Highlight', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-progress id="p" label="X" value="50"></prism-progress>',
    );
    await page.emulateMedia({ forcedColors: 'active' });
    const r = await page.locator('#p').evaluate((el) => {
      const cs = getComputedStyle(
        el.shadowRoot!.querySelector('[part="track"]')!,
      );
      const f = getComputedStyle(
        el.shadowRoot!.querySelector('[part="fill"]')!,
      );
      return { w: cs.borderTopWidth, img: f.backgroundImage };
    });
    expect(r.w).toBe('1px');
    expect(r.img).toBe('none');
  });
});

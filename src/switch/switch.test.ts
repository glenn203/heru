import { expect, test, type Page } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { captureSubmit, mount, submitted } from '../../test/fixture.js';

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

const sw = (page: Page, name: string) =>
  page.getByRole('switch', { name, exact: true });
const settle = (page: Page, ms = 350) =>
  page.evaluate((ms) => new Promise((r) => setTimeout(r, ms)), ms);

test.describe('prism-switch: semantics', () => {
  test('role switch, named by its label, aria-checked follows state', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      '<prism-switch label="Auto-refresh"></prism-switch><prism-switch label="Dark preview" checked></prism-switch>',
    );
    expect(errors).toEqual([]);
    await expect(sw(page, 'Auto-refresh')).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await expect(sw(page, 'Dark preview')).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('click, Space and Enter toggle; the label click toggles too', async ({
    page,
  }) => {
    await setup(page, '<prism-switch label="Auto-refresh"></prism-switch>');
    const s = sw(page, 'Auto-refresh');
    await s.click();
    await expect(s).toHaveAttribute('aria-checked', 'true');
    await page.getByText('Auto-refresh').click();
    await expect(s).toHaveAttribute('aria-checked', 'false');
    await s.focus();
    await expect(s).toBeFocused();
    await page.keyboard.press('Space');
    await expect(s).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Enter');
    await expect(s).toHaveAttribute('aria-checked', 'false');
  });

  test('fires input and change once per user toggle, not for property changes', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-switch id="s" label="Auto-refresh"></prism-switch>',
    );
    await page.evaluate(() => {
      const w = window as unknown as { log: string[] };
      w.log = [];
      const el = document.querySelector('#s')!;
      for (const t of ['input', 'change'])
        el.addEventListener(t, () => w.log.push(t));
    });
    await sw(page, 'Auto-refresh').click();
    expect(
      await page.evaluate(() => (window as never as { log: string[] }).log),
    ).toEqual(['input', 'change']);
    await page.evaluate(() => {
      (
        document.querySelector('#s') as HTMLElement & { checked: boolean }
      ).checked = false;
    });
    await settle(page, 50);
    expect(
      await page.evaluate(() => (window as never as { log: string[] }).log),
    ).toHaveLength(2);
  });

  test('host.click() toggles and checked is reflected with :state(checked)', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-switch id="s" label="Auto-refresh"></prism-switch>',
    );
    const state = () =>
      page.locator('#s').evaluate((el) => ({
        attr: el.hasAttribute('checked'),
        css: el.matches(':state(checked)'),
      }));
    expect(await state()).toEqual({ attr: false, css: false });
    await page.locator('#s').evaluate((el) => (el as HTMLElement).click());
    expect(await state()).toEqual({ attr: true, css: true });
  });

  test('hide-label keeps the name but not the text on screen', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-switch id="s" label="Dark preview" hide-label></prism-switch>',
    );
    await expect(sw(page, 'Dark preview')).toBeVisible();
    const box = await page.locator('#s').evaluate((el) => {
      const l = el
        .shadowRoot!.querySelector('[part="label"]')!
        .getBoundingClientRect();
      return { w: l.width, h: l.height };
    });
    expect(box.w).toBeLessThanOrEqual(1);
    expect(box.h).toBeLessThanOrEqual(1);
  });

  test('label-position=start puts the label before the track', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-switch id="s" label="Auto-refresh" label-position="start"></prism-switch>',
    );
    const order = await page.locator('#s').evaluate((el) => {
      const l = el
        .shadowRoot!.querySelector('[part="label"]')!
        .getBoundingClientRect();
      const b = el
        .shadowRoot!.querySelector('[part="base"]')!
        .getBoundingClientRect();
      return l.left < b.left;
    });
    expect(order).toBe(true);
  });

  test('a missing label is reported', async ({ page }) => {
    const errors = await setup(page, '<prism-switch></prism-switch>');
    expect(errors.join()).toContain('`label` is required');
  });
});

test.describe('prism-switch: disabled', () => {
  test('disabled does not toggle, is not focusable and shows :state(disabled)', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-switch id="s" label="Sync" disabled></prism-switch>',
    );
    const s = sw(page, 'Sync');
    await expect(s).toBeDisabled();
    await page.locator('#s').click({ force: true });
    await expect(s).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('Tab');
    await expect(s).not.toBeFocused();
    expect(
      await page.locator('#s').evaluate((el) => el.matches(':state(disabled)')),
    ).toBe(true);
  });

  test('disabled by an ancestor fieldset', async ({ page }) => {
    await setup(
      page,
      '<form><fieldset disabled><prism-switch label="Sync"></prism-switch></fieldset></form>',
    );
    await expect(sw(page, 'Sync')).toBeDisabled();
  });

  test('a disabled switch gets no hover overlay', async ({ page }) => {
    await setup(
      page,
      '<prism-switch id="s" label="Sync" disabled></prism-switch>',
    );
    await page.locator('#s').hover({ force: true });
    expect(await overlayAlpha(page)).toBe(0);
  });
});

test.describe('prism-switch: forms', () => {
  test('submits value while on, nothing while off', async ({ page }) => {
    await setup(
      page,
      '<form><prism-switch label="A" name="a" checked></prism-switch><prism-switch label="B" name="b" value="yes"></prism-switch><prism-switch label="C" name="c" value="yes"></prism-switch><button>go</button></form>',
    );
    await captureSubmit(page);
    await sw(page, 'C').click();
    await page.getByRole('button', { name: 'go' }).click();
    expect(await submitted(page)).toEqual({ a: 'on', c: 'yes' });
  });

  test('form reset returns to the starting state', async ({ page }) => {
    await setup(
      page,
      '<form><prism-switch label="A" name="a" checked></prism-switch><prism-switch label="B" name="b"></prism-switch></form>',
    );
    await sw(page, 'A').click();
    await sw(page, 'B').click();
    await expect(sw(page, 'A')).toHaveAttribute('aria-checked', 'false');
    await page.locator('form').evaluate((f: HTMLFormElement) => f.reset());
    await expect(sw(page, 'A')).toHaveAttribute('aria-checked', 'true');
    await expect(sw(page, 'B')).toHaveAttribute('aria-checked', 'false');
  });
});

// ---- look and motion ----

const geometry = (page: Page, selector: string) =>
  page.locator(selector).evaluate((el) => {
    const r = (p: string) =>
      el.shadowRoot!.querySelector(`[part="${p}"]`)!.getBoundingClientRect();
    const base = r('base');
    const thumb = r('thumb');
    return {
      track: { w: base.width, h: base.height, x: base.left },
      thumb: { w: thumb.width, h: thumb.height, x: thumb.left },
    };
  });

test.describe('prism-switch: shape', () => {
  test('flat, wide track with a pill thumb, three sizes, 24px minimum target', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-switch id="sm" size="sm" label="S"></prism-switch><prism-switch id="md" label="M"></prism-switch><prism-switch id="lg" size="lg" label="L"></prism-switch>',
    );
    const heights: number[] = [];
    for (const id of ['sm', 'md', 'lg']) {
      const g = await geometry(page, `#${id}`);
      expect(g.track.w).toBeGreaterThanOrEqual(g.track.h * 1.8); // wide
      expect(g.thumb.w).toBeGreaterThan(g.thumb.h); // pill, not a circle
      expect(g.track.h).toBeGreaterThanOrEqual(24);
      heights.push(g.track.h);
    }
    expect(heights[0]).toBeLessThan(heights[1]!);
    expect(heights[1]).toBeLessThan(heights[2]!);
  });

  test('flat: no shadow or gradient on the thumb, the wash or the resting track', async ({
    page,
  }) => {
    await setup(page, '<prism-switch id="s" label="S" checked></prism-switch>');
    const r = await page.locator('#s').evaluate((el) => {
      const cs = (p: string) =>
        getComputedStyle(el.shadowRoot!.querySelector(`[part="${p}"]`)!);
      return {
        thumb: cs('thumb').boxShadow,
        wash: cs('wash').boxShadow,
        // The resting focus ring has zero spread, so it draws nothing.
        base: cs('base')
          .boxShadow.split(/\)\s*,\s*/)
          .every((l) => /0px 0px 0px 0px\s*\)?$/.test(l)),
        images: ['base', 'thumb', 'wash'].map((p) => cs(p).backgroundImage),
      };
    });
    expect(r.thumb).toBe('none');
    expect(r.wash).toBe('none');
    expect(r.base).toBe(true);
    expect(r.images).toEqual(['none', 'none', 'none']);
  });

  test('the thumb sits at the start when off and at the end when on', async ({
    page,
  }) => {
    await setup(page, '<prism-switch id="s" label="S"></prism-switch>');
    const off = await geometry(page, '#s');
    await sw(page, 'S').click();
    await settle(page);
    const on = await geometry(page, '#s');
    expect(off.thumb.x - off.track.x).toBeLessThan(6);
    const gap = on.track.x + on.track.w - (on.thumb.x + on.thumb.w);
    expect(gap).toBeLessThan(6);
    expect(on.thumb.x).toBeGreaterThan(off.thumb.x + 10);
  });

  test('rtl mirrors the travel', async ({ page }) => {
    await setup(
      page,
      '<div dir="rtl"><prism-switch id="s" label="S"></prism-switch></div>',
    );
    const off = await geometry(page, '#s');
    await sw(page, 'S').click();
    await settle(page);
    const on = await geometry(page, '#s');
    expect(on.thumb.x).toBeLessThan(off.thumb.x - 10);
  });
});

test.describe('prism-switch: motion', () => {
  test('the thumb stretches like a liquid drop, then springs back, in under 250ms', async ({
    page,
  }) => {
    await setup(page, '<prism-switch id="s" label="S"></prism-switch>');
    await sw(page, 'S').click();
    const info = await page.locator('#s').evaluate((el) => {
      const thumb = el.shadowRoot!.querySelector(
        '[part="thumb"]',
      ) as HTMLElement;
      const anims = thumb.getAnimations();
      const stretch = anims.find((a) => !(a instanceof CSSTransition))!;
      const timing = stretch.effect!.getComputedTiming();
      const frames = (stretch.effect as KeyframeEffect).getKeyframes();
      // Sample the stretch at 36% of the way through: widest and flattest.
      stretch.pause();
      stretch.currentTime = (timing.duration as number) * 0.36;
      const peak = getComputedStyle(thumb).scale;
      stretch.currentTime = (timing.duration as number) * 0.99;
      const end = getComputedStyle(thumb).scale;
      const total = Math.max(
        ...[el.shadowRoot!.querySelector('[part="wash"]')!, thumb].flatMap(
          (n) =>
            n
              .getAnimations()
              .map((a) => Number(a.effect!.getComputedTiming().endTime)),
        ),
      );
      return { dur: timing.duration, peak, end, total, n: frames.length };
    });
    expect(info.dur).toBeGreaterThan(150);
    expect(info.dur).toBeLessThanOrEqual(250);
    expect(info.total).toBeLessThanOrEqual(250);
    const [px, py] = info.peak.split(' ').map(Number) as [number, number];
    expect(px).toBeGreaterThan(1.4); // stretched along its travel
    expect(py).toBeLessThan(0.9); // and flattened
    const [ex] = info.end.split(' ').map(Number) as [number];
    expect(Math.abs(ex - 1)).toBeLessThan(0.05); // back in shape
  });

  test('the track wash spreads from the thumb: clip circle grows on, shrinks off', async ({
    page,
  }) => {
    await setup(page, '<prism-switch id="s" label="S"></prism-switch>');
    const clip = () =>
      page
        .locator('#s')
        .evaluate(
          (el) =>
            getComputedStyle(el.shadowRoot!.querySelector('[part="wash"]')!)
              .clipPath,
        );
    expect(await clip()).toMatch(/^circle\(0px at/);
    await sw(page, 'S').click();
    await settle(page);
    expect(await clip()).toMatch(/^circle\(150% at/);
    const dur = await page
      .locator('#s')
      .evaluate(
        (el) =>
          getComputedStyle(el.shadowRoot!.querySelector('[part="wash"]')!)
            .transitionDuration,
      );
    expect(parseFloat(dur) * 1000).toBeLessThanOrEqual(250);
  });

  test('reduced motion: no stretch, no slide, no wash transition, no glint', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setup(page, '<prism-switch id="s" label="S"></prism-switch>');
    await sw(page, 'S').click();
    const r = await page.locator('#s').evaluate((el) => {
      const q = (p: string) =>
        el.shadowRoot!.querySelector(`[part="${p}"]`) as HTMLElement;
      const cs = (n: Element, pe?: string) => getComputedStyle(n, pe);
      return {
        thumbAnims: q('thumb').getAnimations().length,
        baseAnims: q('base').getAnimations({ subtree: true }).length,
        thumbT: cs(q('thumb')).transitionDuration,
        washT: cs(q('wash')).transitionDuration,
        glint: cs(q('base'), '::before').display,
        scale: cs(q('thumb')).scale,
      };
    });
    expect(r.thumbAnims).toBe(0);
    expect(r.baseAnims).toBe(0);
    expect(parseFloat(r.thumbT)).toBe(0);
    expect(parseFloat(r.washT)).toBe(0);
    expect(r.glint).toBe('none');
    expect(r.scale).toBe('none');
  });

  test('the duration can be set with --prism-switch-duration', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-switch id="s" label="S" style="--prism-switch-duration:180ms"></prism-switch>',
    );
    await sw(page, 'S').click();
    const d = await page.locator('#s').evaluate((el) => {
      const a = el
        .shadowRoot!.querySelector('[part="thumb"]')!
        .getAnimations()
        .find((x) => !(x instanceof CSSTransition))!;
      return a.effect!.getComputedTiming().duration;
    });
    expect(d).toBe(180);
  });
});

// ---- state layer ----

/** Alpha of the state overlay drawn above the track (0 when none). */
const overlayAlpha = (page: Page) =>
  page
    .locator('prism-switch')
    .first()
    .evaluate((el) => {
      const base = el.shadowRoot!.querySelector('[part="base"]')!;
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = getComputedStyle(base, '::after').backgroundColor;
      ctx.fillRect(0, 0, 1, 1);
      return ctx.getImageData(0, 0, 1, 1).data[3]! / 255;
    });
const token = (page: Page, name: string) =>
  page.evaluate(
    (name) =>
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(name),
      ) / 100,
    name,
  );

test.describe('prism-switch: state layer (shared 6 / 11 / 15% overlays)', () => {
  test('off: rest none, hover 6%, pressed 12%', async ({ page }) => {
    await setup(page, '<prism-switch id="s" label="S"></prism-switch>');
    expect(await overlayAlpha(page)).toBe(0);
    await sw(page, 'S').hover();
    expect(await overlayAlpha(page)).toBeCloseTo(0.06, 2);
    await page.mouse.down();
    expect(await overlayAlpha(page)).toBeCloseTo(0.12, 2);
    await page.mouse.up();
  });

  test('on: selected 11% at rest, selected and hovered 15%', async ({
    page,
  }) => {
    await setup(page, '<prism-switch id="s" label="S" checked></prism-switch>');
    expect(await overlayAlpha(page)).toBeCloseTo(0.11, 2);
    await sw(page, 'S').hover();
    expect(await overlayAlpha(page)).toBeCloseTo(0.15, 2);
  });

  test('the overlays follow the shared state tokens', async ({ page }) => {
    await setup(page, '<prism-switch id="s" label="S" checked></prism-switch>');
    expect([
      await token(page, '--prism-state-hover'),
      await token(page, '--prism-state-selected'),
      await token(page, '--prism-state-selected-hover'),
    ]).toEqual([0.06, 0.11, 0.15]);
  });
});

// ---- contrast ----

type RGB = [number, number, number];
const lum = ([r, g, b]: RGB) => {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a: RGB, b: RGB) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/**
 * What the eye sees, as sRGB: the page bg, the track (resting fill, or the
 * wash when on, or the border colour), the state overlay over it, the thumb.
 */
async function looks(page: Page, state: 'rest' | 'hover' | 'pressed') {
  if (state !== 'rest') {
    await sw(page, 'S').hover();
    if (state === 'pressed') await page.mouse.down();
  }
  const out = await page.locator('#s').evaluate((el) => {
    const q = (p: string) =>
      el.shadowRoot!.querySelector(`[part="${p}"]`) as HTMLElement;
    const ctx = document
      .createElement('canvas')
      .getContext('2d', { willReadFrequently: true })!;
    const px = (layers: string[]): number[] => {
      ctx.clearRect(0, 0, 1, 1);
      for (const c of layers) {
        ctx.fillStyle = c;
        ctx.fillRect(0, 0, 1, 1);
      }
      return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    };
    const host = el.parentElement!;
    const bg = getComputedStyle(host).backgroundColor;
    const base = q('base');
    const on = base.getAttribute('aria-checked') === 'true';
    const cs = (n: Element, pe?: string) => getComputedStyle(n, pe);
    const fill = on ? cs(q('wash')).backgroundColor : cs(base).backgroundColor;
    const overlay = cs(base, '::after').backgroundColor;
    return {
      bg: px([bg]),
      border: px([bg, cs(base).borderTopColor]),
      track: px([bg, fill, overlay]),
      thumb: px([bg, fill, overlay, cs(q('thumb')).backgroundColor]),
      on,
    };
  });
  if (state === 'pressed') await page.mouse.up();
  return out;
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`prism-switch: AA non-text contrast (${theme})`, () => {
    for (const checked of [false, true]) {
      for (const state of ['rest', 'hover', 'pressed'] as const) {
        test(`${checked ? 'on' : 'off'}, ${state}: track vs page, thumb vs track >= 3:1`, async ({
          page,
        }) => {
          await setup(
            page,
            `<div data-prism-theme="${theme}" style="background:var(--prism-color-bg);padding:24px"><prism-switch id="s" label="S" ${checked ? 'checked' : ''}></prism-switch></div>`,
          );
          const l = await looks(page, state);
          expect(l.on).toBe(checked);
          // The edge of the control: its border when off, its fill when on.
          const edge = checked ? l.track : l.border;
          expect(ratio(edge as RGB, l.bg as RGB)).toBeGreaterThanOrEqual(3);
          // The thumb against the track it sits on.
          expect(ratio(l.thumb as RGB, l.track as RGB)).toBeGreaterThanOrEqual(
            3,
          );
          // The label text.
        });
      }
    }

    test('label text is 4.5:1 on the page', async ({ page }) => {
      await setup(
        page,
        `<div data-prism-theme="${theme}" style="background:var(--prism-color-bg);padding:24px"><prism-switch id="s" label="Auto-refresh"></prism-switch></div>`,
      );
      const r = await page.locator('#s').evaluate((el) => {
        const ctx = document
          .createElement('canvas')
          .getContext('2d', { willReadFrequently: true })!;
        const px = (c: string) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = c;
          ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
        };
        return {
          fg: px(
            getComputedStyle(el.shadowRoot!.querySelector('[part="label"]')!)
              .color,
          ),
          bg: px(getComputedStyle(el.parentElement!).backgroundColor),
        };
      });
      expect(ratio(r.fg as RGB, r.bg as RGB)).toBeGreaterThanOrEqual(4.5);
    });
  });
}

test('focus ring shows on keyboard focus', async ({ page }) => {
  await setup(page, '<prism-switch id="s" label="S"></prism-switch>');
  await page.keyboard.press('Tab');
  const sh = await page
    .locator('#s')
    .evaluate(
      (el) =>
        getComputedStyle(el.shadowRoot!.querySelector('[part="base"]')!)
          .boxShadow,
    );
  expect(sh).not.toMatch(/^(0px 0px 0px 0px [^,]+(, )?)+$/);
});

// ---- axe ----

const AXE = (() => {
  const dir = readdirSync('node_modules/.pnpm').find((d) =>
    d.startsWith('axe-core@'),
  );
  return `node_modules/.pnpm/${dir}/node_modules/axe-core/axe.min.js`;
})();
async function axe(page: Page) {
  await page.addScriptTag({ path: AXE });
  return page.evaluate(async () => {
    const r = await (
      window as unknown as {
        axe: {
          run(
            c: Element,
            o: object,
          ): Promise<{ violations: { id: string; nodes: unknown[] }[] }>;
        };
      }
    ).axe.run(document.querySelector('#root')!, {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'],
    });
    return r.violations.map(
      (v) =>
        `${v.id} (${v.nodes.length}) ${JSON.stringify(v.nodes).slice(0, 600)}`,
    );
  });
}

const ALL = `
  <prism-switch label="Off"></prism-switch>
  <prism-switch label="On" checked></prism-switch>
  <prism-switch label="Small" size="sm"></prism-switch>
  <prism-switch label="Large" size="lg" checked></prism-switch>
  <prism-switch label="Disabled off" disabled></prism-switch>
  <prism-switch label="Disabled on" checked disabled></prism-switch>
  <prism-switch label="Hidden label" hide-label></prism-switch>
  <prism-switch label="Label first" label-position="start"></prism-switch>`;

for (const theme of ['light', 'dark']) {
  test(`axe: no WCAG A/AA violations (${theme})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setup(
      page,
      `<div data-prism-theme="${theme}" style="background:var(--prism-color-bg);color:var(--prism-color-text);padding:16px">${ALL}</div>`,
    );
    expect(await axe(page)).toEqual([]);
  });
}

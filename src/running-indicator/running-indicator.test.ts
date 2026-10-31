import { expect, test, type Page } from '@playwright/test';
import { readdirSync } from 'node:fs';
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

const probe = (page: Page, sel = '#r') =>
  page.locator(sel).evaluate((el) => {
    const root = el.shadowRoot!;
    const cs = (s: string) => getComputedStyle(root.querySelector(s)!);
    return {
      anims: root.querySelector('svg')!.getAnimations({ subtree: true }),
    }.anims.length
      ? {
          ringAnims: [1, 2, 3].map(
            (i) => root.querySelector(`.ring-${i}`)!.getAnimations().length,
          ),
          coreAnims: root.querySelector('.core')!.getAnimations().length,
          ring: [1, 2, 3].map((i) => ({
            opacity: cs(`.ring-${i}`).opacity,
            scale: cs(`.ring-${i}`).scale,
            display: cs(`.ring-${i}`).display,
          })),
        }
      : {
          ringAnims: [0, 0, 0],
          coreAnims: 0,
          ring: [1, 2, 3].map((i) => ({
            opacity: cs(`.ring-${i}`).opacity,
            scale: cs(`.ring-${i}`).scale,
            display: cs(`.ring-${i}`).display,
          })),
        };
  });

test.describe('prism-running-indicator', () => {
  test('role status with the default label "Running"', async ({ page }) => {
    const errors = await setup(
      page,
      '<prism-running-indicator id="r"></prism-running-indicator>',
    );
    expect(errors).toEqual([]);
    const status = page.getByRole('status');
    await expect(status).toHaveText('Running');
    // The graphic is hidden from assistive tech.
    expect(
      await page
        .locator('#r')
        .evaluate((el) =>
          el.shadowRoot!.querySelector('svg')!.getAttribute('aria-hidden'),
        ),
    ).toBe('true');
  });

  test('label changes the status text and show-label shows it', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-running-indicator id="r" label="Export running"></prism-running-indicator><prism-running-indicator id="v" label="Syncing" show-label></prism-running-indicator>',
    );
    await expect(page.getByRole('status', { name: /./ })).toHaveCount(0);
    await expect(page.getByRole('status').first()).toHaveText('Export running');
    const w = (sel: string) =>
      page.locator(sel).evaluate((el) => {
        const r = el
          .shadowRoot!.querySelector('[part="label"]')!
          .getBoundingClientRect();
        return r.width;
      });
    expect(await w('#r')).toBeLessThanOrEqual(1); // there for screen readers only
    expect(await w('#v')).toBeGreaterThan(20); // shown
  });

  test('sm, md and lg are 16, 24 and 40px', async ({ page }) => {
    await setup(
      page,
      '<prism-running-indicator id="a" size="sm"></prism-running-indicator><prism-running-indicator id="b"></prism-running-indicator><prism-running-indicator id="c" size="lg"></prism-running-indicator>',
    );
    const size = (id: string) =>
      page.locator(id).evaluate((el) => {
        const r = el.shadowRoot!.querySelector('svg')!.getBoundingClientRect();
        return [r.width, r.height];
      });
    expect(await size('#a')).toEqual([16, 16]);
    expect(await size('#b')).toEqual([24, 24]);
    expect(await size('#c')).toEqual([40, 40]);
  });

  test('rings spread outward and fade, one third of a cycle apart', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-running-indicator id="r"></prism-running-indicator>',
    );
    const r = await page.locator('#r').evaluate((el) => {
      const root = el.shadowRoot!;
      const out = [1, 2, 3].map((i) => {
        const node = root.querySelector(`.ring-${i}`)!;
        const a = node.getAnimations()[0]!;
        const t = a.effect!.getComputedTiming();
        a.pause();
        const at = (p: number) => {
          a.currentTime = Number(t.delay) + Number(t.duration) * p;
          const cs = getComputedStyle(node);
          return { opacity: Number(cs.opacity), scale: Number(cs.scale) };
        };
        return {
          delay: Number(t.delay),
          duration: Number(t.duration),
          iterations: t.iterations,
          start: at(0.01),
          end: at(0.99),
        };
      });
      return out;
    });
    for (const ring of r) {
      expect(ring.iterations).toBe(Infinity);
      expect(ring.end.scale).toBeGreaterThan(ring.start.scale * 2);
      expect(ring.end.opacity).toBeLessThan(ring.start.opacity);
      expect(ring.end.opacity).toBeLessThan(0.1);
    }
    expect(r[1]!.delay - r[0]!.delay).toBeCloseTo(r[0]!.duration / 3, 0);
    expect(r[2]!.delay - r[1]!.delay).toBeCloseTo(r[0]!.duration / 3, 0);
  });

  test('accent rings fan out through the spectrum; other tones keep one colour', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-running-indicator id="r"></prism-running-indicator><prism-running-indicator id="s" tone="success"></prism-running-indicator>',
    );
    const strokes = (id: string) =>
      page
        .locator(id)
        .evaluate((el) =>
          [1, 2, 3].map(
            (i) =>
              getComputedStyle(el.shadowRoot!.querySelector(`.ring-${i}`)!)
                .stroke,
          ),
        );
    const a = await strokes('#r');
    expect(new Set(a).size).toBe(3);
    const s = await strokes('#s');
    expect(new Set(s).size).toBe(1);
  });

  test('reduced motion: nothing moves, a still halo remains, the label is unchanged', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setup(
      page,
      '<prism-running-indicator id="r"></prism-running-indicator>',
    );
    const p = await probe(page);
    expect(p.ringAnims).toEqual([0, 0, 0]);
    expect(p.coreAnims).toBe(0);
    expect(Number(p.ring[0]!.opacity)).toBeGreaterThan(0);
    await expect(page.getByRole('status')).toHaveText('Running');
  });

  test('the duration can be set with --prism-running-duration', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-running-indicator id="r" style="--prism-running-duration:900ms"></prism-running-indicator>',
    );
    const d = await page
      .locator('#r')
      .evaluate(
        (el) =>
          el
            .shadowRoot!.querySelector('.ring-1')!
            .getAnimations()[0]!
            .effect!.getComputedTiming().duration,
      );
    expect(d).toBe(900);
  });
});

test('in a card header it sits before the title and lines up with its first line', async ({
  page,
}) => {
  const errors = await setup(
    page,
    `<prism-card standalone raised style="max-inline-size:420px">
      <prism-running-indicator id="r" slot="header" data-prism-card-icon size="sm" label="Export running"></prism-running-indicator>
      <prism-card-title id="t" slot="header" level="3">Lumen Bloom export</prism-card-title>
      <prism-tag slot="header" job="status" tone="accent">In progress</prism-tag>
      <p>Preview render</p>
    </prism-card>`,
  );
  expect(errors).toEqual([]);
  const m = await page.evaluate(() => {
    const r = document.querySelector('#r')!.getBoundingClientRect();
    const t = document.querySelector('#t')!.getBoundingClientRect();
    return {
      rRight: r.right,
      tLeft: t.left,
      rMid: r.top + r.height / 2,
      tTop: t.top,
    };
  });
  expect(m.rRight).toBeLessThanOrEqual(m.tLeft);
  // Centred on the title's first 20px line.
  expect(Math.abs(m.rMid - (m.tTop + 10))).toBeLessThanOrEqual(2);
  await expect(page.getByRole('status')).toHaveText('Export running');
});

// ---- contrast: the dot is a non-text mark, 3:1 on the page ----

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

for (const theme of ['light', 'dark']) {
  for (const tone of [
    'accent',
    'neutral',
    'info',
    'success',
    'warning',
    'danger',
  ]) {
    test(`dot is >= 3:1 on the page (${theme}, ${tone})`, async ({ page }) => {
      await setup(
        page,
        `<div data-prism-theme="${theme}" style="background:var(--prism-color-bg);padding:16px"><prism-running-indicator id="r" tone="${tone}"></prism-running-indicator></div>`,
      );
      const c = await page.locator('#r').evaluate((el) => {
        const ctx = document
          .createElement('canvas')
          .getContext('2d', { willReadFrequently: true })!;
        const px = (v: string) => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = v;
          ctx.fillRect(0, 0, 1, 1);
          return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
        };
        return {
          dot: px(
            getComputedStyle(el.shadowRoot!.querySelector('.core')!).fill,
          ),
          bg: px(getComputedStyle(el.parentElement!).backgroundColor),
        };
      });
      expect(ratio(c.dot as RGB, c.bg as RGB)).toBeGreaterThanOrEqual(3);
    });
  }
}

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
  <prism-running-indicator size="sm"></prism-running-indicator>
  <prism-running-indicator show-label label="Export running"></prism-running-indicator>
  <prism-running-indicator size="lg" tone="success" show-label></prism-running-indicator>
  <prism-running-indicator tone="warning" label="Sync running"></prism-running-indicator>`;

for (const theme of ['light', 'dark']) {
  for (const motion of ['reduce', 'no-preference'] as const) {
    test(`axe: no WCAG A/AA violations (${theme}, motion ${motion})`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: motion });
      await setup(
        page,
        `<div data-prism-theme="${theme}" style="background:var(--prism-color-bg);color:var(--prism-color-text);padding:16px">${ALL}</div>`,
      );
      expect(await axe(page)).toEqual([]);
    });
  }
}

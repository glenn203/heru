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

  test('one ring and one dot, in the 24 unit box of the reference pulse', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-running-indicator id="r"></prism-running-indicator>',
    );
    const g = await page.locator('#r').evaluate((el) => {
      const svg = el.shadowRoot!.querySelector('svg')!;
      return {
        viewBox: svg.getAttribute('viewBox'),
        rings: svg.querySelectorAll('.ring').length,
        cores: svg.querySelectorAll('.core').length,
        circles: svg.querySelectorAll('circle').length,
        stroke: getComputedStyle(svg.querySelector('.ring')!).strokeWidth,
      };
    });
    expect(g).toEqual({
      viewBox: '0 0 24 24',
      rings: 1,
      cores: 1,
      circles: 2,
      stroke: '2px',
    });
  });

  test('ring grows r 4 to 9 and fades 0.6 to 0; dot breathes r 4, 4.6, 4 and opacity 1, 0.85, 1', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-running-indicator id="r"></prism-running-indicator>',
    );
    const r = await page.locator('#r').evaluate((el) => {
      const root = el.shadowRoot!;
      const sample = (sel: string, ps: number[]) => {
        const node = root.querySelector(sel)!;
        const a = node.getAnimations()[0]!;
        const t = a.effect!.getComputedTiming();
        a.pause();
        return {
          iterations: t.iterations,
          duration: Number(t.duration),
          delay: Number(t.delay),
          at: ps.map((p) => {
            a.currentTime = Number(t.duration) * p;
            const cs = getComputedStyle(node);
            return { r: parseFloat(cs.r), o: Number(cs.opacity) };
          }),
        };
      };
      // A cycle is 2720ms; the pulse is the first 1920ms (70.588%).
      const pulse = 1920 / 2720;
      return {
        ring: sample('.ring', [0, pulse / 2, pulse, (pulse + 1) / 2, 0.999]),
        core: sample('.core', [0, pulse / 2, pulse, (pulse + 1) / 2, 0.999]),
      };
    });
    const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 1);
    // Ring: starts at the dot's size, 60% opaque, ends at 9 and nothing, then stays gone.
    near(r.ring.at[0]!.r, 4);
    near(r.ring.at[0]!.o, 0.6);
    near(r.ring.at[1]!.r, 6.5);
    near(r.ring.at[1]!.o, 0.3);
    near(r.ring.at[2]!.r, 9);
    near(r.ring.at[2]!.o, 0);
    near(r.ring.at[3]!.o, 0); // invisible in the rest
    near(r.ring.at[4]!.o, 0);
    // Dot: 4 to 4.6 (opacity 0.85) at the middle of the pulse, back to 4 at its end, still in the rest.
    near(r.core.at[0]!.r, 4);
    near(r.core.at[0]!.o, 1);
    near(r.core.at[1]!.r, 4.6);
    near(r.core.at[1]!.o, 0.85);
    near(r.core.at[2]!.r, 4);
    near(r.core.at[2]!.o, 1);
    near(r.core.at[3]!.r, 4);
    near(r.core.at[3]!.o, 1);
    near(r.core.at[4]!.r, 4);
    // Both run the same clock, forever.
    expect(r.ring.duration).toBe(r.core.duration);
    expect(r.ring.delay).toBe(r.core.delay);
    expect(r.ring.iterations).toBe(Infinity);
    expect(r.core.iterations).toBe(Infinity);
  });

  test('timing: a 1.92s pulse then an 800ms rest, 2.72s in all (20% slower than 1.6s)', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-running-indicator id="r"></prism-running-indicator>',
    );
    const t = await page.locator('#r').evaluate((el) => {
      const a = el.shadowRoot!.querySelector('.ring')!.getAnimations()[0]!;
      const kf = (a.effect as KeyframeEffect).getKeyframes();
      return {
        total: Number(a.effect!.getComputedTiming().duration),
        // Offset at which the ring has finished its pulse.
        pulseEnd: kf
          .filter((k) => Number(k.opacity) === 0)
          .map((k) => k.offset)[0],
        easing: kf[0]!.easing,
      };
    });
    expect(t.total).toBe(2720);
    expect(Number(t.pulseEnd) * t.total).toBeCloseTo(1920, 0);
    expect(t.total - 1920).toBe(800);
    expect(1920).toBeCloseTo(1600 * 1.2, 5);
    expect(t.easing).toBe('linear');
  });

  test('the ring and the dot use the tone colour; tone changes both', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-running-indicator id="r"></prism-running-indicator><prism-running-indicator id="s" tone="success"></prism-running-indicator>',
    );
    const colours = (id: string) =>
      page.locator(id).evaluate((el) => {
        const root = el.shadowRoot!;
        return [
          getComputedStyle(root.querySelector('.ring')!).stroke,
          getComputedStyle(root.querySelector('.core')!).fill,
        ];
      });
    const a = await colours('#r');
    const s = await colours('#s');
    expect(a[0]).toBe(a[1]);
    expect(s[0]).toBe(s[1]);
    expect(a[0]).not.toBe(s[0]);
  });

  test('sizes scale the whole drawing: the ring stays inside the box', async ({
    page,
  }) => {
    await setup(
      page,
      '<prism-running-indicator id="a" size="sm"></prism-running-indicator><prism-running-indicator id="c" size="lg"></prism-running-indicator>',
    );
    for (const [id, px] of [
      ['#a', 16],
      ['#c', 40],
    ] as const) {
      const r = await page.locator(id).evaluate((el) => {
        const svg = el.shadowRoot!.querySelector('svg')!;
        const ring = svg.querySelector('.ring')!;
        const a = ring.getAnimations()[0]!;
        a.pause();
        a.currentTime = 1919;
        const box = ring.getBoundingClientRect();
        const outer = svg.getBoundingClientRect();
        return { ring: box.width, outer: outer.width };
      });
      expect(r.outer).toBe(px);
      // Radius 9 (a diameter of 18 units of 24); the stroke adds one more each side, still inside.
      expect(r.ring).toBeCloseTo((18 / 24) * px, 0);
    }
  });

  test('reduced motion: nothing moves, the dot and a faint ring stay, the label is unchanged', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setup(
      page,
      '<prism-running-indicator id="r"></prism-running-indicator>',
    );
    const p = await page.locator('#r').evaluate((el) => {
      const root = el.shadowRoot!;
      const ring = root.querySelector('.ring')!;
      const core = root.querySelector('.core')!;
      return {
        anims: root.querySelector('svg')!.getAnimations({ subtree: true })
          .length,
        ringO: Number(getComputedStyle(ring).opacity),
        coreO: Number(getComputedStyle(core).opacity),
        coreR: parseFloat(getComputedStyle(core).r),
      };
    });
    expect(p.anims).toBe(0);
    expect(p.ringO).toBeGreaterThan(0);
    expect(p.coreO).toBe(1);
    expect(p.coreR).toBe(4);
    await expect(page.getByRole('status')).toHaveText('Running');
  });

  test('the cycle can be set with --prism-running-cycle', async ({ page }) => {
    await setup(
      page,
      '<prism-running-indicator id="r" style="--prism-running-cycle:1800ms"></prism-running-indicator>',
    );
    const d = await page
      .locator('#r')
      .evaluate(
        (el) =>
          el
            .shadowRoot!.querySelector('.ring')!
            .getAnimations()[0]!
            .effect!.getComputedTiming().duration,
      );
    expect(d).toBe(1800);
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

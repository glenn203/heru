import { expect, test, type Page } from '@playwright/test';
import { mount } from '../../test/fixture.js';

/**
 * WCAG 2.2 AA contrast for the Dashboard rows recipe, measured from what is
 * painted: text and icons against the pixel behind them (taken from a render
 * with all glyphs made transparent, so state layers and tints are included),
 * and borders, the focus ring and the drop line against what is next to them.
 * Run in the default, hover, focus, open-menu and dragging states.
 */

const settle = (page: Page, ms = 150) =>
  page.evaluate(
    (ms) =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => setTimeout(() => r(), ms)),
      ),
    ms,
  );

async function setup(page: Page) {
  await page.setViewportSize({ width: 1500, height: 1100 });
  await mount(page, '');
  await page.addStyleTag({ path: 'src/tokens/tokens.css' });
  await page.addStyleTag({ path: 'src/theme/theme.css' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(async () => {
    const path = '/src/card/dashboard-rows.recipe.ts';
    const m = (await import(/* @vite-ignore */ path)) as {
      createDashboardRows(): HTMLElement;
    };
    document.querySelector('#root')!.append(m.createDashboardRows());
    const els = [...document.querySelectorAll('#root *')] as (HTMLElement & {
      updateComplete?: Promise<unknown>;
    })[];
    await Promise.all(els.map((e) => e.updateComplete ?? Promise.resolve()));
  });
  await settle(page, 250);
}

interface Item {
  kind: 'text' | 'icon';
  what: string;
  x: number;
  y: number;
  color: string;
  large: boolean;
  dimmed: boolean;
}

/** Step 1, in the page: what to measure. Step 2 hides glyphs for the render. */
const collect = (page: Page): Promise<Item[]> =>
  page.evaluate(() => {
    const out: Item[] = [];
    const flatParent = (el: Element): Element | null =>
      el.assignedSlot ??
      el.parentElement ??
      (el.getRootNode() as ShadowRoot).host ??
      null;
    const dimmed = (el: Element): boolean => {
      for (let e: Element | null = el; e; e = flatParent(e))
        if (Number(getComputedStyle(e).opacity) < 1) return true;
      return false;
    };
    const visible = (el: Element): boolean => {
      for (let e: Element | null = el; e; e = flatParent(e)) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      }
      return true;
    };
    const walk = (root: ParentNode): void => {
      for (const el of root.querySelectorAll('*')) {
        if (el.shadowRoot) walk(el.shadowRoot);
        if (['STYLE', 'SCRIPT', 'SLOT'].includes(el.tagName)) continue;
        if (el.closest('.dash-sr')) continue;
        if (!visible(el)) continue;
        const cs = getComputedStyle(el);
        if (el instanceof SVGSVGElement) {
          const r = el.getBoundingClientRect();
          if (r.width > 1 && r.height > 1)
            out.push({
              kind: 'icon',
              what: `${(el.getRootNode() as ShadowRoot).host?.localName ?? el.parentElement?.localName ?? ''} svg`,
              x: r.left + r.width / 2 + scrollX,
              y: r.top + r.height / 2 + scrollY,
              color: cs.color,
              large: true,
              dimmed: dimmed(el),
            });
          continue;
        }
        for (const n of el.childNodes) {
          if (n.nodeType !== 3 || !n.textContent!.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(n);
          const r = range.getClientRects()[0];
          if (!r || r.width < 2 || r.height < 2) continue;
          // Slotted text inherits from its slot, not from the host.
          const slot = (n as Text).assignedSlot;
          const tcs = slot ? getComputedStyle(slot) : cs;
          const size = parseFloat(tcs.fontSize);
          const bold = Number(tcs.fontWeight) >= 700;
          out.push({
            kind: 'text',
            what: `${el.localName}: ${n.textContent!.trim().slice(0, 28)}`,
            x: r.left + r.width / 2 + scrollX,
            y: r.top + r.height / 2 + scrollY,
            color: tcs.color,
            large: size >= 24 || (bold && size >= 18.66),
            dimmed: dimmed(el),
          });
        }
      }
    };
    walk(document.querySelector('#root')!);
    return out;
  });

const HIDE = `*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; caret-color: transparent !important; text-decoration-color: transparent !important; }
svg, svg * { stroke: transparent !important; fill: transparent !important; }
[part="dot"], .dot { background-image: none !important; }`;

/** Applies the glyph-hiding sheet to the page and every shadow root. */
const hideGlyphs = (page: Page, on: boolean) =>
  page.evaluate(
    ({ css, on }) => {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      const key = '__hide';
      const w = window as unknown as Record<string, CSSStyleSheet>;
      if (on) w[key] = sheet;
      const roots: (Document | ShadowRoot)[] = [document];
      const find = (r: ParentNode): void => {
        for (const el of r.querySelectorAll('*'))
          if (el.shadowRoot) {
            roots.push(el.shadowRoot);
            find(el.shadowRoot);
          }
      };
      find(document);
      for (const r of roots) {
        const rest = r.adoptedStyleSheets.filter((s) => s !== w[key]);
        r.adoptedStyleSheets = on ? [...rest, w[key]!] : rest;
      }
    },
    { css: HIDE, on },
  );

interface Check {
  what: string;
  ratio: number;
  need: number;
}

/** Step 3, in the page: sample the render and compute the ratios. */
const measure = (
  page: Page,
  png: string,
  items: Item[],
  extra: { what: string; color: string; x: number; y: number; need: number }[],
): Promise<Check[]> =>
  page.evaluate(
    async ({ png, items, extra }) => {
      const img = await createImageBitmap(
        await (await fetch(`data:image/png;base64,${png}`)).blob(),
      );
      const shot = new OffscreenCanvas(img.width, img.height);
      const sctx = shot.getContext('2d', { willReadFrequently: true })!;
      sctx.drawImage(img, 0, 0);
      const px = (x: number, y: number): [number, number, number] => {
        const d = sctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        return [d[0]!, d[1]!, d[2]!];
      };
      const cv = new OffscreenCanvas(1, 1);
      const cx = cv.getContext('2d', { willReadFrequently: true })!;
      /** Any CSS colour over an opaque backdrop, through the canvas. */
      const over = (
        css: string,
        bg: [number, number, number],
      ): [number, number, number] => {
        cx.clearRect(0, 0, 1, 1);
        cx.fillStyle = `rgb(${bg.join(',')})`;
        cx.fillRect(0, 0, 1, 1);
        cx.fillStyle = css;
        cx.fillRect(0, 0, 1, 1);
        const d = cx.getImageData(0, 0, 1, 1).data;
        return [d[0]!, d[1]!, d[2]!];
      };
      const lum = (c: [number, number, number]): number => {
        const f = (v: number): number => {
          const s = v / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
      };
      const ratio = (
        a: [number, number, number],
        b: [number, number, number],
      ): number => {
        const [hi, lo] = [lum(a), lum(b)].sort((p, q) => q - p) as [
          number,
          number,
        ];
        return (hi + 0.05) / (lo + 0.05);
      };
      const out: { what: string; ratio: number; need: number }[] = [];
      for (const it of items) {
        if (it.dimmed) continue;
        const bg = px(it.x, it.y);
        out.push({
          what: `${it.kind} ${it.what}`,
          ratio: ratio(over(it.color, bg), bg),
          need: it.kind === 'icon' || it.large ? 3 : 4.5,
        });
      }
      for (const e of extra) {
        const bg = px(e.x, e.y);
        out.push({
          what: e.what,
          ratio: ratio(over(e.color, bg), bg),
          need: e.need,
        });
      }
      return out;
    },
    { png, items, extra },
  );

/** Run one audit of the current state. Returns every check and the failures. */
async function audit(
  page: Page,
  extra: () => Promise<
    { what: string; color: string; x: number; y: number; need: number }[]
  > = () => Promise.resolve([]),
) {
  const items = await collect(page);
  const more = await extra();
  await hideGlyphs(page, true);
  const png = (await page.screenshot({ fullPage: true })).toString('base64');
  await hideGlyphs(page, false);
  const checks = await measure(page, png, items, more);
  return {
    checks,
    fails: checks.filter((c) => c.ratio < c.need),
    min: (kind: string) =>
      Math.min(
        ...checks.filter((c) => c.what.startsWith(kind)).map((c) => c.ratio),
      ),
  };
}

const fmt = (fails: Check[]) =>
  fails.map((f) => `${f.what}: ${f.ratio.toFixed(2)} < ${String(f.need)}`);

/** Non-text parts: the dashed drop zone, progress track edge, card edge. */
const edges = (page: Page) =>
  page.evaluate(() => {
    const out: {
      what: string;
      color: string;
      x: number;
      y: number;
      need: number;
    }[] = [];
    const zones = [...document.querySelectorAll<HTMLElement>('.dash-zone')];
    for (const z of zones) {
      if (z.querySelector('prism-card')) continue;
      const r = z.getBoundingClientRect();
      out.push({
        what: 'empty drop zone border',
        color: getComputedStyle(z).borderTopColor,
        x: r.left + r.width / 2 + scrollX,
        y: r.top - 6 + scrollY,
        need: 3,
      });
    }
    for (const p of document.querySelectorAll('prism-progress')) {
      const t = p.shadowRoot!.querySelector('[part="track"]')!;
      const r = t.getBoundingClientRect();
      out.push({
        what: 'progress track edge',
        color: getComputedStyle(t).borderTopColor,
        x: r.left + r.width / 2 + scrollX,
        y: r.top - 4 + scrollY,
        need: 3,
      });
      const f = p.shadowRoot!.querySelector('[part="fill"]')!;
      const fr = f.getBoundingClientRect();
      out.push({
        what: 'progress fill',
        color: getComputedStyle(f).backgroundColor,
        x: r.right - 6 + scrollX,
        y: fr.top + fr.height / 2 + scrollY,
        need: 3,
      });
    }
    return out;
  });

test.describe('dashboard rows: contrast (WCAG 2.2 AA)', () => {
  test('default: every text >= 4.5:1, every icon and edge >= 3:1', async ({
    page,
  }) => {
    await setup(page);
    const a = await audit(page, () => edges(page));
    expect(a.checks.length).toBeGreaterThan(60);
    expect(fmt(a.fails)).toEqual([]);
    console.log(
      `default: ${String(a.checks.length)} checks, min text ${a.min('text').toFixed(2)}, min icon ${a.min('icon').toFixed(2)}`,
    );
  });

  test('the audit can fail: pale text and a faint icon are caught', async ({
    page,
  }) => {
    await setup(page);
    await page.addStyleTag({
      content:
        '.dash h2 { color: #bbb !important } prism-card-title { color: #ccc !important }',
    });
    const a = await audit(page);
    expect(a.fails.some((f) => f.what.includes('Row 1'))).toBe(true);
    expect(a.fails.length).toBeGreaterThan(8);
  });

  test('empty row: the note and the dashed border', async ({ page }) => {
    await setup(page);
    for (const t of ['Admin sign-ins', 'Policy changes', 'Reports queued']) {
      await page.getByRole('button', { name: `More options for ${t}` }).click();
      await page.getByRole('menuitem', { name: `Move to row 1, ${t}` }).click();
      await settle(page, 200);
    }
    const a = await audit(page, () => edges(page));
    expect(a.checks.some((c) => c.what.includes('Row 3 is empty'))).toBe(true);
    expect(a.checks.some((c) => c.what === 'empty drop zone border')).toBe(
      true,
    );
    expect(fmt(a.fails)).toEqual([]);
  });

  test('hover on the handle and on the menu button (state layers included)', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setup(page);
    for (const name of [
      'Reorder Hosts online',
      'More options for Hosts online',
    ]) {
      await page.getByRole('button', { name, exact: true }).hover();
      await settle(page, 120);
      const a = await audit(page);
      expect(fmt(a.fails), name).toEqual([]);
      // The hover layer is really painted.
      const bg = await page
        .getByRole('button', { name, exact: true })
        .evaluate((el) => getComputedStyle(el).backgroundImage);
      expect(bg, name).toContain('gradient');
    }
    // Pressed too.
    const b = page.getByRole('button', {
      name: 'More options for Hosts online',
    });
    await b.hover();
    await page.mouse.down();
    await settle(page, 100);
    expect(fmt((await audit(page)).fails)).toEqual([]);
    await page.mouse.up();
  });

  test('keyboard focus ring on the menu button, the handle and Reset: >= 3:1 against the surface and the card', async ({
    page,
  }) => {
    await setup(page);
    const targets = [
      page.getByRole('button', { name: 'More options for Open detections' }),
      page.getByRole('button', {
        name: 'Reorder Open detections',
        exact: true,
      }),
      page.getByRole('button', { name: 'Reset layout' }),
    ];
    for (const t of targets) {
      await t.focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await settle(page, 100);
      const ring = await t.evaluate((el) => {
        const part =
          el.shadowRoot?.querySelector<HTMLElement>(
            '[part="trigger"],[part="base"],button',
          ) ?? (el as HTMLElement);
        const cs = getComputedStyle(part);
        const r = part.getBoundingClientRect();
        return {
          outline: cs.outlineStyle,
          width: cs.outlineWidth,
          color: cs.outlineColor,
          shadow: cs.boxShadow,
          x: r.left + r.width / 2 + scrollX,
          top: r.top + scrollY,
          focusVisible: part.matches(':focus-visible'),
        };
      });
      console.log(JSON.stringify(ring));
      expect(ring.focusVisible).toBe(true);
      // A ring is drawn: an outline or a box-shadow ring.
      expect(ring.outline !== 'none' || ring.shadow !== 'none').toBe(true);
      // The ring is the widest opaque layer of the shadow stack (the inner
      // 1px layer is the gap in the surface colour).
      const layers = [
        ...ring.shadow.matchAll(
          /((?:oklch|rgba?|color)\([^)]*\))\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+([\d.]+)px/g,
        ),
      ]
        .map((m) => ({ c: m[1]!, spread: Number(m[5]) }))
        .filter((l) => !l.c.includes('/'));
      const widest = layers.sort((p, q) => q.spread - p.spread)[0];
      const colour =
        ring.outline !== 'none' &&
        parseFloat(ring.width) > 0 &&
        ring.color !== 'rgba(0, 0, 0, 0)'
          ? ring.color
          : widest!.c;
      const a = await audit(page, () =>
        Promise.resolve([
          {
            what: 'focus ring',
            color: colour,
            x: ring.x,
            y: ring.top - 6,
            need: 3,
          },
        ]),
      );
      expect(fmt(a.fails)).toEqual([]);
    }
  });

  test('menu open: items and the Move to row entries', async ({ page }) => {
    await setup(page);
    await page
      .getByRole('button', { name: 'More options for Open detections' })
      .click();
    await settle(page, 200);
    const a = await audit(page);
    expect(a.checks.some((c) => c.what.includes('Move to row 2'))).toBe(true);
    expect(fmt(a.fails)).toEqual([]);
    // A hovered item too.
    await page
      .getByRole('menuitem', { name: 'Move to row 2, Open detections' })
      .hover();
    await settle(page, 100);
    expect(fmt((await audit(page)).fails)).toEqual([]);
  });

  test('dragging: the copy, the drop line and its dot, and the cards behind', async ({
    page,
  }) => {
    await setup(page);
    const h = (await page
      .getByRole('button', { name: 'Reorder Open detections', exact: true })
      .boundingBox())!;
    const z = (await page.locator('.dash-zone').nth(1).boundingBox())!;
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await page.mouse.down();
    await page.mouse.move(h.x + 30, h.y + 40, { steps: 2 });
    await page.mouse.move(z.x + z.width / 2 + 30, z.y + z.height / 2, {
      steps: 8,
    });
    await settle(page, 120);
    const line = await page.evaluate(() => {
      const lists = [...document.querySelectorAll('prism-card-list')];
      for (const l of lists) {
        const p =
          l.shadowRoot!.querySelector<HTMLElement>('[part="drop-line"]');
        if (p && !p.hidden) {
          const r = p.getBoundingClientRect();
          const dot = p.querySelector('[part="drop-dot"]')!;
          return {
            color: getComputedStyle(p).backgroundColor,
            dot: getComputedStyle(dot).backgroundColor,
            x: r.left + 40 + scrollX,
            y: r.top - 5 + scrollY,
            h: r.height,
          };
        }
      }
      return null;
    });
    expect(line).not.toBeNull();
    const copy = await page.locator('[data-prism-drag-copy]').count();
    expect(copy).toBe(1);
    const a = await audit(page, () =>
      Promise.resolve([
        {
          what: 'drop line',
          color: line!.color,
          x: line!.x,
          y: line!.y,
          need: 3,
        },
      ]),
    );
    expect(fmt(a.fails)).toEqual([]);
    await page.keyboard.press('Escape');
    await page.mouse.up();
  });
});

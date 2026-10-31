import type { Locator, Page } from '@playwright/test';

/**
 * What a state-layer surface actually shows: its background-color with the
 * background-image overlay (linear-gradient(X, X)) composited on top, all over
 * the page bg. Returns RGB bytes so serialisation differences don't matter.
 */
export const painted = (host: Locator, part: string) =>
  host.evaluate((el, part) => {
    const node = el.shadowRoot!.querySelector(`[part~="${part}"]`)!;
    const cs = getComputedStyle(node);
    const img = cs.backgroundImage;
    let ov = 'transparent';
    if (img.startsWith('linear-gradient(')) {
      const body = img.slice('linear-gradient('.length);
      let depth = 0;
      for (let i = 0; i < body.length; i++) {
        const ch = body[i];
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (ch === ',' && depth === 0) {
          ov = body.slice(0, i);
          break;
        }
      }
    }
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
      '--prism-color-bg',
    );
    ctx.fillRect(0, 0, 1, 1);
    for (const c of [cs.backgroundColor, ov]) {
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
    }
    return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  }, part);

/** Expected paint: bg, then --_on-equivalent `on` at `pct` alpha over it. */
export const expected = (page: Page, bg: string, on: string, pct: string) =>
  page.evaluate(
    ([bg, on, pct]) => {
      const d = document.createElement('div');
      document.body.append(d);
      const res = (v: string) => {
        d.style.color = v;
        return getComputedStyle(d).color;
      };
      const ctx = document.createElement('canvas').getContext('2d')!;
      ctx.fillStyle = res('var(--prism-color-bg)');
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = res(bg);
      ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = res(`color-mix(in srgb, ${on} ${pct}, transparent)`);
      ctx.fillRect(0, 0, 1, 1);
      d.remove();
      return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    },
    [bg, on, pct] as [string, string, string],
  );

export const PCT = {
  rest: '0%',
  hover: 'var(--prism-state-hover)',
  pressed: 'var(--prism-state-pressed)',
  selected: 'var(--prism-state-selected)',
  'selected+hover': 'var(--prism-state-selected-hover)',
} as const;

/** Assert two RGB byte triples match within ±1. */
export const near = (a: number[], b: number[]) =>
  a.every((v, i) => Math.abs(v - (b[i] ?? 0)) <= 1);

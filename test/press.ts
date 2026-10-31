import type { Locator, Page } from '@playwright/test';

/** The `scale` the element is drawn at now (1 when none), read in the page. */
export const SCALE_OF = `(el) => { const s = getComputedStyle(el).scale; return s === 'none' ? 1 : parseFloat(s); }`;

/** Computed scale of a shadow part of `host` (or of the host's own element). */
export const scaleOf = (host: Locator, part: string) =>
  host.evaluate((el, part) => {
    const t = el.shadowRoot!.querySelector(part)!;
    const s = getComputedStyle(t).scale;
    return s === 'none' ? 1 : parseFloat(s);
  }, part);

/** Moves the mouse to the middle of `loc` and presses. */
export async function mouseDown(page: Page, loc: Locator) {
  const b = (await loc.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
}

/** Running animations on `part` of `host`: the properties each one moves. */
export const scaleAnims = (host: Locator, part: string) =>
  host.evaluate((el, part) => {
    const skip = ['offset', 'easing', 'composite', 'computedOffset'];
    const t = el.shadowRoot!.querySelector(part)!;
    return t
      .getAnimations()
      .filter((a) => !(a instanceof CSSTransition))
      .map((a) =>
        [
          ...new Set(
            (a.effect as KeyframeEffect)
              .getKeyframes()
              .flatMap((k) => Object.keys(k))
              .filter((p) => !skip.includes(p)),
          ),
        ].join(','),
      );
  }, part);

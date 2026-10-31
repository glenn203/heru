import type { Locator, Page } from '@playwright/test';

export const wait = (page: Page, ms: number) =>
  page.evaluate((ms) => new Promise((r) => setTimeout(r, ms)), ms);

/** Two frames: the first render counts as painted after this. */
export const painted = (page: Page) =>
  page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );

/** Running animations (not transitions) on a part or its pseudo-element. */
export function animsOn(host: Locator, part: string, pseudo?: string) {
  return host.evaluate(
    (el, [part, pseudo]) => {
      const node = el.shadowRoot!.querySelector(`[part="${part}"]`)!;
      return node
        .getAnimations({ subtree: pseudo !== null })
        .filter((a) => !(a instanceof CSSTransition))
        .filter((a) => (a.effect as KeyframeEffect).target === node)
        .filter((a) => (a.effect as KeyframeEffect).pseudoElement === pseudo)
        .map((a) => {
          const fx = a.effect as KeyframeEffect;
          return {
            css: a instanceof CSSAnimation,
            easing: fx.getTiming().easing,
            ms: Number(fx.getTiming().duration),
            props: [
              ...new Set(
                fx
                  .getKeyframes()
                  .flatMap((k) => Object.keys(k))
                  .filter(
                    (p) =>
                      ![
                        'offset',
                        'easing',
                        'composite',
                        'computedOffset',
                      ].includes(p),
                  ),
              ),
            ].sort(),
          };
        });
    },
    [part, pseudo ?? null] as [string, string | null],
  );
}

/**
 * Samples `read` (a function of the host's shadow root) once per frame for
 * `ms`, running each `steps` entry (`run(host)`) at its time. Pure data in,
 * numbers out, so a test can check a move for jumps.
 */
export function recordFrames(
  host: Locator,
  ms: number,
  read: (root: ShadowRoot, host: HTMLElement) => number[],
  steps: { at: number; run: (host: HTMLElement) => void }[] = [],
): Promise<number[][]> {
  return host.evaluate(
    (el, { ms, readSrc, stepSrcs }) => {
      // Test-only: the page cannot receive a function, so it gets the source of
      // one that closes over nothing and rebuilds it.
      /* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-implied-eval */
      const fn = (src: string) => new Function(`return (${src})`)();
      /* eslint-enable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-implied-eval */
      const readFn = fn(readSrc) as (r: ShadowRoot, h: HTMLElement) => number[];
      const todo = stepSrcs.map((s) => ({
        at: s.at,
        run: fn(s.src) as (h: HTMLElement) => void,
        done: false,
      }));
      return new Promise<number[][]>((resolve) => {
        const out: number[][] = [];
        const t0 = performance.now();
        const tick = () => {
          const t = performance.now() - t0;
          for (const s of todo)
            if (!s.done && t >= s.at) {
              s.done = true;
              s.run(el as HTMLElement);
            }
          out.push(readFn(el.shadowRoot!, el as HTMLElement));
          if (t < ms) requestAnimationFrame(tick);
          else resolve(out);
        };
        requestAnimationFrame(tick);
      });
    },
    {
      ms,
      readSrc: read.toString(),
      stepSrcs: steps.map((s) => ({ at: s.at, src: s.run.toString() })),
    },
  );
}

/** Largest change between neighbouring samples in each column. */
export const maxStep = (rows: number[][]): number[] =>
  rows[0]!.map((_, c) =>
    Math.max(...rows.slice(1).map((r, i) => Math.abs(r[c]! - rows[i]![c]!))),
  );

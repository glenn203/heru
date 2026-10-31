import { readdirSync } from 'node:fs';
import type { Page } from '@playwright/test';

const AXE = (() => {
  const dir = readdirSync('node_modules/.pnpm').find((d) =>
    d.startsWith('axe-core@'),
  );
  return `node_modules/.pnpm/${dir}/node_modules/axe-core/axe.min.js`;
})();

/** Runs axe (WCAG 2.x A and AA) over `#root`; returns a line per violation. */
export async function axe(page: Page): Promise<string[]> {
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

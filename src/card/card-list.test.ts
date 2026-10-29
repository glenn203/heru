import { expect, test, type Page } from '@playwright/test';
import { mount } from '../../test/fixture.js';

const settle = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => setTimeout(() => r(), 60)),
      ),
  );
async function setup(page: Page, markup: string, width = 1300) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.setViewportSize({ width, height: 900 });
  await mount(page, markup);
  await page.addStyleTag({ path: 'src/tokens/tokens.css' });
  await page.addStyleTag({ path: 'src/theme/theme.css' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await settle(page);
  return errors;
}
const card = (id: string, extra = '') => `
  <prism-card type="selectable" kind="collection" value="${id}" ${extra}>
    <prism-card-select slot="header"></prism-card-select>
    <prism-card-title slot="header" level="3">Resource ${id}</prism-card-title>
    <prism-card-description slot="header">Lumen Server</prism-card-description>
    <p>Updated 4 min ago</p>
  </prism-card>`;
const cards = (ids: string[]) => ids.map((i) => card(i)).join('');
const LIST = (ids: string[], attrs = '', style = 'width:1300px') =>
  `<prism-card-list id="l" label="Resources" ${attrs} style="${style}">${cards(ids)}</prism-card-list>`;
const ids = (from: number, n: number) =>
  Array.from({ length: n }, (_, i) => `h-${from + i}`);

const listStatus = (page: Page) =>
  page
    .locator('#l')
    .evaluate((el) =>
      String(
        el.shadowRoot!.querySelector('[part="status"]')!.textContent,
      ).trim(),
    );
const columns = (page: Page) =>
  page.locator('#l').evaluate((el) => {
    const cs = getComputedStyle(el.shadowRoot!.querySelector('[part="grid"]')!);
    return cs.gridTemplateColumns.split(' ').length;
  });
const widths = (page: Page) =>
  page.locator('#l prism-card').evaluateAll((els) =>
    els.map((e) => {
      const r = e.getBoundingClientRect();
      return { w: r.width, h: r.height, x: r.x, y: r.y };
    }),
  );

test.describe('card list: grid', () => {
  for (const [w, cols] of [
    [320, 1],
    [639, 1],
    [640, 2],
    [1023, 2],
    [1024, 3],
    [1279, 3],
    [1280, 4],
  ] as const)
    test(`${String(w)}px wide: ${String(cols)} column(s), each card at least 280px (320px: fits)`, async ({
      page,
    }) => {
      await setup(page, LIST(ids(1, 8), '', `width:${String(w)}px`), 1300);
      expect(await columns(page)).toBe(cols);
      const ws = await widths(page);
      // At 320 the card shrinks to its container (reflow); elsewhere >= 280.
      for (const c of ws)
        expect(c.w).toBeGreaterThanOrEqual(w < 400 ? w - 1 : 280);
    });

  test('the gap is 16px between columns and between rows', async ({ page }) => {
    await setup(page, LIST(ids(1, 8), '', 'width:1024px'));
    const [a, b, , , d] = await widths(page);
    expect(Math.round(b!.x - (a!.x + a!.w))).toBe(16);
    expect(Math.round(d!.y - (a!.y + a!.h))).toBe(16);
  });

  test('columns="1" pins one column in a wide container (Aside, Drawer, Modal)', async ({
    page,
  }) => {
    await setup(page, LIST(ids(1, 4), 'columns="1"', 'width:1300px'));
    expect(await columns(page)).toBe(1);
  });

  test('cards in a row share a height and footers line up', async ({
    page,
  }) => {
    const long = `<prism-card type="selectable" kind="collection" value="x">
      <prism-card-select slot="header"></prism-card-select>
      <prism-card-title slot="header" level="3">Long</prism-card-title>
      <p>one</p><p>two</p><p>three</p><p>four</p>
      <prism-card-meta slot="footer">Foot</prism-card-meta></prism-card>`;
    const short = `<prism-card type="selectable" kind="collection" value="y">
      <prism-card-select slot="header"></prism-card-select>
      <prism-card-title slot="header" level="3">Short</prism-card-title>
      <p>one</p><prism-card-meta slot="footer">Foot</prism-card-meta></prism-card>`;
    await setup(
      page,
      `<prism-card-list id="l" label="x" style="width:700px">${long}${short}</prism-card-list>`,
    );
    const ws = await widths(page);
    expect(ws[0]!.h).toBe(ws[1]!.h);
    const feet = await page
      .locator('#l prism-card-meta')
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().bottom));
    expect(Math.abs(feet[0]! - feet[1]!)).toBeLessThan(1);
  });

  test('320px viewport and 200% zoom: no horizontal scroll', async ({
    page,
  }) => {
    await setup(page, LIST(ids(1, 6), '', 'width:100%'), 320);
    const over = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(over).toBeLessThanOrEqual(0);
    expect(await columns(page)).toBe(1);
  });
});

test.describe('card list: semantics', () => {
  test('a labelled list of list items with real headings, one level', async ({
    page,
  }) => {
    const errors = await setup(page, LIST(ids(1, 3)));
    expect(errors).toEqual([]);
    await expect(page.getByRole('list', { name: 'Resources' })).toHaveCount(1);
    await expect(page.getByRole('listitem')).toHaveCount(3);
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);
    await expect(page.getByRole('region')).toHaveCount(0);
  });

  test('mixed title levels are a dev error', async ({ page }) => {
    const errors = await setup(
      page,
      `<prism-card-list label="x">
        <prism-card><prism-card-title slot="header" level="3">A</prism-card-title>a</prism-card>
        <prism-card><prism-card-title slot="header" level="4">B</prism-card-title>b</prism-card>
      </prism-card-list>`,
    );
    expect(errors.some((e) => e.includes('share one title level'))).toBe(true);
  });

  test('total sets position and size from the data, not the page', async ({
    page,
  }) => {
    await setup(page, LIST(ids(49, 24), 'total="120" page="3"'));
    const first = page.locator('#l prism-card').first();
    await expect(first).toHaveAttribute('aria-posinset', '49');
    await expect(first).toHaveAttribute('aria-setsize', '120');
    await expect(page.locator('#l prism-card').last()).toHaveAttribute(
      'aria-posinset',
      '72',
    );
  });

  test('a missing label is a dev error', async ({ page }) => {
    const errors = await setup(page, `<prism-card-list></prism-card-list>`);
    expect(errors.some((e) => e.includes('needs a `label`'))).toBe(true);
  });
});

test.describe('card list: paging', () => {
  const pager = (page: Page) => page.locator('#l [data-prism-pager]');

  test('default page size is 24; 12, 24 and 48 are the choices', async ({
    page,
  }) => {
    await setup(page, LIST(ids(1, 3), 'total="100"'));
    await expect(page.locator('#l')).toHaveJSProperty('pageSize', 24);
    const opts = await page
      .locator('#l [data-prism-page-size] option')
      .allTextContents();
    expect(opts.map((o) => o.trim())).toEqual(['12', '24', '48']);
    await expect(page.locator('#l [data-prism-page-size] select')).toHaveValue(
      '24',
    );
  });

  test('another page size is a dev error', async ({ page }) => {
    const errors = await setup(page, LIST(ids(1, 3), 'page-size="30"'));
    expect(errors.some((e) => e.includes('page-size is 12, 24, 48'))).toBe(
      true,
    );
  });

  test('shows "Page X of Y" even with one page; Previous and Next end at the edges', async ({
    page,
  }) => {
    await setup(page, LIST(ids(1, 3), 'total="3"'));
    await expect(pager(page)).toBeVisible();
    await expect(pager(page)).toContainText('Page 1 of 1');
    await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Next' })).toBeDisabled();
    await expect(
      page.getByRole('navigation', { name: 'Pagination' }),
    ).toHaveCount(1);
  });

  test('Next fires prism-card-list-page with the new page', async ({
    page,
  }) => {
    await setup(page, LIST(ids(1, 24), 'total="100"'));
    await page.evaluate(() => {
      const w = window as unknown as { log: unknown[] };
      w.log = [];
      document.addEventListener('prism-card-list-page', (e) =>
        w.log.push((e as CustomEvent).detail),
      );
    });
    await page.getByRole('button', { name: 'Next' }).click();
    expect(
      await page.evaluate(() => (window as unknown as { log: unknown[] }).log),
    ).toEqual([{ page: 2, pageSize: 24 }]);
    await expect(pager(page)).toContainText('Page 2 of 5');
  });

  test('changing the page size goes back to page 1', async ({ page }) => {
    await setup(page, LIST(ids(1, 24), 'total="100" page="3"'));
    await page.evaluate(() => {
      const w = window as unknown as { log: unknown[] };
      w.log = [];
      document.addEventListener('prism-card-list-page', (e) =>
        w.log.push((e as CustomEvent).detail),
      );
    });
    await page.locator('#l [data-prism-page-size] select').selectOption('48');
    expect(
      await page.evaluate(() => (window as unknown as { log: unknown[] }).log),
    ).toEqual([{ page: 1, pageSize: 48 }]);
    await expect(pager(page)).toContainText('Page 1 of 3');
  });

  test('a pagination slot replaces the built-in pager', async ({ page }) => {
    await setup(
      page,
      `<prism-card-list id="l" label="x" total="50">${cards(ids(1, 2))}<nav slot="pagination" id="mine">mine</nav></prism-card-list>`,
    );
    await expect(page.locator('#mine')).toBeVisible();
    await expect(page.locator('#l [data-prism-pager]')).toHaveCount(0);
  });

  test('load more: a button instead of the pager; fires an event', async ({
    page,
  }) => {
    await setup(page, LIST(ids(1, 3), 'load-more total="100"'));
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await page.evaluate(() => {
      const w = window as unknown as { more: number };
      w.more = 0;
      document.addEventListener('prism-card-list-load-more', () => w.more++);
    });
    await page.getByRole('button', { name: 'Load more' }).click();
    expect(
      await page.evaluate(() => (window as unknown as { more: number }).more),
    ).toBe(1);
  });

  test('a changed total says "24 results" politely', async ({ page }) => {
    await setup(page, LIST(ids(1, 3), 'total="100"'));
    await page.locator('#l').evaluate((el) => {
      (el as HTMLElement & { total: number }).total = 24;
    });
    await settle(page);
    await expect.poll(() => listStatus(page)).toBe('24 results');
  });
});

test.describe('card list: selection is kept across pages', () => {
  const bar = (page: Page) => page.locator('#l [data-prism-selection-bar]');
  const box = (page: Page, id: string) =>
    page.getByRole('checkbox', { name: `Resource ${id}` });
  const swap = (page: Page, html: string) =>
    page.locator('#l').evaluate((el, h) => {
      for (const c of [...el.children])
        if (c.localName === 'prism-card') c.remove();
      el.insertAdjacentHTML('afterbegin', h);
    }, html);

  test('a visible "N selected" and a Clear selection button', async ({
    page,
  }) => {
    await setup(page, LIST(ids(1, 4)));
    await expect(bar(page)).toContainText('0 selected');
    await expect(
      page.getByRole('button', { name: 'Clear selection' }),
    ).toHaveCount(0);
    await box(page, 'h-1').check();
    await box(page, 'h-3').check();
    await expect(bar(page)).toContainText('2 selected');
    await expect(
      page.getByRole('button', { name: 'Clear selection' }),
    ).toBeVisible();
  });

  test('ids stay selected when the page changes, and come back checked', async ({
    page,
  }) => {
    await setup(page, LIST(ids(1, 4), 'total="8"'));
    await box(page, 'h-2').check();
    await box(page, 'h-4').check();
    // Page 2 arrives (server-side): different cards, none on screen selected.
    await swap(page, cards(ids(5, 4)));
    await settle(page);
    await expect(bar(page)).toContainText('2 selected');
    await expect(box(page, 'h-5')).not.toBeChecked();
    await box(page, 'h-6').check();
    await expect(bar(page)).toContainText('3 selected');
    // Back to page 1: the two earlier ids are still selected.
    await swap(page, cards(ids(1, 4)));
    await settle(page);
    await expect(box(page, 'h-2')).toBeChecked();
    await expect(box(page, 'h-4')).toBeChecked();
    await expect(box(page, 'h-1')).not.toBeChecked();
    await expect(bar(page)).toContainText('3 selected');
    expect(
      await page
        .locator('#l')
        .evaluate(
          (el) => (el as HTMLElement & { selected: string[] }).selected,
        ),
    ).toEqual(['h-2', 'h-4', 'h-6']);
  });

  test('deselecting an on-screen card lowers the count; the event carries all ids', async ({
    page,
  }) => {
    await setup(page, LIST(ids(1, 4)));
    await page.evaluate(() => {
      const w = window as unknown as { log: unknown[] };
      w.log = [];
      document.addEventListener('prism-selection-change', (e) =>
        w.log.push((e as CustomEvent).detail),
      );
    });
    await box(page, 'h-1').check();
    await box(page, 'h-2').check();
    await box(page, 'h-1').uncheck();
    expect(
      await page.evaluate(() => (window as unknown as { log: unknown[] }).log),
    ).toEqual([
      { selected: ['h-1'], count: 1 },
      { selected: ['h-1', 'h-2'], count: 2 },
      { selected: ['h-2'], count: 1 },
    ]);
  });

  test('Clear selection clears every id (also off-screen), then focus moves to the count', async ({
    page,
  }) => {
    await setup(page, LIST(ids(1, 4), 'total="8"'));
    await box(page, 'h-1').check();
    await swap(page, cards(ids(5, 4)));
    await settle(page);
    await box(page, 'h-5').check();
    await expect(bar(page)).toContainText('2 selected');
    await page.getByRole('button', { name: 'Clear selection' }).click();
    await expect(bar(page)).toContainText('0 selected');
    await expect(box(page, 'h-5')).not.toBeChecked();
    // The button went away: focus is not lost to the body.
    await expect(page.locator('#l [data-prism-count]')).toBeFocused();
    await swap(page, cards(ids(1, 4)));
    await settle(page);
    await expect(box(page, 'h-1')).not.toBeChecked();
  });

  test('the bar can be hidden for the page Toolbar, or replaced through a slot', async ({
    page,
  }) => {
    await setup(page, LIST(ids(1, 2), 'hide-selection-bar'));
    await expect(page.locator('#l [data-prism-selection-bar]')).toHaveCount(0);
    await setup(
      page,
      `<prism-card-list id="l" label="x"><div slot="toolbar" id="mine">mine</div>${cards(ids(1, 2))}</prism-card-list>`,
    );
    await expect(page.locator('#mine')).toBeVisible();
    await expect(page.locator('#l [data-prism-selection-bar]')).toHaveCount(0);
  });

  test('a list of cards that cannot be selected shows no bar', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card-list id="l" label="x"><prism-card><prism-card-title slot="header" level="3">A</prism-card-title>a</prism-card></prism-card-list>`,
    );
    await expect(page.locator('#l [data-prism-selection-bar]')).toHaveCount(0);
  });

  test('single selection belongs in a group: a list refuses it', async ({
    page,
  }) => {
    const errors = await setup(page, LIST(ids(1, 2), 'selection="single"'));
    expect(errors.some((e) => e.includes('selects many'))).toBe(true);
  });

  test('keyboard: Tab visits each checkbox, Space toggles, count follows', async ({
    page,
  }) => {
    await setup(page, LIST(ids(1, 3)));
    await box(page, 'h-1').focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    await expect(box(page, 'h-2')).toBeFocused();
    await page.keyboard.press('Space');
    await expect(bar(page)).toContainText('2 selected');
  });
});

test.describe('card list: states', () => {
  const stateOf = (page: Page) => page.locator('#l');
  test('loading: skeleton cards (8), list busy, "Loading" announced, real cards hidden, bar and filters usable', async ({
    page,
  }) => {
    await setup(
      page,
      `<button id="filter">Filter</button>` +
        LIST(ids(1, 3), 'state="loading"'),
    );
    await expect(stateOf(page)).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('#l prism-card-skeleton')).toHaveCount(8);
    await expect(page.locator('#l prism-card-skeleton').first()).toBeVisible();
    await expect(page.locator('#l prism-card').first()).toBeHidden();
    await expect.poll(() => listStatus(page)).toBe('Loading');
    await expect(page.locator('#filter')).toBeEnabled();
    // Same size as real ones: a skeleton card is about as tall as a real card.
    const sk = await page
      .locator('#l prism-card-skeleton')
      .first()
      .evaluate((e) => e.getBoundingClientRect().height);
    expect(sk).toBeGreaterThanOrEqual(160);
  });

  test('refreshing: cards stay, a quiet busy line shows, no blanking', async ({
    page,
  }) => {
    await setup(page, LIST(ids(1, 3), 'state="refreshing"'));
    await expect(page.locator('#l prism-card')).toHaveCount(3);
    await expect(page.locator('#l prism-card').first()).toBeVisible();
    await expect(stateOf(page)).toHaveAttribute('aria-busy', 'true');
    await expect(stateOf(page).locator('[part="busy"]')).toBeVisible();
    await expect.poll(() => listStatus(page)).toBe('Refreshing');
  });

  test('empty, first use: your content in the empty slot', async ({ page }) => {
    await setup(
      page,
      `<prism-card-list id="l" label="Resources" state="empty"><div slot="empty" id="first"><p>No resources yet</p><prism-button>Add a resource</prism-button></div></prism-card-list>`,
    );
    await expect(page.locator('#first')).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Add a resource' }),
    ).toBeVisible();
  });

  test('no matches: "No matches" and one Clear filters button', async ({
    page,
  }) => {
    await setup(page, LIST([], 'state="no-matches"'));
    await expect(page.getByText('No matches')).toBeVisible();
    await page.evaluate(() => {
      const w = window as unknown as { hit: number };
      w.hit = 0;
      document.addEventListener('prism-card-list-clear-filters', () => w.hit++);
    });
    await page.getByRole('button', { name: 'Clear filters' }).click();
    expect(
      await page.evaluate(() => (window as unknown as { hit: number }).hit),
    ).toBe(1);
  });

  test('error, whole list: what failed, one Retry', async ({ page }) => {
    await setup(
      page,
      LIST([], 'state="error" state-message="The resources service is down."'),
    );
    await expect(
      page.getByText('The resources service is down.').first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(1);
    await page.evaluate(() => {
      const w = window as unknown as { hit: number };
      w.hit = 0;
      document.addEventListener('prism-card-list-retry', () => w.hit++);
    });
    await page.getByRole('button', { name: 'Retry' }).click();
    expect(
      await page.evaluate(() => (window as unknown as { hit: number }).hit),
    ).toBe(1);
  });

  test('error, one card: only that card shows an error and a Retry; the rest keep working', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card-list id="l" label="Resources">${card('a')}${card('b', 'state="error" state-message="This resource failed to load."')}${card('c')}</prism-card-list>`,
    );
    await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(1);
    await expect(
      page.getByText('This resource failed to load.').first(),
    ).toBeVisible();
    await page.getByRole('checkbox', { name: 'Resource a' }).check();
    await expect(page.locator('#l [data-prism-selection-bar]')).toContainText(
      '1 selected',
    );
  });
});

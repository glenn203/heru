import { expect, test, type Page } from '@playwright/test';
import { mount } from '../../test/fixture.js';

const settle = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => setTimeout(() => r(), 80)),
      ),
  );
async function setup(page: Page, markup: string, width = 1000) {
  await page.setViewportSize({ width, height: 800 });
  await mount(page, markup);
  await page.addStyleTag({ path: 'src/tokens/tokens.css' });
  await page.addStyleTag({ path: 'src/theme/theme.css' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await settle(page);
}

/** Heights and widths of every control target found inside `#root`. */
const targets = (page: Page) =>
  page.evaluate(() => {
    const out: Record<string, { w: number; h: number; size: string | null }[]> =
      {};
    const add = (key: string, el: Element, size: string | null) => {
      const r = el.getBoundingClientRect();
      (out[key] ??= []).push({ w: r.width, h: r.height, size });
    };
    const walk = (root: ParentNode) => {
      for (const el of root.querySelectorAll('prism-icon-button'))
        add(
          el.parentElement?.localName === 'prism-menu' ||
            (el.getRootNode() as ShadowRoot).host?.localName === 'prism-menu'
            ? 'menu-trigger'
            : 'icon-button',
          el,
          el.getAttribute('size'),
        );
      for (const el of root.querySelectorAll('*'))
        if (el.shadowRoot) walk(el.shadowRoot);
    };
    walk(document.querySelector('#root')!);
    return out;
  });

const HEADER_CARD = (id = 'c', width = 420) => `
  <prism-card id="${id}" style="width:${width}px">
    <prism-card-title slot="header" level="3">Resource lumen-board-01</prism-card-title>
    <prism-card-actions slot="header" id="${id}-act">
      <prism-icon-button label="Refresh Resource lumen-board-01">R</prism-icon-button>
      <prism-icon-button label="Export Resource lumen-board-01">E</prism-icon-button>
    </prism-card-actions>
    <p>Body</p>
  </prism-card>`;

test.describe('widget error Retry', () => {
  test('is a soft (secondary) button, small', async ({ page }) => {
    await setup(
      page,
      `<prism-card id="w" type="widget" state="error" state-message="Timed out." style="width:360px">
        <prism-card-title slot="header" level="3">Items</prism-card-title>
        <prism-card-metric label="Items">1</prism-card-metric>
      </prism-card>`,
    );
    const retry = page.getByRole('button', { name: 'Retry' });
    await expect(retry).toHaveCount(1);
    const btn = page.locator('#w prism-button');
    await expect(btn).toHaveAttribute('variant', 'secondary');
    await expect(btn).toHaveAttribute('size', 'sm');
    // Painted as the soft variant: a tinted fill, no border.
    const paint = await btn.evaluate((el) => {
      const cs = getComputedStyle(
        el.shadowRoot!.querySelector('[part="base"]')!,
      );
      return {
        border: cs.borderTopColor,
        fill: cs.backgroundColor,
        h: el.getBoundingClientRect().height,
      };
    });
    expect(paint.border).toBe('rgba(0, 0, 0, 0)');
    expect(paint.fill).not.toBe('rgba(0, 0, 0, 0)');
    expect(paint.h).toBeGreaterThanOrEqual(24);
    // No dev error: the guard does not touch the generated control.
    await expect(page.locator('#w')).not.toHaveAttribute('data-prism-invalid');
    expect(
      await page.locator('#w').evaluate((el) => el.matches(':state(invalid)')),
    ).toBe(false);
  });

  test('outline is still refused in a footer', async ({ page }) => {
    await setup(
      page,
      `<prism-card id="c"><p>x</p><prism-card-meta slot="footer">m</prism-card-meta>
        <prism-card-actions slot="footer"><prism-button variant="outline" id="o">Out</prism-button></prism-card-actions></prism-card>`,
    );
    await expect(page.locator('#o')).toHaveAttribute(
      'data-prism-invalid',
      /outline button is not allowed/,
    );
  });
});

test.describe('widget footer View all', () => {
  const FOOT = (type: string) => `
    <prism-card id="c" ${type} style="width:360px">
      <prism-card-title slot="header" level="3">Items</prism-card-title>
      <p>Body</p>
      <prism-card-meta slot="footer">Updated 2 min ago</prism-card-meta>
      <prism-card-actions slot="footer"><prism-button id="v" variant="ghost">View all</prism-button></prism-card-actions>
    </prism-card>`;

  test('is ghost and small in a widget footer, and the guard allows it', async ({
    page,
  }) => {
    await setup(page, FOOT('type="widget"'));
    const v = page.locator('#v');
    await expect(v).toHaveAttribute('variant', 'ghost');
    await expect(v).toHaveAttribute('size', 'sm');
    await expect(v).not.toHaveAttribute('data-prism-invalid');
    const h = await v.evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeGreaterThanOrEqual(24);
    expect(h).toBeLessThan(40);
  });

  test('other card footers stay medium', async ({ page }) => {
    await setup(page, FOOT(''));
    await expect(page.locator('#v')).toHaveAttribute('size', 'md');
  });

  test('a widget footer still refuses outline', async ({ page }) => {
    await setup(
      page,
      FOOT('type="widget"').replace('variant="ghost"', 'variant="outline"'),
    );
    await expect(page.locator('#v')).toHaveAttribute(
      'data-prism-invalid',
      /outline button is not allowed/,
    );
  });
});

test.describe('header actions', () => {
  test('icon buttons are 8px apart', async ({ page }) => {
    await setup(page, HEADER_CARD());
    const gap = await page.evaluate(() => {
      const [a, b] = [...document.querySelectorAll('#c prism-icon-button')].map(
        (e) => e.getBoundingClientRect(),
      ) as [DOMRect, DOMRect];
      return b.left - a.right;
    });
    expect(Math.round(gap)).toBe(8);
    expect(
      await page
        .locator('#c-act')
        .evaluate((el) => getComputedStyle(el).columnGap),
    ).toBe('8px');
  });

  test('an icon button beside a menu trigger is 8px apart too', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card id="c" type="widget" style="width:420px">
        <prism-card-title slot="header" level="3">Items</prism-card-title>
        <prism-card-actions slot="header">
          <prism-icon-button label="Refresh Items">R</prism-icon-button>
          <prism-menu label="More options for Items"><prism-menu-item>Configure</prism-menu-item></prism-menu>
        </prism-card-actions>
        <prism-card-metric label="Items">1</prism-card-metric>
      </prism-card>`,
    );
    const gap = await page.evaluate(() => {
      const a = document
        .querySelector('#c prism-icon-button')!
        .getBoundingClientRect();
      const b = document
        .querySelector('#c prism-menu')!
        .getBoundingClientRect();
      return b.left - a.right;
    });
    expect(Math.round(gap)).toBe(8);
  });
});

test.describe('icon buttons inside a card are small', () => {
  test('header buttons, a menu trigger and the folded overflow menu are size sm', async ({
    page,
  }) => {
    await setup(
      page,
      HEADER_CARD('a') +
        `<prism-card id="b" style="width:420px">
          <prism-card-title slot="header" level="3">Other</prism-card-title>
          <prism-card-actions slot="header"><prism-menu label="More options for Other"><prism-menu-item>One</prism-menu-item></prism-menu></prism-card-actions>
          <p>x</p></prism-card>` +
        HEADER_CARD('narrow', 260),
    );
    // size is set by the card, not written by the author
    for (const sel of [
      '#a prism-icon-button',
      '#b prism-menu',
      '#narrow prism-menu',
    ])
      for (const el of await page.locator(sel).all())
        await expect(el).toHaveAttribute('size', 'sm');
    const t = await targets(page);
    for (const k of Object.keys(t))
      // The folded header buttons are display:none in the narrow card.
      for (const e of t[k]!.filter((x) => x.w > 0)) {
        expect(e.size).toBe('sm');
        expect(e.w).toBeGreaterThanOrEqual(24);
        expect(e.h).toBeGreaterThanOrEqual(24);
      }
    expect(t['menu-trigger']?.length).toBeGreaterThanOrEqual(2);
  });

  test('the handle used as the menu button is small too', async ({ page }) => {
    await setup(
      page,
      `<prism-card-list id="l" label="Guides" reorderable columns="1" style="width:420px">
        <prism-card value="a"><prism-card-handle slot="header"></prism-card-handle>
          <prism-card-title slot="header" level="3">Alpha</prism-card-title><p>x</p></prism-card>
        <prism-card value="b"><prism-card-handle slot="header"></prism-card-handle>
          <prism-card-title slot="header" level="3">Bravo</prism-card-title><p>x</p></prism-card>
      </prism-card-list>`,
    );
    const t = await targets(page);
    expect(t['menu-trigger']?.length).toBe(2);
    for (const e of t['menu-trigger']!) {
      expect(e.size).toBe('sm');
      expect(e.w).toBeGreaterThanOrEqual(24);
      expect(e.h).toBeGreaterThanOrEqual(24);
    }
  });

  test('small stays at or above 24px in every density: 24 / 32 / 40', async ({
    page,
  }) => {
    await setup(
      page,
      ['compact', 'default', 'comfortable']
        .map(
          (d) =>
            `<div data-prism-density="${d}" id="d-${d}">${HEADER_CARD(d)}</div>`,
        )
        .join(''),
    );
    const sizes = await page.evaluate(() =>
      ['compact', 'default', 'comfortable'].map((d) => {
        const r = document
          .querySelector(`#${d} prism-icon-button`)!
          .getBoundingClientRect();
        return [Math.round(r.width), Math.round(r.height)];
      }),
    );
    expect(sizes).toEqual([
      [24, 24],
      [32, 32],
      [40, 40],
    ]);
  });

  test('the button is centred on the title line, and a late button is resized', async ({
    page,
  }) => {
    await setup(page, HEADER_CARD());
    const off = await page.evaluate(() => {
      const t = document
        .querySelector('#c prism-card-title')!
        .getBoundingClientRect();
      const b = document
        .querySelector('#c prism-icon-button')!
        .getBoundingClientRect();
      return Math.abs(b.top + b.height / 2 - (t.top + t.height / 2));
    });
    expect(off).toBeLessThanOrEqual(1);
    await page.evaluate(() => {
      const b = document.createElement('prism-icon-button');
      b.setAttribute('label', 'Added later');
      b.id = 'late';
      document.querySelector('#c p')!.after(b);
    });
    await settle(page);
    await expect(page.locator('#late')).toHaveAttribute('size', 'sm');
  });
});

test.describe('card list: list role on an inner wrapper', () => {
  const LIST = (attrs = '') => `
    <prism-card-list id="l" label="Resources" ${attrs} style="width:900px">
      ${['a', 'b', 'c']
        .map(
          (v) => `<prism-card type="selectable" kind="collection" value="${v}">
            <prism-card-select slot="header"></prism-card-select>
            <prism-card-title slot="header" level="3">Resource ${v}</prism-card-title><p>x</p></prism-card>`,
        )
        .join('')}
    </prism-card-list>`;

  test('the card list has no role; the wrapper is the named list around the cards', async ({
    page,
  }) => {
    await setup(page, LIST('total="30" page-size="12"'));
    const r = await page.locator('#l').evaluate((el) => {
      const list = el.shadowRoot!.querySelector('[role="list"]')!;
      const slot = list.querySelector('slot')!;
      return {
        hostRole: el.getAttribute('role'),
        hostLabel: el.getAttribute('aria-label'),
        listLabel: list.getAttribute('aria-label'),
        lists: el.shadowRoot!.querySelectorAll('[role="list"]').length,
        assigned: slot.assignedElements().length,
        statusInList: !!list.querySelector('[role="status"]'),
        pagerInList:
          !!list.closest('[part="pager"]') || !!list.querySelector('nav'),
        toolbarInList: !!list.querySelector('[part="toolbar"]'),
        status: el.shadowRoot!.querySelector('[role="status"]') !== null,
        pager: el.shadowRoot!.querySelector('[part="pager"]') !== null,
      };
    });
    expect(r.hostRole).toBeNull();
    expect(r.hostLabel).toBeNull();
    expect(r.listLabel).toBe('Resources');
    expect(r.lists).toBe(1);
    expect(r.assigned).toBe(3);
    expect(r.statusInList).toBe(false);
    expect(r.pagerInList).toBe(false);
    expect(r.toolbarInList).toBe(false);
    expect(r.status).toBe(true);
    expect(r.pager).toBe(true);
    await expect(page.getByRole('list', { name: 'Resources' })).toHaveCount(1);
    await expect(page.getByRole('listitem')).toHaveCount(3);
  });

  test('position and size stay on the list items, from the data', async ({
    page,
  }) => {
    await setup(page, LIST('total="30" page-size="12" page="2"'));
    const pos = await page.evaluate(() =>
      [...document.querySelectorAll('#l prism-card')].map((c) => [
        c.getAttribute('role'),
        c.getAttribute('aria-posinset'),
        c.getAttribute('aria-setsize'),
      ]),
    );
    expect(pos).toEqual([
      ['listitem', '13', '30'],
      ['listitem', '14', '30'],
      ['listitem', '15', '30'],
    ]);
  });

  test('loading, empty and error states are not a list', async ({ page }) => {
    await setup(
      page,
      `<prism-card-list id="a" label="Loading" state="loading" skeleton-count="2"></prism-card-list>
       <prism-card-list id="b" label="Empty" state="empty"></prism-card-list>
       <prism-card-list id="c" label="Broken" state="error"></prism-card-list>`,
    );
    for (const id of ['a', 'b', 'c'])
      expect(
        await page
          .locator(`#${id}`)
          .evaluate(
            (el) => el.shadowRoot!.querySelectorAll('[role="list"]').length,
          ),
      ).toBe(0);
  });
});

test('a card in the list empty slot is a group, not a list item without a list', async ({
  page,
}) => {
  await setup(
    page,
    `<prism-card-list id="l" label="Saved" state="empty">
      <prism-card id="e" slot="empty"><h3>Nothing</h3><p>Add one.</p></prism-card>
    </prism-card-list>`,
  );
  await expect(page.locator('#e')).toHaveAttribute('role', 'group');
});

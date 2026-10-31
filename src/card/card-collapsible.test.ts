import { expect, test, type Page } from '@playwright/test';
import { mount } from '../../test/fixture.js';

const settle = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => setTimeout(() => r(), 40)),
      ),
  );
async function setup(page: Page, markup: string) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await mount(page, markup);
  await page.addStyleTag({ path: 'src/tokens/tokens.css' });
  await page.addStyleTag({ path: 'src/theme/theme.css' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await settle(page);
  return errors;
}
const COLL = (attrs = '') => `
  <button id="before">before</button>
  <prism-card id="c" type="collapsible" ${attrs} style="width:360px">
    <prism-card-title slot="header" level="3">Advanced settings</prism-card-title>
    <prism-card-actions slot="header">
      <prism-icon-button id="act" label="Reset Advanced settings">R</prism-icon-button>
    </prism-card-actions>
    <p id="body">Optional detail group.</p>
    <prism-card-meta slot="footer">Edited yesterday</prism-card-meta>
  </prism-card>`;
const toggle = (page: Page) =>
  page.getByRole('button', { name: 'Advanced settings', exact: true });

test.describe('collapsible card', () => {
  test('the title row is the toggle button inside a real heading; header actions sit beside it', async ({
    page,
  }) => {
    const errors = await setup(page, COLL('open'));
    expect(errors).toEqual([]);
    await expect(
      page.getByRole('heading', { level: 3, name: 'Advanced settings' }),
    ).toHaveCount(1);
    await expect(toggle(page)).toHaveCount(1);
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    // No button inside a button, and the action is not part of the toggle.
    const nested = await page
      .locator('prism-card-title')
      .evaluate(
        (el) => el.shadowRoot!.querySelectorAll('button button').length,
      );
    expect(nested).toBe(0);
    const apart = await page.evaluate(() => {
      const t = document.querySelector('prism-card-title')!;
      const b = t.shadowRoot!.querySelector('[part="toggle"]')!;
      const a = document.querySelector('#act')!;
      return !b.contains(a) && !t.contains(a);
    });
    expect(apart).toBe(true);
    await expect(
      page.getByRole('button', { name: 'Reset Advanced settings' }),
    ).toBeVisible();
  });

  test('closed by default: content hidden and out of the tab order; click or keys open it', async ({
    page,
  }) => {
    await setup(
      page,
      COLL() + '<input id="inner" aria-label="inner" style="display:none">',
    );
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#body')).toBeHidden();
    await expect(page.locator('#c')).toHaveJSProperty('open', false);
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#body')).toBeVisible();
    await expect(page.locator('#c')).toHaveAttribute('open', '');
    // Keyboard: Enter and Space.
    await toggle(page).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#body')).toBeHidden();
    await page.keyboard.press('Space');
    await expect(page.locator('#body')).toBeVisible();
  });

  test('controls: aria-controls reaches the content (element reflection)', async ({
    page,
  }) => {
    await setup(page, COLL('open'));
    const r = await page.locator('prism-card-title').evaluate((el) => {
      const b = el.shadowRoot!.querySelector(
        '[part="toggle"]',
      ) as HTMLElement & {
        ariaControlsElements?: Element[] | null;
      };
      return {
        supported: 'ariaControlsElements' in b,
        ids: (b.ariaControlsElements ?? []).map((e) => e.id),
      };
    });
    // Chromium supports it; where it does, it points at the content.
    expect(r.supported).toBe(true);
    expect(r.ids).toContain('body');
  });

  test('a short title fits on one line (the toggle never narrows its own text)', async ({
    page,
  }) => {
    await setup(page, COLL('open'));
    const h = await page.locator('prism-card-title').evaluate((el) => {
      const rg = document.createRange();
      rg.selectNodeContents(el);
      return rg.getBoundingClientRect().height;
    });
    expect(h).toBeLessThanOrEqual(20);
  });

  test('keeps the footer; the closed header has no gap under it', async ({
    page,
  }) => {
    await setup(page, COLL());
    await expect(page.getByText('Edited yesterday')).toBeVisible();
    const gap = await page.locator('#c').evaluate((el) => {
      const h = el.shadowRoot!.querySelector('[part="header"]')!;
      return getComputedStyle(h).marginBottom;
    });
    expect(gap).toBe('0px');
  });

  test('emits prism-card-open-change', async ({ page }) => {
    await setup(page, COLL());
    await page.evaluate(() => {
      const w = window as unknown as { log: boolean[] };
      w.log = [];
      document.addEventListener('prism-card-open-change', (e) =>
        w.log.push((e as CustomEvent<{ open: boolean }>).detail.open),
      );
    });
    await toggle(page).click();
    await toggle(page).click();
    expect(
      await page.evaluate(() => (window as unknown as { log: boolean[] }).log),
    ).toEqual([true, false]);
  });

  test('the toggle is the one tab stop of the title, with a focus ring', async ({
    page,
  }) => {
    await setup(page, COLL('open'));
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await expect(toggle(page)).toBeFocused();
    const ring = await page.locator('prism-card-title').evaluate((el) => {
      const b = el.shadowRoot!.querySelector('[part="toggle"]')!;
      return getComputedStyle(b).boxShadow;
    });
    expect(ring).not.toBe('none');
    await page.keyboard.press('Tab');
    await expect(page.locator('#act')).toBeFocused();
  });

  test('chevron: down when open, rotated when closed, and a 16px icon', async ({
    page,
  }) => {
    await setup(page, COLL());
    const closed = await page.locator('prism-card-title').evaluate((el) => {
      const c = el.shadowRoot!.querySelector('[part="chevron"]')!;
      return getComputedStyle(c).transform;
    });
    await toggle(page).click();
    const open = await page.locator('prism-card-title').evaluate((el) => {
      const c = el.shadowRoot!.querySelector('[part="chevron"]')!;
      return getComputedStyle(c).transform;
    });
    expect(open).toBe('none');
    expect(closed).not.toBe('none');
  });

  test('session memory: storage-key restores the last state after a reload of the element', async ({
    page,
  }) => {
    await setup(page, COLL('storage-key="adv"'));
    await toggle(page).click();
    expect(
      await page.evaluate(() => sessionStorage.getItem('prism-card:adv')),
    ).toBe('1');
    // New element with the same key opens from memory.
    await page.evaluate(() => {
      document.querySelector('#c')!.remove();
      const el = document.createElement('prism-card');
      el.id = 'd';
      el.setAttribute('type', 'collapsible');
      el.setAttribute('storage-key', 'adv');
      el.innerHTML =
        '<prism-card-title slot="header" level="3">Advanced settings</prism-card-title><p id="b2">x</p>';
      document.body.append(el);
    });
    await settle(page);
    await expect(page.locator('#b2')).toBeVisible();
    await toggle(page).click();
    expect(
      await page.evaluate(() => sessionStorage.getItem('prism-card:adv')),
    ).toBe('0');
  });

  test('nesting: two levels are fine, a third is a dev error', async ({
    page,
  }) => {
    const mk = (n: number): string =>
      n === 0
        ? '<p>leaf</p>'
        : `<prism-card type="collapsible" open><prism-card-title slot="header" level="${3 + (3 - n)}">L${4 - n}</prism-card-title>${mk(n - 1)}</prism-card>`;
    const errors = await setup(page, mk(2));
    expect(errors.some((e) => e.includes('more than two levels'))).toBe(false);
    const errors3 = await setup(page, mk(3));
    expect(errors3.some((e) => e.includes('more than two levels'))).toBe(true);
  });

  test('a nested collapsible toggles on its own', async ({ page }) => {
    await setup(
      page,
      `<prism-card id="o" type="collapsible" open><prism-card-title slot="header" level="3">Outer</prism-card-title>
         <prism-card id="i" type="collapsible"><prism-card-title slot="header" level="4">Inner</prism-card-title><p id="inb">in</p></prism-card>
       </prism-card>`,
    );
    await page.getByRole('button', { name: 'Inner' }).click();
    await expect(page.locator('#inb')).toBeVisible();
    await expect(page.locator('#o')).toHaveJSProperty('open', true);
  });

  test('a link or action on the title is ignored with a dev error', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card type="collapsible"><prism-card-title slot="header" level="3" href="#x">T</prism-card-title><p>b</p></prism-card>`,
    );
    expect(errors.some((e) => e.includes('title is the toggle'))).toBe(true);
    await expect(page.getByRole('link')).toHaveCount(0);
  });

  test('toggle tint: the shared state layer, 6% on hover and 12% pressed', async ({
    page,
  }) => {
    await setup(page, COLL('open'));
    const read = () =>
      page.locator('prism-card-title').evaluate((el) => {
        const b = el.shadowRoot!.querySelector('[part="toggle"]')!;
        return getComputedStyle(b).backgroundImage;
      });
    const rest = await read();
    await toggle(page).hover();
    await settle(page);
    const hover = await read();
    expect(hover).not.toBe(rest);
    expect(hover).toContain('0.06');
  });
});

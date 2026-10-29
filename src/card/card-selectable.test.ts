import { expect, test, type Page } from '@playwright/test';
import { mount } from '../../test/fixture.js';
import { expected, near, painted, PCT } from '../../test/paint.js';

interface Win {
  events?: { selected: string[]; count: number }[];
}
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
  await page.evaluate(() => {
    const w = window as unknown as Win;
    w.events = [];
    document.addEventListener('prism-selection-change', (e) =>
      w.events!.push(
        (e as CustomEvent<{ selected: string[]; count: number }>).detail,
      ),
    );
  });
  await settle(page);
  return errors;
}
const PLANS = (extra = '') => `
  <button id="before">before</button>
  <prism-card-group id="g" selection="single" label="Plan" ${extra}>
    ${['free', 'team', 'enterprise']
      .map(
        (
          v,
        ) => `<prism-card id="${v}" type="selectable" kind="choice" value="${v}" style="width:260px;margin-block-end:8px">
        <prism-card-select slot="header"></prism-card-select>
        <prism-card-title slot="header" level="3">${v[0]!.toUpperCase() + v.slice(1)} plan</prism-card-title>
        <prism-card-description slot="header">Description of ${v}.</prism-card-description>
        <div>${v} details</div>
      </prism-card>`,
      )
      .join('')}
  </prism-card-group>
  <button id="after">after</button>`;
const HOSTS = (attrs = '') => `
  <button id="before">before</button>
  <prism-card-group id="g" selection="multi" label="Hosts" ${attrs}>
    ${['a', 'b', 'c']
      .map(
        (
          v,
        ) => `<prism-card id="${v}" type="selectable" kind="collection" value="${v}" style="width:320px;margin-block-end:8px">
        <prism-card-select slot="header"></prism-card-select>
        <prism-card-title slot="header" level="3" href="#host-${v}">Host ${v.toUpperCase()}</prism-card-title>
        <prism-card-description slot="header">Lumen server ${v}.</prism-card-description>
        <prism-card-actions slot="header"><prism-menu label="More options for Host ${v.toUpperCase()}"><prism-menu-item>Isolate</prism-menu-item></prism-menu></prism-card-actions>
        <div>content ${v}</div>
      </prism-card>`,
      )
      .join('')}
  </prism-card-group>
  <button id="after">after</button>`;
const selected = (page: Page) =>
  page
    .locator('#g')
    .evaluate((el) => (el as unknown as { selected: string[] }).selected);
const isSel = (page: Page, id: string) =>
  page.locator(`#${id}`).evaluate((el) => el.matches(':state(selected)'));
const box = (page: Page, sel: string) =>
  page.locator(sel).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  });

test.describe('collection card (multi): toggles only through its checkbox', () => {
  test('the checkbox is always visible, named by the title, described by the description', async ({
    page,
  }) => {
    const errors = await setup(page, HOSTS());
    expect(errors).toEqual([]);
    const cb = page.getByRole('checkbox', { name: 'Host A' });
    await expect(cb).toBeVisible();
    await expect(cb).toHaveAccessibleDescription('Lumen server a.');
    // 24 by 24px target at least.
    const t = await page.locator('#a prism-card-select').evaluate((el) => {
      const r = el
        .shadowRoot!.querySelector('[part="base"]')!
        .getBoundingClientRect();
      return [r.width, r.height];
    });
    expect(t[0]).toBeGreaterThanOrEqual(24);
    expect(t[1]).toBeGreaterThanOrEqual(24);
  });

  test('clicking the checkbox selects; clicking elsewhere on the card does not', async ({
    page,
  }) => {
    await setup(page, HOSTS());
    await page.getByRole('checkbox', { name: 'Host A' }).click();
    expect(await selected(page)).toEqual(['a']);
    await page.locator('#b').getByText('content b').click();
    expect(await selected(page)).toEqual(['a']);
    expect(await isSel(page, 'a')).toBe(true);
    expect(await isSel(page, 'b')).toBe(false);
    await page.getByRole('checkbox', { name: 'Host A' }).click();
    expect(await selected(page)).toEqual([]);
  });

  test('the title stays a link and is its own tab stop; order is checkbox, title, actions', async ({
    page,
  }) => {
    await setup(page, HOSTS());
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('checkbox', { name: 'Host A' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Host A' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'More options for Host A' }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('checkbox', { name: 'Host B' })).toBeFocused();
  });

  test('Space toggles; a polite message says how many are selected', async ({
    page,
  }) => {
    await setup(page, HOSTS());
    await page.getByRole('checkbox', { name: 'Host A' }).focus();
    await page.keyboard.press(' ');
    await page.getByRole('checkbox', { name: 'Host B' }).focus();
    await page.keyboard.press(' ');
    expect(await selected(page)).toEqual(['a', 'b']);
    const status = page.locator('#g').locator('[role="status"]');
    await expect(status).toHaveText('2 selected');
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await page
      .locator('#g')
      .evaluate((el) => (el as unknown as { clear(): void }).clear());
    await expect(status).toHaveText('None selected');
  });

  test('selection-change event carries the ids and count', async ({ page }) => {
    await setup(page, HOSTS());
    await page.getByRole('checkbox', { name: 'Host C' }).click();
    await page.getByRole('checkbox', { name: 'Host A' }).click();
    const events = await page.evaluate(() => (window as unknown as Win).events);
    expect(events).toEqual([
      { selected: ['c'], count: 1 },
      { selected: ['c', 'a'], count: 2 },
    ]);
  });

  test('selected look: 14% overlay, 18% on hover, 2px inside ring, checked control', async ({
    page,
  }) => {
    await setup(page, HOSTS());
    await page.getByRole('checkbox', { name: 'Host A' }).click();
    await page.mouse.move(0, 0);
    await settle(page);
    const bg = ['var(--prism-color-bg)', 'var(--prism-color-text)'] as const;
    const check = async (id: string, state: keyof typeof PCT) => {
      const got = await painted(page.locator(`#${id}`), 'base');
      const want = await expected(page, bg[0], bg[1], PCT[state]);
      expect(
        near(got, want),
        `${id} ${state}: ${got.join()} vs ${want.join()}`,
      ).toBe(true);
    };
    await check('a', 'selected');
    await check('b', 'rest');
    const c = await box(page, '#a');
    await page.mouse.move(c.x + c.w / 2, c.y + c.h - 12);
    await settle(page);
    await check('a', 'selected+hover');
    // Unselected collection card: no hover tint at all (it is not operable).
    const b = await box(page, '#b');
    await page.mouse.move(b.x + b.w / 2, b.y + b.h - 12);
    await settle(page);
    await check('b', 'rest');
    const ring = await page
      .locator('#a')
      .evaluate(
        (el) =>
          getComputedStyle(el.shadowRoot!.querySelector('[part="base"]')!)
            .boxShadow,
      );
    expect(ring).toMatch(/inset/);
    expect(ring).toMatch(/ 2px/);
    await expect(page.getByRole('checkbox', { name: 'Host A' })).toBeChecked();
  });

  test('a nested control keeps the selected overlay but adds no hover on it', async ({
    page,
  }) => {
    await setup(page, HOSTS());
    await page.getByRole('checkbox', { name: 'Host A' }).click();
    await page.getByRole('button', { name: 'More options for Host A' }).hover();
    await settle(page);
    const got = await painted(page.locator('#a'), 'base');
    const want = await expected(
      page,
      'var(--prism-color-bg)',
      'var(--prism-color-text)',
      PCT.selected,
    );
    expect(near(got, want)).toBe(true);
  });

  test('initial selected attributes are read once; ids not on screen stay selected', async ({
    page,
  }) => {
    await setup(page, HOSTS().replace('value="b"', 'value="b" selected'));
    expect(await selected(page)).toEqual(['b']);
    await page.locator('#g').evaluate((el) => {
      (el as unknown as { selected: string[] }).selected = ['b', 'zz'];
    });
    await settle(page);
    expect(await selected(page)).toEqual(['b', 'zz']);
    // Append the card that was already selected by id (a later page).
    await page.locator('#g').evaluate((el) => {
      const card = document.createElement('prism-card');
      card.id = 'zz';
      card.setAttribute('type', 'selectable');
      card.setAttribute('kind', 'collection');
      card.setAttribute('value', 'zz');
      card.innerHTML =
        '<prism-card-select slot="header"></prism-card-select><prism-card-title slot="header" level="3">Host ZZ</prism-card-title><p>x</p>';
      el.append(card);
    });
    await settle(page);
    expect(await isSel(page, 'zz')).toBe(true);
    await expect(page.getByRole('checkbox', { name: 'Host ZZ' })).toBeChecked();
    // Removing a card (paging away) keeps its id.
    await page.locator('#zz').evaluate((el) => el.remove());
    await settle(page);
    expect(await selected(page)).toEqual(['b', 'zz']);
  });

  test('disabled: control disabled, no overlay, reason is in the text', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card-group id="g" label="Hosts"><prism-card id="d" type="selectable" kind="collection" value="d" disabled style="width:320px"><prism-card-select slot="header"></prism-card-select><prism-card-title slot="header" level="3">Host D</prism-card-title><prism-card-description slot="header">Offline: cannot be selected.</prism-card-description></prism-card></prism-card-group>`,
    );
    expect(errors).toEqual([]);
    await expect(page.getByRole('checkbox', { name: 'Host D' })).toBeDisabled();
    await page.getByRole('checkbox', { name: 'Host D' }).click({ force: true });
    expect(await selected(page)).toEqual([]);
    const got = await painted(page.locator('#d'), 'base');
    const want = await expected(
      page,
      'var(--prism-color-bg)',
      'var(--prism-color-text)',
      PCT.rest,
    );
    expect(near(got, want)).toBe(true);
  });

  test('the card does not nest controls inside the control: the checkbox is a real input', async ({
    page,
  }) => {
    await setup(page, HOSTS());
    const tag = await page
      .locator('#a prism-card-select')
      .evaluate((el) => el.shadowRoot!.querySelector('input')!.type);
    expect(tag).toBe('checkbox');
  });
});

test.describe('choice card (single): a radio group', () => {
  test('semantics: radiogroup with radios named by the title, position and size set', async ({
    page,
  }) => {
    const errors = await setup(page, PLANS());
    expect(errors).toEqual([]);
    await expect(page.getByRole('radiogroup', { name: 'Plan' })).toHaveCount(1);
    const r = page.getByRole('radio', { name: 'Team plan' });
    await expect(r).toHaveAttribute('aria-posinset', '2');
    await expect(r).toHaveAttribute('aria-setsize', '3');
    await expect(r).toHaveAccessibleDescription('Description of team.');
    await expect(page.getByRole('radio')).toHaveCount(3);
  });

  test('clicking anywhere on the card chooses it; choosing one clears the others; it cannot be cleared', async ({
    page,
  }) => {
    await setup(page, PLANS());
    await page.locator('#team').getByText('team details').click();
    expect(await selected(page)).toEqual(['team']);
    await page.locator('#enterprise').getByText('enterprise details').click();
    expect(await selected(page)).toEqual(['enterprise']);
    expect(await isSel(page, 'team')).toBe(false);
    await page.locator('#enterprise').getByText('enterprise details').click();
    expect(await selected(page)).toEqual(['enterprise']);
    await expect(
      page.getByRole('radio', { name: 'Enterprise plan' }),
    ).toBeChecked();
  });

  test('one tab stop: Tab enters on the first card, then on the selected one', async ({
    page,
  }) => {
    await setup(page, PLANS());
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('radio', { name: 'Free plan' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#after')).toBeFocused();
    await page.locator('#team').getByText('team details').click();
    await settle(page);
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('radio', { name: 'Team plan' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#after')).toBeFocused();
  });

  test('arrow keys move focus and select, and wrap', async ({ page }) => {
    await setup(page, PLANS());
    await page.getByRole('radio', { name: 'Free plan' }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('radio', { name: 'Team plan' })).toBeFocused();
    expect(await selected(page)).toEqual(['team']);
    await page.keyboard.press('ArrowRight');
    await expect(
      page.getByRole('radio', { name: 'Enterprise plan' }),
    ).toBeFocused();
    await page.keyboard.press('ArrowDown'); // wraps
    await expect(page.getByRole('radio', { name: 'Free plan' })).toBeFocused();
    expect(await selected(page)).toEqual(['free']);
    await page.keyboard.press('ArrowUp'); // wraps back
    await expect(
      page.getByRole('radio', { name: 'Enterprise plan' }),
    ).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('radio', { name: 'Team plan' })).toBeFocused();
    expect(await selected(page)).toEqual(['team']);
  });

  test('right-to-left flips the horizontal arrows', async ({ page }) => {
    await setup(page, `<div dir="rtl">${PLANS()}</div>`);
    await page.getByRole('radio', { name: 'Free plan' }).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('radio', { name: 'Team plan' })).toBeFocused();
  });

  test('a disabled card is skipped by the arrows', async ({ page }) => {
    await setup(
      page,
      PLANS().replace(
        'id="team" type="selectable"',
        'id="team" disabled type="selectable"',
      ),
    );
    await page.getByRole('radio', { name: 'Free plan' }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(
      page.getByRole('radio', { name: 'Enterprise plan' }),
    ).toBeFocused();
  });

  test('Space on a focused, unchosen radio chooses it', async ({ page }) => {
    await setup(page, PLANS());
    await page.getByRole('radio', { name: 'Free plan' }).focus();
    await page.keyboard.press(' ');
    expect(await selected(page)).toEqual(['free']);
  });

  test('no live "N selected" message for a radio group (the radio announces itself)', async ({
    page,
  }) => {
    await setup(page, PLANS());
    await page.locator('#team').getByText('team details').click();
    await expect(page.locator('#g').locator('[role="status"]')).toHaveText('');
  });

  test('the whole card shows the focus ring, not the radio', async ({
    page,
  }) => {
    await setup(page, PLANS());
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await settle(page);
    const r = await page.locator('#free').evaluate((el) => ({
      ring: el.matches(':state(focus-ring)'),
      shadow: getComputedStyle(el.shadowRoot!.querySelector('[part="base"]')!)
        .boxShadow,
      outline: getComputedStyle(
        el
          .querySelector('prism-card-select')!
          .shadowRoot!.querySelector('input')!,
      ).outlineStyle,
    }));
    expect(r.ring).toBe(true);
    expect(r.shadow).toMatch(/4px/);
    expect(r.outline).toBe('none');
  });

  test('choice card hover tints (it is operable) and the control hover does too', async ({
    page,
  }) => {
    await setup(page, PLANS());
    const c = await box(page, '#free');
    await page.mouse.move(c.x + c.w / 2, c.y + c.h - 10);
    await settle(page);
    const got = await painted(page.locator('#free'), 'base');
    const want = await expected(
      page,
      'var(--prism-color-bg)',
      'var(--prism-color-text)',
      PCT.hover,
    );
    expect(near(got, want)).toBe(true);
    await page.getByRole('radio', { name: 'Free plan' }).hover();
    await settle(page);
    const got2 = await painted(page.locator('#free'), 'base');
    expect(near(got2, want)).toBe(true);
  });

  test('selected choice card: ring plus a checked radio, never colour alone', async ({
    page,
  }) => {
    await setup(page, PLANS());
    await page.locator('#team').getByText('team details').click();
    await expect(page.getByRole('radio', { name: 'Team plan' })).toBeChecked();
    const ring = await page
      .locator('#team')
      .evaluate(
        (el) =>
          getComputedStyle(el.shadowRoot!.querySelector('[part="base"]')!)
            .boxShadow,
      );
    expect(ring).toMatch(/inset/);
  });
});

test.describe('selection rules and errors', () => {
  test('a selectable card needs kind, a visible control and a value in a group', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card-group label="x"><prism-card type="selectable"><prism-card-title slot="header" level="3">Bare</prism-card-title></prism-card></prism-card-group>`,
    );
    expect(errors.some((e) => e.includes('`kind="choice"`'))).toBe(true);
    expect(errors.some((e) => e.includes('visible prism-card-select'))).toBe(
      true,
    );
    expect(errors.some((e) => e.includes('needs a `value`'))).toBe(true);
  });

  test('a choice card has no other controls', async ({ page }) => {
    const errors = await setup(
      page,
      `<prism-card-group label="x"><prism-card type="selectable" kind="choice" value="1"><prism-card-select slot="header"></prism-card-select><prism-card-title slot="header" level="3">Choice</prism-card-title><prism-button>Extra</prism-button></prism-card></prism-card-group>`,
    );
    expect(errors.some((e) => e.includes('no other controls'))).toBe(true);
  });

  test('a group without a label is a dev error', async ({ page }) => {
    const errors = await setup(
      page,
      `<prism-card-group><prism-card type="selectable" kind="choice" value="1"><prism-card-select slot="header"></prism-card-select><prism-card-title slot="header" level="3">C</prism-card-title></prism-card></prism-card-group>`,
    );
    expect(errors.some((e) => e.includes('needs a `label`'))).toBe(true);
  });

  test('a selection control is refused on a non-selectable card', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card><prism-card-title slot="header" level="3">T</prism-card-title><prism-card-select slot="header" id="s"></prism-card-select></prism-card>`,
    );
    expect(
      await page.locator('#s').evaluate((el) => getComputedStyle(el).display),
    ).toBe('none');
  });

  test('one selection control per card', async ({ page }) => {
    await setup(
      page,
      `<prism-card type="selectable" kind="collection"><prism-card-select slot="header" id="s1"></prism-card-select><prism-card-select slot="header" id="s2"></prism-card-select><prism-card-title slot="header" level="3">T</prism-card-title></prism-card>`,
    );
    expect(
      await page.locator('#s2').evaluate((el) => getComputedStyle(el).display),
    ).toBe('none');
  });

  test('a standalone selectable card (no group) toggles its own checkbox', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card id="s" type="selectable" kind="choice" style="width:260px"><prism-card-select slot="header"></prism-card-select><prism-card-title slot="header" level="3">Solo</prism-card-title><p>click me</p></prism-card>`,
    );
    await page.getByText('click me').click();
    await expect(page.getByRole('checkbox', { name: 'Solo' })).toBeChecked();
    await page.getByText('click me').click();
    await expect(
      page.getByRole('checkbox', { name: 'Solo' }),
    ).not.toBeChecked();
  });

  test('forced-colors: the selected ring is an outline that stays visible', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await setup(page, HOSTS());
    await page.getByRole('checkbox', { name: 'Host A' }).click();
    const o = await page.locator('#a').evaluate((el) => {
      const cs = getComputedStyle(
        el.shadowRoot!.querySelector('[part="base"]')!,
      );
      return [cs.outlineStyle, cs.outlineWidth];
    });
    expect(o).toEqual(['solid', '2px']);
  });
});

test.describe('menu trigger inside a selected card', () => {
  test('stays transparent so the selected tint shows through', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card id="c" type="selectable" kind="collection" value="x" selected>
        <prism-card-header>
          <prism-card-title slot="title" level="3">Host</prism-card-title>
          <prism-menu slot="actions" label="More options for Host">
            <prism-menu-item>Rename</prism-menu-item>
          </prism-menu>
        </prism-card-header>
        <prism-card-content>Body</prism-card-content>
      </prism-card>`,
    );
    const bg = await page.evaluate(() => {
      const m = document.querySelector('prism-menu')!;
      const ib = m.shadowRoot!.querySelector('prism-icon-button')!;
      return getComputedStyle(ib.shadowRoot!.querySelector('[part=base]')!)
        .backgroundColor;
    });
    expect(['transparent', 'rgba(0, 0, 0, 0)']).toContain(bg);
  });
});

test.describe('SelectionController', () => {
  type SC = typeof import('./selection-controller.js').SelectionController;
  test('multi mode toggles, keeps order and counts ids', async ({ page }) => {
    await mount(page, '');
    const r = await page.evaluate(async () => {
      const { SelectionController } = (await import(
        /* @vite-ignore */ '/src/card/' + 'selection-controller.ts'
      )) as { SelectionController: SC };
      const s = new SelectionController();
      s.toggle('a');
      s.toggle('b');
      s.toggle('a');
      s.select('c');
      return { values: s.values, size: s.size, has: s.has('b') };
    });
    expect(r).toEqual({ values: ['b', 'c'], size: 2, has: true });
  });

  test('single mode holds one id and a repeat select reports no change', async ({
    page,
  }) => {
    await mount(page, '');
    const r = await page.evaluate(async () => {
      const { SelectionController } = (await import(
        /* @vite-ignore */ '/src/card/' + 'selection-controller.ts'
      )) as { SelectionController: SC };
      const s = new SelectionController(undefined, { mode: 'single' });
      const first = s.select('a');
      const again = s.select('a');
      s.toggle('b');
      return { first, again, values: s.values };
    });
    expect(r).toEqual({ first: true, again: false, values: ['b'] });
  });

  test('set keeps ids that are not on screen and clear empties', async ({
    page,
  }) => {
    await mount(page, '');
    const r = await page.evaluate(async () => {
      const { SelectionController } = (await import(
        /* @vite-ignore */ '/src/card/' + 'selection-controller.ts'
      )) as { SelectionController: SC };
      const s = new SelectionController();
      s.set(['a', 'b', 'a']);
      const same = s.set(['a', 'b']);
      const size = s.size;
      const cleared = s.clear();
      return { same, size, cleared, after: s.size };
    });
    expect(r).toEqual({ same: false, size: 2, cleared: true, after: 0 });
  });
});

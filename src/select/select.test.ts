import { expect, test, type Page } from '@playwright/test';
import { captureSubmit, mount, submitted } from '../../test/fixture.js';

const OPTIONS = `
  <heru-option value="apple">Apple</heru-option>
  <heru-option value="banana">Banana</heru-option>
  <heru-option value="cherry" disabled>Cherry</heru-option>
  <heru-option value="date">Date</heru-option>`;

const withTheme = (page: Page) =>
  Promise.all([
    page.addStyleTag({ path: 'src/tokens/tokens.css' }),
    page.addStyleTag({ path: 'src/theme/theme.css' }),
  ]);

const activeText = (page: Page) =>
  page.locator('heru-select').evaluate((el) => {
    const t = el.shadowRoot!.querySelector(
      '[part="trigger"]',
    ) as HTMLElement & {
      ariaActiveDescendantElement: Element | null;
    };
    return t.ariaActiveDescendantElement?.textContent ?? null;
  });

test('combobox is labelled, keyboard opens, navigates (skips disabled) and selects', async ({
  page,
}) => {
  await mount(page, `<heru-select label="Fruit">${OPTIONS}</heru-select>`);
  const box = page.getByRole('combobox', { name: 'Fruit' });
  await box.focus();
  await expect(box).toHaveAttribute('aria-expanded', 'false');
  await box.press('ArrowDown');
  await expect(box).toHaveAttribute('aria-expanded', 'true');
  expect(await activeText(page)).toBe('Apple');
  await box.press('ArrowDown');
  await box.press('ArrowDown');
  expect(await activeText(page)).toBe('Date'); // Cherry is disabled
  await box.press('Home');
  expect(await activeText(page)).toBe('Apple');
  await box.press('End');
  await box.press('Enter');
  await expect(box).toHaveAttribute('aria-expanded', 'false');
  await expect(box).toBeFocused();
  expect(
    await page
      .locator('heru-select')
      .evaluate((e: HTMLElement & { value: string }) => e.value),
  ).toBe('date');
  await box.press('ArrowDown');
  await box.press('Escape');
  expect(
    await page
      .locator('heru-select')
      .evaluate((e: HTMLElement & { value: string }) => e.value),
  ).toBe('date');
  await box.press('b'); // typeahead opens on Banana
  expect(await activeText(page)).toBe('Banana');
});

test('pointer: click opens, click option selects and fires change', async ({
  page,
}) => {
  await mount(page, `<heru-select label="Fruit">${OPTIONS}</heru-select>`);
  await page.evaluate(() => {
    document.querySelector('heru-select')!.addEventListener('change', () => {
      (window as unknown as { changed: number }).changed = 1;
    });
  });
  await page.getByRole('combobox', { name: 'Fruit' }).click();
  await page.getByRole('option', { name: 'Banana' }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { changed?: number }).changed,
    ),
  ).toBe(1);
  await expect(page.getByRole('option', { name: 'Banana' })).toBeHidden();
});

test('form: submits value, required blocks submit, reset restores', async ({
  page,
}) => {
  await mount(
    page,
    `<form><heru-select label="Fruit" name="fruit" required>${OPTIONS}<span slot="error">Pick one</span></heru-select><button>Go</button><button type="reset">Reset</button></form>`,
  );
  await captureSubmit(page);
  await page.getByRole('button', { name: 'Go' }).click();
  expect(await submitted(page)).toBeUndefined();
  const box = page.getByRole('combobox', { name: 'Fruit' });
  await expect(box).toHaveAttribute('aria-invalid', 'true');
  await box.focus();
  await box.press('ArrowDown');
  await box.press('Enter');
  await page.getByRole('button', { name: 'Go' }).click();
  expect(await submitted(page)).toEqual({ fruit: 'apple' });
  await page.getByRole('button', { name: 'Reset' }).click();
  expect(
    await page
      .locator('heru-select')
      .evaluate((e: HTMLElement & { value: string }) => e.value),
  ).toBe('');
  await expect(box).toHaveAttribute('aria-invalid', 'false');
});

test('disabled: excluded from submit and does not open', async ({ page }) => {
  await mount(
    page,
    `<form><heru-select label="Fruit" name="fruit" value="apple" disabled>${OPTIONS}</heru-select><button>Go</button></form>`,
  );
  await captureSubmit(page);
  await page.getByRole('button', { name: 'Go' }).click();
  expect(await submitted(page)).toEqual({});
  await page.getByRole('combobox', { name: 'Fruit' }).click({ force: true });
  await expect(page.getByRole('combobox', { name: 'Fruit' })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
});

test('error replaces helper text', async ({ page }) => {
  await mount(
    page,
    `<heru-select label="Fruit" required>${OPTIONS}<span slot="description">Ships Mondays</span><span slot="error">Pick one</span></heru-select>`,
  );
  const box = page.getByRole('combobox', { name: 'Fruit' });
  await expect(box).toHaveAccessibleDescription('Ships Mondays');
  await expect(page.getByText('Ships Mondays')).toBeVisible();
  await page
    .locator('heru-select')
    .evaluate((e: HTMLElement & { reportValidity(): boolean }) =>
      e.reportValidity(),
    );
  await expect(page.getByText('Pick one')).toBeVisible();
  await expect(page.getByText('Ships Mondays')).toBeHidden();
  await expect(box).toHaveAccessibleDescription('Pick one');
});

const errorAnimations = (page: Page) =>
  page
    .locator('heru-select')
    .evaluate(
      (el) =>
        el.shadowRoot!.querySelector('[part="error"]')!.getAnimations().length,
    );

test('error animation runs on invalid only, never on focus', async ({
  page,
}) => {
  await mount(
    page,
    `<heru-select label="Fruit" required>${OPTIONS}<span slot="error">Pick one</span></heru-select>`,
  );
  await withTheme(page);
  await page.getByRole('combobox', { name: 'Fruit' }).focus();
  expect(await errorAnimations(page)).toBe(0);
  await page
    .locator('heru-select')
    .evaluate((e: HTMLElement & { reportValidity(): boolean }) =>
      e.reportValidity(),
    );
  expect(await errorAnimations(page)).toBe(1);
  await page.waitForTimeout(400);
  await page.getByRole('combobox', { name: 'Fruit' }).blur();
  await page.getByRole('combobox', { name: 'Fruit' }).focus();
  expect(await errorAnimations(page)).toBe(0);
});

test('reduced motion: menu and error appear without animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(
    page,
    `<heru-select label="Fruit" required>${OPTIONS}<span slot="error">Pick one</span></heru-select>`,
  );
  await withTheme(page);
  await page
    .locator('heru-select')
    .evaluate((e: HTMLElement & { reportValidity(): boolean }) =>
      e.reportValidity(),
    );
  expect(await errorAnimations(page)).toBe(0);
  await page.getByRole('combobox', { name: 'Fruit' }).click();
  const n = await page
    .locator('heru-select')
    .evaluate(
      (el) =>
        el.shadowRoot!.querySelector('[part="listbox"]')!.getAnimations()
          .length,
    );
  expect(n).toBe(0);
});

test('menu slides down with motion allowed and uses elevation tokens', async ({
  page,
}) => {
  await mount(page, `<heru-select label="Fruit">${OPTIONS}</heru-select>`);
  await withTheme(page);
  await page.getByRole('combobox', { name: 'Fruit' }).click();
  const r = await page.locator('heru-select').evaluate((el) => {
    const lb = el.shadowRoot!.querySelector('[part="listbox"]')!;
    return {
      anims: lb.getAnimations().map((a) => (a as CSSAnimation).animationName),
      shadow: getComputedStyle(lb).boxShadow,
    };
  });
  expect(r.anims).toContain('heru-slide-down');
  expect(r.shadow).not.toBe('none');
});

test('attached error box is inset 8px on each side of the control', async ({
  page,
}) => {
  await mount(
    page,
    `<heru-select label="Fruit" required>${OPTIONS}<span slot="error">Pick one</span></heru-select>`,
  );
  await withTheme(page);
  const r = await page.locator('heru-select').evaluate(async (el) => {
    (el as HTMLElement & { reportValidity(): boolean }).reportValidity();
    await (el as HTMLElement & { updateComplete: Promise<unknown> })
      .updateComplete;
    const t = el
      .shadowRoot!.querySelector('[part="trigger"]')!
      .getBoundingClientRect();
    const e = el
      .shadowRoot!.querySelector('[part="error"]')!
      .getBoundingClientRect();
    return {
      left: e.left - t.left,
      right: t.right - e.right,
      tuck: t.bottom - e.top,
    };
  });
  expect(r.left).toBeCloseTo(8, 0);
  expect(r.right).toBeCloseTo(8, 0);
  // Attached: starts under the control's bottom edge, no gap.
  expect(r.tuck).toBeGreaterThan(0);
});

const errorBox = (page: Page, tag: string) =>
  page.locator(tag).evaluate(async (el) => {
    const host = el as HTMLElement & {
      reportValidity(): boolean;
      updateComplete: Promise<unknown>;
    };
    host.reportValidity();
    await host.updateComplete;
    const ctl = el.shadowRoot!.querySelector(
      '[part="trigger"], [part="input"]',
    )!;
    const box = el.shadowRoot!.querySelector('[part="error"]')!;
    const desc = el.shadowRoot!.querySelector('[part="description"]')!;
    const t = ctl.getBoundingClientRect();
    const e = box.getBoundingClientRect();
    const cs = getComputedStyle(box);
    return {
      shadow: cs.boxShadow,
      bg: cs.backgroundColor,
      fontSize: cs.fontSize,
      left: e.left - t.left,
      right: t.right - e.right,
      tuck: t.bottom - e.top,
      helperHidden: desc.hasAttribute('hidden'),
    };
  });

for (const tag of ['heru-select', 'heru-text-field']) {
  test(`${tag}: flat attached error box (no shadow, inset 8px, tucked, replaces helper)`, async ({
    page,
  }) => {
    const inner = tag === 'heru-select' ? OPTIONS : '';
    await mount(
      page,
      `<${tag} label="Fruit" required>${inner}<span slot="description">Help</span><span slot="error">Pick one</span></${tag}>`,
    );
    await withTheme(page);
    const r = await errorBox(page, tag);
    expect(r.shadow).toBe('none');
    expect(r.bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(r.fontSize).toBe('12px');
    expect(r.left).toBeCloseTo(8, 0);
    expect(r.right).toBeCloseTo(8, 0);
    expect(r.tuck).toBeGreaterThan(0);
    expect(r.helperHidden).toBe(true);
  });
}

test('select focus matches text field focus (outer ring), incl. invalid', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await mount(
    page,
    `<heru-text-field label="Name" required></heru-text-field><heru-select label="Fruit" required>${OPTIONS}</heru-select>`,
  );
  await withTheme(page);
  const shadow = async (focus: () => Promise<void>, sel: string) => {
    await focus();
    return page.evaluate(
      (s) =>
        getComputedStyle(
          document
            .querySelector(s.split('|')[0]!)!
            .shadowRoot!.querySelector(s.split('|')[1]!)!,
        ).boxShadow,
      sel,
    );
  };
  const tf = await shadow(
    () => page.getByRole('textbox', { name: 'Name' }).focus(),
    'heru-text-field|[part="input"]',
  );
  const se = await shadow(
    () => page.getByRole('combobox', { name: 'Fruit' }).focus(),
    'heru-select|[part="trigger"]',
  );
  expect(tf).not.toContain('inset');
  expect(se).toBe(tf);
  await page.evaluate(() =>
    document
      .querySelectorAll('heru-text-field, heru-select')
      .forEach((e) =>
        (e as HTMLElement & { reportValidity(): boolean }).reportValidity(),
      ),
  );
  const tfi = await shadow(
    () => page.getByRole('textbox', { name: 'Name' }).focus(),
    'heru-text-field|[part="input"]',
  );
  const sei = await shadow(
    () => page.getByRole('combobox', { name: 'Fruit' }).focus(),
    'heru-select|[part="trigger"]',
  );
  expect(sei).toBe(tfi);
  expect(sei).not.toBe(se);
});

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
      letterSpacing: cs.letterSpacing,
      weight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      radii: [
        cs.borderTopLeftRadius,
        cs.borderTopRightRadius,
        cs.borderBottomRightRadius,
        cs.borderBottomLeftRadius,
      ],
      padding: [
        cs.paddingTop,
        cs.paddingRight,
        cs.paddingBottom,
        cs.paddingLeft,
      ],
      overlap: cs.marginTop,
    };
  });

for (const tag of ['heru-select', 'heru-text-field']) {
  test(`${tag}: flat attached error box (no shadow, inset 8px, tucked, replaces helper)`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
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
    // Astryx FieldStatus attached values.
    expect(r.letterSpacing).toBe('normal');
    expect(r.weight).toBe('400');
    expect(r.lineHeight).toBe('16px');
    expect(r.radii).toEqual(['0px', '0px', '8px', '8px']);
    expect(r.padding).toEqual(['12px', '8px', '6px', '8px']);
    expect(r.overlap).toBe('-6px');
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

for (const tag of ['heru-select', 'heru-text-field']) {
  test(`${tag}: 4px label gap, 8px description gap, focus reach clears label/description/error text`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const inner = tag === 'heru-select' ? OPTIONS : '';
    await mount(
      page,
      `<${tag} label="Fruit" required>${inner}<span slot="description">Help</span><span slot="error">Pick one</span></${tag}>`,
    );
    await withTheme(page);
    const g = await page.locator(tag).evaluate(async (el) => {
      const root = el.shadowRoot!;
      const q = (s: string) => root.querySelector(s)!.getBoundingClientRect();
      const ctl = q('[part="trigger"], [part="input"]');
      const reach =
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--heru-focus-ring-offset',
          ),
        ) +
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--heru-focus-ring-width',
          ),
        ) +
        parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--heru-focus-halo-width',
          ),
        );
      const label = q('[part="label"]');
      const desc = q('[part="description"]');
      const host = el as HTMLElement & {
        reportValidity(): boolean;
        updateComplete: Promise<unknown>;
      };
      host.reportValidity();
      await host.updateComplete;
      // Top of the error text's line box (box top + padding-top).
      const errBox = root.querySelector('[part="error"]')!;
      const errTop =
        errBox.getBoundingClientRect().top +
        parseFloat(getComputedStyle(errBox).paddingTop);
      return {
        reach,
        labelGap: ctl.top - label.bottom,
        descGap: desc.top - ctl.bottom,
        errGap: errTop - ctl.bottom,
      };
    });
    expect(g.reach).toBeLessThanOrEqual(4);
    expect(g.labelGap).toBeCloseTo(4, 0);
    expect(g.descGap).toBeCloseTo(8, 0);
    expect(g.labelGap).toBeGreaterThanOrEqual(g.reach);
    expect(g.descGap).toBeGreaterThan(g.reach);
    expect(g.errGap).toBeGreaterThan(g.reach);
    expect(g.errGap).toBeLessThanOrEqual(6.5);
  });
}

for (const tag of ['heru-select', 'heru-text-field']) {
  test(`${tag}: error text is centered in the visible 28px box and clears the ring`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const inner = tag === 'heru-select' ? OPTIONS : '';
    await mount(
      page,
      `<${tag} label="Fruit" required>${inner}<span slot="error">Enter an email address.</span></${tag}>`,
    );
    await withTheme(page);
    const m = await page.locator(tag).evaluate(async (el) => {
      await document.fonts.ready;
      const host = el as HTMLElement & {
        reportValidity(): boolean;
        updateComplete: Promise<unknown>;
      };
      host.reportValidity();
      await host.updateComplete;
      const root = el.shadowRoot!;
      const ctl = root
        .querySelector('[part="trigger"], [part="input"]')!
        .getBoundingClientRect();
      const box = root.querySelector('[part="error"]')!.getBoundingClientRect();
      const span = el.querySelector('[slot="error"]')!;
      const range = document.createRange();
      range.selectNodeContents(span);
      const g = range.getBoundingClientRect();
      return {
        total: box.height,
        visible: box.bottom - ctl.bottom,
        glyphTop: g.top - ctl.bottom,
        glyphBottom: box.bottom - g.bottom,
      };
    });
    expect(m.total).toBeCloseTo(34, 0);
    expect(m.visible).toBeCloseTo(28, 0);
    expect(m.glyphTop).toBeGreaterThanOrEqual(6); // clears the 4px focus reach
    expect(Math.abs(m.glyphTop - m.glyphBottom)).toBeLessThanOrEqual(1.5);
  });
}

test('option hover and keyboard-active use a flat slate-100 background, no shadow', async ({
  page,
}) => {
  await mount(page, `<heru-select label="Fruit">${OPTIONS}</heru-select>`);
  await withTheme(page);
  const read = (v: string) =>
    page.locator(`heru-option[value="${v}"]`).evaluate((o) => {
      const b = getComputedStyle(o.shadowRoot!.querySelector('[part="base"]')!);
      const probe = document.createElement('div');
      probe.style.background = 'var(--heru-color-slate-100)';
      document.body.append(probe);
      const want = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return { shadow: b.boxShadow, bg: b.backgroundColor, want };
    });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('combobox', { name: 'Fruit' }).click();
  await page.locator('heru-option[value="banana"]').hover();
  const hover = await read('banana');
  expect(hover.shadow).toBe('none');
  expect(hover.bg).toBe(hover.want);
  await page.mouse.move(0, 0);
  await page.getByRole('combobox', { name: 'Fruit' }).press('End');
  const active = await read('date');
  expect(active.shadow).toBe('none');
  expect(active.bg).toBe(active.want);
});

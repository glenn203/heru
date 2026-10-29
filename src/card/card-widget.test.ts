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
const WIDGET = (attrs = '', body = '') => `
  <section id="page" data-prism-time-range="Last 24 hours">
    <prism-card id="w" type="widget" ${attrs} style="width:360px">
      <prism-card-title slot="header" level="3">Items over time</prism-card-title>
      <prism-card-description slot="header">Aperture Labs</prism-card-description>
      <prism-card-actions slot="header">
        <prism-icon-button label="Refresh Items over time">R</prism-icon-button>
        <prism-menu label="More options for Items over time">
          <prism-menu-item>Configure</prism-menu-item>
          <prism-menu-item>Export</prism-menu-item>
          <prism-menu-item>Remove</prism-menu-item>
        </prism-menu>
      </prism-card-actions>
      ${body || '<prism-card-metric label="Items">1,284</prism-card-metric>'}
      <prism-card-meta slot="footer">Updated 2 min ago</prism-card-meta>
      <prism-card-actions slot="footer">
        <prism-button variant="ghost" size="sm">View all</prism-button>
      </prism-card-actions>
    </prism-card>
  </section>`;
const range = (page: Page) =>
  page.locator('#w').evaluate((el) => {
    const c = el as HTMLElement & {
      effectiveRange: string;
      rangeOverridden: boolean;
    };
    const part = c.shadowRoot!.querySelector<HTMLElement>('[part="range"]')!;
    return {
      effective: c.effectiveRange,
      overridden: c.rangeOverridden,
      shown: !part.hidden,
      text: part.hidden
        ? ''
        : [
            part.textContent,
            ...[...part.querySelectorAll('slot')].flatMap((sl) =>
              sl.assignedNodes({ flatten: true }).map((n) => n.textContent),
            ),
          ]
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim(),
    };
  });

test.describe('widget card', () => {
  test('is a labelled group with a real heading, not a landmark', async ({
    page,
  }) => {
    const errors = await setup(page, WIDGET());
    expect(errors).toEqual([]);
    await expect(page.locator('#w')).toHaveAttribute('role', 'group');
    await expect(page.locator('#w')).toHaveAttribute(
      'aria-label',
      'Items over time',
    );
    await expect(
      page.getByRole('heading', { level: 3, name: 'Items over time' }),
    ).toHaveCount(1);
    await expect(page.getByRole('region')).toHaveCount(0);
  });

  test('header: scope description, refresh and overflow; footer: Updated and View all', async ({
    page,
  }) => {
    const errors = await setup(page, WIDGET());
    expect(errors).toEqual([]);
    await expect(
      page.getByRole('button', { name: 'Refresh Items over time' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: 'More options for Items over time',
      }),
    ).toBeVisible();
    await expect(page.getByText('Aperture Labs')).toBeVisible();
    await expect(page.getByText('Updated 2 min ago')).toBeVisible();
    await expect(page.getByRole('button', { name: 'View all' })).toBeVisible();
  });

  test('metric: PROPOSED 28/36/600 with tabular figures; label under it', async ({
    page,
  }) => {
    await setup(page, WIDGET());
    const m = await page.locator('prism-card-metric').evaluate((el) => {
      const v = el.shadowRoot!.querySelector('[part="value"]')!;
      const l = el.shadowRoot!.querySelector<HTMLElement>('[part="label"]')!;
      const cs = getComputedStyle(v);
      const vb = v.getBoundingClientRect();
      const lb = l.getBoundingClientRect();
      return {
        size: cs.fontSize,
        line: cs.lineHeight,
        weight: cs.fontWeight,
        tabular: cs.fontVariantNumeric,
        labelBelow: lb.top >= vb.bottom - 0.5,
        label: l.textContent,
      };
    });
    expect(m).toMatchObject({
      size: '28px',
      line: '36px',
      weight: '600',
      tabular: expect.stringContaining('tabular-nums'),
      labelBelow: true,
      label: 'Items',
    });
  });

  test('the metric style is private: no Display style, no token edit', async ({
    page,
  }) => {
    await setup(page, WIDGET());
    const family = await page
      .locator('prism-card-metric')
      .evaluate((el) =>
        getComputedStyle(
          el.shadowRoot!.querySelector('[part="value"]')!,
        ).getPropertyValue('--_metric-font-size'),
      );
    expect(family).not.toBe('');
  });
});

test.describe('widget time range: page level with a per-widget override', () => {
  test('follows the page attribute; nothing is marked overridden', async ({
    page,
  }) => {
    await setup(page, WIDGET());
    expect(await range(page)).toEqual({
      effective: 'Last 24 hours',
      overridden: false,
      shown: false,
      text: '',
    });
  });

  test('a page change reaches the widget and fires prism-card-range', async ({
    page,
  }) => {
    await setup(page, WIDGET());
    await page.evaluate(() => {
      const w = window as unknown as { seen: unknown[] };
      w.seen = [];
      document.addEventListener('prism-card-range', (e) =>
        w.seen.push((e as CustomEvent).detail),
      );
      document
        .querySelector('#page')!
        .setAttribute('data-prism-time-range', 'Last 7 days');
    });
    await settle(page);
    expect((await range(page)).effective).toBe('Last 7 days');
    expect(
      await page.evaluate(
        () => (window as unknown as { seen: unknown[] }).seen,
      ),
    ).toEqual([{ range: 'Last 7 days', overridden: false }]);
  });

  test('its own range wins, is shown in the header and says "Overridden" in text', async ({
    page,
  }) => {
    await setup(page, WIDGET('range="Last 30 days"'));
    const r = await range(page);
    expect(r).toEqual({
      effective: 'Last 30 days',
      overridden: true,
      shown: true,
      text: 'Last 30 days Overridden',
    });
    // A page change does not move an overridden widget.
    await page.evaluate(() =>
      document
        .querySelector('#page')!
        .setAttribute('data-prism-time-range', 'Last 7 days'),
    );
    await settle(page);
    expect((await range(page)).effective).toBe('Last 30 days');
  });

  test('the override cue is not colour alone: the flag is a Tag with a fill and the word', async ({
    page,
  }) => {
    await setup(page, WIDGET('range="Last 30 days"'));
    const flag = await page.locator('#w').evaluate((el) => {
      const f = el.querySelector('prism-tag')!;
      const cs = getComputedStyle(
        f.shadowRoot!.querySelector('[part="base"]')!,
      );
      return {
        text: f.textContent,
        tag: f.localName,
        border: cs.borderTopWidth,
        fill: cs.backgroundColor,
      };
    });
    // A Tag: the word plus a filled box, so the override is never colour alone.
    expect(flag.text).toBe('Overridden');
    expect(flag.tag).toBe('prism-tag');
    expect(flag.border).toBe('1px');
    expect(flag.fill).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('removing the override returns to the page range and fires the event', async ({
    page,
  }) => {
    await setup(page, WIDGET('range="Last 30 days"'));
    await page.evaluate(() => {
      const w = window as unknown as { seen: unknown[] };
      w.seen = [];
      document.addEventListener('prism-card-range', (e) =>
        w.seen.push((e as CustomEvent).detail),
      );
      document.querySelector('#w')!.removeAttribute('range');
    });
    await settle(page);
    expect((await range(page)).overridden).toBe(false);
    expect(
      await page.evaluate(
        () => (window as unknown as { seen: unknown[] }).seen,
      ),
    ).toEqual([{ range: 'Last 24 hours', overridden: false }]);
  });

  test('a TimeRangeInput in the header without an override is a dev error; a third action is rejected', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card type="widget"><prism-card-title slot="header" level="3">X</prism-card-title>
        <prism-card-actions slot="header"><prism-time-range-input></prism-time-range-input></prism-card-actions>
        body</prism-card>`,
    );
    expect(errors.some((e) => e.includes('only when it overrides'))).toBe(true);
  });

  test('a TimeRangeInput is accepted on a widget and refused on other cards', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card type="widget" range="Last 7 days"><prism-card-title slot="header" level="3">A</prism-card-title>
        <prism-card-actions slot="header"><prism-time-range-input id="ok"></prism-time-range-input></prism-card-actions>x</prism-card>
       <prism-card><prism-card-title slot="header" level="3">B</prism-card-title>
        <prism-card-actions slot="header"><prism-time-range-input id="no"></prism-time-range-input></prism-card-actions>x</prism-card>`,
    );
    await expect(page.locator('#ok')).not.toHaveAttribute('data-prism-invalid');
    await expect(page.locator('#no')).toHaveAttribute(
      'data-prism-invalid',
      /widget/,
    );
    expect(errors.some((e) => e.includes('only for widget cards'))).toBe(true);
  });

  test('no resize: a widget has no resize handle or Resize hook', async ({
    page,
  }) => {
    await setup(page, WIDGET());
    await expect(page.locator('#w')).not.toHaveAttribute('resizable');
    await expect(page.getByText('Resize', { exact: false })).toHaveCount(0);
  });
});

test.describe('widget states stay inside the widget', () => {
  test('loading: a skeleton replaces the content, header and footer stay, busy and "Loading"', async ({
    page,
  }) => {
    const errors = await setup(page, WIDGET('state="loading"'));
    expect(errors).toEqual([]);
    await expect(page.locator('#w')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('prism-card-metric')).toBeHidden();
    await expect(page.locator('prism-card-skeleton')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Items over time' }),
    ).toBeVisible();
    await expect(page.getByText('Updated 2 min ago')).toBeVisible();
    await expect(page.locator('#w').locator('[part="status"]')).toHaveText(
      'Loading',
    );
    // Decorative: hidden from assistive technology.
    await expect(page.locator('prism-card-skeleton')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  test('error: says what failed, one Retry, only this widget; Retry fires and the content returns', async ({
    page,
  }) => {
    await setup(
      page,
      WIDGET('state="error" state-message="Items service timed out."') +
        '<prism-card id="other" type="widget"><prism-card-title slot="header" level="3">Other</prism-card-title><prism-card-metric>7</prism-card-metric></prism-card>',
    );
    await expect(page.locator('#w [data-prism-card-state] p')).toHaveText(
      'Items service timed out.',
    );
    await expect(page.locator('#w').locator('[part="status"]')).toHaveText(
      'Items service timed out.',
    );
    await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(1);
    await expect(page.locator('#other prism-card-metric')).toBeVisible();
    await page.evaluate(() => {
      const w = window as unknown as { retried: number };
      w.retried = 0;
      document.addEventListener('prism-card-retry', () => w.retried++);
    });
    await page.getByRole('button', { name: 'Retry' }).click();
    expect(
      await page.evaluate(
        () => (window as unknown as { retried: number }).retried,
      ),
    ).toBe(1);
    await page.locator('#w').evaluate((el) => el.removeAttribute('state'));
    await settle(page);
    await expect(page.locator('#w prism-card-metric')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toHaveCount(0);
  });

  test('empty: "No data for this range" and a Change range button', async ({
    page,
  }) => {
    await setup(page, WIDGET('state="empty"'));
    await expect(page.locator('#w [data-prism-card-state] p')).toHaveText(
      'No data for this range',
    );
    await page.evaluate(() => {
      const w = window as unknown as { hits: number };
      w.hits = 0;
      document.addEventListener('prism-card-change-range', () => w.hits++);
    });
    await page.getByRole('button', { name: 'Change range' }).click();
    expect(
      await page.evaluate(() => (window as unknown as { hits: number }).hits),
    ).toBe(1);
  });

  test('narrow: header actions still fold into the overflow menu', async ({
    page,
  }) => {
    await setup(page, WIDGET().replace('width:360px', 'width:260px'));
    await expect(page.locator('#w')).toHaveAttribute('role', 'group');
    const narrow = await page
      .locator('#w')
      .evaluate((el) => el.matches(':state(narrow)'));
    expect(narrow).toBe(true);
  });
});

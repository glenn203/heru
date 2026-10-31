import { expect, test, type Locator, type Page } from '@playwright/test';
import { axe } from '../../test/axe.js';
import { mount } from '../../test/fixture.js';
import {
  animsOn,
  maxStep,
  painted,
  recordFrames,
  wait,
} from '../../test/field.js';

const OPTIONS = `
  <prism-option value="apricot">Apricot</prism-option>
  <prism-option value="banana">Banana</prism-option>
  <prism-option value="cherry" disabled>Cherry</prism-option>
  <prism-option value="date">Date</prism-option>
  <prism-option value="elder">Elderberry</prism-option>
  <prism-option value="fig">Fig</prism-option>`;
const SELECT = `<prism-select id="s" label="Fruit">${OPTIONS}</prism-select>`;

async function setup(page: Page, markup: string, theme = 'light') {
  await mount(page, markup);
  await page.addStyleTag({ path: 'src/tokens/tokens.css' });
  await page.addStyleTag({ path: 'src/theme/theme.css' });
  await page.evaluate(
    (t) => document.documentElement.setAttribute('data-prism-theme', t),
    theme,
  );
  await painted(page);
  await wait(page, 500);
}

const host = (page: Page) => page.locator('#s');
const combo = (page: Page) => page.getByRole('combobox', { name: 'Fruit' });

/** Listbox: scale (x, y), vertical offset, opacity, and whether it is on screen. */
const listPose = (page: Page) =>
  host(page).evaluate((el) => {
    const lb = el.shadowRoot!.querySelector<HTMLElement>('[part="listbox"]')!;
    const m = new DOMMatrix(getComputedStyle(lb).transform);
    return {
      sx: m.a,
      sy: m.d,
      ty: m.f,
      opacity: Number(getComputedStyle(lb).opacity),
      hidden: lb.hidden || getComputedStyle(lb).display === 'none',
    };
  });

/** The marker's top, relative to the option it should sit on, and its opacity. */
const markerOn = (page: Page, value: string) =>
  host(page).evaluate((el, value) => {
    const m = el.shadowRoot!.querySelector('[part="highlight"]')!;
    const o = el.querySelector(`prism-option[value="${value}"]`)!;
    const mr = m.getBoundingClientRect();
    const or = o.getBoundingClientRect();
    return {
      dy: mr.top - or.top,
      dh: mr.height - or.height,
      opacity: Number(getComputedStyle(m).opacity),
    };
  }, value);

/** Check mark of an option: stroke still to draw (1 = none) and opacity. */
const checkOf = (opt: Locator) =>
  opt.evaluate((el) => {
    const mark = el.shadowRoot!.querySelector('[part="mark"]')!;
    const cs = getComputedStyle(mark);
    return {
      offset: parseFloat(cs.strokeDashoffset),
      opacity: Number(cs.opacity),
    };
  });

test.describe('prism-select: open and close', () => {
  test('grows out of the trigger on springs: transform and opacity, one clock with the chevron', async ({
    page,
  }) => {
    await setup(page, SELECT);
    await combo(page).click();
    const list = await animsOn(host(page), 'listbox');
    const chev = await animsOn(host(page), 'indicator');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      css: false,
      easing: 'linear',
      props: ['opacity', 'transform'],
    });
    expect(chev[0]!.props).toEqual(['transform']);
    expect(chev[0]!.ms).toBe(list[0]!.ms);
    expect(list[0]!.ms).toBeGreaterThan(150);
    expect(list[0]!.ms).toBeLessThan(600);
  });

  test('starts small, faint and tucked under the trigger; ends at rest with no animation left', async ({
    page,
  }) => {
    await setup(page, SELECT);
    await combo(page).click();
    // Pause at the first frame.
    await host(page).evaluate((el) => {
      for (const a of el
        .shadowRoot!.querySelector('[part="listbox"]')!
        .getAnimations()) {
        a.pause();
        a.currentTime = 0;
      }
    });
    const start = await listPose(page);
    expect(start.sy).toBeLessThan(0.92);
    expect(start.sx).toBeLessThan(0.99);
    expect(start.ty).toBeLessThan(-4);
    expect(start.opacity).toBeLessThan(0.1);
    await host(page).evaluate((el) => {
      for (const a of el
        .shadowRoot!.querySelector('[part="listbox"]')!
        .getAnimations())
        a.play();
    });
    await wait(page, 800);
    const end = await listPose(page);
    expect(end).toMatchObject({
      sx: 1,
      sy: 1,
      ty: 0,
      opacity: 1,
      hidden: false,
    });
    expect(await animsOn(host(page), 'listbox')).toEqual([]);
    const flip = await host(page).evaluate(
      (el) =>
        new DOMMatrix(
          getComputedStyle(el.shadowRoot!.querySelector('[part="indicator"]')!)
            .transform,
        ).a,
    );
    expect(flip).toBeCloseTo(-1, 2); // the chevron has turned over
  });

  test('closing keeps the list on screen while it shrinks, ignores the pointer, then hides', async ({
    page,
  }) => {
    await setup(page, SELECT);
    await combo(page).click();
    await wait(page, 700);
    await combo(page).press('Escape');
    await expect(combo(page)).toHaveAttribute('aria-expanded', 'false');
    const mid = await host(page).evaluate((el) => {
      const lb = el.shadowRoot!.querySelector<HTMLElement>('[part="listbox"]')!;
      return {
        shown: !lb.hidden,
        events: getComputedStyle(lb).pointerEvents,
        inert: lb.inert,
      };
    });
    expect(mid).toEqual({ shown: true, events: 'none', inert: true });
    await expect
      .poll(() =>
        host(page).evaluate(
          (el) =>
            el.shadowRoot!.querySelector<HTMLElement>('[part="listbox"]')!
              .hidden,
        ),
      )
      .toBe(true);
    await expect(combo(page)).toBeFocused();
  });

  test('interruptible: close mid-open and reopen mid-close never jump', async ({
    page,
  }) => {
    await setup(page, SELECT);
    const rows = await recordFrames(
      host(page),
      1100,
      (root) => {
        const lb = root.querySelector<HTMLElement>('[part="listbox"]')!;
        const cs = getComputedStyle(lb);
        const m = new DOMMatrix(cs.transform);
        return [
          lb.hidden ? 0 : Number(cs.opacity),
          lb.hidden ? 0.88 : m.d,
          lb.hidden ? -6 : m.f,
        ];
      },
      [
        {
          at: 50,
          run: (h) =>
            h
              .shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!
              .click(),
        },
        {
          at: 130,
          run: (h) =>
            h
              .shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!
              .click(),
        },
        {
          at: 190,
          run: (h) =>
            h
              .shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!
              .click(),
        },
      ],
    );
    const [dOpacity, dScale, dY] = maxStep(rows);
    expect(dOpacity).toBeLessThan(0.45); // fades over ~4 frames at its fastest
    expect(dScale).toBeLessThan(0.06);
    expect(dY).toBeLessThan(2.5);
    // Opened, closed, opened again: it ends open and settled.
    expect(rows.at(-1)).toEqual([1, 1, 0]);
  });

  test('reduced motion: no animation, shows and hides at once, fades only', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setup(page, SELECT);
    await combo(page).click();
    // No spring: only the collapsed-duration fade below.
    expect(
      (await animsOn(host(page), 'listbox')).filter((a) => !a.css),
    ).toEqual([]);
    const anims = await host(page).evaluate((el) =>
      el
        .shadowRoot!.querySelector('[part="listbox"]')!
        .getAnimations()
        .map((a) => (a as CSSAnimation).animationName),
    );
    expect(anims).toEqual(['prism-fade-in']);
    expect(await listPose(page)).toMatchObject({
      sx: 1,
      sy: 1,
      ty: 0,
      hidden: false,
    });
    await combo(page).press('Escape');
    expect((await listPose(page)).hidden).toBe(true);
  });
});

test.describe('prism-select: option highlight', () => {
  test('on open the marker is already on the active option, with no travel', async ({
    page,
  }) => {
    await setup(page, SELECT);
    await combo(page).click();
    expect(await animsOn(host(page), 'highlight')).toEqual([]);
    await wait(page, 700);
    const at = await markerOn(page, 'apricot');
    expect(Math.abs(at.dy)).toBeLessThan(1);
    expect(Math.abs(at.dh)).toBeLessThan(1);
    expect(at.opacity).toBe(1);
  });

  test('arrow keys slide it to the next enabled option (transform and opacity only) and it lands exactly', async ({
    page,
  }) => {
    await setup(page, SELECT);
    await combo(page).click();
    await wait(page, 700);
    await combo(page).press('ArrowDown');
    const a = await animsOn(host(page), 'highlight');
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({
      css: false,
      easing: 'linear',
      props: ['opacity', 'transform'],
    });
    await wait(page, 700);
    expect(Math.abs((await markerOn(page, 'banana')).dy)).toBeLessThan(1);
    await combo(page).press('ArrowDown'); // Cherry is disabled
    await wait(page, 700);
    expect(Math.abs((await markerOn(page, 'date')).dy)).toBeLessThan(1);
    await combo(page).press('End');
    await wait(page, 700);
    expect(Math.abs((await markerOn(page, 'fig')).dy)).toBeLessThan(1);
  });

  test('the slide is smooth and settles, and a new target takes over from where it is', async ({
    page,
  }) => {
    await setup(page, SELECT);
    await combo(page).click();
    await wait(page, 700);
    const row = await host(page).evaluate((el) => {
      const o = el.querySelector('prism-option')!.getBoundingClientRect();
      return o.height;
    });
    const rows = await recordFrames(
      host(page),
      800,
      (root) => {
        const m = new DOMMatrix(
          getComputedStyle(root.querySelector('[part="highlight"]')!).transform,
        );
        return [m.f];
      },
      [
        {
          at: 50,
          run: () =>
            document
              .querySelector('#s')!
              .shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!
              .dispatchEvent(
                new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
              ),
        },
        {
          at: 130,
          run: () =>
            document
              .querySelector('#s')!
              .shadowRoot!.querySelector<HTMLElement>('[part="trigger"]')!
              .dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
              ),
        },
      ],
    );
    const travel =
      Math.max(...rows.map((r) => r[0]!)) - Math.min(...rows.map((r) => r[0]!));
    expect(travel).toBeGreaterThan(row * 3); // it did start towards Fig
    // A spring covers about a quarter of its distance in its fastest frame.
    expect(maxStep(rows)[0]).toBeLessThan(travel * 0.35);
    expect(Math.abs(rows.at(-1)![0]! - rows[0]![0]!)).toBeLessThan(1); // and is home on Apricot
  });

  test('the pointer moves it too', async ({ page }) => {
    await setup(page, SELECT);
    await combo(page).click();
    await wait(page, 700);
    await page.getByRole('option', { name: 'Date' }).hover();
    await wait(page, 700);
    expect(Math.abs((await markerOn(page, 'date')).dy)).toBeLessThan(1);
  });

  test('reduced motion: it jumps with no animation', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setup(page, SELECT);
    await combo(page).click();
    await combo(page).press('ArrowDown');
    expect(await animsOn(host(page), 'highlight')).toEqual([]);
    expect(Math.abs((await markerOn(page, 'banana')).dy)).toBeLessThan(1);
  });

  test('forced colors: the marker is a Highlight box, not a tint', async ({
    page,
  }) => {
    await page.emulateMedia({
      forcedColors: 'active',
      reducedMotion: 'reduce',
    });
    await setup(page, SELECT);
    await combo(page).click();
    const r = await host(page).evaluate((el) => {
      const cs = getComputedStyle(
        el.shadowRoot!.querySelector('[part="highlight"]')!,
      );
      return { style: cs.borderTopStyle, width: cs.borderTopWidth };
    });
    expect(r).toEqual({ style: 'solid', width: '2px' });
  });
});

test.describe('prism-select: selected check', () => {
  test('first paint: the selected option already shows its check, nothing animates', async ({
    page,
  }) => {
    await mount(
      page,
      `<prism-select id="s" label="Fruit" value="banana">${OPTIONS}</prism-select>`,
    );
    await page.addStyleTag({ path: 'src/tokens/tokens.css' });
    await page.addStyleTag({ path: 'src/theme/theme.css' });
    await painted(page);
    const opt = page.locator('prism-option[value="banana"]');
    expect(await checkOf(opt)).toEqual({ offset: 0, opacity: 1 });
    expect(
      await checkOf(page.locator('prism-option[value="apricot"]')),
    ).toEqual({
      offset: 1,
      opacity: 0,
    });
    const n = await opt.evaluate(
      (el) =>
        el
          .shadowRoot!.querySelector('[part="check"]')!
          .getAnimations({ subtree: true }).length,
    );
    expect(n).toBe(0);
  });

  test('picking draws the new check in and the old one out, on springs', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-select id="s" label="Fruit" value="banana">${OPTIONS}</prism-select>`,
    );
    await combo(page).click();
    await wait(page, 600);
    await page.getByRole('option', { name: 'Date' }).click();
    const info = (v: string) =>
      page.locator(`prism-option[value="${v}"]`).evaluate((el) =>
        el
          .shadowRoot!.querySelector('[part="check"]')!
          .getAnimations({ subtree: true })
          .map((a) => ({
            css: a instanceof CSSAnimation,
            props: [
              ...new Set(
                (a.effect as KeyframeEffect)
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
          })),
      );
    const on = await info('date');
    const off = await info('banana');
    expect(on.length).toBeGreaterThan(0);
    expect(off.length).toBeGreaterThan(0);
    for (const a of [...on, ...off]) {
      expect(a.css).toBe(false);
      for (const p of a.props)
        expect(['opacity', 'strokeDashoffset', 'transform']).toContain(p);
    }
    await wait(page, 800);
    expect(await checkOf(page.locator('prism-option[value="date"]'))).toEqual({
      offset: 0,
      opacity: 1,
    });
    expect(await checkOf(page.locator('prism-option[value="banana"]'))).toEqual(
      { offset: 1, opacity: 0 },
    );
    await expect(
      page.getByRole('option', { name: 'Date', includeHidden: true }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  test('the stroke is drawn in progress, never past its length, with a pop on the box', async ({
    page,
  }) => {
    await setup(page, SELECT);
    await combo(page).click();
    await wait(page, 600);
    const rows = await recordFrames(
      host(page),
      700,
      () => {
        const o = document.querySelector('prism-option[value="date"]')!;
        const mark = o.shadowRoot!.querySelector('[part="mark"]')!;
        const svg = o.shadowRoot!.querySelector('[part="check"] svg')!;
        return [
          parseFloat(getComputedStyle(mark).strokeDashoffset),
          new DOMMatrix(getComputedStyle(svg).transform).a,
        ];
      },
      [
        {
          at: 40,
          run: (h) => ((h as HTMLElement & { value: string }).value = 'date'),
        },
      ],
    );
    const offsets = rows.map((r) => r[0]!);
    expect(Math.min(...offsets)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...offsets)).toBeLessThanOrEqual(1);
    expect(offsets.at(-1)).toBe(0);
    const [dOffset] = maxStep(rows);
    expect(dOffset).toBeLessThan(0.45);
    expect(Math.max(...rows.map((r) => r[1]!))).toBeLessThan(1.1);
  });

  test('a change from code while closed is not animated', async ({ page }) => {
    await setup(page, SELECT);
    await host(page).evaluate(
      (el: HTMLElement & { value: string }) => (el.value = 'fig'),
    );
    await wait(page, 100);
    const n = await page
      .locator('prism-option[value="fig"]')
      .evaluate(
        (el) =>
          el
            .shadowRoot!.querySelector('[part="check"]')!
            .getAnimations({ subtree: true }).length,
      );
    expect(n).toBe(0);
    expect(await checkOf(page.locator('prism-option[value="fig"]'))).toEqual({
      offset: 0,
      opacity: 1,
    });
  });

  test('reduced motion: the check changes at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setup(
      page,
      `<prism-select id="s" label="Fruit" value="banana">${OPTIONS}</prism-select>`,
    );
    await combo(page).click();
    await page.getByRole('option', { name: 'Date' }).click();
    const n = await page
      .locator('prism-option[value="date"]')
      .evaluate(
        (el) =>
          el
            .shadowRoot!.querySelector('[part="check"]')!
            .getAnimations({ subtree: true }).length,
      );
    expect(n).toBe(0);
    expect(await checkOf(page.locator('prism-option[value="date"]'))).toEqual({
      offset: 0,
      opacity: 1,
    });
  });
});

test.describe('prism-select: keyboard and typeahead', () => {
  test('typing several letters jumps to the match; the same letter again cycles', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-select id="s" label="Fruit">
        <prism-option value="apricot">Apricot</prism-option><prism-option value="apricot">Apricot</prism-option>
        <prism-option value="banana">Banana</prism-option><prism-option value="blueberry">Blueberry</prism-option>
      </prism-select>`,
    );
    await combo(page).focus();
    const active = () =>
      host(page).evaluate(
        (el) =>
          (
            el.shadowRoot!.querySelector('[part="trigger"]') as HTMLElement & {
              ariaActiveDescendantElement: Element | null;
            }
          ).ariaActiveDescendantElement?.textContent,
      );
    await page.keyboard.type('bl');
    expect(await active()).toBe('Blueberry');
    await page.keyboard.press('Escape');
    await wait(page, 700);
    await page.keyboard.press('a');
    expect(await active()).toBe('Apricot'); // nothing selected: from the top
    await page.keyboard.press('a');
    expect(await active()).toBe('Apricot'); // the same letter again: the next match
  });

  test('PageDown and PageUp move by ten, Home and End jump, and the marker follows', async ({
    page,
  }) => {
    const many = Array.from(
      { length: 30 },
      (_, i) => `<prism-option value="o${i}">Option ${i}</prism-option>`,
    ).join('');
    await setup(
      page,
      `<prism-select id="s" label="Fruit">${many}</prism-select>`,
    );
    await combo(page).focus();
    await combo(page).press('ArrowDown'); // open on Option 0
    await combo(page).press('PageDown');
    await wait(page, 700);
    expect(Math.abs((await markerOn(page, 'o10')).dy)).toBeLessThan(1);
    await combo(page).press('End');
    await wait(page, 800);
    expect(Math.abs((await markerOn(page, 'o29')).dy)).toBeLessThan(1);
    await combo(page).press('PageUp');
    await wait(page, 800);
    expect(Math.abs((await markerOn(page, 'o19')).dy)).toBeLessThan(1);
  });
});

test.describe('prism-select: error', () => {
  const REQ = `<prism-select id="s" label="Fruit" required>${OPTIONS}<span slot="error">Pick a fruit.</span></prism-select>`;

  test('the trigger nudges sideways once on becoming invalid, transform only', async ({
    page,
  }) => {
    await setup(page, REQ);
    await host(page).evaluate((e) =>
      (e as HTMLElement & { reportValidity(): boolean }).reportValidity(),
    );
    const a = await animsOn(host(page), 'anchor');
    expect(a).toHaveLength(1);
    expect(a[0]!.props).toEqual(['transform']);
    await wait(page, 800);
    await combo(page).focus();
    expect(await animsOn(host(page), 'anchor')).toEqual([]);
    const input = combo(page);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription('Pick a fruit.');
  });

  test('reduced motion: no nudge', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setup(page, REQ);
    await host(page).evaluate((e) =>
      (e as HTMLElement & { reportValidity(): boolean }).reportValidity(),
    );
    expect(await animsOn(host(page), 'anchor')).toEqual([]);
  });
});

test('forced colors: no stray outline at rest, an outline while focused', async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await setup(page, SELECT);
  const outline = () =>
    host(page).evaluate(
      (el) =>
        getComputedStyle(el.shadowRoot!.querySelector('[part="trigger"]')!)
          .outlineStyle,
    );
  expect(await outline()).toBe('none');
  await combo(page).focus();
  expect(await outline()).toBe('solid');
});

for (const theme of ['light', 'dark']) {
  test(`axe: closed, open with a marker and a check, and invalid (${theme})`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await setup(
      page,
      `<div style="background:var(--prism-color-bg);color:var(--prism-color-text);padding:16px;display:grid;gap:20px">
        <prism-select id="s" label="Fruit" value="banana"><span slot="description">Pick one.</span>${OPTIONS}</prism-select>
        <prism-select id="bad" label="Other" required>${OPTIONS}<span slot="error">Pick a fruit.</span></prism-select>
      </div>`,
      theme,
    );
    await page.evaluate(() =>
      (document.querySelector('#bad') as HTMLInputElement).reportValidity(),
    );
    expect(await axe(page)).toEqual([]);
    await combo(page).click();
    await combo(page).press('ArrowDown');
    expect(await axe(page)).toEqual([]);
  });
}

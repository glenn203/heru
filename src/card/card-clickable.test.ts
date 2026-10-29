import { expect, test, type Page } from '@playwright/test';
import { mount } from '../../test/fixture.js';
import { expected, near, painted, PCT } from '../../test/paint.js';

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
const LINK = `
  <p id="before" tabindex="0">before</p>
  <prism-card id="c" type="clickable" style="width:360px">
    <prism-card-title slot="header" level="3" href="#opened">Onboarding guide</prism-card-title>
    <prism-card-description slot="header">Steps for welcoming new members.</prism-card-description>
    <div id="body">Some content that is not a control.</div>
    <prism-card-actions slot="footer">
      <prism-button id="nested" variant="ghost">Share Onboarding guide</prism-button>
    </prism-card-actions>
  </prism-card>`;
const box = (page: Page, sel: string) =>
  page.locator(sel).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom };
  });
const BG = ['var(--prism-color-bg)', 'var(--prism-color-text)'] as const;
const paint = async (page: Page, state: keyof typeof PCT) => {
  const got = await painted(page.locator('#c'), 'base');
  const want = await expected(page, BG[0], BG[1], PCT[state]);
  return { got, want, ok: near(got, want) };
};

test.describe('clickable card (stretched link)', () => {
  test('the title is the one real link; its name is the title only', async ({
    page,
  }) => {
    const errors = await setup(page, LINK);
    expect(errors).toEqual([]);
    const link = page.getByRole('link', { name: 'Onboarding guide' });
    await expect(link).toHaveCount(1);
    await expect(link).toHaveAttribute('href', '#opened');
    // The heading holds the link, so the outline is intact.
    await expect(
      page.getByRole('heading', { level: 3, name: 'Onboarding guide' }),
    ).toHaveCount(1);
    // Not the whole card's text.
    await expect(page.getByRole('link', { name: /Steps|content/ })).toHaveCount(
      0,
    );
  });

  test('clicking anywhere on the card follows the link', async ({ page }) => {
    await setup(page, LINK);
    const c = await box(page, '#c');
    for (const [dx, dy] of [
      [8, 8],
      [c.w - 8, 8],
      [c.w / 2, c.h / 2],
      [8, c.h - 8],
    ] as const) {
      await page.evaluate(() => (location.hash = ''));
      await page.mouse.click(c.x + dx, c.y + dy);
      expect(await page.evaluate(() => location.hash)).toBe('#opened');
    }
  });

  test('a nested control keeps its own click area and does not follow the link', async ({
    page,
  }) => {
    await setup(page, LINK);
    await page.evaluate(() => {
      location.hash = '';
      document
        .getElementById('nested')!
        .addEventListener('click', () => (document.title = 'nested'));
    });
    await page.locator('#nested').click();
    expect(await page.title()).toBe('nested');
    expect(await page.evaluate(() => location.hash)).toBe('');
  });

  test('tab order: the title, then each nested control. One stop for the title', async ({
    page,
  }) => {
    await setup(page, LINK);
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: 'Onboarding guide' }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('button', { name: 'Share Onboarding guide' }),
    ).toBeFocused();
  });

  test('Enter follows the link', async ({ page }) => {
    await setup(page, LINK);
    await page.getByRole('link', { name: 'Onboarding guide' }).focus();
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => location.hash)).toBe('#opened');
  });

  test('a real link: new-tab and context-menu behaviour come from the <a>', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card type="clickable"><prism-card-title slot="header" level="3" href="/somewhere" target="_blank" rel="noopener">Out</prism-card-title></prism-card>`,
    );
    const a = page.getByRole('link', { name: 'Out' });
    await expect(a).toHaveAttribute('target', '_blank');
    await expect(a).toHaveAttribute('rel', 'noopener');
  });

  test('action: the title is a button; Enter and Space press it; a click anywhere does', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card id="c" type="clickable" style="width:320px"><prism-card-title slot="header" level="3" action>Open details</prism-card-title><div>body</div></prism-card>`,
    );
    await page.evaluate(() => {
      (window as unknown as { n: number }).n = 0;
      document
        .getElementById('c')!
        .addEventListener(
          'click',
          () => (window as unknown as { n: number }).n++,
        );
    });
    const btn = page.getByRole('button', { name: 'Open details' });
    await btn.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press(' ');
    expect(
      await page.evaluate(() => (window as unknown as { n: number }).n),
    ).toBe(2);
    const c = await box(page, '#c');
    await page.mouse.click(c.x + c.w - 10, c.y + c.h - 10);
    expect(
      await page.evaluate(() => (window as unknown as { n: number }).n),
    ).toBe(3);
  });

  test('the title link does not draw its own ring: the whole card does (>= 2px)', async ({
    page,
  }) => {
    await setup(page, LINK);
    await page.locator('#before').focus();
    await page.keyboard.press('Tab');
    await settle(page);
    const r = await page.locator('#c').evaluate((el) => {
      const base = getComputedStyle(
        el.shadowRoot!.querySelector('[part="base"]')!,
      );
      const link = getComputedStyle(
        el
          .querySelector('prism-card-title')!
          .shadowRoot!.querySelector('[part="link"]')!,
      );
      return {
        ring: el.matches(':state(focus-ring)'),
        shadow: base.boxShadow,
        linkOutline: link.outlineStyle,
      };
    });
    expect(r.ring).toBe(true);
    expect(r.shadow).toMatch(/4px/); // offset 1px + ring 2px + blur layers
    expect(r.linkOutline).toBe('none');
  });

  test('a nested control shows only its own ring, not the card ring', async ({
    page,
  }) => {
    await setup(page, LINK);
    await page.locator('#nested').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await settle(page);
    expect(
      await page
        .locator('#c')
        .evaluate((el) => el.matches(':state(focus-ring)')),
    ).toBe(false);
  });

  test('hover and pressed: the state layer at 8% and 12% over the card surface', async ({
    page,
  }) => {
    await setup(page, LINK);
    expect((await paint(page, 'rest')).ok).toBe(true);
    const c = await box(page, '#c');
    await page.mouse.move(c.x + c.w / 2, c.y + c.h / 2 - 10);
    const hover = await paint(page, 'hover');
    expect(hover.ok, `${hover.got.join()} vs ${hover.want.join()}`).toBe(true);
    await page.mouse.down();
    const pressed = await paint(page, 'pressed');
    expect(pressed.ok, `${pressed.got.join()} vs ${pressed.want.join()}`).toBe(
      true,
    );
    await page.mouse.up();
  });

  test('rule 3: no tint while the pointer is over a nested control', async ({
    page,
  }) => {
    await setup(page, LINK);
    await page.locator('#nested').hover();
    await settle(page);
    const rest = await paint(page, 'rest');
    expect(rest.ok, `${rest.got.join()} vs ${rest.want.join()}`).toBe(true);
    // And it comes back on the card surface.
    const c = await box(page, '#c');
    await page.mouse.move(c.x + 20, c.y + c.h / 2);
    expect((await paint(page, 'hover')).ok).toBe(true);
  });

  test('hover is the tint only: no lift, transform or shadow change', async ({
    page,
  }) => {
    await setup(page, LINK);
    const read = () =>
      page.locator('#c').evaluate((el) => {
        const cs = getComputedStyle(
          el.shadowRoot!.querySelector('[part="base"]')!,
        );
        return {
          transform: cs.transform,
          shadow: cs.boxShadow,
          top: el.getBoundingClientRect().top,
        };
      });
    const before = await read();
    const c = await box(page, '#c');
    await page.mouse.move(c.x + 30, c.y + c.h / 2);
    await settle(page);
    expect(await read()).toEqual(before);
  });

  test('never flat: the edge is the strong border colour (and raised keeps a transparent one)', async ({
    page,
  }) => {
    await setup(
      page,
      `${LINK}<prism-card id="r" type="clickable" raised><prism-card-title slot="header" level="3" href="#x">Raised</prism-card-title></prism-card>`,
    );
    const edge = (id: string) =>
      page.locator(`#${id}`).evaluate((el) => {
        const cs = getComputedStyle(
          el.shadowRoot!.querySelector('[part="base"]')!,
        );
        const probe = document.createElement('div');
        probe.style.color = 'var(--prism-color-border-strong)';
        document.body.append(probe);
        const strong = getComputedStyle(probe).color;
        probe.remove();
        return {
          color: cs.borderTopColor,
          width: cs.borderTopWidth,
          strong,
          shadow: cs.boxShadow,
        };
      });
    const c = await edge('c');
    expect(c.width).toBe('1px');
    expect(c.color).toBe(c.strong);
    const r = await edge('r');
    expect(r.color).toBe('rgba(0, 0, 0, 0)');
    expect(r.shadow).not.toBe('none');
  });

  test('cursor is pointer on a clickable card', async ({ page }) => {
    await setup(page, LINK);
    expect(
      await page
        .locator('#c')
        .evaluate(
          (el) =>
            getComputedStyle(el.shadowRoot!.querySelector('[part="base"]')!)
              .cursor,
        ),
    ).toBe('pointer');
  });

  test('a borderless card is never clickable: plain title and a dev error', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card type="borderless"><prism-card-title slot="header" level="3" href="#x">Flat</prism-card-title></prism-card>`,
    );
    await expect(page.getByRole('link')).toHaveCount(0);
    expect(errors.some((e) => e.includes('never clickable'))).toBe(true);
  });

  test('a clickable card without href or action is a dev error', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card type="clickable"><prism-card-title slot="header" level="3">No target</prism-card-title></prism-card>`,
    );
    expect(errors.some((e) => e.includes('needs a link or button'))).toBe(true);
  });

  test('disabled: not focusable, no tint, and the reason must be in the text', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card id="c" type="clickable" disabled style="width:320px"><prism-card-title slot="header" level="3" href="#x">Locked</prism-card-title></prism-card>`,
    );
    expect(errors.some((e) => e.includes('says why'))).toBe(true);
    const a = page.getByRole('link', { name: 'Locked' });
    await expect(a).toHaveAttribute('aria-disabled', 'true');
    await expect(a).not.toHaveAttribute('href', /.+/);
    const c = await box(page, '#c');
    await page.mouse.move(c.x + 20, c.y + c.h / 2);
    await page.mouse.click(c.x + 20, c.y + c.h / 2);
    expect(await page.evaluate(() => location.hash)).toBe('');
    expect((await paint(page, 'rest')).ok).toBe(true);
  });

  test('a disabled card with a description raises no error', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card type="clickable" disabled><prism-card-title slot="header" level="3" href="#x">Locked</prism-card-title><prism-card-description slot="header">Needs an admin role.</prism-card-description></prism-card>`,
    );
    expect(errors).toEqual([]);
  });

  test('rule 6: a nested control names its card (dev error otherwise)', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card type="clickable"><prism-card-title slot="header" level="3" href="#x">Guide</prism-card-title>
        <prism-card-actions slot="header"><prism-menu label="More options"><prism-menu-item>A</prism-menu-item></prism-menu></prism-card-actions></prism-card>
       <prism-card type="clickable"><prism-card-title slot="header" level="3" href="#y">Other</prism-card-title>
        <prism-card-actions slot="header"><prism-menu label="More options for Other"><prism-menu-item>A</prism-menu-item></prism-menu></prism-card-actions></prism-card>`,
    );
    expect(errors.filter((e) => e.includes('names its card')).length).toBe(1);
  });

  test('no limit on nested controls (the cap is not enforced)', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card type="clickable" style="width:420px"><prism-card-title slot="header" level="3" href="#x">Many</prism-card-title>
        <prism-card-actions slot="header"><prism-icon-button label="Pin Many">p</prism-icon-button><prism-icon-button label="Share Many">s</prism-icon-button></prism-card-actions>
        <prism-card-actions slot="footer"><prism-button variant="ghost">One</prism-button><prism-button variant="secondary">Two</prism-button></prism-card-actions></prism-card>`,
    );
    expect(errors).toEqual([]);
  });

  test('forced-colors: the edge stays visible', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await setup(page, LINK);
    const c = await page
      .locator('#c')
      .evaluate(
        (el) =>
          getComputedStyle(el.shadowRoot!.querySelector('[part="base"]')!)
            .borderTopColor,
      );
    expect(c).not.toBe('rgba(0, 0, 0, 0)');
  });
});

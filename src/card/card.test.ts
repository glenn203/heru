import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mount } from '../../test/fixture.js';

interface Win {
  picked?: string;
  hit?: string;
  hits?: Record<string, boolean>;
}

const withTheme = async (page: Page) => {
  await page.addStyleTag({ path: 'src/tokens/tokens.css' });
  await page.addStyleTag({ path: 'src/theme/theme.css' });
};
const settle = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => setTimeout(() => r(), 30)),
      ),
  );
/** Mounts themed markup and returns the dev errors logged while it settled. */
async function setup(page: Page, markup: string, width?: number) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await mount(page, markup);
  await withTheme(page);
  if (width) await page.addStyleTag({ content: `#root{width:${width}px}` });
  await settle(page);
  return errors;
}
const BASIC = `
  <prism-card id="c">
    <prism-card-title slot="header" level="3">Phishing playbook</prism-card-title>
    <prism-card-description slot="header">Owner: SOC</prism-card-description>
    <p>Body text</p>
    <prism-card-meta slot="footer">Updated 2 min ago</prism-card-meta>
    <prism-card-actions slot="footer">
      <prism-button variant="ghost">Dismiss</prism-button>
      <prism-button variant="secondary">View all</prism-button>
    </prism-card-actions>
  </prism-card>`;
const hidden = (page: Page, sel: string) =>
  page.locator(sel).evaluate((el) => getComputedStyle(el).display === 'none');
const box = (page: Page, sel: string) =>
  page.locator(sel).evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom };
  });

test.describe('shared card: slots, name, heading', () => {
  test('three slots render; the title is a real heading and names the card', async ({
    page,
  }) => {
    const errors = await setup(page, BASIC);
    expect(errors).toEqual([]);
    await expect(
      page.getByRole('heading', { level: 3, name: 'Phishing playbook' }),
    ).toHaveCount(1);
    await expect(
      page.getByRole('group', { name: 'Phishing playbook' }),
    ).toHaveCount(1);
    await expect(page.getByText('Body text')).toBeVisible();
    await expect(page.getByText('Updated 2 min ago')).toBeVisible();
    await expect(page.getByRole('button', { name: 'View all' })).toBeVisible();
  });

  test('named slot "content" and the default slot both reach the content area', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card><prism-card-title slot="header" level="2">T</prism-card-title><p slot="content" id="a">A</p><p id="b">B</p></prism-card>`,
    );
    const inContent = await page.locator('prism-card').evaluate((el) => {
      const content = el.shadowRoot!.querySelector('[part="content"]')!;
      return [...content.querySelectorAll('slot')].flatMap((s) =>
        s.assignedElements().map((e) => e.id),
      );
    });
    expect(inContent.sort()).toEqual(['a', 'b']);
  });

  test('role: group standalone, none inside an li, listitem inside prism-card-list', async ({
    page,
  }) => {
    await setup(
      page,
      `<ul><li><prism-card id="in-li"><prism-card-title slot="header" level="3">One</prism-card-title></prism-card></li></ul>
       <prism-card id="solo"><prism-card-title slot="header" level="3">Two</prism-card-title></prism-card>`,
    );
    await expect(page.getByRole('group', { name: 'Two' })).toHaveCount(1);
    await expect(page.getByRole('group', { name: 'One' })).toHaveCount(0);
    await expect(page.getByRole('listitem')).toHaveCount(1);
  });

  test('the accessible name follows the title text', async ({ page }) => {
    await setup(page, BASIC);
    await page
      .locator('prism-card-title')
      .evaluate((el) => (el.textContent = 'Renamed'));
    await settle(page);
    await expect(page.getByRole('group', { name: 'Renamed' })).toHaveCount(1);
  });

  test('a card is never a landmark', async ({ page }) => {
    await setup(page, BASIC);
    expect(await page.locator('prism-card').getAttribute('role')).toBe('group');
    await expect(page.getByRole('region')).toHaveCount(0);
    await expect(page.getByRole('banner')).toHaveCount(0);
    await expect(page.getByRole('complementary')).toHaveCount(0);
  });

  test('title level is required: plain text and a dev error without it', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card><prism-card-title slot="header">No level</prism-card-title></prism-card>`,
    );
    await expect(page.getByRole('heading')).toHaveCount(0);
    expect(errors.some((e) => e.includes('needs `level`'))).toBe(true);
  });

  test('every level 2 to 6 renders that heading', async ({ page }) => {
    await setup(
      page,
      [2, 3, 4, 5, 6]
        .map(
          (n) =>
            `<prism-card><prism-card-title slot="header" level="${n}">H${n}</prism-card-title></prism-card>`,
        )
        .join(''),
    );
    for (const n of [2, 3, 4, 5, 6])
      await expect(
        page.getByRole('heading', { level: n, name: `H${n}` }),
      ).toHaveCount(1);
  });

  test('a header without a CardTitle logs an error but still renders', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card><prism-card-description slot="header">Only a description</prism-card-description></prism-card>`,
    );
    expect(errors.some((e) => e.includes('needs a CardTitle'))).toBe(true);
    await expect(page.getByText('Only a description')).toBeVisible();
  });

  test('title clamps at two lines and the component title style applies (14/20/600)', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card style="width:240px"><prism-card-title slot="header" level="3">${'Very long title '.repeat(
        12,
      )}</prism-card-title></prism-card>`,
    );
    const m = await page.locator('prism-card-title').evaluate((el) => {
      const text = el.shadowRoot!.querySelector('[part="text"]')!;
      const h = el.shadowRoot!.querySelector('[part="heading"]')!;
      const cs = getComputedStyle(h);
      return {
        height: text.getBoundingClientRect().height,
        clamp: getComputedStyle(text).webkitLineClamp,
        size: cs.fontSize,
        line: cs.lineHeight,
        weight: cs.fontWeight,
      };
    });
    expect(m.clamp).toBe('2');
    expect(m.height).toBe(40);
    expect([m.size, m.line, m.weight]).toEqual(['14px', '20px', '600']);
  });

  test('description clamps at two lines (12/20/400)', async ({ page }) => {
    await setup(
      page,
      `<prism-card style="width:240px"><prism-card-title slot="header" level="3">T</prism-card-title><prism-card-description slot="header">${'word '.repeat(
        60,
      )}</prism-card-description></prism-card>`,
    );
    const m = await page.locator('prism-card-description').evaluate((el) => {
      const text = el.shadowRoot!.querySelector('[part="text"]')!;
      const cs = getComputedStyle(el);
      return {
        h: text.getBoundingClientRect().height,
        size: cs.fontSize,
        line: cs.lineHeight,
        weight: cs.fontWeight,
      };
    });
    expect(m.h).toBe(40);
    expect([m.size, m.line, m.weight]).toEqual(['12px', '20px', '400']);
  });
});

test.describe('header and footer accept only approved parts', () => {
  test('an unapproved header element is hidden with a dev error', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card><prism-card-title slot="header" level="3">T</prism-card-title><div slot="header" id="stray">Stray</div></prism-card>`,
    );
    expect(await hidden(page, '#stray')).toBe(true);
    expect(errors.some((e) => e.includes('not an approved header part'))).toBe(
      true,
    );
    await expect(page.getByText('Stray')).toBeHidden();
  });

  test('one title, one description, one tag, one icon at most', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card><prism-card-title slot="header" level="3" id="t1">A</prism-card-title><prism-card-title slot="header" level="3" id="t2">B</prism-card-title>
        <prism-card-description slot="header" id="d1">x</prism-card-description><prism-card-description slot="header" id="d2">y</prism-card-description>
        <prism-tag slot="header" id="g1">One</prism-tag><prism-tag slot="header" id="g2">Two</prism-tag></prism-card>`,
    );
    expect(await hidden(page, '#t1')).toBe(false);
    for (const id of ['#t2', '#d2', '#g2'])
      expect(await hidden(page, id)).toBe(true);
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  test('drag handle and selection control are refused until the card allows them', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card><prism-card-title slot="header" level="3">T</prism-card-title><prism-card-handle slot="header" id="h"></prism-card-handle><prism-card-select slot="header" id="s"></prism-card-select></prism-card>`,
    );
    expect(await hidden(page, '#h')).toBe(true);
    expect(await hidden(page, '#s')).toBe(true);
  });

  test('header actions: two ghost icon buttons are fine, a third and any text button are hidden', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card><prism-card-title slot="header" level="3">T</prism-card-title>
        <prism-card-actions slot="header">
          <prism-icon-button label="Refresh" id="i1">r</prism-icon-button>
          <prism-icon-button label="Export" id="i2">e</prism-icon-button>
          <prism-icon-button label="Third" id="i3">t</prism-icon-button>
          <prism-button id="txt" variant="ghost">Text</prism-button>
        </prism-card-actions></prism-card>`,
    );
    expect(await hidden(page, '#i1')).toBe(false);
    expect(await hidden(page, '#i2')).toBe(false);
    expect(await hidden(page, '#i3')).toBe(true);
    expect(await hidden(page, '#txt')).toBe(true);
    expect(errors.some((e) => e.includes('Text buttons are not allowed'))).toBe(
      true,
    );
  });

  test('header actions: one overflow menu is accepted', async ({ page }) => {
    const errors = await setup(
      page,
      `<prism-card><prism-card-title slot="header" level="3">Playbook</prism-card-title>
        <prism-card-actions slot="header"><prism-menu label="More options for Playbook"><prism-menu-item>Edit</prism-menu-item></prism-menu></prism-card-actions></prism-card>`,
    );
    expect(errors).toEqual([]);
    await expect(
      page.getByRole('button', { name: 'More options for Playbook' }),
    ).toBeVisible();
  });

  test('footer: only meta and actions; a second primary, outline and destructive are hidden', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card><prism-card-title slot="header" level="3">T</prism-card-title>
        <div slot="footer" id="junk">junk</div>
        <prism-card-actions slot="footer">
          <prism-button variant="outline" id="o">Outline</prism-button>
          <prism-button variant="destructive" id="d">Delete</prism-button>
          <prism-button variant="ghost" id="g">Ghost</prism-button>
        </prism-card-actions></prism-card>`,
    );
    expect(await hidden(page, '#junk')).toBe(true);
    expect(await hidden(page, '#o')).toBe(true);
    expect(await hidden(page, '#d')).toBe(true);
    expect(await hidden(page, '#g')).toBe(false);
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  test('footer: a primary button needs `standalone`, and only one is allowed', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card id="plain"><prism-card-title slot="header" level="3">A</prism-card-title>
        <prism-card-actions slot="footer"><prism-button id="p0">Go</prism-button></prism-card-actions></prism-card>
       <prism-card id="task" standalone><prism-card-title slot="header" level="3">B</prism-card-title>
        <prism-card-actions slot="footer"><prism-button id="p1">Go</prism-button><prism-button id="p2" variant="primary">Also</prism-button></prism-card-actions></prism-card>`,
    );
    expect(await hidden(page, '#p0')).toBe(true);
    expect(await hidden(page, '#p1')).toBe(false);
    expect(await hidden(page, '#p2')).toBe(true);
    // Toggling `standalone` re-checks the footer.
    await page
      .locator('#plain')
      .evaluate((el) => el.setAttribute('standalone', ''));
    await settle(page);
    expect(await hidden(page, '#p0')).toBe(false);
  });

  test('footer: at most two actions, a "View all" link counts as one', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card><prism-card-title slot="header" level="3">T</prism-card-title>
        <prism-card-actions slot="footer"><prism-button variant="ghost" id="a1">One</prism-button><a href="/all" id="a2">View all</a><prism-button variant="secondary" id="a3">Three</prism-button></prism-card-actions></prism-card>`,
    );
    expect(await hidden(page, '#a2')).toBe(false);
    expect(await hidden(page, '#a3')).toBe(true);
  });

  test('footer layout: meta at the start, actions at the end, medium buttons 8px apart', async ({
    page,
  }) => {
    await setup(page, BASIC, 480);
    const meta = await box(page, 'prism-card-meta');
    const a = await box(page, 'prism-card-actions');
    const card = await box(page, '#c');
    expect(meta.x).toBeLessThan(a.x);
    // Actions end flush with the card's inner edge: 16px padding + 1px border.
    expect(Math.round(card.r - a.r)).toBe(17);
    const [b1, b2] = await page
      .locator('prism-card-actions prism-button')
      .evaluateAll((els) =>
        els.map((e) => {
          const r = e.getBoundingClientRect();
          return { x: r.x, r: r.right, h: r.height };
        }),
      );
    expect(Math.round(b2!.x - b1!.r)).toBe(8);
    expect(b1!.h).toBe(36);
    expect(b2!.h).toBe(36);
  });

  test('right-to-left mirrors the footer actions', async ({ page }) => {
    await setup(page, `<div dir="rtl">${BASIC}</div>`, 480);
    const meta = await box(page, 'prism-card-meta');
    const a = await box(page, 'prism-card-actions');
    expect(a.x).toBeLessThan(meta.x);
  });
});

test.describe('content-only card button row', () => {
  const ROW = `
    <prism-card id="c" style="width:360px"><p>A short promo message.</p>
      <prism-card-actions id="row">
        <prism-button variant="ghost" id="g">Dismiss</prism-button>
        <prism-button variant="secondary" id="s">Learn more</prism-button>
      </prism-card-actions></prism-card>`;

  test('buttons sit on the right, 8px apart, medium, soft rightmost', async ({
    page,
  }) => {
    const errors = await setup(page, ROW);
    expect(errors).toEqual([]);
    const g = await box(page, '#g');
    const s = await box(page, '#s');
    const card = await box(page, '#c');
    expect(Math.round(s.x - g.r)).toBe(8);
    expect(g.x).toBeLessThan(s.x);
    expect(Math.round(card.r - s.r)).toBe(17);
    expect(g.h).toBe(36);
    expect(await page.locator('#g').getAttribute('size')).toBe('md');
  });

  test('primary, outline and destructive are not allowed in the row', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card><p>Promo</p><prism-card-actions>
        <prism-button id="p">Primary</prism-button>
        <prism-button variant="outline" id="o">Outline</prism-button>
        <prism-button variant="destructive" id="d">Destroy</prism-button>
        <prism-button variant="ghost" id="g">Ghost</prism-button></prism-card-actions></prism-card>`,
    );
    for (const id of ['#p', '#o', '#d'])
      expect(await hidden(page, id)).toBe(true);
    expect(await hidden(page, '#g')).toBe(false);
    expect(errors.length).toBeGreaterThanOrEqual(3);
  });

  test('a wrong DOM order is reported, but soft still lands on the right', async ({
    page,
  }) => {
    const errors = await setup(
      page,
      `<prism-card style="width:360px"><p>Promo</p><prism-card-actions>
        <prism-button variant="secondary" id="s">Soft</prism-button>
        <prism-button variant="ghost" id="g">Ghost</prism-button></prism-card-actions></prism-card>`,
    );
    expect(errors.some((e) => e.includes('ghost button before'))).toBe(true);
    const g = await box(page, '#g');
    const s = await box(page, '#s');
    expect(g.x).toBeLessThan(s.x);
  });

  test('the row wraps onto the next line on the end side and never truncates', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card style="width:200px"><p>Promo</p><prism-card-actions>
        <prism-button variant="ghost" id="g">Remind me later</prism-button>
        <prism-button variant="secondary" id="s">Learn more</prism-button></prism-card-actions></prism-card>`,
    );
    const g = await box(page, '#g');
    const s = await box(page, '#s');
    expect(s.y).toBeGreaterThan(g.y);
    const card = await box(page, 'prism-card');
    expect(Math.round(card.r - s.r)).toBe(17);
    expect(Math.round(card.r - g.r)).toBe(17);
  });

  test('the row sits at the bottom of cards in the same row', async ({
    page,
  }) => {
    await setup(
      page,
      `<div style="display:flex;gap:16px;align-items:stretch;width:760px">
        <prism-card style="flex:1"><p>Short</p><prism-card-actions><prism-button variant="ghost" id="a">A</prism-button></prism-card-actions></prism-card>
        <prism-card style="flex:1"><p>${'Long text. '.repeat(30)}</p><prism-card-actions><prism-button variant="ghost" id="b">B</prism-button></prism-card-actions></prism-card>
      </div>`,
    );
    const a = await box(page, '#a');
    const b = await box(page, '#b');
    expect(Math.round(a.b)).toBe(Math.round(b.b));
  });
});

test.describe('layout and elevation', () => {
  test('footers line up at the bottom of cards in a row', async ({ page }) => {
    await setup(
      page,
      `<div style="display:flex;gap:16px;align-items:stretch;width:760px">
        <prism-card style="flex:1"><prism-card-title slot="header" level="3">Short</prism-card-title><p>One line</p><prism-card-meta slot="footer" id="f1">Footer 1</prism-card-meta></prism-card>
        <prism-card style="flex:1"><prism-card-title slot="header" level="3">Tall</prism-card-title><p>${'More text. '.repeat(30)}</p><prism-card-meta slot="footer" id="f2">Footer 2</prism-card-meta></prism-card>
      </div>`,
    );
    const f1 = await box(page, '#f1');
    const f2 = await box(page, '#f2');
    expect(Math.round(f1.b)).toBe(Math.round(f2.b));
  });

  test('header: gap to the content is 12px; start items 8px apart; actions pinned top end; tag after the title', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card id="c" style="width:420px">
        <svg slot="header" data-prism-card-icon width="16" height="16" id="ic"></svg>
        <prism-card-title slot="header" level="3" id="t">Title</prism-card-title>
        <prism-tag slot="header" id="tag">Critical</prism-tag>
        <prism-card-description slot="header" id="d">Desc</prism-card-description>
        <prism-card-actions slot="header" id="act"><prism-icon-button label="Refresh">r</prism-icon-button></prism-card-actions>
        <div id="body">Body</div></prism-card>`,
    );
    const ic = await box(page, '#ic');
    const t = await box(page, '#t');
    const tag = await box(page, '#tag');
    const d = await box(page, '#d');
    const act = await box(page, '#act');
    const body = await box(page, '#body');
    expect(Math.round(t.x - ic.r)).toBe(8);
    expect(tag.x).toBeGreaterThan(t.x);
    expect(Math.round(tag.x - t.r)).toBe(8);
    // The icon button is centred on the title's first line.
    expect(Math.round(act.y + act.h / 2)).toBe(Math.round(t.y + t.h / 2));
    expect(d.y).toBeGreaterThanOrEqual(t.b);
    const card = await box(page, '#c');
    expect(Math.round(card.r - act.r)).toBe(17);
    expect(Math.round(body.y - Math.max(d.b, act.b))).toBe(12);
  });

  test('padding follows density: 12 / 16 / 20px', async ({ page }) => {
    await setup(
      page,
      ['compact', 'default', 'comfortable']
        .map(
          (d) =>
            `<div data-prism-density="${d}"><prism-card id="${d}"><p>x</p></prism-card></div>`,
        )
        .join(''),
    );
    const pads = await Promise.all(
      ['compact', 'default', 'comfortable'].map((d) =>
        page
          .locator(`#${d}`)
          .evaluate(
            (el) =>
              getComputedStyle(el.shadowRoot!.querySelector('[part="base"]')!)
                .paddingLeft,
          ),
      ),
    );
    expect(pads).toEqual(['12px', '16px', '20px']);
  });

  test('bordered: 1px border, no shadow. Raised: elevation-hover and a transparent border. Borderless: neither', async ({
    page,
  }) => {
    await setup(
      page,
      `<prism-card id="b"><p>b</p></prism-card><prism-card id="r" raised><p>r</p></prism-card><prism-card id="f" type="borderless"><p>f</p></prism-card><prism-card id="rf" type="borderless" raised><p>rf</p></prism-card>`,
    );
    const read = (id: string) =>
      page.locator(`#${id}`).evaluate((el) => {
        const cs = getComputedStyle(
          el.shadowRoot!.querySelector('[part="base"]')!,
        );
        const probe = document.createElement('div');
        probe.style.boxShadow = 'var(--prism-elevation-hover)';
        document.body.append(probe);
        const hover = getComputedStyle(probe).boxShadow;
        probe.remove();
        return {
          border: cs.borderTopWidth,
          borderColor: cs.borderTopColor,
          shadow: cs.boxShadow,
          hover,
        };
      });
    const b = await read('b');
    const r = await read('r');
    const f = await read('f');
    const rf = await read('rf');
    expect(b.border).toBe('1px');
    expect(b.shadow).toBe('none');
    expect(r.shadow).toBe(r.hover);
    expect(r.shadow).not.toBe('none');
    expect(r.borderColor).toBe('rgba(0, 0, 0, 0)');
    expect(f.border).toBe('0px');
    expect(f.shadow).toBe('none');
    expect(rf.shadow).toBe('none'); // borderless never has a shadow
  });

  test('forced-colors: raised and bordered cards keep a visible edge', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await setup(page, `<prism-card id="r" raised><p>r</p></prism-card>`);
    const c = await page
      .locator('#r')
      .evaluate(
        (el) =>
          getComputedStyle(el.shadowRoot!.querySelector('[part="base"]')!)
            .borderTopColor,
      );
    expect(c).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('hover is the tint only: no lift, no transform, no shadow change', async ({
    page,
  }) => {
    await setup(page, BASIC);
    const read = () =>
      page.locator('#c').evaluate((el) => {
        const base = el.shadowRoot!.querySelector('[part="base"]')!;
        const cs = getComputedStyle(base);
        const r = el.getBoundingClientRect();
        return {
          transform: cs.transform,
          shadow: cs.boxShadow,
          top: r.top,
          translate: cs.translate,
        };
      });
    const before = await read();
    await page.locator('#c').hover();
    await settle(page);
    expect(await read()).toEqual(before);
    expect(before.transform).toBe('none');
  });

  test('theme never uses the urgent elevation or hover transforms on cards', () => {
    const css = readFileSync('src/theme/theme.css', 'utf8');
    const card = css.slice(css.indexOf('/* ---------- Card'));
    expect(card).not.toMatch(/elevation-urgent/);
    expect(card).not.toMatch(/translate|transform/);
    const src = readFileSync('src/card/card.ts', 'utf8');
    expect(src).not.toMatch(/elevation-urgent|transform:/);
  });

  test('a card never sets its own margin', async ({ page }) => {
    await setup(page, BASIC);
    const m = await page.locator('#c').evaluate((el) => {
      const cs = getComputedStyle(el);
      return [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft];
    });
    expect(m).toEqual(['0px', '0px', '0px', '0px']);
  });
});

test.describe('narrow card (†)', () => {
  const NARROW = (w: number) => `
    <prism-card id="c" style="width:${w}px">
      <prism-card-title slot="header" level="3">Playbook</prism-card-title>
      <prism-card-actions slot="header">
        <prism-icon-button label="Refresh" id="i1">r</prism-icon-button>
        <prism-icon-button label="Export" id="i2">e</prism-icon-button>
      </prism-card-actions>
      <p>Body</p>
      <prism-card-meta slot="footer">Updated</prism-card-meta>
      <prism-card-actions slot="footer"><prism-button variant="ghost">View all</prism-button></prism-card-actions>
    </prism-card>`;

  test('at 280px or less: state(narrow), icon buttons fold into one overflow menu, footer stacks', async ({
    page,
  }) => {
    await setup(page, NARROW(280));
    expect(
      await page.locator('#c').evaluate((el) => el.matches(':state(narrow)')),
    ).toBe(true);
    await expect(page.locator('#i1')).toBeHidden();
    const menu = page.getByRole('button', {
      name: 'More options for Playbook',
    });
    await expect(menu).toBeVisible();
    await menu.click();
    await expect(page.getByRole('menuitem', { name: 'Refresh' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Export' })).toBeVisible();
    const meta = await box(page, 'prism-card-meta');
    const act = await box(page, 'prism-card-actions[slot=footer]');
    expect(act.y).toBeGreaterThan(meta.y);
  });

  test('a folded menu item runs the original button', async ({ page }) => {
    await setup(page, NARROW(260));
    await page
      .locator('#i1')
      .evaluate((el) =>
        el.addEventListener(
          'click',
          () => ((window as unknown as Win).hit = 'refresh'),
        ),
      );
    await page
      .getByRole('button', { name: 'More options for Playbook' })
      .click();
    await page.getByRole('menuitem', { name: 'Refresh' }).click();
    expect(await page.evaluate(() => (window as unknown as Win).hit)).toBe(
      'refresh',
    );
  });

  test('wider than 280px: nothing folds', async ({ page }) => {
    await setup(page, NARROW(400));
    expect(
      await page.locator('#c').evaluate((el) => el.matches(':state(narrow)')),
    ).toBe(false);
    await expect(page.locator('#i1')).toBeVisible();
  });

  test('reflows at 320px wide with no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await setup(page, NARROW(300));
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});

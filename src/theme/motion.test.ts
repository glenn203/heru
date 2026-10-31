import { expect, test, type Page } from '@playwright/test';
import { mount } from '../../test/fixture.js';

const FIXTURE = `<prism-text-field label="Email" required><span slot="error">Enter an email.</span></prism-text-field>
<prism-select label="Fruit" required><prism-option value="a">A</prism-option><prism-option value="b">B</prism-option><span slot="error">Choose.</span></prism-select>`;

async function setup(page: Page) {
  await mount(page, FIXTURE);
  await page.addStyleTag({ path: 'src/tokens/tokens.css' });
  await page.addStyleTag({ path: 'src/theme/theme.css' });
}
const part = (page: Page, host: string, p: string, prop: string) =>
  page
    .locator(host)
    .evaluate(
      (el, [p, prop]: [string, string]) =>
        getComputedStyle(
          el.shadowRoot!.querySelector(`[part="${p}"]`)!,
        ).getPropertyValue(prop),
      [p, prop] as [string, string],
    );

test('focus ring grows in on the spring; colour/border stay on standard ease', async ({
  page,
}) => {
  await setup(page);
  for (const [host, p] of <[string, string][]>[
    ['prism-text-field', 'input'],
    ['prism-select', 'trigger'],
  ]) {
    const props = (await part(page, host, p, 'transition-property')).split(
      ', ',
    );
    const fns = await part(page, host, p, 'transition-timing-function');
    const durs = (await part(page, host, p, 'transition-duration')).split(', ');
    const byProp: Record<string, number> = Object.fromEntries(
      props.map((n, i) => [n, i]),
    );
    const fn: string[] = fns.split(/,\s*(?=cubic|linear)/);
    const bs = byProp['box-shadow'] ?? -1;
    const bc = byProp['border-color'] ?? -1;
    const got: string[] = [
      fn[bs] ?? '',
      durs[bs] ?? '',
      fn[bc] ?? '',
      durs[bc] ?? '',
    ];
    expect(got[0]?.startsWith('linear(')).toBe(true);
    expect(got.slice(1)).toEqual([
      '0.2s',
      'cubic-bezier(0.2, 0, 0, 1)',
      '0.12s',
    ]);
  }
});

test('menu grows out of the trigger on springs: transform and opacity, one clock with the chevron', async ({
  page,
}) => {
  await setup(page);
  await page.getByRole('combobox', { name: 'Fruit' }).click();
  const r = await page.locator('prism-select').evaluate((el) => {
    const root = el.shadowRoot!;
    const info = (part: string) =>
      root
        .querySelector(`[part="${part}"]`)!
        .getAnimations()
        .map((a) => {
          const fx = a.effect as KeyframeEffect;
          return {
            css: a instanceof CSSAnimation,
            easing: fx.getTiming().easing,
            ms: Number(fx.getTiming().duration),
            props: [
              ...new Set(
                fx
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
          };
        });
    return { listbox: info('listbox'), indicator: info('indicator') };
  });
  expect(r.listbox).toHaveLength(1);
  expect(r.listbox[0]!.css).toBe(false);
  expect(r.listbox[0]!.props).toEqual(['opacity', 'transform']);
  expect(r.listbox[0]!.easing).toBe('linear');
  expect(r.listbox[0]!.ms).toBeGreaterThan(150);
  expect(r.listbox[0]!.ms).toBeLessThan(600);
  expect(r.indicator).toHaveLength(1);
  expect(r.indicator[0]!.props).toEqual(['transform']);
  expect(r.indicator[0]!.ms).toBe(r.listbox[0]!.ms);
});

test('error box keeps the standard ease (no spring)', async ({ page }) => {
  await setup(page);
  await page
    .locator('prism-text-field')
    .evaluate((e) =>
      (e as HTMLElement & { reportValidity(): boolean }).reportValidity(),
    );
  expect(await part(page, 'prism-text-field', 'error', 'animation-name')).toBe(
    'prism-error-in',
  );
  expect(
    await part(page, 'prism-text-field', 'error', 'animation-timing-function'),
  ).toBe('cubic-bezier(0.2, 0, 0, 1)');
});

test('reduced motion: menu fades only, error and ring are instant, tokens collapse', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setup(page);
  const root = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return [
      'duration-fast',
      'duration-default',
      'duration-slow',
      'ease-spring',
      'ease-spring-bouncy',
    ].map((k) => s.getPropertyValue(`--prism-${k}`).trim());
  });
  expect(root).toEqual(['0.01ms', '0.01ms', '0.01ms', 'linear', 'linear']);
  await page.getByRole('combobox', { name: 'Fruit' }).click();
  expect(await part(page, 'prism-select', 'listbox', 'animation-name')).toBe(
    'prism-fade-in',
  );
  expect(
    await part(page, 'prism-select', 'trigger', 'transition-property'),
  ).toBe('none');
  await page.keyboard.press('Escape');
  await page
    .locator('prism-text-field')
    .evaluate((e) =>
      (e as HTMLElement & { reportValidity(): boolean }).reportValidity(),
    );
  expect(await part(page, 'prism-text-field', 'error', 'animation-name')).toBe(
    'none',
  );
});

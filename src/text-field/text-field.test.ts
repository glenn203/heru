import { expect, test } from '@playwright/test';
import { captureSubmit, mount, submitted } from '../../test/fixture.js';

test('label is wired to the native input', async ({ page }) => {
  await mount(
    page,
    `<prism-text-field label="Email"><span slot="description">Work address</span></prism-text-field>`,
  );
  const input = page.getByRole('textbox', { name: 'Email' });
  await expect(input).toBeVisible();
  await expect(input).toHaveAccessibleDescription('Work address');
});

test('submits its value with the form', async ({ page }) => {
  await mount(
    page,
    `<form><prism-text-field label="Name" name="name"></prism-text-field><button>Go</button></form>`,
  );
  await captureSubmit(page);
  await page.getByLabel('Name').fill('Ada');
  await page.getByLabel('Name').press('Enter');
  expect(await submitted(page)).toEqual({ name: 'Ada' });
});

test('required: blocks submit, sets :state(invalid) and shows the error', async ({
  page,
}) => {
  await mount(
    page,
    `<form><prism-text-field label="Name" name="name" required><span slot="error">Enter a name</span></prism-text-field><button>Go</button></form>`,
  );
  await captureSubmit(page);
  const field = page.locator('prism-text-field');
  expect(
    await field.evaluate((el: HTMLElement & { checkValidity(): boolean }) =>
      el.checkValidity(),
    ),
  ).toBe(false);
  await page.getByRole('button', { name: 'Go' }).click();
  expect(await submitted(page)).toBeUndefined();
  expect(await field.evaluate((el) => el.matches(':state(invalid)'))).toBe(
    true,
  );
  const input = page.getByRole('textbox', { name: 'Name' });
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(input).toHaveAccessibleDescription('Enter a name');
  await input.fill('Ada');
  await input.blur();
  expect(await field.evaluate((el) => el.matches(':state(invalid)'))).toBe(
    false,
  );
});

test('disabled: excluded from submit, not editable, :state(disabled)', async ({
  page,
}) => {
  await mount(
    page,
    `<form><prism-text-field label="Name" name="name" value="x" disabled></prism-text-field><button>Go</button></form>`,
  );
  await captureSubmit(page);
  await expect(page.getByLabel('Name')).toBeDisabled();
  expect(
    await page
      .locator('prism-text-field')
      .evaluate((el) => el.matches(':state(disabled)')),
  ).toBe(true);
  await page.getByRole('button', { name: 'Go' }).click();
  expect(await submitted(page)).toEqual({});
});

test('keyboard: Tab focuses the input and typing updates value', async ({
  page,
}) => {
  await mount(page, `<prism-text-field label="Name"></prism-text-field>`);
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Name')).toBeFocused();
  await page.keyboard.type('Bo');
  expect(
    await page
      .locator('prism-text-field')
      .evaluate((el: HTMLElement & { value: string }) => el.value),
  ).toBe('Bo');
});

test('form reset restores the initial value', async ({ page }) => {
  await mount(
    page,
    `<form><prism-text-field label="Name" name="n" value="start"></prism-text-field></form>`,
  );
  await page.getByLabel('Name').fill('changed');
  await page.evaluate(() => document.querySelector('form')!.reset());
  await expect(page.getByLabel('Name')).toHaveValue('start');
});

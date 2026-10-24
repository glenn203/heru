import { expect, test } from '@playwright/test';
import { captureSubmit, mount, submitted } from '../../test/fixture.js';

test('submits its form with name and value', async ({ page }) => {
  await mount(
    page,
    `<form><input name="q" value="hi"><heru-button name="action" value="save">Save</heru-button></form>`,
  );
  await captureSubmit(page);
  await page.getByRole('button', { name: 'Save' }).click();
  expect(await submitted(page)).toEqual({ q: 'hi', action: 'save' });
});

test('does not submit a form when the form is invalid', async ({ page }) => {
  await mount(
    page,
    `<form><heru-text-field label="Name" name="n" required></heru-text-field><heru-button>Go</heru-button></form>`,
  );
  await captureSubmit(page);
  await page.getByRole('button', { name: 'Go' }).click();
  expect(await submitted(page)).toBeUndefined();
});

test('type="reset" resets the form and type="button" does nothing', async ({
  page,
}) => {
  await mount(
    page,
    `<form><heru-text-field label="Name" name="n" value="a"></heru-text-field><heru-button type="button">Noop</heru-button><heru-button type="reset">Reset</heru-button></form>`,
  );
  await captureSubmit(page);
  await page.getByLabel('Name').fill('changed');
  await page.getByRole('button', { name: 'Noop' }).click();
  expect(await submitted(page)).toBeUndefined();
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByLabel('Name')).toHaveValue('a');
});

test('disabled: not focusable, no submit, :state(disabled)', async ({
  page,
}) => {
  await mount(page, `<form><heru-button disabled>Save</heru-button></form>`);
  await captureSubmit(page);
  const button = page.getByRole('button', { name: 'Save' });
  await expect(button).toBeDisabled();
  await page.locator('heru-button').click({ force: true });
  expect(await submitted(page)).toBeUndefined();
  expect(
    await page
      .locator('heru-button')
      .evaluate((el) => el.matches(':state(disabled)')),
  ).toBe(true);
  await page.keyboard.press('Tab');
  await expect(button).not.toBeFocused();
});

test('disabled by an ancestor fieldset', async ({ page }) => {
  await mount(
    page,
    `<form><fieldset disabled><heru-button>Save</heru-button></fieldset></form>`,
  );
  await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
});

test('keyboard: Enter and Space activate', async ({ page }) => {
  await mount(
    page,
    `<form><heru-button name="a" value="1">Save</heru-button></form>`,
  );
  await captureSubmit(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Save' })).toBeFocused();
  await page.keyboard.press('Enter');
  expect(await submitted(page)).toEqual({ a: '1' });
  await page.evaluate(() => {
    (window as unknown as { submitted?: unknown }).submitted = undefined;
  });
  await page.keyboard.press('Space');
  expect(await submitted(page)).toEqual({ a: '1' });
});

test('toggle: pressed flips aria-pressed and :state(pressed)', async ({
  page,
}) => {
  await mount(page, `<heru-button type="button" pressed>Bold</heru-button>`);
  const button = page.getByRole('button', { name: 'Bold' });
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'false');
  expect(
    await page
      .locator('heru-button')
      .evaluate((el) => el.matches(':state(pressed)')),
  ).toBe(false);
});

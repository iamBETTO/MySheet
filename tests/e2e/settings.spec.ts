// Settings: accounts and categories can be added and changed, with Undo.
import { test, expect } from '@playwright/test';
import { sampleData } from '../../src/model/sample';
import { fakeRuntime, seriousA11yProblems, storedDoc, TODAY, watchErrors } from './helpers';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(TODAY); await page.goto('/'); });

test('add a sub-category, rename an account, and undo', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  expect(await seriousA11yProblems(page)).toEqual([]);

  await page.getByRole('region', { name: 'Categories' }).getByRole('button', { name: 'Add' }).click();
  const sheet = page.getByRole('dialog', { name: 'New category' });
  await sheet.getByRole('textbox', { name: 'Name' }).fill('Coffee');
  await sheet.getByRole('combobox', { name: /Inside another category/ }).selectOption({ label: 'Eating out' });
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /^Coffee/ })).toBeVisible();
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'categories'))).toContain('Coffee');

  await page.getByRole('button', { name: /^Main bank/ }).click();
  await page.getByRole('dialog', { name: 'Account' }).getByRole('textbox', { name: 'Name' }).fill('Everyday bank');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /^Everyday bank/ })).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: /^Main bank/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('a duplicate category name is refused with the reason', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('region', { name: 'Categories' }).getByRole('button', { name: 'Add' }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: 'Name' }).fill('groceries');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert')).toHaveText('There’s already a category with that name.');
});

// Activity, as v1: the table, search and chips, tapping rows to select them, the selection bar with Change type
// (which now saves, with Undo) and Edit for one transaction.
import { test, expect, type Page } from '@playwright/test';
import { sampleData } from '../../src/model/sample';
import { choosePeriod, fakeRuntime, openPlace, seriousA11yProblems, storedDoc, TODAY, watchErrors } from './helpers';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(TODAY); });

async function openAllTime(page: Page) {
  await page.goto('/');
  await openPlace(page, 'Activity');
  await choosePeriod(page, 'All time');
}

const table = (page: Page) => page.getByRole('region', { name: 'Transactions, scrollable' });
const rows = (page: Page) => table(page).locator('tbody tr');
const row = (page: Page, text: RegExp) => rows(page).filter({ hasText: text });
const bar = (page: Page) => page.getByRole('region', { name: 'Selected transactions' });

test('lists every transaction newest first, with the count and total', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await openAllTime(page);
  await expect(rows(page)).toHaveCount(5);
  await expect(rows(page).first()).toContainText('Oct 10');
  // Salary 12,000 − groceries 250 − Wolt 80, and the card payment pair (−250 + 250) nets to nothing.
  await expect(page.getByText('5 transactions · total ₪11,670 · All time')).toBeVisible();
  expect(await seriousA11yProblems(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('search shows as a chip that clears it, and column titles sort', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await openAllTime(page);
  await page.getByRole('searchbox', { name: 'Search transactions' }).fill('wolt');
  await expect(rows(page)).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear filter Search: wolt' }).click();
  await expect(rows(page)).toHaveCount(5);
  await page.locator('th button', { hasText: 'Amount' }).click();
  await expect(rows(page).first()).toContainText('SALARY');
  await page.locator('th button', { hasText: 'Amount' }).click();
  await expect(rows(page).first()).toContainText('−₪250.00');
});

test('tap rows to select them, change their type in one go, and undo it', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await openAllTime(page);
  await row(page, /SUPERMARKET/).click();
  await row(page, /WOLT TLV/).click();
  await expect(bar(page)).toContainText('2 selected · total −₪330.00');
  expect(await seriousA11yProblems(page)).toEqual([]);
  await bar(page).getByRole('button', { name: 'Change type' }).click();
  await page.getByRole('combobox', { name: 'Move 2 selected to' }).selectOption({ label: 'Groceries' });
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  await expect(page.getByText('Moved 2 transactions to Groceries')).toBeVisible();
  await expect(bar(page)).toHaveCount(0);
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'ledger/months/2026-10'))).toContain('"categoryId":"cat-food"');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText(/Undone/)).toBeVisible();
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'ledger/months/2026-10'))).toContain('"categoryId":"cat-wolt"');
  expect(errors).toEqual([]);
});

test('a new type can be made while moving', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await openAllTime(page);
  await row(page, /WOLT TLV/).click();
  await bar(page).getByRole('button', { name: 'Change type' }).click();
  await page.getByRole('button', { name: 'New type…' }).click();
  await page.getByRole('textbox', { name: 'New type name' }).fill('Takeaway');
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  await expect(page.getByText('Moved 1 transaction to Takeaway')).toBeVisible();
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'categories'))).toContain('Takeaway');
});

test('select all, then Clear', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await openAllTime(page);
  await page.getByRole('checkbox', { name: 'Select all shown transactions' }).check();
  await expect(bar(page)).toContainText('5 selected');
  await bar(page).getByRole('button', { name: 'Clear' }).click();
  await expect(bar(page)).toHaveCount(0);
});

test('Edit one transaction: name and note, saved for the same description and as a rule', async ({ page }) => {
  const data = sampleData();
  data.months['2026-10']!.transactions.push({ ...data.months['2026-10']!.transactions[0]!, id: 't6', date: '2026-10-03', categoryId: null });
  await fakeRuntime(page, { userId: 'u_test', data });
  await openAllTime(page);
  await row(page, /WOLT TLV/).first().click();
  await bar(page).getByRole('button', { name: 'Edit' }).click();
  const sheet = page.getByRole('dialog', { name: 'Transaction' });
  await sheet.getByRole('combobox', { name: 'Category' }).selectOption({ label: 'Groceries' });
  await sheet.getByRole('textbox', { name: /Name to show/ }).fill('Wolt delivery');
  await sheet.getByRole('checkbox', { name: /other 1 with the same description/ }).check();
  await sheet.getByRole('checkbox', { name: /new imports/ }).check();
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved 2 transactions and a rule for new imports')).toBeVisible();
  await expect(row(page, /Wolt delivery/)).toHaveCount(2);
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'rules'))).toContain('"payee":"Wolt delivery"');
});

test('Escape closes the edit sheet without saving', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await openAllTime(page);
  await row(page, /SUPERMARKET/).click();
  await bar(page).getByRole('button', { name: 'Edit' }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: /Note/ }).fill('not saved');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText('not saved')).toHaveCount(0);
});

test('when saving fails, the change is put back and the person is told', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData(), failWrites: true });
  await openAllTime(page);
  await row(page, /SUPERMARKET/).click();
  await bar(page).getByRole('button', { name: 'Change type' }).click();
  await page.getByRole('combobox', { name: 'Move 1 selected to' }).selectOption({ label: 'Eating out' });
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  await expect(page.getByText(/couldn’t be saved, so it was put back/)).toBeVisible();
  await expect(row(page, /SUPERMARKET/)).toContainText('Groceries');
});

// The owner, 6 Nov 2026: say how to edit, in as few words as possible.
test('the hint under the list says how to edit, briefly', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Activity');
  await expect(page.getByText('Select one to edit.')).toBeVisible();
});

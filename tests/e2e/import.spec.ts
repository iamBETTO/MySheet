// Importing files in the app: recognised layouts, matching a new layout once, skipping repeats, and Undo.
import { test, expect, type Page } from '@playwright/test';
import { sampleData } from '../../src/model/sample';
import { BANK_XLS, CARD_XLSX } from '../../src/import/testFiles';
import { choosePeriod, fakeRuntime, openPlace, seriousA11yProblems, storedDoc, TODAY, watchErrors } from './helpers';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(TODAY); });

async function openImport(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Import a file' }).click();
  await expect(page.getByRole('dialog', { name: 'Import a file' })).toBeVisible();
}

const choose = (page: Page, name: string, buffer: Buffer, mimeType = 'application/octet-stream') =>
  page.locator('#import-file').setInputFiles({ name, mimeType, buffer });

test('a recognised card file imports into the card, with categories from past choices, and Undo removes it', async ({ page }) => {
  const errors = watchErrors(page);
  const data = sampleData();
  // A past choice: COFFEE & CAKE was Eating out before.
  data.months['2026-09']!.transactions.push({ ...data.months['2026-09']!.transactions[1]!, id: 'tc', description: 'COFFEE & CAKE', categoryId: 'cat-out', fingerprint: null });
  await fakeRuntime(page, { userId: 'u_test', data });
  await openImport(page);
  expect(await seriousA11yProblems(page)).toEqual([]);
  await choose(page, 'statement.xlsx', Buffer.from(CARD_XLSX, 'base64'));
  const sheet = page.getByRole('dialog', { name: 'Import a file' });
  await expect(sheet.getByText('Recognised: Isracard card statement')).toBeVisible();
  await expect(sheet.getByRole('combobox', { name: 'Into which account?' })).toHaveValue('acc-card');
  await expect(sheet.locator('.import-summary')).toContainText('New');
  await expect(sheet.getByRole('table')).toContainText('Eating out');
  expect(await seriousA11yProblems(page)).toEqual([]);
  await sheet.getByRole('button', { name: 'Import 3 transactions' }).click();
  await expect(page.getByText('Imported 3 transactions from statement.xlsx')).toBeVisible();
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'ledger/months/2026-01'))).toContain('COFFEE & CAKE');
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'imports'))).toContain('statement.xlsx');

  await openPlace(page, 'Activity');
  await choosePeriod(page, 'All time');
  const coffee = page.getByRole('region', { name: 'Transactions, scrollable' }).locator('tbody tr').filter({ hasText: 'COFFEE & CAKE' });
  await expect(coffee.filter({ hasText: 'Eating out' })).toHaveCount(2);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(coffee).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('importing the same file twice adds nothing the second time', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await openImport(page);
  await choose(page, 'bank.xls', Buffer.from(BANK_XLS, 'base64'));
  const sheet = page.getByRole('dialog', { name: 'Import a file' });
  await expect(sheet.getByText('Recognised: One Zero bank account')).toBeVisible();
  await sheet.getByRole('button', { name: 'Import 2 transactions' }).click();
  await page.getByRole('button', { name: 'Import a file' }).click();
  await choose(page, 'bank.xls', Buffer.from(BANK_XLS, 'base64'));
  await expect(sheet.getByRole('button', { name: 'Nothing new to import' })).toBeDisabled();
});

test('a new layout is matched once, saved, and imported into a new account', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await openImport(page);
  const csv = 'My Bank export\nWhen,What,Out,In\n01/11/2026,Rent,3000,\n02/11/2026,Pay,,9000\n';
  await choose(page, 'mybank-2026-11.csv', Buffer.from(csv), 'text/csv');
  const sheet = page.getByRole('dialog', { name: 'Import a file' });
  await expect(sheet.getByRole('combobox', { name: 'Row with the column titles' })).toHaveValue('1');
  await sheet.getByRole('combobox', { name: 'Date', exact: true }).selectOption('When');
  await sheet.getByRole('combobox', { name: 'Description' }).selectOption('What');
  await sheet.getByRole('radio', { name: 'Two columns: money out and money in' }).check();
  await sheet.getByRole('combobox', { name: 'Money out' }).selectOption('Out');
  await sheet.getByRole('combobox', { name: 'Money in' }).selectOption('In');
  expect(await seriousA11yProblems(page)).toEqual([]);
  await sheet.getByRole('button', { name: 'Continue' }).click();
  await expect(sheet.getByText('Layout: mybank (new)')).toBeVisible();
  await sheet.getByRole('combobox', { name: 'Into which account?' }).selectOption('new');
  await sheet.getByRole('textbox', { name: 'Name' }).fill('Second bank');
  await sheet.getByRole('button', { name: 'Import 2 transactions' }).click();
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'accounts'))).toContain('Second bank');
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'imports'))).toContain('"name":"mybank"');
  // Next time the same layout is recognised straight away.
  await page.getByRole('button', { name: 'Import a file' }).click();
  await choose(page, 'mybank-2026-12.csv', Buffer.from(csv.replace(/11\/2026/g, '12/2026')), 'text/csv');
  await expect(sheet.getByText('Recognised: mybank')).toBeVisible();
  await expect(sheet.getByRole('combobox', { name: 'Into which account?' })).toHaveValue(/.+/);
  await expect(sheet.getByRole('combobox', { name: 'Into which account?' }).locator('option:checked')).toHaveText('Second bank');
  expect(errors).toEqual([]);
});

test('a file that can’t be read is explained', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await openImport(page);
  await choose(page, 'photo.jpg', Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01, 0x02, 0x00, 0x00]));
  await expect(page.getByRole('alert')).toContainText('“photo.jpg” couldn’t be read');
});

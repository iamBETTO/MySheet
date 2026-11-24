// Bit details, what you own and owe, and the welcome-back summary.
import { test, expect } from '@playwright/test';
import { sampleData } from '../../src/model/sample';
import { fakeRuntime, openPlace, seriousA11yProblems, storedDoc, TODAY, watchErrors } from './helpers';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(TODAY); });

const BIT = '﻿Status, Description, Fee Amount, Amount, Payment Method, Credit/Debit, From/To, Date, \n' +
  'Done, Pizza night, 0, 45, כרטיס אשראי, Debit, Dana, 03.10.26, \n' +
  'Done, Coffee, 0, 12, יתרה, Debit, Cafe, 06.10.26, \n';

test('a Bit file adds who and what to the matching card line', async ({ page }) => {
  const errors = watchErrors(page);
  const data = sampleData();
  data.months['2026-10']!.transactions.push({ id: 'tb', accountId: 'acc-card', date: '2026-10-04', amount: -4500, currency: 'ILS', description: 'BIT TRANSFER', payee: null, categoryId: null, note: null, importId: null, fingerprint: null });
  await fakeRuntime(page, { userId: 'u_test', data });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Import a file' }).click();
  await page.locator('#import-file').setInputFiles({ name: 'bit.csv', mimeType: 'text/csv', buffer: Buffer.from(BIT) });
  const sheet = page.getByRole('dialog', { name: 'Import a file' });
  await expect(sheet.getByText('Recognised: Bit history')).toBeVisible();
  await expect(sheet.getByRole('table')).toContainText('Bit · Dana · Pizza night');
  expect(await seriousA11yProblems(page)).toEqual([]);
  await sheet.getByRole('button', { name: 'Add details to 1 transactions' }).click();
  await expect(page.getByText('Added Bit details to 1 transaction')).toBeVisible();
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'ledger/months/2026-10'))).toContain('Pizza night');
  expect(errors).toEqual([]);
});

// Bug found by the owner on Android (6 Nov 2026): the date box could be emptied, the value was saved with no date, and on
// the next visit the app refused to show any of his data.
test('a value can\'t be saved without its date, and nothing unreadable is ever saved', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('region', { name: 'What you own and owe' }).getByRole('button', { name: 'Add' }).click();
  const sheet = page.getByRole('dialog', { name: 'Something you own or owe' });
  await sheet.getByRole('textbox', { name: 'Name' }).fill('Crypto');
  await sheet.getByRole('textbox', { name: /Value/ }).fill('5000');
  await sheet.locator('input[type=date]').fill('');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(sheet.getByText('Pick the date of this value.')).toBeVisible();
  await expect(sheet).toBeVisible();
  expect(JSON.stringify(await storedDoc(page, 'holdings'))).not.toContain('Crypto');
  await sheet.locator('input[type=date]').fill('2026-10-01');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(sheet).toHaveCount(0);
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'holdings'))).toContain('"date":"2026-10-01"');
  await expect(page.getByRole('button', { name: /^Crypto/ })).toBeVisible();
});

test('add something you own, update its value, and see it in net worth', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('region', { name: 'What you own and owe' }).getByRole('button', { name: 'Add' }).click();
  const sheet = page.getByRole('dialog', { name: 'Something you own or owe' });
  await sheet.getByRole('textbox', { name: 'Name' }).fill('Car loan');
  await sheet.getByRole('combobox', { name: 'Kind' }).selectOption({ label: 'Loan or debt' });
  await sheet.getByRole('textbox', { name: /Still owed/ }).fill('5000');
  expect(await seriousA11yProblems(page)).toEqual([]);
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: /^Car loan/ })).toContainText('−₪5,000.00');
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'holdings'))).toContain('Car loan');
  await openPlace(page, 'Home');
  // 41,670 before, minus the loan.
  await expect(page.getByRole('region', { name: 'Net worth' })).toContainText('₪36,670');
  expect(errors).toEqual([]);
});

test('after a week away, Home says what happened since, and it can be skipped', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('mysheet.lastVisit.v1', '2026-10-01'); } catch { /* storage off */ } });
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Home');
  const card = page.getByRole('region', { name: 'Welcome back' });
  await expect(card).toContainText('Since your last visit on 1 Oct 2026: 3 transactions');
  await card.getByRole('button', { name: 'Skip' }).click();
  await expect(card).toHaveCount(0);
});

test('a broken saved entry is set aside: the rest of the data shows, with a calm note on Home', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  const data = sampleData();
  data.holdings[0]!.valuations[0]!.date = '';
  await fakeRuntime(page, { userId: 'u_test', data });
  await page.goto('/');
  const note = page.getByRole('region', { name: 'One saved entry couldn’t be read' });
  await expect(note).toContainText('A value of "Savings plan"');
  await expect(note).toContainText('A copy is kept safely');
  await expect(page.getByRole('region', { name: 'Net worth' })).toBeVisible();
  expect(await seriousA11yProblems(page)).toEqual([]);
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'setaside'))).toContain('holdings[0].valuations[0]');
  await note.getByRole('button', { name: 'Hide this message' }).click();
  await expect(note).toHaveCount(0);
  expect(errors).toEqual([]);
});

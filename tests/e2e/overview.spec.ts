// Home and Spending, as v1, on made-up data: the sums, comparing periods, tapping through to transactions, the eye.
import { test, expect } from '@playwright/test';
import { sampleData } from '../../src/model/sample';
import { choosePeriod, fakeRuntime, openPlace, seriousA11yProblems, TODAY, watchErrors } from './helpers';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(TODAY); });

test('Home adds up net worth, this month and the period', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Home');
  // Bank 21,750 + card −80 (its payment is in it) + savings 20,000 = 41,670.
  await expect(page.getByRole('region', { name: 'Net worth' })).toContainText('₪41,670');
  await expect(page.getByText('Data as of Oct 10, 2026')).toBeVisible();
  await choosePeriod(page, 'All time');
  const summary = page.getByRole('region', { name: 'All time' });
  await expect(summary).toContainText('Money in');
  await expect(summary).toContainText('₪12,000');
  await expect(summary).toContainText('₪330');
  const balance = page.getByRole('region', { name: 'Bank balance' });
  await balance.getByRole('button', { name: 'Show the numbers' }).click();
  await expect(balance.getByRole('table')).toContainText('Sep 2026');
  expect(await seriousA11yProblems(page)).toEqual([]);
  await page.getByRole('button', { name: 'This month: open Budget' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Budget');
  expect(errors).toEqual([]);
});

test('What you have opens to its items, and something can be added there', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Home');
  const have = page.getByRole('region', { name: 'What you have' });
  await have.getByRole('button', { name: /^Assets/ }).click();
  await expect(have).toContainText('Savings plan');
  await have.getByRole('button', { name: /^Debts/ }).click();
  await have.locator('#part-debt').getByRole('button', { name: 'Add' }).click();
  const sheet = page.getByRole('dialog', { name: 'Something you own or owe' });
  await expect(sheet.getByRole('combobox', { name: 'Kind' })).toHaveValue('debt');
  await sheet.getByRole('textbox', { name: 'Name' }).fill('Car loan');
  await sheet.getByRole('textbox', { name: /Still owed/ }).fill('5000');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('region', { name: 'Net worth' })).toContainText('₪36,670');
});

test('a section folds away and Show hidden sections brings it back', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Home');
  await page.getByRole('region', { name: 'Bank balance' }).getByRole('button', { name: 'Hide Bank balance' }).click();
  await expect(page.getByRole('button', { name: 'Show the numbers' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show hidden sections' }).click();
  await expect(page.getByRole('button', { name: 'Show the numbers' })).toBeVisible();
});

test('Spending lists types and places and opens their transactions, with Back', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Spending');
  await choosePeriod(page, 'All time');
  const went = page.getByRole('region', { name: 'Where it went' });
  await expect(went.getByRole('button', { name: /Show transactions$/ })).toHaveCount(2); // Groceries, Eating out (Wolt inside)
  expect(await seriousA11yProblems(page)).toEqual([]);
  await went.getByRole('button', { name: 'Eating out. Show transactions' }).click();
  await expect(page.getByRole('region', { name: 'Transactions, scrollable' }).locator('tbody tr')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Clear filter Eating out' })).toBeVisible();
  await page.getByRole('button', { name: /Back to Spending/ }).click();
  await page.getByRole('region', { name: 'Top places, scrollable' }).getByRole('row', { name: /SUPERMARKET/ }).click();
  await expect(page.getByRole('button', { name: 'Clear filter SUPERMARKET' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Transactions, scrollable' }).locator('tbody tr')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('the eye blurs every amount, and screen readers hear "amount hidden"', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Home');
  await page.getByRole('button', { name: 'Hide amounts' }).click();
  await expect(page.locator('#rm')).toHaveClass(/priv/);
  await expect(page.locator('main')).toContainText('amount hidden');
  await expect(page.locator('main svg text').first()).toHaveText('₪ ••••');
  await page.getByRole('button', { name: 'Show amounts' }).click();
  await expect(page.locator('main')).not.toContainText('amount hidden');
});

test('comparing two periods shows per-month changes on Home and Spending', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Home');
  await page.locator('#period-btn').click();
  const panel = page.locator('#period-sheet');
  await panel.getByRole('combobox', { name: 'Pick a month' }).selectOption({ label: 'October 2026' });
  await panel.getByRole('combobox', { name: 'Compare with' }).selectOption({ label: 'September 2026' });
  // The panel stays open while choosing (v1); Done closes it.
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Done' }).click();
  await expect(page.locator('#period-btn')).toHaveText('October 2026 vs September 2026');
  await expect(page.getByRole('heading', { name: 'October 2026 vs September 2026, per month' })).toBeVisible();
  await expect(page.getByText(/Per month, October 2026 vs\. September 2026: you spent/)).toBeVisible();
  await openPlace(page, 'Spending');
  await expect(page.getByText(/Per month: October 2026 \(top bar\) vs September 2026 \(grey\)/)).toBeVisible();
});

// The owner, 6 Nov 2026: the chart's spoken summary no longer points to a button that may be hidden (Arrange Home).
test('In and out\'s spoken summary stands on its own', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  const label = await page.getByRole('region', { name: 'In and out, by month' }).getByRole('img').first().getAttribute('aria-label');
  expect(label).toMatch(/^Money in and out by month/);
  expect(label).not.toContain('Bank balance');
});

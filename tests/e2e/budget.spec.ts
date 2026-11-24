// Budget, as v1: the month-start setting, This month so far with pace, Bills and safe to spend, and Limits month by
// month; plus setting and changing limits in place (v2).
import { test, expect } from '@playwright/test';
import { sampleData } from '../../src/model/sample';
import { choosePeriod, fakeRuntime, openPlace, seriousA11yProblems, storedDoc, TODAY, watchErrors } from './helpers';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(TODAY); });

test('this month so far shows each limit with its pace, up to the day the data reaches', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Budget');
  const card = page.getByRole('region', { name: 'This month so far' });
  // The sample's data reaches 10 Oct; its limits are ₪8,000 for all spending and ₪1,000 for Eating out (Wolt is inside it).
  await expect(card).toContainText('Oct 1 – Oct 31, 2026, day 10 of 31.');
  await expect(card).toContainText('₪80 of ₪8,000');
  await expect(card).toContainText('₪80 of ₪1,000');
  await expect(card.getByText('On pace')).toHaveCount(2);
  expect(await seriousA11yProblems(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('add a limit, change one for this month only, and undo', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Budget');
  await page.getByRole('region', { name: 'This month so far' }).getByRole('button', { name: 'Add a limit' }).click();
  const sheet = page.getByRole('dialog', { name: 'Add a limit' });
  await sheet.getByRole('combobox', { name: 'For' }).selectOption({ label: 'Groceries' });
  await sheet.getByRole('textbox', { name: /Limit/ }).fill('600');
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Groceries: limit ₪600 a month')).toBeVisible();
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'budgets'))).toContain('"monthly":60000');

  const limits = page.getByRole('region', { name: 'Limits, month by month' });
  await limits.getByRole('button', { name: /^Eating out/ }).click();
  await limits.getByRole('button', { name: 'Change limit' }).click();
  const edit = page.getByRole('dialog', { name: 'Limit for Eating out' });
  await edit.getByRole('textbox', { name: /Limit/ }).fill('50');
  await edit.getByRole('radio', { name: 'Only October 2026' }).check();
  await edit.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Eating out: limit ₪50 for October 2026 only')).toBeVisible();
  const pace = page.getByRole('region', { name: 'This month so far' });
  await expect(pace.getByText('Over limit')).toBeVisible();
  await expect(pace).toContainText('(this month’s own limit)');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(pace.getByText('Over limit')).toHaveCount(0);
});

test('changing the month start day moves the budget month', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Budget');
  await page.getByRole('combobox', { name: 'Your month starts on day' }).selectOption('5');
  await expect(page.getByRole('region', { name: 'This month so far' })).toContainText('Oct 5 – Nov 4, 2026, day 6 of 31.');
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'settings'))).toContain('"budgetMonthStartDay":5');
});

test('limits month by month open to a small chart and a link to the transactions', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Budget');
  await choosePeriod(page, 'All time');
  const limits = page.getByRole('region', { name: 'Limits, month by month' });
  await expect(limits).toContainText('You stayed under every limit in this period.');
  const all = limits.getByRole('button', { name: /^All spending/ });
  await all.click();
  await expect(all).toHaveAttribute('aria-expanded', 'true');
  await expect(limits.getByRole('img', { name: 'Spending by month for All spending.' })).toBeVisible();
  expect(await seriousA11yProblems(page)).toEqual([]);
  await limits.getByRole('button', { name: 'See all transactions' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Activity');
  await page.getByRole('button', { name: /Back to Budget/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Budget');
});

test('bills and safe to spend explain the sum', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Budget');
  const bills = page.getByRole('region', { name: 'Bills and safe to spend' });
  await expect(bills).toContainText('Safe to spend until Oct 31');
  await expect(bills).toContainText('as of Oct 10, minus ₪0 of regular bills still due by Oct 31.');
  await expect(bills).toContainText('No regular bills found yet.');
});

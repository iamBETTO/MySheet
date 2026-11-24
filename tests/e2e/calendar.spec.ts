// Calendar, as v1: the month of tinted day boxes, notes, and the picked day's transactions; adding and editing notes (v2).
import { test, expect } from '@playwright/test';
import { sampleData } from '../../src/model/sample';
import { fakeRuntime, openPlace, seriousA11yProblems, storedDoc, TODAY, watchErrors } from './helpers';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(TODAY); });

test('days show what was spent, and a day shows its transactions', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Calendar');
  await expect(page.getByRole('heading', { name: 'October 2026', exact: true })).toBeVisible();
  await expect(page.getByText('October 2026: ₪80 spent on 1 day; the biggest day was Oct 2 (₪80).')).toBeVisible();
  // The sample's trip note covers 5–7 Oct; the newest day with data (10 Oct) starts picked.
  await expect(page.getByRole('button', { name: 'Monday, October 5, note: Trip to the north' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Saturday, October 10, 2026' })).toBeVisible();
  await page.getByRole('button', { name: /^Friday, October 2, spent ₪80/ }).click();
  const day = page.getByRole('region', { name: 'Friday, October 2, 2026', exact: true });
  await expect(day).toContainText('1 transaction · spent ₪80');
  await expect(day).toContainText('WOLT TLV');
  expect(await seriousA11yProblems(page)).toEqual([]);
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(page.getByText('September 2026: ₪250 spent on 1 day; the biggest day was Sep 3 (₪250).')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous month' })).toBeDisabled();
  expect(errors).toEqual([]);
});

test('add a note over several days from the day card, edit it, delete it and undo', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Calendar');
  await page.getByRole('button', { name: 'Add a note' }).click();
  const sheet = page.getByRole('dialog', { name: 'New note' });
  await sheet.getByRole('textbox', { name: 'Note' }).fill('Vacation');
  await sheet.getByLabel('From').fill('2026-10-12');
  await sheet.getByLabel('To').fill('2026-10-14');
  await sheet.getByRole('radio', { name: 'Purple' }).check();
  expect(await seriousA11yProblems(page)).toEqual([]);
  await sheet.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('button', { name: 'Tuesday, October 13, note: Vacation' })).toBeVisible();
  await expect.poll(async () => JSON.stringify(await storedDoc(page, 'notes'))).toContain('Vacation');

  await page.getByRole('button', { name: 'Tuesday, October 13, note: Vacation' }).click();
  await page.getByRole('button', { name: 'Edit note: Vacation' }).click();
  await page.getByRole('dialog', { name: 'Note' }).getByRole('button', { name: 'Delete note' }).click();
  await expect(page.getByRole('button', { name: /note: Vacation/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByRole('button', { name: 'Tuesday, October 13, note: Vacation' })).toBeVisible();
});

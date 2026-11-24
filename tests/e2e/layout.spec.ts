// The computer layout (the owner, 6 Nov 2026): two columns from 1100px wide, and Activity's details beside the list.
import { test, expect, type Page } from '@playwright/test';
import { sampleData } from '../../src/model/sample';
import { choosePeriod, fakeRuntime, openPlace, seriousA11yProblems, TODAY } from './helpers';

// Each test sets its own screen size, so one browser project is enough.
test.beforeEach(async ({ page }, info) => { test.skip(info.project.name !== 'desktop'); await page.clock.setFixedTime(TODAY); });

const box = async (page: Page, sel: string) => (await page.locator(sel).boundingBox())!;

test('from 1100px wide, half cards sit side by side and the rest take the full width', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const [glance, kpis, have] = [await box(page, '#home-glance'), await box(page, '#home-kpis'), await box(page, '#home-have')];
  expect(Math.abs(glance.y - kpis.y)).toBeLessThan(2);
  expect(kpis.x).toBeGreaterThan(glance.x + glance.width);
  expect(Math.abs(glance.height - kpis.height), 'a row lines up').toBeLessThan(2);
  expect(have.width).toBeGreaterThan(glance.width * 1.9);
  for (const name of ['Spending', 'Budget', 'Calendar'] as const) {
    await openPlace(page, name);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), name).toBeLessThanOrEqual(1280);
    expect(await seriousA11yProblems(page), name).toEqual([]);
  }
  const [month, day] = [await box(page, '#calendar-month'), await box(page, '#calendar-day')];
  expect(Math.abs(month.y - day.y)).toBeLessThan(2);
});

test('below 1100px every card keeps v1\'s single column', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto('/');
  const [glance, kpis] = [await box(page, '#home-glance'), await box(page, '#home-kpis')];
  expect(kpis.y).toBeGreaterThan(glance.y + glance.height);
  expect(Math.abs(glance.width - kpis.width)).toBeLessThan(2);
});

test('on a computer a transaction opens beside the list, which stays usable; Escape closes it', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await openPlace(page, 'Activity');
  await choosePeriod(page, 'All time');
  const rows = page.locator('#tx-list tbody tr');
  await rows.filter({ hasText: 'SUPERMARKET' }).click();
  await page.locator('.rm-selbar').getByRole('button', { name: 'Edit' }).click();
  const panel = page.getByRole('dialog', { name: 'Transaction' });
  await expect(panel).toBeVisible();
  await expect(panel).toHaveClass(/docked/);
  const [list, p] = [await box(page, '#tx-list'), await panel.boundingBox()];
  expect(p!.x).toBeGreaterThan(list.x + list.width);
  await expect(panel.getByRole('combobox', { name: 'Category' })).toBeFocused();
  expect(await seriousA11yProblems(page)).toEqual([]);
  // The list is not covered: another row can still be ticked while the details are open.
  await rows.filter({ hasText: 'WOLT TLV' }).locator('input').check();
  await expect(page.locator('.rm-selbar')).toContainText('2 selected');
  await panel.getByRole('combobox', { name: 'Category' }).press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(page.locator('#tx-list')).toBeFocused();
});

test('on a phone the transaction still opens as a sheet over the list', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await openPlace(page, 'Activity');
  await choosePeriod(page, 'All time');
  await page.locator('#tx-list tbody tr').filter({ hasText: 'SUPERMARKET' }).click();
  await page.locator('.rm-selbar').getByRole('button', { name: 'Edit' }).click();
  const panel = page.getByRole('dialog', { name: 'Transaction' });
  await expect(panel).toBeVisible();
  await expect(panel).not.toHaveClass(/docked/);
});

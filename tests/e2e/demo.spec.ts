// v1's Demo button: the made-up demo person in place of your own data. Nothing done in demo is saved.
import { test, expect, type Page } from '@playwright/test';
import { sampleData } from '../../src/model/sample';
import { choosePeriod, fakeRuntime, openPlace, seriousA11yProblems, TODAY, watchErrors } from './helpers';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(TODAY); });

const allDocs = (page: Page) => page.evaluate(() => JSON.stringify([...(window as unknown as { __docs: Map<string, unknown> }).__docs]));
/** The person button beside Settings, on phones and computers (the owner, 6 Nov 2026). */
async function switchToDemo(page: Page) {
  await page.getByRole('button', { name: 'Switch to the demo account' }).click();
  await expect(page.locator('#demo-btn')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#demo-btn')).toContainText('Demo on');
}
const rows = (page: Page) => page.getByRole('region', { name: 'Transactions, scrollable' }).locator('tbody tr');

test('Demo shows the made-up person, and switches back to your own data', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Activity');
  await choosePeriod(page, 'All time');
  await expect(rows(page).filter({ hasText: 'SUPERMARKET' })).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Settings' })).toBeVisible();

  await switchToDemo(page);
  await expect(page.getByText('Demo account: a made-up person with round numbers.')).toBeVisible();
  await openPlace(page, 'Activity');
  await expect(rows(page).filter({ hasText: 'SUPERMARKET' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Import a file' })).toHaveCount(0);
  for (const name of ['Home', 'Spending', 'Budget', 'Calendar', 'Activity'] as const) {
    await openPlace(page, name);
    expect(await seriousA11yProblems(page), name).toEqual([]);
  }

  await page.getByRole('button', { name: 'Back to my account', exact: true }).click();
  await expect(page.getByText('Demo account: a made-up person')).toHaveCount(0);
  await expect(rows(page).filter({ hasText: 'SUPERMARKET' })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('changes made in demo are never saved', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Activity');
  await choosePeriod(page, 'All time');
  const before = await allDocs(page);

  await switchToDemo(page);
  await openPlace(page, 'Activity');
  await rows(page).nth(0).click();
  await rows(page).nth(1).click();
  await page.getByRole('button', { name: 'Change type' }).click();
  await page.getByRole('combobox', { name: 'Move 2 selected to' }).selectOption({ label: 'Groceries' });
  await page.getByRole('button', { name: 'Move', exact: true }).click();
  await expect(page.getByText('Moved 2 transactions to Groceries')).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText(/Undone/)).toBeVisible();
  await page.waitForTimeout(300);
  expect(await allDocs(page)).toBe(before);

  // Settings in demo: no import, backup or restore, since those would touch your own saved data.
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByText('You’re looking at the demo account.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Import', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Restore|Download a backup/ })).toHaveCount(0);
  expect(await allDocs(page)).toBe(before);
  await page.getByRole('main').getByRole('button', { name: 'Back to my account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Import', exact: true })).toBeVisible();
});

test('a first visit with no data offers the demo next to Import', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Try the demo' }).click();
  await expect(page.getByText('Demo account: a made-up person with round numbers.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome to MySheet' })).toHaveCount(0);
});

test('on a phone the period gets its own row, so its name is never cut short', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone');
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const pill = page.locator('#period-btn');
    await expect(pill).toHaveText('Last 12 months');
    expect(await pill.evaluate((el) => { const n = el.querySelector('#period-name')!; return n.scrollWidth <= n.clientWidth; }), `${width}px`).toBe(true);
    const [title, eye] = await Promise.all([page.locator('#title').boundingBox(), page.getByRole('button', { name: 'Hide amounts' }).boundingBox()]);
    const p = (await pill.boundingBox())!;
    expect(p.y, 'period below the title row').toBeGreaterThan(Math.max(title!.y + title!.height, eye!.y + eye!.height) - 1);
  }
});

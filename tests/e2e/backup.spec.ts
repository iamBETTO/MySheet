// Backup and restore, from Settings.
import { test, expect, type Page } from '@playwright/test';
import { sampleData } from '../../src/model/sample';
import { toBackupFile } from '../../src/logic/backup';
import { choosePeriod, fakeRuntime, openPlace, seriousA11yProblems, TODAY, watchErrors } from './helpers';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(TODAY); });

const BACKUP = toBackupFile(sampleData(), new Date('2026-10-12T09:00:00Z'));

async function openSettings(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
}

async function chooseFile(page: Page, name: string, text: string) {
  await page.locator('#restore-file').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
}

async function countAllTime(page: Page) {
  await openPlace(page, 'Activity');
  await choosePeriod(page, 'All time');
  return page.getByRole('region', { name: 'Transactions, scrollable' }).locator('tbody tr');
}

test('download a backup offers one file with everything', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await openSettings(page);
  await expect(page.getByText('No backup saved from this device yet.')).toBeVisible();
  await page.getByRole('button', { name: 'Download a backup' }).click();
  await expect(page.getByText('Backup saved.')).toBeVisible();
  await expect(page.getByText(/^Last backup from this device: \d{1,2} \w{3} \d{4}\.$/)).toBeVisible();
  const saved = await page.evaluate(() => (window as unknown as { __saved: { filename: string; data: string }[] }).__saved);
  expect(saved).toHaveLength(1);
  expect(saved[0]!.filename).toMatch(/^mysheet-backup-\d{4}-\d{2}-\d{2}\.json$/);
  expect(JSON.parse(saved[0]!.data).data.accounts).toHaveLength(2);
  expect(errors).toEqual([]);
});

test('saying no to the download is reported plainly', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', downloads: 'declined' });
  await openSettings(page);
  await page.getByRole('button', { name: 'Download a backup' }).click();
  await expect(page.getByText('No file was saved.')).toBeVisible();
});

test('restore asks first, replaces everything, and can be undone', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test' });
  await openSettings(page);
  await chooseFile(page, 'mysheet-backup-2026-10-12.json', BACKUP);
  await expect(page.getByText('This backup from 12 Oct 2026 has 2 accounts and 5 transactions in 2 months.')).toBeVisible();
  expect(await seriousA11yProblems(page)).toEqual([]);
  await page.getByRole('button', { name: 'Keep my data' }).click();
  await expect(page.getByRole('button', { name: 'Replace my data with this backup' })).toHaveCount(0);

  await chooseFile(page, 'mysheet-backup-2026-10-12.json', BACKUP);
  await page.getByRole('button', { name: 'Replace my data with this backup' }).click();
  await expect(page.getByText('Restored.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Main bank/ })).toBeVisible();

  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Undone.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Main bank/ })).toHaveCount(0);
  const months = await page.evaluate(() => [...(window as unknown as { __docs: Map<string, unknown> }).__docs.keys()].filter((k) => k.includes('/months/')));
  expect(months).toEqual([]);
  expect(errors).toEqual([]);
});

test('a file that isn\'t a backup is refused with the reason', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test' });
  await openSettings(page);
  await chooseFile(page, 'notes.json', '{"hello": 1}');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Replace my data with this backup' })).toHaveCount(0);
  await chooseFile(page, 'broken.json', 'not json at all');
  await expect(page.getByRole('alert')).toBeVisible();
});

test('restored data survives a reload', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test' });
  await openSettings(page);
  await chooseFile(page, 'b.json', BACKUP);
  await page.getByRole('button', { name: 'Replace my data with this backup' }).click();
  await expect(page.getByText('Restored.')).toBeVisible();
  const docs = await page.evaluate(() => [...(window as unknown as { __docs: Map<string, unknown> }).__docs.entries()]);
  await page.addInitScript((entries) => { const w = window as unknown as { __docs: Map<string, unknown> }; for (const [k, v] of entries) w.__docs.set(k, v); }, docs);
  await page.reload();
  await expect(await countAllTime(page)).toHaveCount(5);
});

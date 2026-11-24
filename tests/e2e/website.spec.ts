// MySheet on its own website (plans/offline-app.md, decision ms-d63): with no Claude runtime it saves on the device,
// so what you change is still there after a reload, and nothing asks you to sign in to Claude.
import { expect, test } from '@playwright/test';
import { fakeRuntime, watchErrors } from './helpers';
import { sampleData } from '../../src/model/sample';
import { toBackupFile } from '../../src/logic/backup';

test('on its own website, changes are saved on the device and survive a reload', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to MySheet' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).first().click();
  const startHidden = page.getByRole('checkbox', { name: /Start with amounts hidden/ });
  await startHidden.check();
  await expect(page.getByText('Amounts will start hidden')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome to MySheet' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings' }).first().click();
  await expect(page.getByRole('checkbox', { name: /Start with amounts hidden/ })).toBeChecked();
  expect(errors).toEqual([]);
});

test('on its own website, Home reminds you to back up, and a backup is an ordinary download', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  // Bring some data in through Restore, the way you'd move your data over from the Claude version.
  await page.getByRole('button', { name: 'Settings' }).first().click();
  await page.locator('#restore-file').setInputFiles({ name: 'mysheet-backup.json', mimeType: 'application/json', buffer: Buffer.from(toBackupFile(sampleData(), new Date())) });
  await page.getByRole('button', { name: 'Replace my data with this backup' }).click();
  await expect(page.getByText('Restored. Everything now matches the backup.')).toBeVisible();
  await page.getByRole('navigation').first().getByRole('button', { name: 'Home', exact: true }).click();
  const reminder = page.getByRole('region', { name: 'Back up your data' });
  await expect(reminder).toBeVisible();
  const download = page.waitForEvent('download');
  await reminder.getByRole('button', { name: 'Download a backup' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.json$/);
  await expect(reminder).toHaveCount(0);
  // Saved data and the backup date both survive a reload.
  await page.reload();
  await expect(page.locator('#home-flow')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Back up your data' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('on its own website, MySheet opens without internet after one visit, and can be installed', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload(); // the first visit installs the offline copy; this one is served through it and saved
  await expect(page.getByRole('heading', { name: 'Welcome to MySheet' })).toBeVisible();
  const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
  const app = await (await page.request.get(manifest!)).json() as { name: string; display: string; icons: unknown[] };
  expect([app.name, app.display, app.icons.length]).toEqual(['MySheet', 'standalone', 3]);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome to MySheet' })).toBeVisible();
  await context.setOffline(false);
});

test('inside Claude there is no offline copy: the viewer serves the page', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to MySheet' })).toBeVisible();
  expect(await page.evaluate(() => navigator.serviceWorker.getRegistrations().then((r) => r.length))).toBe(0);
});

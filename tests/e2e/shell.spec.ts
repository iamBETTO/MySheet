// The app frame: connecting, the five places, the period, the privacy eye, small screens and the published page.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { sampleData } from '../../src/model/sample';
import { choosePeriod, fakeRuntime, openPlace, seriousA11yProblems, TODAY, watchErrors } from './helpers';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(TODAY); });

// Outside Claude MySheet saves on the device (tests/e2e/website.spec.ts); only a browser with no storage stops it.
test('outside the Claude viewer, in a browser that won\'t store anything, it says so', async ({ page }) => {
  const errors = watchErrors(page);
  await page.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { value: undefined }); });
  await page.goto('/');
  await expect(page.getByRole('status').first()).toContainText('This browser won’t let MySheet save anything');
  expect(await seriousA11yProblems(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('signed out, it asks you to sign in', async ({ page }) => {
  await fakeRuntime(page, { userId: null });
  await page.goto('/');
  await expect(page.getByRole('status').first()).toContainText('Sign in to Claude');
});

test('every place opens, and is labelled in the bar', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  for (const name of ['Spending', 'Budget', 'Calendar', 'Activity', 'Home'] as const) {
    await openPlace(page, name);
    await expect(page.getByRole('navigation', { name: 'MySheet sections' }).getByRole('button', { name })).toHaveAttribute('aria-current', 'page');
    expect(await seriousA11yProblems(page), name).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('the chosen place and period are remembered after a reload', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Activity');
  await choosePeriod(page, '2026');
  await expect(page.locator('#period-btn')).toHaveText('2026');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Activity');
  await expect(page.locator('#period-btn')).toHaveText('2026');
});

test('the eye blurs every amount on every place, and says so to screen readers', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await page.getByRole('button', { name: 'Hide amounts' }).click();
  for (const name of ['Home', 'Spending', 'Budget', 'Calendar', 'Activity'] as const) {
    await openPlace(page, name);
    // Every visible "₪123" sits inside a blurred amount (v1: .rm.priv .m).
    const readable = await page.evaluate(() => {
      const out: string[] = [];
      const walk = document.createTreeWalker(document.querySelector('main')!, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (!/₪\s?\d/.test(n.textContent ?? '')) continue;
        const el = n.parentElement!;
        if (el.closest('.m') || !el.getClientRects().length) continue;
        out.push(n.textContent!.trim().slice(0, 40));
      }
      return out;
    });
    expect(readable, name).toEqual([]);
  }
  await page.getByRole('button', { name: 'Show amounts' }).click();
  await expect(page.locator('main')).not.toContainText('amount hidden');
});

test('fits a 320px screen without sideways scrolling, on every place', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  for (const name of ['Home', 'Spending', 'Budget', 'Calendar', 'Activity'] as const) {
    await openPlace(page, name);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), name).toBeLessThanOrEqual(320);
  }
});

test('the published page (inlined) runs inside the artifact skeleton', async ({ page }) => {
  const errors = watchErrors(page);
  const body = readFileSync('dist/artifact.html', 'utf8');
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await page.setContent(`<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}</style></head><body>${body}</body></html>`);
  await expect(page.getByRole('navigation', { name: 'MySheet sections' })).toBeVisible();
  expect(errors).toEqual([]);
});

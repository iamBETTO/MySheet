// Hebrew next to English (6 Nov 2026): the demo person with Hebrew names (tests/fixtures/demo-hebrew.json, built by
// scripts/build-hebrew-demo.mjs), on an emulated 360px Android phone.
import { test, expect, devices, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { AppData } from '../../src/model/types';
import { choosePeriod, fakeRuntime, openPlace, seriousA11yProblems, watchErrors } from './helpers';

const hebrew = JSON.parse(readFileSync(new URL('../fixtures/demo-hebrew.json', import.meta.url), 'utf8')) as AppData;
const { defaultBrowserType: _, ...galaxy } = devices['Galaxy S24'];
test.use({ ...galaxy });
test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== 'phone');
  await page.clock.setFixedTime(new Date('2026-10-08T12:00:00'));
  await fakeRuntime(page, { userId: 'u_test', data: hebrew });
});

/** Text that is cut with "…" but starts with a Hebrew letter must be cut in Hebrew's direction, keeping its beginning. */
const cutTheWrongWay = (page: Page) => page.evaluate(() => {
  const out: string[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('main *')) {
    const s = getComputedStyle(el);
    if (s.textOverflow !== 'ellipsis' || el.scrollWidth <= el.clientWidth + 0.5) continue;
    const first = (el.textContent ?? '').match(/[A-Za-z֐-׿]/)?.[0];
    if (first && /[֐-׿]/.test(first) && s.direction !== 'rtl') out.push(el.textContent!.slice(0, 30));
  }
  return out;
});

test('long Hebrew names are cut at their end, not their beginning, on every place', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  for (const name of ['Home', 'Spending', 'Budget', 'Calendar', 'Activity'] as const) {
    await openPlace(page, name);
    if (name === 'Activity') await choosePeriod(page, 'All time');
    expect(await cutTheWrongWay(page), name).toEqual([]);
    expect(await seriousA11yProblems(page), name).toEqual([]);
  }
  await page.getByRole('button', { name: 'Settings' }).tap();
  expect(await cutTheWrongWay(page), 'Settings').toEqual([]);
  expect(errors).toEqual([]);
});

test('searching in Hebrew finds Hebrew lines, and mixed names keep their order', async ({ page }) => {
  await page.goto('/');
  await openPlace(page, 'Activity');
  await choosePeriod(page, 'All time');
  await page.getByRole('searchbox').fill('שופרסל');
  const rows = page.locator('#tx-list tbody tr');
  await expect(rows.first()).toContainText('שופרסל דיל');
  expect(await rows.evaluateAll((rs) => rs.every((r) => r.textContent!.includes('שופרסל')))).toBe(true);
  // Hebrew and English names line up on the same side of the Description column.
  await page.getByRole('searchbox').fill('');
  const starts = await page.locator('#tx-list tbody td.desc > bdi').evaluateAll((els) => els.slice(0, 12).map((e) => {
    const r = document.createRange(); r.selectNodeContents(e); return Math.round(r.getBoundingClientRect().left - e.getBoundingClientRect().left);
  }));
  expect(Math.max(...starts), 'every name starts at the column\'s left edge').toBeLessThanOrEqual(1);
  await page.getByRole('searchbox').fill('LIME');
  await expect(rows.first()).toContainText('LIME קורקינט');
});

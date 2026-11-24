// The owner's phone is Android (6 Nov 2026): checks on an emulated Galaxy S24 (360px wide, touch, 3x screen), run once.
import { test, expect, devices, type Page } from '@playwright/test';
import { sampleData } from '../../src/model/sample';
import { readFileSync } from 'node:fs';
import type { AppData } from '../../src/model/types';
import { choosePeriod, fakeRuntime, openPlace, seriousA11yProblems, TODAY, watchErrors } from './helpers';

const demo = JSON.parse(readFileSync(new URL('../../src/model/demo.json', import.meta.url), 'utf8')) as AppData;
const { defaultBrowserType: _, ...galaxy } = devices['Galaxy S24'];
test.use({ ...galaxy });
test.beforeEach(async ({ page }, info) => { test.skip(info.project.name !== 'phone'); await page.clock.setFixedTime(TODAY); });

/** Elements whose text doesn't fit (cut with "…" or pushed out of their box). */
const cutOff = (page: Page, sel: string) => page.locator(sel).evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 0.5).map((e) => e.textContent));

test('every place fits a 360px Android phone: nothing cut off, no sideways scrolling', async ({ page }) => {
  const errors = watchErrors(page);
  await page.clock.setFixedTime(new Date('2026-10-08T12:00:00'));
  await fakeRuntime(page, { userId: 'u_test', data: demo });
  await page.goto('/');
  for (const name of ['Home', 'Spending', 'Budget', 'Calendar', 'Activity'] as const) {
    await page.getByRole('navigation', { name: 'MySheet sections' }).getByRole('button', { name }).tap();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name === 'Home' ? 'Treasury' : name);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), name).toBeLessThanOrEqual(360);
    if (name === 'Calendar') expect(await cutOff(page, '.rm-day .amt'), 'calendar amounts').toEqual([]);
  }
  await openPlace(page, 'Activity');
  const list = page.locator('#tx-list');
  expect(await list.evaluate((e) => e.scrollWidth - e.clientWidth), 'the transaction table fits its card').toBeLessThanOrEqual(0);
  expect(await cutOff(page, '#tx-list th button'), 'column titles').toEqual([]);
  expect(errors).toEqual([]);
});

test('taps work: period panel, a transaction sheet, and closing them', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Activity');
  await page.locator('#period-btn').tap();
  await page.locator('#period-sheet').getByRole('button', { name: 'All time', exact: true }).tap();
  await page.locator('#period-sheet').getByRole('button', { name: 'Done' }).tap();
  await expect(page.locator('#period-sheet')).toHaveCount(0);
  await page.locator('#tx-list tbody tr').filter({ hasText: 'SUPERMARKET' }).tap();
  await page.locator('.rm-selbar').getByRole('button', { name: 'Edit' }).tap();
  const sheet = page.getByRole('dialog', { name: 'Transaction' });
  await expect(sheet).toBeVisible();
  // The sheet fits the phone and its buttons stay reachable above the bottom edge.
  const box = (await sheet.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360.5);
  await expect(sheet.getByRole('button', { name: 'Save' })).toBeInViewport();
  expect(await seriousA11yProblems(page)).toEqual([]);
  await sheet.getByRole('button', { name: 'Close' }).tap();
  await expect(sheet).toHaveCount(0);
});

test('Arrange Home: a card can be dragged with a finger', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await page.getByRole('button', { name: 'Arrange Home' }).tap();
  await expect(page.getByRole('heading', { name: 'Arranging Home' })).toBeFocused();
  const handle = page.getByRole('button', { name: 'Move Totals for the period', exact: true });
  await handle.scrollIntoViewIfNeeded();
  const from = (await handle.boundingBox())!;
  const to = (await page.getByRole('region', { name: 'This month', exact: true }).boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const at = (x: number, y: number) => [{ x: Math.round(x), y: Math.round(y), id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(from.x + 22, from.y + 22) });
  for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(from.x + 22 + (to.x + 30 - from.x - 22) * i / 10, from.y + 22 + (to.y + 30 - from.y - 22) * i / 10) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  // Chrome ignores a tap that comes within a moment of a touch gesture ending (a person's next tap is never that
  // fast), so the tap on Done is repeated until it lands.
  await expect(async () => {
    const d = (await page.getByRole('button', { name: 'Done' }).boundingBox())!;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(d.x + 10, d.y + 10) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(page.getByRole('heading', { name: 'Arranging Home' })).toHaveCount(0, { timeout: 500 });
  }).toPass({ timeout: 5000 });
  expect(await page.locator('.tile > [id^="home-"]').evaluateAll((els) => els.map((e) => e.id))).toEqual(['home-kpis', 'home-glance', 'home-flow', 'home-balance', 'home-have']);
});

test('with large text (about 130% on a 360px phone, a 280px page) nothing is cut off or wraps oddly', async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 640 });
  await page.clock.setFixedTime(new Date('2026-10-08T12:00:00'));
  await fakeRuntime(page, { userId: 'u_test', data: demo });
  await page.goto('/');
  for (const name of ['Home', 'Spending', 'Budget', 'Calendar', 'Activity'] as const) {
    await page.getByRole('navigation', { name: 'MySheet sections' }).getByRole('button', { name }).tap();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), name).toBeLessThanOrEqual(280);
    // The title and the three round buttons stay on one row.
    const [title, gear] = [(await page.locator('#title').boundingBox())!, (await page.getByRole('button', { name: 'Settings' }).boundingBox())!];
    expect(Math.abs(title.y + title.height / 2 - (gear.y + gear.height / 2)), name).toBeLessThan(8);
    // Bottom bar labels don't run into each other.
    const labels = await page.getByRole('navigation', { name: 'MySheet sections' }).getByRole('button').evaluateAll((bs) => bs.map((b) => { const r = document.createRange(); r.selectNodeContents(b.lastChild!); const x = r.getBoundingClientRect(); return [x.left, x.right]; }));
    for (let i = 1; i < labels.length; i++) expect(labels[i]![0]! - labels[i - 1]![1]!, `${name}: gap before label ${i}`).toBeGreaterThan(1);
  }
  // The owner (6 Nov 2026, large text on his phone): "The calendar doesn't show the numbers anymore." They come back short.
  await page.getByRole('navigation', { name: 'MySheet sections' }).getByRole('button', { name: 'Calendar' }).tap();
  const amounts = page.locator('.rm-day .amt');
  expect(await amounts.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().width > 0 && e.scrollWidth <= e.clientWidth + 0.5)), 'day amounts shown in full').not.toContain(false);
  expect(await amounts.evaluateAll((els) => els.map((e) => e.innerText.trim()))).toEqual(['350', '40', '70', '350', '4k', '40', '320']);
  await page.getByRole('navigation', { name: 'MySheet sections' }).getByRole('button', { name: 'Activity' }).tap();
  const list = page.locator('#tx-list');
  expect(await list.evaluate((e) => e.scrollWidth - e.clientWidth), 'Activity amounts stay in view').toBeLessThanOrEqual(0);
  await expect(page.locator('#tx-list tbody tr').first().locator('.amt-whole')).toHaveText('−₪150');
});

test('screen readers: every button has its own clear name, and decorative arrows are silent', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-08T12:00:00'));
  await fakeRuntime(page, { userId: 'u_test', data: demo });
  await page.goto('/');
  for (const name of ['Home', 'Spending', 'Budget', 'Calendar', 'Activity'] as const) {
    await openPlace(page, name);
    const tree = await page.locator('main').ariaSnapshot();
    expect(tree, `${name}: arrows read aloud`).not.toMatch(/[›‹]"/);
    expect(tree, `${name}: an unnamed fold button`).not.toContain('this section');
  }
  await openPlace(page, 'Home');
  await page.getByRole('button', { name: 'Hide Bank balance' }).tap();
  await expect(page.getByRole('button', { name: 'Show Bank balance' })).toHaveAttribute('aria-expanded', 'false');
});

test('very large text (a 240px page): calendar numbers still show in full', async ({ page }) => {
  await page.setViewportSize({ width: 240, height: 640 });
  await page.clock.setFixedTime(new Date('2026-10-08T12:00:00'));
  await fakeRuntime(page, { userId: 'u_test', data: demo });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'MySheet sections' }).getByRole('button', { name: 'Calendar' }).tap();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(240);
  const amounts = page.locator('.rm-day .amt');
  expect(await amounts.evaluateAll((els) => els.map((e) => e.scrollWidth <= e.clientWidth + 0.5))).not.toContain(false);
  expect(await page.locator('.rm-calhead').innerText()).toMatch(/^S\s*M\s*T\s*W\s*T\s*F\s*S$/);
});

// The owner's phone test (6 Nov 2026): "when I try to scroll down the period card closes."
test('the period panel stays open while scrolling with a finger, and closes on a tap outside it', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-08T12:00:00'));
  await fakeRuntime(page, { userId: 'u_test', data: demo });
  await page.goto('/');
  await page.locator('#period-btn').tap();
  const panel = page.locator('#period-sheet');
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: '2025', exact: true }).tap();
  const cdp = await page.context().newCDPSession(page);
  const at = (y: number) => [{ x: 180, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(650) });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(650 - i * 40) });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => window.scrollY), 'the page scrolled').toBeGreaterThan(50);
  await expect(panel).toBeVisible();
  await expect(async () => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(600) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(panel).toHaveCount(0, { timeout: 500 });
  }).toPass({ timeout: 5000 });
});

// The owner's phone test (6 Nov 2026): dragging felt "clunky and inconsistent".
test('Arrange Home: the held card follows the finger and moves steadily, without flipping back and forth', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await page.getByRole('button', { name: 'Arrange Home' }).tap();
  await expect(page.getByRole('heading', { name: 'Arranging Home' })).toBeFocused();
  const handle = page.getByRole('button', { name: 'Move This month', exact: true });
  await handle.scrollIntoViewIfNeeded();
  const start = (await handle.boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const x = Math.round(start.x + 22);
  let y = Math.round(start.y + 22);
  const tileTop0 = (await page.locator('[data-tile="home-glance"]').boundingBox())!.y;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  const places: number[] = [];
  for (let i = 0; i < 24; i++) {
    y += 15;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
    // Chrome hands touch moves to the page once per screen frame: measure after the next two frames.
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    // The card stays under the finger: its top moved as far as the finger did (within 2px), whatever the scrolling.
    const top = (await page.locator('[data-tile="home-glance"]').boundingBox())!.y;
    expect(Math.abs(top - (tileTop0 + (y - Math.round(start.y + 22)))), `step ${i}`).toBeLessThan(2.5);
    places.push(await page.locator('[data-tile]').evaluateAll((els) => els.findIndex((e) => (e as HTMLElement).dataset.tile === 'home-glance')));
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  for (let i = 1; i < places.length; i++) expect(places[i], `place at step ${i}: ${places.join(',')}`).toBeGreaterThanOrEqual(places[i - 1]!);
  expect(places.at(-1)).toBeGreaterThan(0);
});

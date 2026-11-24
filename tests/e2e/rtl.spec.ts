// Right to left (plans/translation.md, step 4): with Hebrew chosen the page reads right to left, the tab bar starts on
// the right, amounts carry the shekel sign after the number (decision ms-d60), charts keep running left to right with
// their labels clear of the plot, the calendar's short amounts fit their boxes, and dragging side by side follows the
// reading direction. Selectors avoid wording, which changes with the language.
import { devices, expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { sampleData } from '../../src/model/sample';
import type { AppData } from '../../src/model/types';
import { fakeRuntime, seriousA11yProblems, watchErrors } from './helpers';

const hebrew = () => { const d = sampleData(); d.settings.locale = 'he-IL'; return d; };
const order = (page: Page) => page.locator('.tile > [id^="home-"]').evaluateAll((els) => els.map((e) => e.id.slice(5)));

test('Hebrew: the page reads right to left, with Hebrew amounts and dates', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: hebrew() });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.locator('html')).toHaveAttribute('lang', 'he');
  // The tab bar starts on the right: Home, its first place, sits right of Activity, its last.
  const tabs = page.getByRole('navigation').first().getByRole('button');
  const [first, last] = [(await tabs.first().boundingBox())!, (await tabs.last().boundingBox())!];
  expect(first.x).toBeGreaterThan(last.x);
  // Amounts: the sign follows the number; dates are Hebrew.
  const texts = await page.locator('#main').innerText();
  expect(texts).toMatch(/\d[\d,]*(\.\d\d)?[\s ‏]*₪/);
  expect(texts).not.toMatch(/₪\d/);
  expect(texts).toMatch(/באוק׳|בספט׳/);
  expect(await seriousA11yProblems(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('Hebrew: chart labels stay clear of the plot', async ({ page }, info) => {
  await fakeRuntime(page, { userId: 'u_test', data: hebrew() });
  if (info.project.name === 'phone') await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  const clash = await page.locator('#home-flow svg[role="img"]').evaluate((svg) => {
    const plot = [...svg.querySelectorAll('rect')].find((r) => r.getAttribute('fill') === 'transparent')!;
    const left = plot.getBoundingClientRect().left;
    return [...svg.querySelectorAll('text[text-anchor="end"]')].filter((t) => t.getBoundingClientRect().right > left + 1).map((t) => t.textContent);
  });
  expect(clash, 'amount labels running into the plot').toEqual([]);
});

test('Hebrew: dragging side by side follows the reading direction', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await fakeRuntime(page, { userId: 'u_test', data: hebrew() });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.locator('.arrange-open button').click();
  // Right to left, the first card (This month) is on the right and the second (Totals) on its left. Dropping This
  // month so its middle is on Totals' left half puts it after Totals: further along, reading right to left.
  const from = (await page.locator('[data-handle="home-glance"]').boundingBox())!;
  const held = (await page.locator('[data-tile="home-glance"]').boundingBox())!;
  const to = (await page.locator('[data-tile="home-kpis"]').boundingBox())!;
  expect(held.x).toBeGreaterThan(to.x);
  const grip = { x: from.x + from.width / 2 - held.x, y: from.y + from.height / 2 - held.y };
  const end = { x: to.x + to.width * 0.25 - held.width / 2 + grip.x, y: to.y + grip.y };
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(from.x + (end.x - from.x) * i / 8, from.y + (end.y - from.y) * i / 8);
  await page.mouse.up();
  await page.locator('.arrange-bar .btn-primary').click();
  expect(await order(page)).toEqual(['kpis', 'glance', 'flow', 'balance', 'have']);
});

test('Hebrew: names from the data keep their own direction inside a sentence', async ({ page }) => {
  // The demo person's categories are English; in a Hebrew list ("A, B ו-C") an unisolated two-word name such as
  // "Eating out" was split across the sentence. Each name sits in its own direction isolate (U+2068 … U+2069).
  const demo = JSON.parse(readFileSync(new URL('../../src/model/demo.json', import.meta.url), 'utf8')) as AppData;
  demo.settings.locale = 'he-IL';
  await fakeRuntime(page, { userId: 'u_test', data: demo });
  await page.goto('/');
  await page.getByRole('navigation').first().getByRole('button').nth(2).click(); // Budget
  const sentence = await page.locator('p', { hasText: 'חרגת' }).first().innerText();
  expect(sentence).toContain('\u2068Eating out\u2069');
});

// The owner's phone (Galaxy S24, 360px wide), where the cut-off first showed: Chrome on Android sets the text a little
// larger than a plain 360px window.
test.describe('on an Android phone', () => {
  const { defaultBrowserType: _, ...galaxy } = devices['Galaxy S24'];
  test.use({ ...galaxy });
  test('Hebrew: the calendar\'s short amounts fit their days', async ({ page }, info) => {
    test.skip(info.project.name !== 'phone');
    // The demo person has a day over ₪1,000 in the month shown ("₪3.9k"), the one that was cut off.
    const demo = JSON.parse(readFileSync(new URL('../../src/model/demo.json', import.meta.url), 'utf8')) as AppData;
    demo.settings.locale = 'he-IL';
    await fakeRuntime(page, { userId: 'u_test', data: demo });
    await page.goto('/');
    await page.getByRole('navigation').first().getByRole('button').nth(3).click(); // Calendar
    await expect(page.locator('.rm-day').first()).toBeVisible();
    const cut = await page.locator('.rm-day .amt').evaluateAll((els) => els
      .filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
    expect(cut, 'amounts cut off in a day').toEqual([]);
    // Short amounts read like the rest: on screen the sign is left of the number.
    const amt = page.locator('.rm-day .amt').first();
    await expect(amt).toContainText('₪');
  });
});

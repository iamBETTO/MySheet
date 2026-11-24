// Before the first import (plans/empty-screens.md, decision ms-d62): every screen keeps its usual cards and labels, with
// "—" where a number will be and "Nothing yet" for a list; no made-up zeros and no explaining sentences (the owner,
// 10 Nov 2026: minimal); Home's welcome box (a title and two buttons) sits above its cards.
import { expect, test, type Page } from '@playwright/test';
import { emptyData } from '../../src/model/types';
import { fakeRuntime, seriousA11yProblems, watchErrors } from './helpers';

const place = (page: Page, name: string) => page.getByRole('navigation').first().getByRole('button', { name, exact: true }).click();
const zero = /₪0(?![\d.,])|\b0 transactions|0 days/;

test('Home before the first import: the welcome box above the usual cards, no made-up numbers', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: emptyData() });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to MySheet' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import a file' })).toBeVisible();
  for (const id of ['home-glance', 'home-kpis', 'home-flow', 'home-balance', 'home-have']) await expect(page.locator(`#${id}`)).toBeVisible();
  await expect(page.getByText('Net worth')).toBeVisible();
  // The welcome box comes first, then the cards.
  const [welcome, glance] = await Promise.all([page.getByRole('heading', { name: 'Welcome to MySheet' }).boundingBox(), page.locator('#home-glance').boundingBox()]);
  expect(welcome!.y).toBeLessThan(glance!.y);
  // The welcome box is a title and two buttons, nothing more.
  await expect(page.getByRole('button', { name: 'Try the demo' })).toBeVisible();
  await expect(page.locator('section', { has: page.getByRole('heading', { name: 'Welcome to MySheet' }) }).locator('p')).toHaveCount(0);
  // The cards keep their labels, with "—" for the numbers.
  for (const label of ['Safe to spend', 'Money in', 'Money out', 'Left over']) await expect(page.locator('#main').getByText(label, { exact: true })).toBeVisible();
  await expect(page.locator('.rm-hero .big')).toHaveText('—');
  expect(await page.locator('#main .rm-note').count(), 'no explaining sentences').toBe(0);
  // What you have keeps v1's "Nothing added yet ₪0" rows, a true zero; everything else has no number yet.
  const rest = await page.locator('#main').evaluate((el) => { const c = el.cloneNode(true) as HTMLElement; c.querySelector('#home-have')?.remove(); return c.innerText; });
  expect(rest).not.toMatch(zero);
  // The charts keep their frame, so the page has its usual shape.
  await expect(page.locator('#home-flow svg.chart')).toBeVisible();
  await expect(page.locator('#home-balance svg.chart')).toBeVisible();
  expect(await seriousA11yProblems(page)).toEqual([]);
  expect(errors).toEqual([]);
});

test('Spending, Budget, Calendar and Activity before the first import say what will appear, without zeros', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: emptyData() });
  await page.goto('/');
  const cards: Record<string, string[]> = {
    Spending: ['spending-went', 'spending-from', 'spending-moves', 'spending-places'],
    Budget: ['budget-pace', 'budget-bills', 'budget-limits'],
    Calendar: [],
    Activity: [],
  };
  for (const [name, ids] of Object.entries(cards)) {
    await place(page, name);
    for (const id of ids) await expect(page.locator(`#${id}`), `${name}: ${id}`).toBeVisible();
    const main = await page.locator('#main').innerText();
    if (name !== 'Calendar') expect(main, name).toMatch(/Nothing yet|—/); // the calendar's empty days say it alone
    for (const note of await page.locator('#main .rm-note').allInnerTexts()) expect(note.length, `${name}: "${note}"`).toBeLessThan(80);
    expect(main, name).not.toMatch(zero);
    expect(main, name).not.toContain('Nothing in this period');
    expect(await seriousA11yProblems(page), name).toEqual([]);
  }
  expect(errors).toEqual([]);
});

test('an account with no transactions yet still counts as no data', async ({ page }) => {
  const d = emptyData();
  d.accounts.push({ id: 'acc-1', name: 'Bank', kind: 'bank', currency: 'ILS', openingBalance: 500000, openingDate: '2026-01-01', closed: false });
  await fakeRuntime(page, { userId: 'u_test', data: d });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome to MySheet' })).toBeVisible();
  // Net worth is real as soon as there is an account: its starting balance.
  await expect(page.locator('.rm-hero .big')).toHaveText('₪5,000');
});

// The sweep: every place and the main sheets in both themes, a keyboard pass, right-to-left layout, and a
// full-size data set (about 3,000 transactions over four years) to check the screens stay quick.
import { test, expect, type Page } from '@playwright/test';
import { sampleData } from '../../src/model/sample';
import { emptyData, type AppData, type Transaction } from '../../src/model/types';
import { choosePeriod, fakeRuntime, openPlace, seriousA11yProblems, TODAY, watchErrors } from './helpers';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(TODAY); });

const PLACES = ['Home', 'Spending', 'Budget', 'Calendar', 'Activity'] as const;

/** Made-up data the size of a real person's four years: two accounts, 12 categories, ~3,000 lines. */
function bigData(): AppData {
  const d = emptyData();
  d.accounts = [
    { id: 'b', name: 'Bank', kind: 'bank', currency: 'ILS', openingBalance: 500_000, openingDate: '2022-10-01', closed: false },
    { id: 'c', name: 'Card', kind: 'card', currency: 'ILS', openingBalance: 0, openingDate: '2022-10-01', closed: false },
  ];
  const names = ['Groceries', 'Eating out', 'Transport', 'Phone', 'Rent', 'Clothes', 'Games', 'Travel', 'Health', 'Gifts'];
  d.categories = [
    ...names.map((n, i) => ({ id: `s${i}`, name: n, kind: 'spending' as const, parentId: null, color: null, fixedCost: n === 'Rent', archived: false })),
    { id: 'inc', name: 'Salary', kind: 'income', parentId: null, color: null, fixedCost: false, archived: false },
    { id: 'mv', name: 'Card payments', kind: 'transfer', parentId: null, color: null, fixedCost: false, archived: false },
  ];
  d.budgets.limits = [{ categoryId: null, monthly: 900_000 }, { categoryId: 's1', monthly: 120_000 }];
  let seq = 0;
  const tx = (accountId: string, date: string, amount: number, description: string, categoryId: string): Transaction =>
    ({ id: `t${++seq}`, accountId, date, amount, currency: 'ILS', description, payee: null, categoryId, note: null, importId: null, fingerprint: `f${seq}` });
  for (let m = 0; m < 49; m++) {
    const y = 2022 + Math.floor((9 + m) / 12), mo = ((9 + m) % 12) + 1;
    const key = `${y}-${String(mo).padStart(2, '0')}`;
    const list: Transaction[] = [tx('b', `${key}-01`, 1_100_000, 'SALARY', 'inc'), tx('b', `${key}-02`, -400_000, 'RENT CHECK', 's4')];
    for (let i = 0; i < 58; i++) {
      const day = String(1 + (i % 28)).padStart(2, '0');
      const cat = i % 10;
      list.push(tx('c', `${key}-${day}`, -(1_000 + ((i * 7919 + m * 31) % 25_000)), `SHOP ${cat}-${i % 17}`, `s${cat}`));
    }
    list.push(tx('b', `${key}-15`, -300_000, 'CARD PAYMENT', 'mv'));
    if (key <= '2026-10') d.months[key] = { month: key, transactions: list.filter((t) => t.date <= '2026-10-15').sort((a, b) => a.date.localeCompare(b.date)), transfers: [] };
  }
  return d;
}

async function focusPass(page: Page, steps = 30): Promise<string[]> {
  const problems: string[] = [];
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press('Tab');
    const p = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      const r = el.getBoundingClientRect();
      const label = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40);
      if (r.width === 0 || r.height === 0) return `${label}: focused but not visible`;
      // The ring may sit on the element or on a wrapper that shows it with :focus-within (the search box).
      const ringOn = (e: Element | null) => { if (!e) return false; const cs = getComputedStyle(e); return cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 || cs.boxShadow !== 'none'; };
      const ring = ringOn(el) || ringOn(el.parentElement) || ringOn(el.parentElement?.parentElement ?? null);
      if (!ring) return `${label}: no visible focus ring`;
      const x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
      const hit = document.elementFromPoint(x, y);
      if (hit && !el.contains(hit) && !hit.contains(el)) return `${label}: hidden under ${hit.tagName.toLowerCase()}.${(hit as HTMLElement).className}`;
      return null;
    });
    if (p) problems.push(p);
  }
  return problems;
}

for (const scheme of ['light', 'dark'] as const) {
  test(`every place and sheet passes accessibility checks (${scheme})`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.emulateMedia({ colorScheme: scheme });
    await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
    await page.goto('/');
    for (const name of PLACES) {
      await openPlace(page, name);
      expect(await seriousA11yProblems(page), name).toEqual([]);
    }
    await page.getByRole('button', { name: /Last 12 months/ }).click();
    expect(await seriousA11yProblems(page), 'period sheet').toEqual([]);
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    expect(await seriousA11yProblems(page), 'settings').toEqual([]);
    await page.getByRole('button', { name: 'Import a file' }).click();
    expect(await seriousA11yProblems(page), 'import sheet').toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('keyboard: every place can be tabbed through with a visible focus that nothing covers', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  for (const name of PLACES) {
    await openPlace(page, name);
    expect(await focusPass(page), name).toEqual([]);
  }
});

test('right-to-left: every place keeps its layout inside the screen', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.lang = 'he'; });
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 860 });
    for (const name of PLACES) {
      await openPlace(page, name);
      // The tab lens springs past its end mid-move (v1's overshoot); measure once it has settled.
      const outside = await page.evaluate(async () => {
        await Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)));
        const w = document.documentElement.clientWidth;
        return [...document.querySelectorAll('main *, nav *')].filter((el) => {
          const r = el.getBoundingClientRect();
          if (!r.width || getComputedStyle(el).position === 'fixed' && r.width < 2) return false;
          const clipped = el.closest('.table-wrap, .chart-scroll, [data-scroll]');
          return !clipped && (r.right > w + 1 || r.left < -1);
        }).slice(0, 3).map((el) => `${el.tagName.toLowerCase()}.${(el as HTMLElement).className}`);
      });
      expect(outside, `${name} at ${width}px`).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${name} at ${width}px`).toBeLessThanOrEqual(width);
    }
  }
});

test('a full-size data set opens every place quickly and without errors', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: bigData() });
  await page.goto('/');
  await expect(page.getByRole('navigation', { name: 'MySheet sections' })).toBeVisible();
  for (const name of PLACES) {
    const t0 = Date.now();
    await openPlace(page, name);
    await expect(page.locator('main')).toContainText('₪');
    expect(Date.now() - t0, `${name} took too long`).toBeLessThan(1500);
  }
  await choosePeriod(page, 'All time');
  const t0 = Date.now();
  await page.getByRole('searchbox', { name: 'Search transactions' }).fill('shop 3');
  await expect(page.getByRole('region', { name: 'Transactions, scrollable' }).locator('tbody tr').first()).toBeVisible();
  expect(Date.now() - t0, 'search took too long').toBeLessThan(1500);
  expect(errors).toEqual([]);
});

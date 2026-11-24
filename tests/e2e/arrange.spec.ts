// Arranging Home, Spending and Budget (plans/arrange-pages.md, plans/arrange-spending-budget.md): order, width, hide and show, reset; saved with the data, with Undo.
import { test, expect, type Page } from '@playwright/test';
import { sampleData } from '../../src/model/sample';
import { fakeRuntime, openPlace, seriousA11yProblems, storedDoc, TODAY, watchErrors } from './helpers';

test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(TODAY); });

const order = (page: Page) => page.locator('.tile > [id^="home-"]').evaluateAll((els) => els.map((e) => e.id.replace('home-', '')));
const tile = (page: Page, name: string) => page.getByRole('region', { name, exact: true });
const savedHome = async (page: Page) => (((await storedDoc(page, 'settings')) as { layouts?: { home?: { cards: { id: string; hidden: boolean }[] } } } | undefined)
  ?.layouts?.home?.cards ?? []).map((c) => c.id.replace('home-', '') + (c.hidden ? ' (hidden)' : ''));
const settingsLayouts = async (page: Page) => ((await storedDoc(page, 'settings')) as { layouts?: unknown } | undefined)?.layouts;

test('arrange Home with buttons: move, hide, Done saves it with Undo, and it stays after a reload', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  expect(await order(page)).toEqual(['glance', 'kpis', 'flow', 'balance', 'have']);
  await page.getByRole('button', { name: 'Arrange Home' }).click();
  await expect(page.getByRole('heading', { name: 'Arranging Home' })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Reset to original' })).toBeDisabled();
  expect(await seriousA11yProblems(page)).toEqual([]);

  await page.getByRole('button', { name: 'Move What you have earlier' }).click();
  await expect(page.getByRole('button', { name: 'Move What you have earlier' })).toBeFocused();
  await expect(page.getByRole('status').filter({ hasText: 'What you have: position 4 of 5.' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Hide Bank balance' }).click();
  await expect(page.getByRole('heading', { name: 'Hidden cards' })).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();

  await expect(page.getByText('Home arranged')).toBeVisible();
  expect(await order(page)).toEqual(['glance', 'kpis', 'flow', 'have']);
  await expect(page.getByText('1 card hidden')).toBeVisible();
  await expect.poll(() => savedHome(page)).toEqual(['glance', 'kpis', 'flow', 'have', 'balance (hidden)']);

  await page.getByRole('button', { name: 'Arrange Home' }).click();
  await page.getByRole('button', { name: 'Show Bank balance' }).click();
  await page.getByRole('button', { name: 'Reset to original' }).click();
  await expect(page.getByRole('button', { name: 'Reset to original' })).toBeDisabled();
  await page.getByRole('button', { name: 'Done' }).click();
  expect(await order(page)).toEqual(['glance', 'kpis', 'flow', 'balance', 'have']);
  await expect.poll(() => settingsLayouts(page)).toEqual({});
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect.poll(() => savedHome(page)).toEqual(['glance', 'kpis', 'flow', 'have', 'balance (hidden)']);
  expect(await order(page)).toEqual(['glance', 'kpis', 'flow', 'have']);
  expect(errors).toEqual([]);
});

test('a saved layout is used when the data loads', async ({ page }) => {
  const data = sampleData();
  const place = (id: string, hidden = false) => ({ id: `home-${id}`, width: 'half' as const, hidden });
  data.settings.layouts = { home: { cards: [place('have'), place('glance'), place('kpis'), place('flow', true), place('balance')] } };
  await fakeRuntime(page, { userId: 'u_test', data });
  await page.goto('/');
  await expect(page.locator('#home-have')).toBeVisible();
  expect(await order(page)).toEqual(['have', 'glance', 'kpis', 'balance']);
  await expect(page.getByText('1 card hidden')).toBeVisible();
});

test('Cancel drops the changes', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await page.getByRole('button', { name: 'Arrange Home' }).click();
  await page.getByRole('button', { name: 'Hide This month' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  expect(await order(page)).toEqual(['glance', 'kpis', 'flow', 'balance', 'have']);
  expect(await settingsLayouts(page)).toEqual({});
});

test('the handle moves a card with the arrow keys and keeps focus', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await page.getByRole('button', { name: 'Arrange Home' }).click();
  await expect(page.getByRole('heading', { name: 'Arranging Home' })).toBeFocused();
  const handle = page.getByRole('button', { name: 'Move This month', exact: true });
  await handle.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(handle).toBeFocused();
  await expect(page.getByRole('status').filter({ hasText: 'This month: position 3 of 5.' })).toHaveCount(1);
  await page.keyboard.press('ArrowUp');
  await page.getByRole('button', { name: 'Done' }).click();
  expect(await order(page)).toEqual(['kpis', 'glance', 'flow', 'balance', 'have']);
});

test('a card can be dragged by its handle onto another card\'s place', async ({ page }) => {
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await page.getByRole('button', { name: 'Arrange Home' }).click();
  const from = (await page.getByRole('button', { name: 'Move Totals for the period', exact: true }).boundingBox())!;
  const to = (await tile(page, 'This month').boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(from.x + (to.x + 20 - from.x) * i / 8, from.y + (to.y + 20 - from.y) * i / 8);
  await page.mouse.up();
  await page.getByRole('button', { name: 'Done' }).click();
  expect(await order(page)).toEqual(['kpis', 'glance', 'flow', 'balance', 'have']);
});

test('width: half cards pair up on a computer; phones follow the same order in one column', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Arrange Home' }).click();
  await page.getByRole('button', { name: 'Full width' }).first().click();
  await expect(page.getByRole('button', { name: 'Full width' }).first()).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Move What you have earlier' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  const [glance, kpis] = [(await page.locator('#home-glance').boundingBox())!, (await page.locator('#home-kpis').boundingBox())!];
  expect(kpis.y).toBeGreaterThan(glance.y + glance.height);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Full width' })).toHaveCount(0);
  expect(await order(page)).toEqual(['glance', 'kpis', 'flow', 'have', 'balance']);
  await page.getByRole('button', { name: 'Arrange Home' }).click();
  await expect(page.getByRole('button', { name: 'Full width' })).toHaveCount(0);
});

test('on a computer, dropping a card on the far half of its neighbour puts it after (side by side)', async ({ page }, info) => {
  // Bug found 7 Nov 2026: Arrange's wrapper has no width of its own, so every card counted as full width and a card
  // dropped beside another never moved. This Totals (right) ← This month (left) drop only works when sides count.
  test.skip(info.project.name !== 'desktop');
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Arrange Home' }).click();
  const from = (await page.locator('[data-handle="home-glance"]').boundingBox())!;
  const held = (await page.locator('[data-tile="home-glance"]').boundingBox())!;
  const to = (await page.locator('[data-tile="home-kpis"]').boundingBox())!;
  expect(to.x).toBeGreaterThan(held.x);
  const grip = { x: from.x + from.width / 2 - held.x, y: from.y + from.height / 2 - held.y };
  const end = { x: to.x + to.width * 0.75 - held.width / 2 + grip.x, y: to.y + grip.y };
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(from.x + (end.x - from.x) * i / 8, from.y + (end.y - from.y) * i / 8);
  await page.mouse.up();
  await page.getByRole('button', { name: 'Done' }).click();
  expect(await order(page)).toEqual(['kpis', 'glance', 'flow', 'balance', 'have']);
});

// Spending and Budget (plans/arrange-spending-budget.md): the same Arrange, each page with its own saved layout.
const pageOrder = (page: Page, prefix: string) => page.locator(`.tile > [id^="${prefix}-"]`).evaluateAll((els, p) => els.map((e) => e.id.replace(`${p}-`, '')), prefix);
const savedPage = async (page: Page, id: string) => (((await storedDoc(page, 'settings')) as { layouts?: Record<string, { cards: { id: string; hidden: boolean }[] }> } | undefined)
  ?.layouts?.[id]?.cards ?? []).map((c) => c.id.replace(`${id}-`, '') + (c.hidden ? ' (hidden)' : ''));

test('arrange Spending and Budget: each keeps its own layout, and the fixed lines stay on top', async ({ page }) => {
  const errors = watchErrors(page);
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.goto('/');
  await openPlace(page, 'Spending');
  expect(await pageOrder(page, 'spending')).toEqual(['went', 'from', 'moves', 'places']);
  await page.getByRole('button', { name: 'Arrange Spending' }).click();
  await expect(page.getByRole('heading', { name: 'Arranging Spending' })).toBeFocused();
  expect(await seriousA11yProblems(page)).toEqual([]);
  await page.getByRole('button', { name: 'Hide Where it came from' }).click();
  await page.getByRole('button', { name: 'Move Top places earlier' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText('Spending arranged')).toBeVisible();
  expect(await pageOrder(page, 'spending')).toEqual(['went', 'places', 'moves']);
  await expect(page.getByText('1 card hidden')).toBeVisible();
  await expect.poll(() => savedPage(page, 'spending')).toEqual(['went', 'from (hidden)', 'places', 'moves']);

  await openPlace(page, 'Budget');
  await expect(page.getByLabel('Your month starts on day')).toBeVisible();
  expect(await pageOrder(page, 'budget')).toEqual(['pace', 'bills', 'limits']);
  await page.getByRole('button', { name: 'Arrange Budget' }).click();
  await page.getByRole('button', { name: 'Move Limits, month by month earlier' }).click();
  await page.getByRole('button', { name: 'Move Limits, month by month earlier' }).click();
  await page.getByRole('button', { name: 'Done' }).click();
  expect(await pageOrder(page, 'budget')).toEqual(['limits', 'pace', 'bills']);
  await expect(page.getByLabel('Your month starts on day')).toBeVisible();
  await expect.poll(() => savedPage(page, 'budget')).toEqual(['limits', 'pace', 'bills']);
  // Each page has its own layout: Spending and Home are as they were.
  expect(await savedPage(page, 'spending')).toEqual(['went', 'from (hidden)', 'places', 'moves']);
  expect(await savedPage(page, 'home')).toEqual([]);

  await page.getByRole('button', { name: 'Undo' }).click();
  expect(await pageOrder(page, 'budget')).toEqual(['pace', 'bills', 'limits']);
  expect(errors).toEqual([]);
});

test('saved Spending and Budget layouts are used when the data loads', async ({ page }) => {
  const data = sampleData();
  const place = (id: string, hidden = false) => ({ id, width: 'half' as const, hidden });
  data.settings.layouts = {
    spending: { cards: [place('spending-places'), place('spending-went'), place('spending-from', true), place('spending-moves')] },
    budget: { cards: [place('budget-bills'), place('budget-pace', true), place('budget-limits')] },
  };
  await fakeRuntime(page, { userId: 'u_test', data });
  await page.goto('/');
  await openPlace(page, 'Spending');
  expect(await pageOrder(page, 'spending')).toEqual(['places', 'went', 'moves']);
  await openPlace(page, 'Budget');
  expect(await pageOrder(page, 'budget')).toEqual(['bills', 'limits']);
  await expect(page.getByText('1 card hidden')).toBeVisible();
});

test('Spending\'s two cards start side by side on a computer', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop');
  await fakeRuntime(page, { userId: 'u_test', data: sampleData() });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await openPlace(page, 'Spending');
  const [went, from] = [(await page.locator('#spending-went').boundingBox())!, (await page.locator('#spending-from').boundingBox())!];
  expect(Math.abs(went.y - from.y)).toBeLessThan(2);
  expect(from.x).toBeGreaterThan(went.x + went.width);
});

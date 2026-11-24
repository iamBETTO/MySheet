// Shared helpers for screen tests: a pretend Claude viewer, error watching and accessibility checks.
import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { AppData } from '../../src/model/types';

const AXE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');

/** The store documents for some data, laid out the way the repository saves them. */
export function docsFor(data: AppData, userId = 'u_test'): Record<string, unknown> {
  const docs: Record<string, unknown> = { settings: data.settings, budgets: data.budgets, imports: data.imports, ledger: { months: Object.keys(data.months).sort() } };
  for (const n of ['accounts', 'categories', 'rules', 'holdings', 'notes'] as const) docs[n] = { items: data[n] };
  for (const [k, m] of Object.entries(data.months)) docs[`ledger/months/${k}`] = m;
  return Object.fromEntries(Object.entries(docs).map(([k, v]) => [`data/users/${userId}/${k}`, v]));
}

/**
 * Pretends to be the Claude viewer: an in-memory store (optionally filled with `data`), a signed-in or signed-out user,
 * and file saving. What the page saved is readable as window.__docs (store) and window.__saved (offered files).
 */
export async function fakeRuntime(page: Page, opts: { userId: string | null; downloads?: 'ok' | 'declined'; data?: AppData; failWrites?: boolean }) {
  const seed = opts.data && opts.userId ? docsFor(opts.data, opts.userId) : {};
  await page.addInitScript(({ userId, downloads, seed, failWrites }) => {
    const w = window as unknown as Record<string, unknown>;
    const docs = (w.__docs as Map<string, Record<string, unknown>>) ?? new Map<string, Record<string, unknown>>(Object.entries(seed) as [string, Record<string, unknown>][]);
    const saved: { filename: string; data: string }[] = [];
    w.__docs = docs; w.__saved = saved;
    const ref = (path: string) => ({
      id: path.split('/').pop(), path,
      get: async () => ({ id: path, exists: docs.has(path), data: () => structuredClone(docs.get(path)), metadata: { fromCache: false, hasPendingWrites: false } }),
      set: async (d: Record<string, unknown>) => { if (failWrites) throw Object.assign(new Error('offline'), { code: 'unavailable' }); docs.set(path, JSON.parse(JSON.stringify(d))); },
      update: async (d: Record<string, unknown>) => { docs.set(path, { ...docs.get(path), ...d }); },
      delete: async () => { docs.delete(path); },
      onSnapshot: () => () => {},
    });
    const save = async (r: { filename: string; data: string }) => {
      if (downloads === 'declined') throw Object.assign(new Error('declined'), { code: 'declined' });
      saved.push({ filename: r.filename, data: String(r.data) });
      return { status: 'saved' };
    };
    w.claude = {
      use: async (name: string) => name === 'db' ? { doc: ref, collection: () => ({}) }
        : name === 'user' ? { id: async () => userId }
        : name === 'downloads' ? { save }
        : null,
    };
  }, { userId: opts.userId, downloads: opts.downloads ?? 'ok', seed, failWrites: opts.failWrites ?? false });
}

export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return errors;
}

export async function seriousA11yProblems(page: Page): Promise<string[]> {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    // Let opening animations (sheets fade in) finish, so contrast is measured on the settled screen.
    await Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().iterations !== Infinity).map((a) => a.finished.catch(() => undefined)));
    const axe = (window as unknown as { axe: { run: (o: unknown) => Promise<{ violations: { id: string; impact: string; nodes: { target: string[] }[] }[] }> } }).axe;
    const r = await axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id} ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(', ')}`);
  });
}

/** Opens one of the five places from the bar or rail. */
export async function openPlace(page: Page, name: 'Home' | 'Spending' | 'Budget' | 'Calendar' | 'Activity') {
  await page.getByRole('navigation', { name: 'MySheet sections' }).getByRole('button', { name }).click();
  // v1's titles: Home is "Treasury", the other places are named after themselves.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name === 'Home' ? 'Treasury' : name);
}

export async function storedDoc(page: Page, path: string): Promise<unknown> {
  return page.evaluate((p) => (window as unknown as { __docs: Map<string, unknown> }).__docs.get(`data/users/u_test/${p}`), path);
}

/** Today for the app, fixed so periods are the same on every run. */
export const TODAY = new Date('2026-10-15T09:00:00');

/** Picks a period in v1's period panel (a button, or a month from "Month…"), then closes it with Done. */
export async function choosePeriod(page: Page, name: string) {
  await page.locator('#period-btn').click();
  const panel = page.locator('#period-sheet');
  const button = panel.getByRole('button', { name, exact: true });
  if (await button.count()) await button.click();
  else await panel.getByRole('combobox', { name: 'Pick a month' }).selectOption({ label: name });
  await panel.getByRole('button', { name: 'Done' }).click();
  await expect(panel).toHaveCount(0);
}

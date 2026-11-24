// Reads and writes AppData in the user's private store. Layout (approved data model, "How it's stored"):
//   settings, budgets, imports        one document each
//   accounts, categories, rules,      one document each, { items: [...] }
//   holdings, notes
//   ledger                            { months: ['2026-09', '2026-10', ...] }, the index of month documents
//   ledger/months/<YYYY-MM>           one Month per document
import { migrateSettings } from '../model/migrate';
import type { Store } from './store';
import { emptyData, type AppData, type Month, type MonthKey } from '../model/types';
import { asAppData, validateAppData } from '../model/validate';
import { salvage, type SetAside } from '../model/salvage';

export const LIST_DOCS = ['accounts', 'categories', 'rules', 'holdings', 'notes'] as const;
export type ListName = (typeof LIST_DOCS)[number];

const monthPath = (m: MonthKey) => `ledger/months/${m}`;

async function read(store: Store, path: string): Promise<Record<string, unknown> | undefined> {
  const snap = await store.doc(path).get();
  return snap.exists ? snap.data() : undefined;
}

/** Loads everything. Missing documents fall back to empty defaults; data that fails validation throws. */
export async function loadAll(store: Store): Promise<AppData> {
  return (await load(store, false)).data;
}

/**
 * Loads everything, setting aside any record that fails validation instead of refusing all of it (6 Nov 2026).
 * A copy of each set-aside record is kept in the store's "setaside" document, so nothing is lost; the record itself
 * stays where it was until that part of the data is next saved. Throws only when nothing usable can be told apart.
 */
export async function loadKeeping(store: Store): Promise<Loaded> {
  return load(store, true);
}

export interface Loaded {
  data: AppData;
  setAside: SetAside[];
  /** False when the copies of set-aside records couldn't be saved (they are still in memory and on screen). */
  copied: boolean;
}

async function load(store: Store, keep: boolean): Promise<Loaded> {
  const base = emptyData();
  const [settings, budgets, imports, ledger, ...lists] = await Promise.all([
    read(store, 'settings'), read(store, 'budgets'), read(store, 'imports'), read(store, 'ledger'),
    ...LIST_DOCS.map((n) => read(store, n)),
  ]);
  const monthKeys = Array.isArray(ledger?.months) ? (ledger.months as MonthKey[]) : [];
  const months = await Promise.all(monthKeys.map((m) => read(store, monthPath(m))));
  // Older saved settings are upgraded to the current format (CLAUDE.md rule 17) and written back once they're valid.
  const upgraded = settings ? migrateSettings(settings) : base.settings;
  const data: Record<string, unknown> = {
    settings: upgraded,
    budgets: budgets ?? base.budgets,
    imports: imports ?? base.imports,
    months: Object.fromEntries(monthKeys.flatMap((m, i) => (months[i] ? [[m, months[i]]] : []))),
  };
  LIST_DOCS.forEach((n, i) => { data[n] = (lists[i]?.items as unknown[] | undefined) ?? []; });
  let setAside: SetAside[] = [];
  let copied = true;
  let valid: AppData;
  if (!keep || !validateAppData(data).length) valid = asAppData(data);
  else {
    const kept = salvage(data);
    if (!kept) valid = asAppData(data); // throws with the first problems
    else {
      valid = asAppData(kept.data);
      setAside = kept.setAside;
      try { await keepCopies(store, setAside); } catch { copied = false; /* reported by the caller through `copied` */ }
    }
  }
  if (settings && upgraded !== settings && !setAside.some((s) => s.where.startsWith('settings'))) {
    try {
      await saveSettings(store, valid);
    } catch {
      // Harmless: the data in use is already upgraded, and the next change to settings saves the new format.
    }
  }
  return { data: valid, setAside, copied };
}

/** Adds set-aside records to the "setaside" document (once each), with the day they were found. */
async function keepCopies(store: Store, items: SetAside[]): Promise<void> {
  const doc = await read(store, 'setaside');
  const known = Array.isArray(doc?.items) ? (doc.items as (SetAside & { found: string })[]) : [];
  const key = (s: SetAside) => `${s.where} ${JSON.stringify(s.record)}`;
  const seen = new Set(known.map(key));
  const added = items.filter((s) => !seen.has(key(s))).map((s) => ({ ...s, found: new Date().toISOString() }));
  if (added.length) await store.doc('setaside').set({ items: [...known, ...added] });
}

export async function saveSettings(store: Store, data: AppData): Promise<void> {
  await store.doc('settings').set({ ...data.settings });
}

export async function saveList(store: Store, name: ListName, data: AppData): Promise<void> {
  await store.doc(name).set({ items: data[name] });
}

export async function saveBudgets(store: Store, data: AppData): Promise<void> {
  await store.doc('budgets').set({ ...data.budgets });
}

export async function saveImports(store: Store, data: AppData): Promise<void> {
  await store.doc('imports').set({ ...data.imports });
}

/** Saves one month and keeps the index of months up to date. */
export async function saveMonth(store: Store, month: Month, data: AppData): Promise<void> {
  await store.doc(monthPath(month.month)).set({ ...month });
  await store.doc('ledger').set({ months: Object.keys(data.months).sort() });
}

/** Replaces everything with `data` (restore). Months not in `data` are deleted. Writes one document at a time. */
export async function replaceAll(store: Store, data: AppData): Promise<void> {
  const old = await read(store, 'ledger');
  const oldMonths = Array.isArray(old?.months) ? (old.months as MonthKey[]) : [];
  await saveSettings(store, data);
  for (const n of LIST_DOCS) await saveList(store, n, data);
  await saveBudgets(store, data);
  await saveImports(store, data);
  for (const m of Object.values(data.months)) await store.doc(monthPath(m.month)).set({ ...m });
  await store.doc('ledger').set({ months: Object.keys(data.months).sort() });
  for (const m of oldMonths) if (!data.months[m]) await store.doc(monthPath(m)).delete();
}

/** Names one saved document, so an action saves only what it changed. */
export type DocKey = 'settings' | 'budgets' | 'imports' | ListName | `month:${MonthKey}`;

/** Saves the named documents from `data`. A month missing from `data` is deleted; the month index follows. */
export async function saveDocs(store: Store, data: AppData, keys: readonly DocKey[]): Promise<void> {
  let monthsChanged = false;
  for (const key of new Set(keys)) {
    if (key === 'settings') await saveSettings(store, data);
    else if (key === 'budgets') await saveBudgets(store, data);
    else if (key === 'imports') await saveImports(store, data);
    else if (key.startsWith('month:')) {
      const m = key.slice(6);
      const month = data.months[m];
      if (month) await store.doc(monthPath(m)).set({ ...month });
      else await store.doc(monthPath(m)).delete();
      monthsChanged = true;
    } else await saveList(store, key as ListName, data);
  }
  if (monthsChanged) await store.doc('ledger').set({ months: Object.keys(data.months).sort() });
}

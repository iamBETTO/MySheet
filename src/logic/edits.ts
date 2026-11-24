// Changes to the person's data as plain functions: data in, new data out (the input is never changed),
// plus the documents that need saving. The state layer applies them and keeps them undoable.
import { newId } from '../model/ids';
import type { Account, AppData, BudgetLimit, CalendarNote, Category, Holding, Id, IsoDate, MonthKey, Rule, Transaction } from '../model/types';
import type { DocKey } from '../storage/repository';

export interface Edit {
  data: AppData;
  docs: DocKey[];
}

export type TransactionPatch = Partial<Pick<Transaction, 'categoryId' | 'payee' | 'note'>>;

/** Applies the same change to several transactions (one or many). */
export function updateTransactions(data: AppData, ids: readonly Id[], patch: TransactionPatch): Edit {
  const wanted = new Set(ids);
  const months = { ...data.months };
  const docs: DocKey[] = [];
  for (const [key, month] of Object.entries(data.months)) {
    if (!month.transactions.some((t) => wanted.has(t.id))) continue;
    months[key] = { ...month, transactions: month.transactions.map((t) => (wanted.has(t.id) ? { ...t, ...patch } : t)) };
    docs.push(`month:${key}` as DocKey);
  }
  return { data: { ...data, months }, docs };
}

export function findTransaction(data: AppData, id: Id): Transaction | undefined {
  for (const m of Object.values(data.months)) {
    const t = m.transactions.find((x) => x.id === id);
    if (t) return t;
  }
  return undefined;
}

export function addCategory(data: AppData, fields: Omit<Category, 'id' | 'archived'>): Edit & { id: Id } {
  const id = newId();
  return { id, data: { ...data, categories: [...data.categories, { ...fields, id, archived: false }] }, docs: ['categories'] };
}

export function updateCategory(data: AppData, id: Id, patch: Partial<Omit<Category, 'id'>>): Edit {
  // A category can't be its own parent, and sub-categories stay one level deep.
  const safe = { ...patch };
  if (safe.parentId === id) safe.parentId = null;
  const categories = data.categories.map((c) => (c.id === id ? { ...c, ...safe } : c));
  return { data: { ...data, categories }, docs: ['categories'] };
}

export function addAccount(data: AppData, fields: Omit<Account, 'id' | 'closed'>): Edit & { id: Id } {
  const id = newId();
  return { id, data: { ...data, accounts: [...data.accounts, { ...fields, id, closed: false }] }, docs: ['accounts'] };
}

export function updateAccount(data: AppData, id: Id, patch: Partial<Omit<Account, 'id'>>): Edit {
  return { data: { ...data, accounts: data.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)) }, docs: ['accounts'] };
}

/** Sets (or, with null, removes) the usual monthly limit for a category; categoryId null = all spending. */
export function setLimit(data: AppData, categoryId: Id | null, monthly: number | null): Edit {
  const rest = data.budgets.limits.filter((l) => l.categoryId !== categoryId);
  const limits: BudgetLimit[] = monthly === null ? rest : [...rest, { categoryId, monthly }];
  return { data: { ...data, budgets: { ...data.budgets, limits } }, docs: ['budgets'] };
}

/** Sets (or removes) a limit for one month only. */
export function setMonthLimit(data: AppData, month: MonthKey, categoryId: Id | null, monthly: number | null): Edit {
  const rest = data.budgets.overrides.filter((o) => !(o.month === month && o.categoryId === categoryId));
  const overrides = monthly === null ? rest : [...rest, { month, categoryId, monthly }];
  return { data: { ...data, budgets: { ...data.budgets, overrides } }, docs: ['budgets'] };
}

export function setBudgetMonthStartDay(data: AppData, day: number): Edit {
  return { data: { ...data, settings: { ...data.settings, budgetMonthStartDay: Math.min(28, Math.max(1, Math.round(day))) } }, docs: ['settings'] };
}

export function setStartHidden(data: AppData, hidden: boolean): Edit {
  return { data: { ...data, settings: { ...data.settings, startWithAmountsHidden: hidden } }, docs: ['settings'] };
}

/** Adds a rule at the end of the list (or updates the one with the same id). */
export function saveRule(data: AppData, rule: Omit<Rule, 'id' | 'priority'> & { id?: Id }): Edit & { id: Id } {
  const existing = rule.id ? data.rules.find((r) => r.id === rule.id) : undefined;
  if (existing) {
    return { id: existing.id, data: { ...data, rules: data.rules.map((r) => (r.id === existing.id ? { ...r, match: rule.match, set: rule.set } : r)) }, docs: ['rules'] };
  }
  const id = newId();
  const priority = data.rules.reduce((n, r) => Math.max(n, r.priority), 0) + 1;
  return { id, data: { ...data, rules: [...data.rules, { id, priority, match: rule.match, set: rule.set }] }, docs: ['rules'] };
}

export function deleteRule(data: AppData, id: Id): Edit {
  return { data: { ...data, rules: data.rules.filter((r) => r.id !== id) }, docs: ['rules'] };
}

/** Adds a calendar note, or updates the one with the same id. Start and end are put in order. */
export function saveNote(data: AppData, note: Omit<CalendarNote, 'id'> & { id?: Id }): Edit & { id: Id } {
  const [start, end] = note.start <= note.end ? [note.start, note.end] : [note.end, note.start];
  const text = note.text.trim();
  if (note.id && data.notes.some((n) => n.id === note.id)) {
    return { id: note.id, data: { ...data, notes: data.notes.map((n) => (n.id === note.id ? { ...n, start, end, text, color: note.color } : n)) }, docs: ['notes'] };
  }
  const id = newId();
  return { id, data: { ...data, notes: [...data.notes, { id, start, end, text, color: note.color }] }, docs: ['notes'] };
}

export function deleteNote(data: AppData, id: Id): Edit {
  return { data: { ...data, notes: data.notes.filter((n) => n.id !== id) }, docs: ['notes'] };
}

/** Adds or updates something you own or owe; a new value is added to its history (one value per day). */
export function saveHolding(data: AppData, h: { id?: Id; name: string; kind: Holding['kind']; inNetWorth: boolean; value: number | null; date: IsoDate }): Edit & { id: Id } {
  const id = h.id && data.holdings.some((x) => x.id === h.id) ? h.id : newId();
  const existing = data.holdings.find((x) => x.id === id);
  let valuations = existing?.valuations ?? [];
  if (h.value !== null) valuations = [...valuations.filter((v) => v.date !== h.date), { date: h.date, value: h.value, units: null, unitPrice: null }].sort((a, b) => a.date.localeCompare(b.date));
  const next: Holding = { id, name: h.name.trim(), kind: h.kind, currency: existing?.currency ?? data.settings.currency, inNetWorth: h.inNetWorth, valuations };
  const holdings = existing ? data.holdings.map((x) => (x.id === id ? next : x)) : [...data.holdings, next];
  return { id, data: { ...data, holdings }, docs: ['holdings'] };
}

export function deleteHolding(data: AppData, id: Id): Edit {
  return { data: { ...data, holdings: data.holdings.filter((h) => h.id !== id) }, docs: ['holdings'] };
}

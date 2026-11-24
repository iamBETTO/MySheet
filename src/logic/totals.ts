// Money maths over transactions. Plain functions: data in, numbers out (CLAUDE.md rule 8).
// Moves between your own accounts (transfer categories) are never income or spending.
import type { AppData, Id, IsoDate, MonthKey, Transaction } from '../model/types';
import { indexCategories, type CategoryIndex } from './categories';
import { displayName, similarKey } from './names';

/** An account's balance at the end of a day (default: everything). */
export function accountBalance(data: AppData, accountId: Id, upTo?: IsoDate): number {
  const a = data.accounts.find((x) => x.id === accountId);
  if (!a) return 0;
  let sum = a.openingBalance;
  for (const m of Object.values(data.months)) for (const t of m.transactions) if (t.accountId === accountId && (!upTo || t.date <= upTo)) sum += t.amount;
  return sum;
}

/** The latest day any transaction is dated, or null when there are none. */
export function lastDataDay(data: AppData, accountId?: Id): IsoDate | null {
  let last: IsoDate | null = null;
  for (const m of Object.values(data.months)) for (const t of m.transactions) if ((!accountId || t.accountId === accountId) && (!last || t.date > last)) last = t.date;
  return last;
}

export function inRange(data: AppData, start: IsoDate, end: IsoDate): Transaction[] {
  const out: Transaction[] = [];
  for (const [key, m] of Object.entries(data.months)) {
    if (`${key}-31` < start || `${key}-01` > end) continue;
    for (const t of m.transactions) if (t.date >= start && t.date <= end) out.push(t);
  }
  return out;
}

export interface Flow {
  /** Income, positive. */
  in: number;
  /** Spending as a positive number (refunds reduce it). */
  out: number;
  /** Moves between own accounts, kept apart: money that came in, and money that went out. */
  movedIn: number;
  movedOut: number;
}

export function flowOf(list: readonly Transaction[], cats: CategoryIndex): Flow {
  const f: Flow = { in: 0, out: 0, movedIn: 0, movedOut: 0 };
  for (const t of list) {
    const k = cats.kindOf(t);
    if (k === 'transfer') { if (t.amount > 0) f.movedIn += t.amount; else f.movedOut -= t.amount; }
    else if (k === 'income') f.in += t.amount;
    else f.out -= t.amount;
  }
  return f;
}

export interface MonthFlow extends Flow { month: MonthKey }

/** In and out for each month in the list, including months with nothing. */
export function flowByMonth(data: AppData, months: readonly MonthKey[]): MonthFlow[] {
  const cats = indexCategories(data);
  return months.map((month) => ({ month, ...flowOf(data.months[month]?.transactions ?? [], cats) }));
}

export interface CategoryTotal {
  /** Top category id (sub-categories roll up into it); null = no category. */
  id: Id | null;
  name: string;
  /** Spending positive for spending categories, money in positive for income. */
  total: number;
  count: number;
  /** Totals of sub-categories inside it, largest first. */
  parts: { id: Id; name: string; total: number }[];
}

/** Totals per top category for one kind, largest first. */
export function byCategory(list: readonly Transaction[], data: AppData, kind: 'spending' | 'income' | 'transfer'): CategoryTotal[] {
  const cats = indexCategories(data);
  const tops = new Map<string, CategoryTotal>();
  for (const t of list) {
    if (cats.kindOf(t) !== kind) continue;
    const top = cats.topOf(t.categoryId);
    const key = top ?? '';
    const value = kind === 'spending' ? -t.amount : t.amount;
    const row = tops.get(key) ?? { id: top, name: cats.name(top), total: 0, count: 0, parts: [] };
    row.total += value;
    row.count++;
    if (t.categoryId && t.categoryId !== top) {
      const part = row.parts.find((p) => p.id === t.categoryId) ?? (row.parts.push({ id: t.categoryId, name: cats.name(t.categoryId), total: 0 }), row.parts.at(-1)!);
      part.total += value;
    }
    tops.set(key, row);
  }
  const rows = [...tops.values()];
  for (const r of rows) r.parts.sort((a, b) => b.total - a.total);
  return rows.sort((a, b) => b.total - a.total);
}

/** `key` identifies the place for filtering (see placeKey). */
export interface Place { key: string; name: string; count: number; total: number; /** The type most of its payments have. */ categoryId: Id | null }

export function placeKey(t: Pick<Transaction, 'payee' | 'description'>): string {
  return t.payee ? `p:${t.payee}` : `d:${similarKey(t.description)}`;
}

/**
 * Where spending went, by place, largest first. A place is the name the person gave, or the bank's text with lines
 * that differ only in numbers grouped together; it's shown by its most frequent name.
 */
export function topPlaces(list: readonly Transaction[], data: AppData, limit = 20, onlyAccounts?: ReadonlySet<Id>): Place[] {
  const cats = indexCategories(data);
  const places = new Map<string, Omit<Place, 'categoryId'> & { names: Map<string, number>; types: Map<Id | null, number> }>();
  for (const t of list) {
    if (cats.kindOf(t) !== 'spending' || t.amount >= 0 || (onlyAccounts && !onlyAccounts.has(t.accountId))) continue;
    const key = placeKey(t);
    const p = places.get(key) ?? { key, name: '', count: 0, total: 0, names: new Map<string, number>(), types: new Map<Id | null, number>() };
    p.count++;
    p.total -= t.amount;
    const shown = displayName(t);
    p.names.set(shown, (p.names.get(shown) ?? 0) + 1);
    p.types.set(t.categoryId, (p.types.get(t.categoryId) ?? 0) + 1);
    places.set(key, p);
  }
  const most = <K,>(m: Map<K, number>) => [...m].sort((a, b) => b[1] - a[1])[0]![0];
  return [...places.values()]
    .map(({ names, types, ...p }) => ({ ...p, name: most(names), categoryId: most(types) }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/** Spending per day (positive), for the calendar. */
export function spendingByDay(list: readonly Transaction[], data: AppData): Map<IsoDate, number> {
  const cats = indexCategories(data);
  const days = new Map<IsoDate, number>();
  for (const t of list) if (cats.kindOf(t) === 'spending') days.set(t.date, (days.get(t.date) ?? 0) - t.amount);
  return days;
}

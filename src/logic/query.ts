// Finding transactions: by dates, account, category, kind and free text.
import type { AppData, CategoryKind, Id, IsoDate, Transaction } from '../model/types';
import { indexCategories } from './categories';
import { placeKey } from './totals';

export interface TxQuery {
  start?: IsoDate;
  end?: IsoDate;
  accountId?: Id | null;
  /** A category id (sub-categories included), 'none' for transactions without one, or null for all. */
  categoryId?: Id | 'none' | null;
  kind?: CategoryKind | null;
  /** Only one place (a key from placeKey). */
  place?: string | null;
  /** Free text: matches description, payee, note, category name or the amount. */
  text?: string;
}

/** Matching transactions, newest first. */
export function findTransactions(data: AppData, q: TxQuery): Transaction[] {
  const cats = indexCategories(data);
  const family = q.categoryId && q.categoryId !== 'none' ? cats.family(q.categoryId) : null;
  const words = normalise(q.text ?? '').split(' ').filter(Boolean);
  const out: Transaction[] = [];
  for (const [key, month] of Object.entries(data.months)) {
    if (q.start && `${key}-31` < q.start) continue;
    if (q.end && `${key}-01` > q.end) continue;
    for (const t of month.transactions) {
      if (q.start && t.date < q.start) continue;
      if (q.end && t.date > q.end) continue;
      if (q.accountId && t.accountId !== q.accountId) continue;
      if (q.categoryId === 'none' && t.categoryId !== null) continue;
      if (family && !(t.categoryId && family.has(t.categoryId))) continue;
      if (q.kind && cats.kindOf(t) !== q.kind) continue;
      if (q.place && placeKey(t) !== q.place) continue;
      if (words.length) {
        const hay = normalise([t.description, t.payee ?? '', t.note ?? '', cats.name(t.categoryId), (Math.abs(t.amount) / 100).toFixed(2)].join(' '));
        if (!words.every((w) => hay.includes(w))) continue;
      }
      out.push(t);
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);
}

/** Lower case, no direction marks or punctuation differences, single spaces. */
export function normalise(t: string): string {
  return t.toLowerCase().replace(/[‎‏‪-‮]/g, '').replace(/[״"׳'`]/g, '').replace(/\s+/g, ' ').trim();
}

export function sumOf(list: readonly Transaction[]): number {
  return list.reduce((n, t) => n + t.amount, 0);
}

/** Groups newest-first transactions by day, keeping the order. */
export function byDay(list: readonly Transaction[]): { date: IsoDate; items: Transaction[] }[] {
  const out: { date: IsoDate; items: Transaction[] }[] = [];
  for (const t of list) {
    const last = out.at(-1);
    if (last && last.date === t.date) last.items.push(t);
    else out.push({ date: t.date, items: [t] });
  }
  return out;
}

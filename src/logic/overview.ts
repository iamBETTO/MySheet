// The numbers behind Home and Spending, as v1 shows them (V1_REFERENCE.md). Plain functions (CLAUDE.md rule 8).
import type { AppData, Id, IsoDate, MonthKey, Transaction } from '../model/types';
import { indexCategories, type CategoryIndex } from './categories';
import { isCoveredCardCharge } from './cardCharges';
import { byCategory, flowOf, inRange } from './totals';
import { bankBalance } from './worth';
import { monthsBetween, type Range } from './periods';

export interface PeriodSummary {
  in: number; out: number; net: number;
  /** Per month: the totals over the months of the period that have data (v1's averages). */
  months: number; avgIn: number; avgOut: number; avgNet: number;
  /** Bank balance at the period's end (or the as-of day, when the period is still running). */
  endBalance: number;
  /** Own money moved, in minus out: "Not counted above". */
  moved: number;
}

/** Whether anything has been imported or added yet: before that, the screens show their empty cards (plans/empty-screens.md). */
export function hasTransactions(data: AppData): boolean {
  return Object.values(data.months).some((m) => m.transactions.length > 0);
}

/** Months of a range that have data, so a period that started before the first import isn't diluted. */
export function monthsWithData(data: AppData, range: Range): MonthKey[] {
  return range.months.filter((m) => data.months[m]?.transactions.length);
}

/** The lines a person thinks of: without the bank's charges for card purchases that are already listed (v1). */
export function withoutCardCharges(list: readonly Transaction[], cats: CategoryIndex): Transaction[] {
  return list.filter((t) => !isCoveredCardCharge(t, cats));
}

export function periodSummary(data: AppData, range: Range, asOf: IsoDate): PeriodSummary {
  const cats = indexCategories(data);
  const f = flowOf(withoutCardCharges(inRange(data, range.start, range.end), cats), cats);
  const months = Math.max(1, monthsWithData(data, range).length);
  const net = f.in - f.out;
  return {
    in: f.in, out: f.out, net, months,
    avgIn: Math.round(f.in / months), avgOut: Math.round(f.out / months), avgNet: Math.round(net / months),
    endBalance: bankBalance(data, range.end < asOf ? range.end : asOf), moved: f.movedIn - f.movedOut,
  };
}

export interface HistoryMonth { month: MonthKey; in: number; out: number; balance: number }

/** Every month from the first with data to the as-of month: money in, out, and the bank balance at its end. */
export function history(data: AppData, asOf: IsoDate): HistoryMonth[] {
  const keys = Object.keys(data.months).filter((k) => k <= asOf.slice(0, 7)).sort();
  if (!keys.length) return [];
  const cats = indexCategories(data);
  return monthsBetween(keys[0]!, keys.at(-1)!).map((month) => {
    const f = flowOf(data.months[month]?.transactions ?? [], cats);
    const end = month === asOf.slice(0, 7) ? asOf : `${month}-31`;
    return { month, in: f.in, out: f.out, balance: bankBalance(data, end) };
  });
}

export interface TypeTotal { key: string; id: Id | null; name: string; amount: number; perMonth: number; color: string }

/**
 * Totals per top type for one kind, biggest first (v1 "Where it went" and friends). Colour as v1: the type's own colour,
 * else grey for types paid mostly from the bank and red (spending) or blue (money in) for the rest.
 */
export function typeTotals(data: AppData, lines: readonly Transaction[], kind: 'spending' | 'income' | 'transfer', months: number): TypeTotal[] {
  const cats = indexCategories(data);
  const list = withoutCardCharges(lines, cats);
  const cards = new Set(data.accounts.filter((a) => a.kind === 'card').map((a) => a.id));
  const onCard = new Map<string, number>(), all = new Map<string, number>();
  for (const t of list) {
    if (cats.kindOf(t) !== kind) continue;
    const k = cats.topOf(t.categoryId) ?? '';
    all.set(k, (all.get(k) ?? 0) + Math.abs(t.amount));
    if (cards.has(t.accountId)) onCard.set(k, (onCard.get(k) ?? 0) + Math.abs(t.amount));
  }
  return byCategory(list, data, kind).map((c) => {
    const k = c.id ?? '';
    const own = c.id ? cats.byId.get(c.id)?.color : null;
    const color = own ?? (kind === 'transfer' ? 'var(--chart-muted)' : kind === 'income' ? 'var(--chart-in)' : cards.size && (onCard.get(k) ?? 0) * 2 < (all.get(k) ?? 0) ? 'var(--chart-muted)' : 'var(--chart-out)');
    const amount = kind === 'transfer' ? Math.abs(c.total) : c.total;
    return { key: c.id ?? 'none', id: c.id, name: c.name, amount, perMonth: Math.round(amount / Math.max(1, months)), color };
  }).sort((a, b) => (kind === 'transfer' ? Math.abs(b.amount) - Math.abs(a.amount) : b.amount - a.amount));
}

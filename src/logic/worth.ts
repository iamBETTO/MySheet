// What you have: account balances and holdings, at any day. Plain functions (CLAUDE.md rule 8).
import type { Account, AppData, Holding, IsoDate, MonthKey } from '../model/types';
import { indexCategories } from './categories';
import { lastDayOf } from './periods';

/**
 * Whether an account's balance means something you have or owe. A card paid in full from the bank, where only
 * purchases are imported, has a running total that isn't a balance, so it's left out until its payments are in it too.
 */
export function countsInWorth(data: AppData, a: Account): boolean {
  if (a.kind !== 'card') return true;
  const cats = indexCategories(data);
  for (const m of Object.values(data.months)) for (const t of m.transactions) if (t.accountId === a.id && t.amount > 0 && cats.kindOf(t) === 'transfer') return true;
  return false;
}

/** The latest valuation on or before a day, or null. */
export function valueOn(h: Holding, day: IsoDate): number | null {
  let best: { date: IsoDate; value: number } | null = null;
  for (const v of h.valuations) if (v.date <= day && (!best || v.date > best.date)) best = v;
  return best ? best.value : null;
}

export interface Worth {
  accounts: { account: Account; balance: number }[];
  holdings: { holding: Holding; value: number }[];
  total: number;
}

/** Balances and holdings at the end of a day. Debts and loans count against the total. */
export function worthOn(data: AppData, day: IsoDate): Worth {
  const included = data.accounts.filter((a) => countsInWorth(data, a));
  const sums = new Map(included.map((a) => [a.id, a.openingBalance]));
  for (const m of Object.values(data.months)) {
    if (`${m.month}-01` > day) continue;
    for (const t of m.transactions) if (t.date <= day && sums.has(t.accountId)) sums.set(t.accountId, sums.get(t.accountId)! + t.amount);
  }
  const accounts = included.map((a) => ({ account: a, balance: sums.get(a.id)! }));
  const holdings = data.holdings.filter((h) => h.inNetWorth).flatMap((h) => {
    const v = valueOn(h, day);
    return v === null ? [] : [{ holding: h, value: h.kind === 'debt' ? -Math.abs(v) : v }];
  });
  const total = accounts.reduce((n, a) => n + a.balance, 0) + holdings.reduce((n, h) => n + h.value, 0);
  return { accounts, holdings, total };
}

/** Balance of the accounts that count, at the end of each month (today for the current month). */
export function balanceByMonth(data: AppData, months: readonly MonthKey[], today: IsoDate): { month: MonthKey; balance: number }[] {
  const included = new Set(data.accounts.filter((a) => countsInWorth(data, a)).map((a) => a.id));
  let running = data.accounts.filter((a) => included.has(a.id)).reduce((n, a) => n + a.openingBalance, 0);
  const keys = Object.keys(data.months).sort();
  const perMonth = new Map<MonthKey, number>();
  for (const k of keys) perMonth.set(k, data.months[k]!.transactions.reduce((n, t) => n + (included.has(t.accountId) ? t.amount : 0), 0));
  const out: { month: MonthKey; balance: number }[] = [];
  const first = months[0];
  for (const k of keys) if (first && k < first) running += perMonth.get(k)!;
  for (const m of months) {
    running += perMonth.get(m) ?? 0;
    if (`${m}-01` > today) break;
    out.push({ month: m, balance: running });
  }
  return out;
}

export function endOfMonth(month: MonthKey): IsoDate {
  return lastDayOf(month);
}

/** The money in the accounts that count (the bank, in v1's words) at the end of a day. */
export function bankBalance(data: AppData, day: IsoDate): number {
  return worthOn(data, day).accounts.reduce((n, a) => n + a.balance, 0);
}

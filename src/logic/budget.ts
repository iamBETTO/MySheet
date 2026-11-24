// Budget maths exactly as v1 does it (V1_REFERENCE.md, Budget): budget months that start on a chosen day, this month so
// far against each limit, limits month by month over a period, regular bills and safe to spend. "Today" for all of these
// is the day the data reaches (asOfDay), as in v1. Plain functions (CLAUDE.md rule 8); messages stay calm (UX rule 5).
import type { AppData, Id, IsoDate, MonthKey, Transaction } from '../model/types';
import { indexCategories, type CategoryIndex } from './categories';
import { cardChargeTypes } from './cardCharges';
import { addMonths } from './periods';
import { inRange } from './totals';
import { bankBalance } from './worth';
import type { Language } from '../i18n/languages';
import { text } from '../i18n/text';

const DAY = 86_400_000;
const dayNumber = (iso: IsoDate) => Date.parse(`${iso}T00:00:00Z`) / DAY;
const isoOf = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);

/** The last day the data reaches (v1's "as of"), or today when there is no data. Never after today. */
export function asOfDay(data: AppData, today: IsoDate): IsoDate {
  let last = '';
  for (const m of Object.values(data.months)) for (const t of m.transactions) if (t.date > last && t.date <= today) last = t.date;
  return last || today;
}

/** The budget month a day belongs to when months start on day `start` (1–28): 'YYYY-MM' of the month it starts in. */
export function budgetMonthOf(date: IsoDate, start: number): MonthKey {
  return Number(date.slice(8, 10)) >= start ? date.slice(0, 7) : addMonths(date.slice(0, 7), -1);
}

/** First and last day of a budget month. */
export function budgetRange(month: MonthKey, start: number): [IsoDate, IsoDate] {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return [new Date(Date.UTC(y, m - 1, start)).toISOString().slice(0, 10), new Date(Date.UTC(y, m, start - 1)).toISOString().slice(0, 10)];
}

/** The limit for a budget month: that month's own limit if set, else the usual one, else none. null category = All spending. */
export function limitFor(data: AppData, month: MonthKey, categoryId: Id | null): number | null {
  const o = data.budgets.overrides.find((x) => x.month === month && x.categoryId === categoryId);
  if (o) return o.monthly;
  return data.budgets.limits.find((l) => l.categoryId === categoryId)?.monthly ?? null;
}

/** Spending (refunds reduce it) of the lines given, optionally of one top category. */
function spentOf(list: readonly Transaction[], cats: CategoryIndex, topId?: Id | null): number {
  let n = 0;
  for (const t of list) if (cats.kindOf(t) === 'spending' && (topId === undefined || cats.topOf(t.categoryId) === topId)) n -= t.amount;
  return n;
}

export type PaceState = 'over' | 'ahead' | 'ok';

export interface PaceLine {
  /** null = All spending. */
  categoryId: Id | null;
  name: string;
  spent: number;
  limit: number;
  /** This month has its own limit, different from the usual one. */
  special: boolean;
  /** over: past the limit · ahead: more than 10% above even spending · ok: on pace. */
  state: PaceState;
}

export interface MonthNow {
  month: MonthKey;
  from: IsoDate;
  to: IsoDate;
  asOf: IsoDate;
  /** Days from the start of the budget month to the as-of day, counting both; and the month's length. */
  elapsed: number;
  days: number;
  /** All spending first, then over, ahead and on pace (v1's order). Only types with a limit. */
  lines: PaceLine[];
}

/** This budget month so far, from its first day to the as-of day, for every type with a limit (v1 "This month so far"). */
export function monthNow(data: AppData, asOf: IsoDate, start: number, lang: Language = 'en'): MonthNow {
  const cats = indexCategories(data, lang);
  const month = budgetMonthOf(asOf, start);
  const [from, to] = budgetRange(month, start);
  const list = inRange(data, from, asOf);
  const elapsed = dayNumber(asOf) - dayNumber(from) + 1, days = dayNumber(to) - dayNumber(from) + 1;
  const ids: (Id | null)[] = [...new Set(data.budgets.limits.map((l) => l.categoryId).concat(data.budgets.overrides.filter((o) => o.month === month).map((o) => o.categoryId)))];
  const lines: PaceLine[] = [];
  for (const id of ids) {
    const limit = limitFor(data, month, id);
    if (limit === null || (id !== null && !cats.byId.has(id))) continue;
    const spent = id === null ? spentOf(list, cats) : spentOf(list, cats, id);
    const pace = (limit * elapsed) / days;
    const usual = data.budgets.limits.find((l) => l.categoryId === id)?.monthly ?? null;
    lines.push({ categoryId: id, name: id === null ? text(lang, 'sheets.allSpending') : cats.name(id), spent, limit, special: usual !== limit, state: spent > limit ? 'over' : spent > pace * 1.1 && spent > 0 ? 'ahead' : 'ok' });
  }
  const rank = { over: 0, ahead: 1, ok: 2 } as const;
  lines.sort((a, b) => Number(b.categoryId === null) - Number(a.categoryId === null) || rank[a.state] - rank[b.state] || b.spent / (b.limit || 1) - a.spent / (a.limit || 1));
  return { month, from, to, asOf, elapsed, days, lines };
}

/** Spending per budget month for each top spending type (and '' = no type), over the months given. */
export function spendingByBudgetMonth(data: AppData, months: readonly MonthKey[], start: number): Map<string, Map<MonthKey, number>> {
  const cats = indexCategories(data);
  const out = new Map<string, Map<MonthKey, number>>();
  if (!months.length) return out;
  const [from] = budgetRange(months[0]!, start), [, to] = budgetRange(months.at(-1)!, start);
  for (const t of inRange(data, from, to)) {
    if (cats.kindOf(t) !== 'spending') continue;
    const key = cats.topOf(t.categoryId) ?? '';
    const row = out.get(key) ?? new Map<MonthKey, number>();
    const m = budgetMonthOf(t.date, start);
    row.set(m, (row.get(m) ?? 0) - t.amount);
    out.set(key, row);
  }
  return out;
}

export interface LimitCheck {
  /** null = All spending. */
  categoryId: Id | null;
  name: string;
  /** Average spending per month in the period. */
  average: number;
  /** The average of the limits in those months, or null when the type has none (a fixed cost tracked anyway). */
  limit: number | null;
  /** The usual limit and any months with their own, for the line under the name. */
  usual: number | null;
  special: { month: MonthKey; limit: number }[];
  monthsOver: number;
  months: number;
  /** Month by month, for the small chart. */
  byMonth: { month: MonthKey; spent: number; limit: number | null }[];
}

/**
 * Limits, month by month (v1): for each type with a limit, or a fixed cost, its average per month over the period's
 * budget months, its limit, and in how many months it went over. All spending first, then by how far over, then by size.
 */
export function limitCheck(data: AppData, months: readonly MonthKey[], start: number, lang: Language = 'en'): LimitCheck[] {
  const cats = indexCategories(data, lang);
  const per = spendingByBudgetMonth(data, months, start);
  const tracked = new Set<Id | null>(data.budgets.limits.map((l) => l.categoryId));
  for (const c of data.categories) if (c.fixedCost && c.kind === 'spending' && !c.parentId) tracked.add(c.id);
  const rows: LimitCheck[] = [];
  for (const id of tracked) {
    if (id !== null && !cats.byId.has(id)) continue;
    const byMonth = months.map((m) => {
      let spent = 0;
      if (id === null) for (const row of per.values()) spent += row.get(m) ?? 0;
      else spent = per.get(id)?.get(m) ?? 0;
      return { month: m, spent, limit: limitFor(data, m, id) };
    });
    const has = byMonth.map((x) => x.limit).filter((v): v is number => v !== null);
    const limit = has.length ? Math.round(has.reduce((a, b) => a + b, 0) / has.length) : null;
    const usual = data.budgets.limits.find((l) => l.categoryId === id)?.monthly ?? null;
    rows.push({
      categoryId: id, name: id === null ? text(lang, 'sheets.allSpending') : cats.name(id),
      average: Math.round(byMonth.reduce((n, x) => n + x.spent, 0) / Math.max(1, months.length)),
      limit, usual, special: data.budgets.overrides.filter((o) => o.categoryId === id && months.includes(o.month)).map((o) => ({ month: o.month, limit: o.monthly })),
      monthsOver: byMonth.filter((x) => x.limit !== null && x.spent > x.limit).length, months: months.length, byMonth,
    });
  }
  const order = (r: LimitCheck) => (r.categoryId === null ? -1e9 : r.limit === null ? 1e9 : -(r.average / r.limit));
  return rows.sort((a, b) => order(a) - order(b) || b.average - a.average);
}

export interface Bill {
  /** Groups the same payment across months (description without digits). */
  id: string;
  name: string;
  categoryId: Id | null;
  /** Typical amount (positive): the middle of the last three. */
  amount: number;
  months: number;
  lastDate: IsoDate;
  /** A month after the last payment. */
  next: IsoDate;
}

/**
 * Regular bills, found automatically (v1, decision d29): the same payment in at least 4 of the last 6 months, about the
 * same amount each time (spread under 45%), at most one extra, and paid within the last 45 days. Card charges on the bank
 * and cash withdrawals are not bills.
 */
export function regularBills(data: AppData, asOf: IsoDate): Bill[] {
  const cats = indexCategories(data);
  const charges = new Set(cardChargeTypes(data).flatMap((c) => [c.covered, c.uncovered]).filter(Boolean));
  const since = isoOf(dayNumber(asOf) - 183);
  const groups = new Map<string, Transaction[]>();
  for (const t of inRange(data, since, asOf)) {
    if (t.amount >= 0 || cats.kindOf(t) !== 'spending' || (t.categoryId && charges.has(t.categoryId))) continue;
    // Cash taken out is spending, but not a bill to plan for.
    if (/\bcash\b/i.test(cats.name(t.categoryId))) continue;
    const key = t.description.replace(/\d/g, '').replace(/\s+/g, ' ').trim();
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  }
  const out: Bill[] = [];
  for (const [id, rs] of groups) {
    const months = new Set(rs.map((r) => r.date.slice(0, 7))).size;
    if (months < 4 || rs.length > months + 1) continue;
    const a = rs.map((r) => -r.amount), mean = a.reduce((x, y) => x + y, 0) / a.length;
    const sd = Math.sqrt(a.reduce((x, y) => x + (y - mean) ** 2, 0) / Math.max(1, a.length - 1));
    if (sd / mean > 0.45) continue;
    rs.sort((x, y) => x.date.localeCompare(y.date));
    const last = rs.at(-1)!;
    if (dayNumber(asOf) - dayNumber(last.date) > 45) continue;
    const recent = rs.slice(-3).map((r) => -r.amount).sort((x, y) => x - y);
    const [y, m, d] = last.date.split('-').map(Number) as [number, number, number];
    const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    out.push({ id, name: last.description, categoryId: last.categoryId, amount: recent[Math.floor(recent.length / 2)]!, months, lastDate: last.date, next: new Date(Date.UTC(y, m, Math.min(d, dim))).toISOString().slice(0, 10) });
  }
  return out.sort((x, y) => x.next.localeCompare(y.next) || y.amount - x.amount);
}

export interface SafeToSpend {
  /** Bank balance on the as-of day. */
  balance: number;
  asOf: IsoDate;
  /** End of the budget month. */
  until: IsoDate;
  daysLeft: number;
  /** Regular bills whose next payment falls by `until`. */
  due: number;
  safe: number;
}

/** Safe to spend (v1, d28): the bank balance minus regular bills still due by the end of the budget month. */
export function safeToSpend(data: AppData, asOf: IsoDate, start: number, bills: readonly Bill[]): SafeToSpend {
  const [, until] = budgetRange(budgetMonthOf(asOf, start), start);
  const balance = bankBalance(data, asOf);
  const due = bills.filter((b) => b.next <= until).reduce((n, b) => n + b.amount, 0);
  return { balance, asOf, until, daysLeft: dayNumber(until) - dayNumber(asOf), due, safe: balance - due };
}

// Periods worked out from today and the data, never fixed dates (CLAUDE.md rule 16).
import type { AppData, IsoDate, MonthKey } from '../model/types';
import type { Language } from '../i18n/languages';
import { text } from '../i18n/text';
import { v1Date } from './dates';

export type Period =
  | { kind: 'this-month' }
  | { kind: 'last-month' }
  | { kind: 'recent'; months: 3 | 6 | 12 }
  /** The same number of months just before 'recent' (v1's "the 12 months before"). */
  | { kind: 'before-recent'; months: 12 }
  | { kind: 'month'; month: MonthKey }
  | { kind: 'year'; year: number }
  | { kind: 'all' };

export interface Range {
  start: IsoDate;
  end: IsoDate;
  /** Every month the range touches, oldest first. */
  months: MonthKey[];
  /** Short name for buttons, e.g. "Last 12 months". */
  label: string;
  /** The dates in words, e.g. "Oct 2025 – Sep 2026". */
  span: string;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isoDay(d: Date): IsoDate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addMonths(month: MonthKey, n: number): MonthKey {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

export function lastDayOf(month: MonthKey): IsoDate {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
}

export function daysInMonth(month: MonthKey): number {
  return Number(lastDayOf(month).slice(8));
}

export function monthsBetween(first: MonthKey, last: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  for (let m = first; m <= last && out.length < 1200; m = addMonths(m, 1)) out.push(m);
  return out;
}

/** "Oct 2026", or "Oct '26" when short; other languages their own way. */
export function monthName(month: MonthKey, short = false, lang: Language = 'en'): string {
  if (lang !== 'en') return v1Date(month, short ? 'monthAxis' : 'month', lang);
  const [y, m] = month.split('-').map(Number) as [number, number];
  return short ? `${MONTH_NAMES[m - 1]} ’${String(y).slice(2)}` : `${MONTH_NAMES[m - 1]} ${y}`;
}

export function resolvePeriod(p: Period, today: IsoDate, data?: AppData, lang: Language = 'en'): Range {
  const thisMonth = today.slice(0, 7);
  const make = (first: MonthKey, last: MonthKey, label: string): Range => {
    const months = monthsBetween(first, last);
    const span = first === last ? monthName(first, false, lang) : text(lang, 'period.span', { from: monthName(first, false, lang), to: monthName(last, false, lang) });
    return { start: `${first}-01`, end: lastDayOf(last), months, label, span };
  };
  switch (p.kind) {
    case 'this-month': return make(thisMonth, thisMonth, text(lang, 'period.thisMonth'));
    case 'last-month': { const m = addMonths(thisMonth, -1); return make(m, m, text(lang, 'period.lastMonth')); }
    case 'recent': return make(addMonths(thisMonth, -p.months), addMonths(thisMonth, -1), text(lang, 'period.recent', { n: p.months }));
    case 'before-recent': { const r = make(addMonths(thisMonth, -2 * p.months), addMonths(thisMonth, -p.months - 1), ''); return { ...r, label: r.span }; }
    case 'month': { const r = make(p.month, p.month, ''); return { ...r, label: v1Date(p.month, 'monthLong', lang) }; }
    case 'year': return make(`${p.year}-01`, `${p.year}-12`, String(p.year));
    case 'all': {
      const keys = data ? Object.keys(data.months).sort() : [];
      return make(keys[0] ?? thisMonth, keys.at(-1) ?? thisMonth, text(lang, 'period.allTime'));
    }
  }
}

/** v1's period buttons: Last 12 months, each year that has data (newest first), All time. */
export function periodChoices(data: AppData): Period[] {
  const years = [...new Set(Object.keys(data.months).map((m) => Number(m.slice(0, 4))))].sort((a, b) => b - a);
  return [{ kind: 'recent', months: 12 }, ...years.map((year): Period => ({ kind: 'year', year })), { kind: 'all' }];
}

/** Every month that has data, newest first: v1's "Month…" list. */
export function monthChoices(data: AppData): Period[] {
  return Object.keys(data.months).sort().reverse().map((month): Period => ({ kind: 'month', month }));
}

/** v1's "Compare with" list: the 12 months before, Last 12 months, each year, each month; the chosen period left out. */
export function compareChoices(data: AppData, current: Period): Period[] {
  return [{ kind: 'before-recent', months: 12 } as Period, ...periodChoices(data).filter((p) => p.kind !== 'all'), ...monthChoices(data)].filter((p) => !samePeriod(p, current));
}

export function samePeriod(a: Period, b: Period): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Reads a stored period back, or null when it isn't one (browser storage is untrusted). */
export function asPeriod(v: unknown): Period | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (o.kind === 'this-month' || o.kind === 'last-month' || o.kind === 'all') return { kind: o.kind };
  if (o.kind === 'recent' && (o.months === 3 || o.months === 6 || o.months === 12)) return { kind: 'recent', months: o.months };
  if (o.kind === 'before-recent' && o.months === 12) return { kind: 'before-recent', months: 12 };
  if (o.kind === 'month' && typeof o.month === 'string' && /^\d{4}-\d{2}$/.test(o.month)) return { kind: 'month', month: o.month };
  if (o.kind === 'year' && Number.isInteger(o.year)) return { kind: 'year', year: o.year as number };
  return null;
}

// The screens' versions of the money maths' writing functions, in the current language (plans/translation.md). The
// plain functions in src/logic take the language as an argument (rule 8); here it is filled in once, so a screen
// imports `v1Date` from this file and never passes the language itself.
import type { AppData, IsoDate, MonthKey } from '../model/types';
import type { Row } from '../import/rows';
import type { FoundLayout } from '../import/presets';
import type { Currency } from '../model/types';
import { language } from '../state/language';
import * as dates from '../logic/dates';
import * as periods from '../logic/periods';
import * as categories from '../logic/categories';
import * as budget from '../logic/budget';
import * as money from '../logic/money';
import * as backup from '../logic/backup';
import * as parse from '../import/parse';

const lang = () => language.value;

export const v1Date = (date: string, style: dates.DateStyle) => dates.v1Date(date, style, lang());
export const formatDay = (date: string) => dates.formatDay(date, lang());
export const formatWeekday = (date: string) => dates.formatWeekday(date, lang());
export const formatTimestamp = (iso: string) => dates.formatTimestamp(iso, lang());
export const weekdayHeads = () => dates.weekdayHeads(lang());
export const monthName = (month: MonthKey, short = false) => periods.monthName(month, short, lang());
export const resolvePeriod = (p: periods.Period, today: IsoDate, data?: AppData) => periods.resolvePeriod(p, today, data, lang());
export const indexCategories = (data: AppData) => categories.indexCategories(data, lang());
export const monthNow = (data: AppData, asOf: IsoDate, start: number) => budget.monthNow(data, asOf, start, lang());
export const limitCheck = (data: AppData, months: readonly MonthKey[], start: number) => budget.limitCheck(data, months, start, lang());
export const formatShekels = (amount: number, opts: { decimals?: 0 | 2; signed?: boolean } = {}) => money.formatShekels(amount, opts, lang());
export const hiddenAmount = () => money.hiddenAmount(lang());
export const parseBackupFile = (text: string) => backup.parseBackupFile(text, lang());
export const readLines = (rows: Row[], layout: FoundLayout, fallbackCurrency: Currency) => parse.readLines(rows, layout, fallbackCurrency, lang());

const numbers = new Map<string, Intl.NumberFormat>();
/** A count written the language's way ("1,234"). */
export function formatNumber(n: number): string {
  const l = lang();
  if (!numbers.has(l)) numbers.set(l, new Intl.NumberFormat(l));
  return numbers.get(l)!.format(n);
}

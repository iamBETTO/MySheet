// Turns a file's rows into transaction lines using a found layout. Plain functions only (CLAUDE.md rule 8).
import type { Currency, IsoDate, Minor } from '../model/types';
import type { DateFormat, FoundLayout } from './presets';
import { cellText, type Cell, type Row } from './rows';
import type { Language } from '../i18n/languages';
import { text } from '../i18n/text';

export interface ImportLine {
  date: IsoDate;
  amount: Minor;
  currency: Currency;
  description: string;
}

/** A row that looked like a transaction but couldn't be read. `row` counts from 1, as a spreadsheet shows it. */
export interface RowProblem {
  row: number;
  message: string;
}

export interface ParseResult {
  lines: ImportLine[];
  problems: RowProblem[];
}

const SYMBOLS: Record<string, Currency> = { '₪': 'ILS', 'ש"ח': 'ILS', '$': 'USD', '€': 'EUR', '£': 'GBP', 'ლ': 'GEL' };

export function readLines(rows: Row[], layout: FoundLayout, fallbackCurrency: Currency, lang: Language = 'en'): ParseResult {
  const { col, preset } = layout;
  const lines: ImportLine[] = [];
  const problems: RowProblem[] = [];
  for (let r = layout.headerRow + 1; r < rows.length; r++) {
    const row = rows[r]!;
    const rawAmount = col.amount !== null ? toNumber(row[col.amount])
      : col.debit !== null && col.credit !== null && (toNumber(row[col.debit]) !== null || toNumber(row[col.credit]) !== null)
        ? (toNumber(row[col.credit]) ?? 0) - Math.abs(toNumber(row[col.debit]) ?? 0) : null;
    const rawText = cellText(row[col.description]);
    // Section titles, repeated headers and totals have no amount, description or date: not transactions.
    if (rawAmount === null || rawText === '' || cellText(row[col.date]) === '') continue;
    const date = toDate(row[col.date], preset.dateFormat);
    if (!date) { problems.push({ row: r + 1, message: text(lang, 'import.badDate', { value: cellText(row[col.date]) }) }); continue; }
    const currencyText = col.currency === null ? '' : cellText(row[col.currency]);
    const currency = currencyText === '' ? fallbackCurrency : SYMBOLS[currencyText] ?? (/^[A-Z]{3}$/.test(currencyText) ? currencyText : null);
    if (!currency) { problems.push({ row: r + 1, message: text(lang, 'import.badCurrency', { value: currencyText }) }); continue; }
    const minor = Math.round(rawAmount * 100);
    lines.push({
      date,
      amount: preset.amountSign === 'outPositive' ? -minor : minor,
      currency,
      description: preset.textOrder === 'visual' ? fromVisualOrder(rawText) : cleanText(rawText),
    });
  }
  return { lines, problems };
}

/** '1,234.50', '-60.9', '₪ 12' or a number → a number; anything else → null. */
export function toNumber(c: Cell | undefined): number | null {
  if (typeof c === 'number') return Number.isFinite(c) ? c : null;
  const t = cellText(c).replace(/[,\s₪$€£]/g, '');
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : null;
}

/** A cell → 'YYYY-MM-DD', or null. Understands spreadsheet day numbers, ISO dates and the layout's text format. */
export function toDate(c: Cell | undefined, format: DateFormat): IsoDate | null {
  if (typeof c === 'number') {
    if (c < 1 || c > 2_958_465) return null;
    return new Date(Date.UTC(1899, 11, 30) + Math.floor(c) * 86_400_000).toISOString().slice(0, 10);
  }
  const t = cellText(c);
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[ T].*)?$/.exec(t);
  if (iso) return valid(+iso[1]!, +iso[2]!, +iso[3]!);
  const sep = format === 'DD/MM/YYYY' ? '/' : '.';
  const parts = t.split(sep);
  if (format === 'YYYY-MM-DD' || parts.length !== 3) return null;
  const [d, m, y] = parts.map((p) => (/^\d+$/.test(p) ? Number(p) : NaN)) as [number, number, number];
  const year = format === 'DD.MM.YY' ? (parts[2]!.length === 2 ? 2000 + y : NaN) : parts[2]!.length === 4 ? y : NaN;
  return valid(year, m, d);
}

function valid(y: number, m: number, d: number): IsoDate | null {
  if (![y, m, d].every(Number.isInteger)) return null;
  const t = new Date(Date.UTC(y, m - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null;
  return t.toISOString().slice(0, 10);
}

/** Removes invisible direction marks and doubled spaces. */
export function cleanText(t: string): string {
  return t.replace(/[‎‏‪-‮⁦-⁩]/g, '').replace(/\s+/g, ' ').trim();
}

/** Text stored back to front: turn it around, then put runs of Latin letters and digits back the right way. */
export function fromVisualOrder(t: string): string {
  const reversed = [...cleanText(t)].reverse().join('');
  return reversed.replace(/[A-Za-z0-9][A-Za-z0-9 .\-]*[A-Za-z0-9]|[A-Za-z0-9]/g, (run) => [...run].reverse().join(''));
}

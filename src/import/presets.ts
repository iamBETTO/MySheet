// Ready-made layouts for common bank and card export files, recognised by their column titles.
// These describe public file formats only; nothing here is about any one person (CLAUDE.md rule 15).
import type { AccountKind, ColumnLayout } from '../model/types';
import { cellText, type Row } from './rows';

export type DateFormat = 'DD.MM.YY' | 'DD.MM.YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

export interface ImportPreset {
  id: string;
  name: string;
  accountKind: AccountKind;
  /** Column titles exactly as the file writes them: either one amount column, or separate money-out (debit) and money-in (credit) columns. */
  headers: { date: string; description: string; amount?: string; debit?: string; credit?: string; currency?: string };
  /** How dates written as text look. Spreadsheet day numbers and ISO dates are always understood. */
  dateFormat: DateFormat;
  /** 'signed': money out is negative. 'outPositive': card statements list purchases as positive amounts. */
  amountSign: 'signed' | 'outPositive';
  /** 'visual': the file stores right-to-left text back to front (some Hebrew exports), so it is turned around. */
  textOrder: 'logical' | 'visual';
}

export const PRESETS: readonly ImportPreset[] = [
  {
    id: 'preset:onezero',
    name: 'One Zero bank account',
    accountKind: 'bank',
    headers: { date: 'תאריך תנועה', description: 'תיאור', amount: 'סכום פעולה', currency: 'מטבע' },
    dateFormat: 'DD/MM/YYYY',
    amountSign: 'signed',
    textOrder: 'visual',
  },
  {
    id: 'preset:isracard',
    name: 'Isracard card statement',
    accountKind: 'card',
    headers: { date: 'תאריך רכישה', description: 'שם בית עסק', amount: 'סכום חיוב', currency: 'מטבע חיוב' },
    dateFormat: 'DD.MM.YY',
    amountSign: 'outPositive',
    textOrder: 'logical',
  },
];

/** Where a preset's columns are in this file: the first row holding all its titles. */
export interface FoundLayout {
  preset: ImportPreset;
  headerRow: number;
  col: { date: number; description: number; amount: number | null; debit: number | null; credit: number | null; currency: number | null };
}

export function findLayout(rows: Row[], preset: ImportPreset): FoundLayout | null {
  for (let r = 0; r < rows.length; r++) {
    const titles = rows[r]!.map(cellText);
    const at = (t: string | undefined) => (t === undefined ? -1 : titles.indexOf(t));
    const date = at(preset.headers.date), description = at(preset.headers.description);
    const amount = at(preset.headers.amount), debit = at(preset.headers.debit), credit = at(preset.headers.credit);
    if (date < 0 || description < 0 || (amount < 0 && (debit < 0 || credit < 0))) continue;
    const currency = at(preset.headers.currency);
    const or = (n: number) => (n < 0 ? null : n);
    return { preset, headerRow: r, col: { date, description, amount: or(amount), debit: amount < 0 ? or(debit) : null, credit: amount < 0 ? or(credit) : null, currency: or(currency) } };
  }
  return null;
}

/** A layout the person matched once and saved, used like a ready-made one. */
export function fromSaved(l: ColumnLayout): ImportPreset {
  return {
    id: l.id, name: l.name, accountKind: 'bank', dateFormat: (['DD.MM.YY', 'DD.MM.YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'] as const).find((f) => f === l.dateFormat) ?? 'DD/MM/YYYY',
    headers: { date: l.columns.date, description: l.columns.description, amount: l.columns.amount, debit: l.columns.debit, credit: l.columns.credit },
    amountSign: l.amountSign ?? 'signed', textOrder: 'logical',
  };
}

/** The first layout (the person's saved ones first, then ready-made) whose column titles appear in the file. */
export function detectLayout(rows: Row[], saved: readonly ColumnLayout[] = []): FoundLayout | null {
  for (const p of [...saved.map(fromSaved), ...PRESETS]) {
    const found = findLayout(rows, p);
    if (found) return found;
  }
  return null;
}

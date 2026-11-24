// Bit (a payment app) history files: they don't add money, they explain it. Each Bit payment is matched to the
// bank or card line it caused, and that line gets who it was with and what it was for.
// Bit is run by Bank Hapoalim, so its bank lines name Hapoalim; card lines say BIT. Public format facts only (rule 15).
import type { AppData, Id, IsoDate, Transaction } from '../model/types';
import { cellText, type Row } from './rows';
import { toDate, toNumber } from './parse';

export interface BitEntry {
  date: IsoDate;
  /** Negative = you paid, positive = you received. */
  amount: number;
  who: string;
  what: string;
  /** 'card', 'bank' or 'balance' (the Bit balance itself, which has no bank or card line). */
  via: 'card' | 'bank' | 'balance';
}

const HEAD = ['Status', 'Description', 'Amount', 'Payment Method', 'Credit/Debit', 'From/To', 'Date'];

/** Reads a Bit history export, or returns null when the rows aren't one. */
export function readBit(rows: Row[]): BitEntry[] | null {
  const h = rows.findIndex((r) => HEAD.every((t) => r.some((c) => cellText(c).replace(/^﻿/, '') === t)));
  if (h < 0) return null;
  const titles = rows[h]!.map((c) => cellText(c).replace(/^﻿/, ''));
  const col = (t: string) => titles.indexOf(t);
  const out: BitEntry[] = [];
  for (const r of rows.slice(h + 1)) {
    if (cellText(r[col('Status')]) !== 'Done') continue;
    const date = toDate(r[col('Date')], 'DD.MM.YY');
    const amount = toNumber(r[col('Amount')]);
    if (!date || amount === null) continue;
    const method = cellText(r[col('Payment Method')]);
    const via = method === 'כרטיס אשראי' ? 'card' : method === 'חשבון בנק' ? 'bank' : 'balance';
    const minor = Math.round(amount * 100);
    out.push({ date, amount: cellText(r[col('Credit/Debit')]) === 'Debit' ? -minor : minor, who: cellText(r[col('From/To')]), what: cellText(r[col('Description')]), via });
  }
  return out;
}

function daysBetween(a: IsoDate, b: IsoDate): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

const looksLikeBit = (t: Transaction) => /bit|ביט|הפועלים/i.test(t.description);

export interface BitMatch { transactionId: Id; entry: BitEntry }

/**
 * Pairs each Bit payment with one bank or card line: same amount and direction, dated from 3 days before to 4 days
 * after (card and bank dates drift a little), and a description that names Bit or its bank. The closest date wins; each line is used once.
 */
export function matchBit(data: AppData, entries: BitEntry[]): { matches: BitMatch[]; unmatched: BitEntry[] } {
  const kinds = new Map(data.accounts.map((a) => [a.id, a.kind]));
  const candidates = Object.values(data.months).flatMap((m) => m.transactions).filter(looksLikeBit);
  const used = new Set<Id>();
  const matches: BitMatch[] = [];
  const unmatched: BitEntry[] = [];
  for (const e of [...entries].sort((a, b) => a.date.localeCompare(b.date))) {
    if (e.via === 'balance') { unmatched.push(e); continue; }
    const wantKind = e.via === 'card' ? 'card' : 'bank';
    const best = candidates
      .filter((t) => !used.has(t.id) && t.amount === e.amount && kinds.get(t.accountId) === wantKind)
      .map((t) => ({ t, gap: daysBetween(e.date, t.date) }))
      .filter((x) => x.gap >= -3 && x.gap <= 4)
      .sort((a, b) => Math.abs(a.gap) - Math.abs(b.gap) || a.gap - b.gap)[0];
    if (best) { used.add(best.t.id); matches.push({ transactionId: best.t.id, entry: e }); }
    else unmatched.push(e);
  }
  return { matches, unmatched };
}

/** The name and note a matched line gets. Never replaces a name or note the person wrote. */
export function bitDetails(t: Transaction, e: BitEntry): { payee: string | null; note: string | null } {
  return { payee: t.payee ?? (e.who ? `Bit · ${e.who}` : null), note: t.note ?? (e.what || null) };
}

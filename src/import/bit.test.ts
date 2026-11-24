import { describe, expect, it } from 'vitest';
import { parseCsv } from './rows';
import { bitDetails, matchBit, readBit } from './bit';
import { sampleData } from '../model/sample';
import type { Transaction } from '../model/types';

// A made-up Bit export, shaped like the real one (leading BOM, spaces after commas, dd.mm.yy dates).
const CSV = '﻿Status, Description, Fee Amount, Amount, Payment Method, Credit/Debit, From/To, Date, \n' +
  'Done, Pizza night , 0, 45, כרטיס אשראי, Debit, Dana, 03.10.26, \n' +
  'Done, Gift, 0, 200, חשבון בנק, Credit, Uncle, 05.10.26, \n' +
  'Done, Coffee, 0, 12, יתרה, Debit, Cafe, 06.10.26, \n' +
  'Failed, Oops, 0, 99, כרטיס אשראי, Debit, X, 06.10.26, \n';

const tx = (id: string, accountId: string, date: string, amount: number, description: string): Transaction =>
  ({ id, accountId, date, amount, currency: 'ILS', description, payee: null, categoryId: null, note: null, importId: null, fingerprint: null });

describe('Bit history files', () => {
  it('reads payments, skipping failed ones', () => {
    const e = readBit(parseCsv(CSV).map((r) => r.map((c) => (typeof c === 'string' ? c.trim() || null : c))))!;
    expect(e.map((x) => [x.date, x.amount, x.who, x.what, x.via])).toEqual([
      ['2026-10-03', -4500, 'Dana', 'Pizza night', 'card'],
      ['2026-10-05', 20000, 'Uncle', 'Gift', 'bank'],
      ['2026-10-06', -1200, 'Cafe', 'Coffee', 'balance'],
    ]);
  });
  it('is not mistaken for a bank file', () => expect(readBit([['Date', 'Amount']])).toBeNull());

  it('matches each payment to the card or bank line it caused, the closest date first', () => {
    const d = sampleData();
    d.months['2026-10']!.transactions.push(
      tx('c1', 'acc-card', '2026-10-04', -4500, 'העברה ב BIT'),
      tx('c2', 'acc-card', '2026-10-09', -4500, 'העברה ב BIT'), // too late
      tx('b1', 'acc-bank', '2026-10-05', 20000, 'הפועלים ב/123'),
      tx('b2', 'acc-bank', '2026-10-05', 20000, 'SALARY'), // not a Bit line
    );
    const e = readBit(parseCsv(CSV).map((r) => r.map((c) => (typeof c === 'string' ? c.trim() || null : c))))!;
    const { matches, unmatched } = matchBit(d, e);
    expect(matches.map((m) => m.transactionId)).toEqual(['c1', 'b1']);
    expect(unmatched.map((u) => u.what)).toEqual(['Coffee']);
    expect(bitDetails(d.months['2026-10']!.transactions.find((t) => t.id === 'c1')!, matches[0]!.entry)).toEqual({ payee: 'Bit · Dana', note: 'Pizza night' });
  });
  it('never replaces a name or note the person wrote', () => {
    const t = { ...tx('x', 'a', '2026-10-01', -1, 'BIT'), payee: 'Mine', note: 'Mine too' };
    expect(bitDetails(t, { date: '2026-10-01', amount: -1, who: 'Other', what: 'Other', via: 'card' })).toEqual({ payee: 'Mine', note: 'Mine too' });
  });
});

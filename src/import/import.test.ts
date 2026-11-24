import { describe, expect, it } from 'vitest';
import { parseCsv, type Row } from './rows';
import { detectLayout, PRESETS } from './presets';
import { fromVisualOrder, readLines, toDate, toNumber } from './parse';
import { addImport } from './apply';
import { emptyData } from '../model/types';
import { validateAppData } from '../model/validate';

// Made-up files shaped like real exports (CLAUDE.md rule 20).
const CARD: Row[] = [
  [null, null, null],
  ['פירוט עסקאות', null, 'ינואר 2026'],
  ['עסקאות למועד חיוב'],
  ['תאריך רכישה', 'שם בית עסק', 'סכום עסקה', 'מטבע עסקה', 'סכום חיוב', 'מטבע חיוב'],
  ['03.01.26', 'COFFEE PLACE', 12, '₪', 12, '₪'],
  ['03.01.26', 'COFFEE PLACE', 12, '₪', 12, '₪'],
  ['04.01.26', 'BOOK SHOP', 20, '$', 71.5, '₪'],
  ['05.01.26', 'REFUND STORE', -30, '₪', -30, '₪'],
  ['עסקאות בחיוב מחוץ למועד'],
  ['תאריך רכישה', 'שם בית עסק', 'סכום עסקה', 'מטבע עסקה', 'סכום חיוב', 'מטבע חיוב'],
  ['31.02.26', 'BAD DATE', 5, '₪', 5, '₪'],
  [null, 'סה"כ', null, null, 85.5, '₪'],
];

const BANK: Row[] = [
  ['תאריך תנועה', 'תאריך ערך', 'סוג פעולה', 'תיאור', 'סכום פעולה', 'מטבע', 'חיוב/זיכוי', 'יתרה'],
  [46031, 46031, 'חיובים', '‭ABC/1234/‭ןולא', -60.9, 'ILS', 'חיוב', 1000],
  ['2026-01-02 00:00:00', null, 'העברות', 'תרוכשמ', 5000, 'ILS', 'זיכוי', 5060.9],
];

describe('reading rows', () => {
  it('reads CSV with quotes, commas and line breaks inside fields', () => {
    expect(parseCsv('﻿a,"b, c","say ""hi"""\r\n1,,"x\ny"\n')).toEqual([['a', 'b, c', 'say "hi"'], ['1', null, 'x\ny']]);
  });
  it('reads numbers written as text', () => {
    expect(toNumber('1,234.50')).toBe(1234.5);
    expect(toNumber('-60.9')).toBe(-60.9);
    expect(toNumber('סכום')).toBeNull();
    expect(toNumber(null)).toBeNull();
  });
  it('reads dates in each form and refuses impossible ones', () => {
    expect(toDate('03.01.26', 'DD.MM.YY')).toBe('2026-01-03');
    expect(toDate('29.02.26', 'DD.MM.YY')).toBeNull();
    expect(toDate('03/01/2026', 'DD/MM/YYYY')).toBe('2026-01-03');
    expect(toDate(46031, 'DD.MM.YY')).toBe('2026-01-09');
    expect(toDate('2026-01-02 00:00:00', 'DD.MM.YY')).toBe('2026-01-02');
  });
  it('turns back-to-front Hebrew around and keeps numbers readable', () => {
    expect(fromVisualOrder('‭ABC/1234/‭ןולא')).toBe('אלון/1234/ABC');
  });
});

describe('recognising files', () => {
  it('finds the card layout by its column titles', () => expect(detectLayout(CARD)?.preset.id).toBe('preset:isracard'));
  it('finds the bank layout by its column titles', () => expect(detectLayout(BANK)?.preset.id).toBe('preset:onezero'));
  it('recognises nothing in an unknown file', () => expect(detectLayout([['Date', 'Text', 'Sum'], ['1', 'x', '2']])).toBeNull());
  it('has unique preset ids', () => expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length));
});

describe('reading lines', () => {
  it('reads card purchases as money out, refunds as money in, and skips titles and totals', () => {
    const { lines, problems } = readLines(CARD, detectLayout(CARD)!, 'ILS');
    expect(lines.map((l) => [l.date, l.amount, l.description])).toEqual([
      ['2026-01-03', -1200, 'COFFEE PLACE'],
      ['2026-01-03', -1200, 'COFFEE PLACE'],
      ['2026-01-04', -7150, 'BOOK SHOP'],
      ['2026-01-05', 3000, 'REFUND STORE'],
    ]);
    expect(lines.every((l) => l.currency === 'ILS')).toBe(true);
    expect(problems).toEqual([{ row: 11, message: 'The date “31.02.26” couldn’t be read.' }]);
  });
  it('reads signed bank amounts', () => {
    const { lines } = readLines(BANK, detectLayout(BANK)!, 'ILS');
    expect(lines.map((l) => [l.date, l.amount, l.description])).toEqual([['2026-01-09', -6090, 'אלון/1234/ABC'], ['2026-01-02', 500000, 'משכורת']]);
  });
});

describe('adding an import', () => {
  const lines = readLines(CARD, detectLayout(CARD)!, 'ILS').lines;
  const input = { accountId: 'acc-card', fileName: 'jan.xlsx', layoutId: 'preset:isracard', lines, at: '2026-02-01T10:00:00Z' };

  it('adds every line, keeping two identical purchases on the same day', () => {
    const out = addImport(emptyData(), input);
    expect(out.record).toMatchObject({ rowsAdded: 4, duplicatesSkipped: 0, fileName: 'jan.xlsx' });
    expect(out.data.months['2026-01']!.transactions).toHaveLength(4);
    expect(out.changedMonths).toEqual(['2026-01']);
    expect(validateAppData(out.data)).toEqual([]);
  });
  it('skips everything when the same file is imported again', () => {
    const once = addImport(emptyData(), input).data;
    const twice = addImport(once, { ...input, at: '2026-02-02T10:00:00Z' });
    expect(twice.record).toMatchObject({ rowsAdded: 0, duplicatesSkipped: 4 });
    expect(twice.data.months['2026-01']!.transactions).toHaveLength(4);
    expect(twice.changedMonths).toEqual([]);
  });
  it('adds only the new lines from an overlapping file', () => {
    const once = addImport(emptyData(), { ...input, lines: lines.slice(0, 1) }).data;
    const next = addImport(once, input);
    expect(next.record).toMatchObject({ rowsAdded: 3, duplicatesSkipped: 1 });
  });
  it('leaves the data it was given unchanged', () => {
    const before = emptyData();
    addImport(before, input);
    expect(before.months).toEqual({});
    expect(before.imports.records).toEqual([]);
  });
});

import { makeCategorizer, ruleMatches } from './categorize';
import { sampleData } from '../model/sample';
describe('categorising new lines', () => {
  it('uses a rule first, then how the same place was categorised before', () => {
    const d = sampleData();
    const guess = makeCategorizer(d);
    expect(guess({ accountId: 'acc-card', description: 'WOLT JERUSALEM', amount: -5000 })).toEqual({ categoryId: 'cat-wolt', payee: 'Wolt', source: 'rule' });
    expect(guess({ accountId: 'acc-card', description: 'SUPERMARKET', amount: -9900 })).toEqual({ categoryId: 'cat-food', payee: null, source: 'history' });
    expect(guess({ accountId: 'acc-bank', description: 'SALARY OCT', amount: 1_200_000 }).categoryId).toBeNull(); // "SALARY SEPT" is a different text
    expect(guess({ accountId: 'acc-bank', description: 'NEW PLACE', amount: -100 }).source).toBeNull();
  });
  it('a rule matching exactly ignores numbers in the text', () => {
    const r = { id: 'r', priority: 1, match: { descriptionEquals: 'LIME*2 RIDES' }, set: { categoryId: null, payee: null } };
    expect(ruleMatches(r, { accountId: 'a', description: 'LIME*4 RIDES', amount: -1 })).toBe(true);
    expect(ruleMatches(r, { accountId: 'a', description: 'LIME PASS', amount: -1 })).toBe(false);
  });
  it('an import applies the guesses', () => {
    const d = sampleData();
    const out = addImport(d, { accountId: 'acc-card', fileName: 'x.csv', layoutId: null, at: '2026-11-01T00:00:00Z', lines: [{ date: '2026-11-02', amount: -4000, currency: 'ILS', description: 'WOLT HAIFA' }], categorize: makeCategorizer(d) });
    expect(out.data.months['2026-11']!.transactions[0]).toMatchObject({ categoryId: 'cat-wolt', payee: 'Wolt' });
  });
});

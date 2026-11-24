import { describe, expect, it } from 'vitest';
import { kindOf, readRows } from './readFile';
import { detectLayout } from './presets';
import { readLines } from './parse';
import { BANK_CSV_1255, BANK_XLS, BANK_XLSX, CARD_XLSX } from './testFiles';

const bytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

describe('reading spreadsheet files', () => {
  it('tells file types apart by their first bytes', () => {
    expect(kindOf(bytes(CARD_XLSX))).toBe('xlsx');
    expect(kindOf(bytes(BANK_XLS))).toBe('xls');
    expect(kindOf(new TextEncoder().encode('a,b\n1,2'))).toBe('csv');
  });

  it('reads the first sheet of an .xlsx, with shared text and numbers', async () => {
    const { rows } = await readRows(bytes(CARD_XLSX));
    expect(rows[0]).toEqual(['Made-up card statement']);
    expect(rows[2]![1]).toBe('שם בית עסק');
    const { lines } = readLines(rows, detectLayout(rows)!, 'ILS');
    expect(lines.map((l) => [l.date, l.amount, l.description])).toEqual([
      ['2026-01-03', -1200, 'COFFEE & CAKE'], ['2026-01-04', -7150, 'חנות ספרים'], ['2026-01-05', 3000, 'REFUND'],
    ]);
  });

  it('reads dates stored as day numbers in .xlsx and old .xls alike', async () => {
    for (const file of [BANK_XLSX, BANK_XLS]) {
      const { rows } = await readRows(bytes(file));
      const { lines } = readLines(rows, detectLayout(rows)!, 'ILS');
      expect(lines.map((l) => [l.date, l.amount, l.description])).toEqual([['2026-01-09', -6090, 'אלון/1234/ABC'], ['2026-01-02', 500000, 'משכורת']]);
    }
  });

  it('reads a CSV saved in the Hebrew Windows encoding', async () => {
    const { kind, rows } = await readRows(bytes(BANK_CSV_1255));
    expect(kind).toBe('csv');
    expect(rows[1]).toEqual(['03/01/2026', 'קפה, ועוגה', '-12.50']);
  });

  it('refuses a file that is neither a spreadsheet nor text', async () => {
    await expect(readRows(new Uint8Array([0, 1, 2, 3, 4, 5, 0, 0, 0, 7]))).rejects.toThrow();
  });
});

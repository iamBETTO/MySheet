// Before the first import (plans/empty-screens.md): accounts or holdings alone don't count as data; one transaction does.
import { describe, expect, it } from 'vitest';
import { emptyData } from '../model/types';
import { sampleData } from '../model/sample';
import { hasTransactions } from './overview';

describe('no data yet', () => {
  it('counts only transactions as data', () => {
    const d = emptyData();
    expect(hasTransactions(d)).toBe(false);
    d.accounts.push({ id: 'a', name: 'Bank', kind: 'bank', currency: 'ILS', openingBalance: 0, openingDate: '2026-01-01', closed: false });
    d.months['2026-01'] = { month: '2026-01', transactions: [], transfers: [] };
    expect(hasTransactions(d)).toBe(false);
    expect(hasTransactions(sampleData())).toBe(true);
  });
});

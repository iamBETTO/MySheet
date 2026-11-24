import { describe, expect, it } from 'vitest';
import { emptyData, type AppData, type Transaction } from '../model/types';
import { indexCategories } from './categories';
import { cardCoverage, isCoveredCardCharge, reconcileCardCharges } from './cardCharges';

const tx = (id: string, accountId: string, date: string, amount: number, categoryId: string | null): Transaction =>
  ({ id, accountId, date, amount, currency: 'ILS', description: id, payee: null, categoryId, note: null, importId: null, fingerprint: null });

function data(): AppData {
  const d = emptyData();
  d.accounts = [
    { id: 'bank', name: 'Bank', kind: 'bank', currency: 'ILS', openingBalance: 0, openingDate: null, closed: false },
    { id: 'card', name: 'Card', kind: 'card', currency: 'ILS', openingBalance: 0, openingDate: null, closed: false },
  ];
  d.categories = [
    { id: 'pay', name: 'Card payments', kind: 'transfer', parentId: null, color: null, fixedCost: false, archived: false, paysAccountId: 'card' },
    { id: 'nod', name: 'Card (no details)', kind: 'spending', parentId: null, color: null, fixedCost: false, archived: false, paysAccountId: 'card' },
    { id: 'food', name: 'Food', kind: 'spending', parentId: null, color: null, fixedCost: false, archived: false },
  ];
  d.months = {
    '2026-08': { month: '2026-08', transfers: [], transactions: [tx('b1', 'bank', '2026-08-30', -100, 'pay')] },
    '2026-09': { month: '2026-09', transfers: [], transactions: [tx('c1', 'card', '2026-09-01', -50, 'food'), tx('c2', 'card', '2026-09-16', -70, 'food'), tx('b2', 'bank', '2026-09-03', -50, 'nod'), tx('b3', 'bank', '2026-09-20', -80, 'pay')] },
  };
  return d;
}

describe('card charges on the bank', () => {
  it('knows the days the card file covers', () => expect(cardCoverage(data(), 'card')).toEqual({ first: '2026-09-01', last: '2026-09-16' }));

  it('marks covered charges as own money and the rest as card spending with no details', () => {
    const r = reconcileCardCharges(data());
    const all = Object.values(r.data.months).flatMap((m) => m.transactions);
    const cat = (id: string) => all.find((t) => t.id === id)!.categoryId;
    expect([cat('b1'), cat('b2'), cat('b3')]).toEqual(['nod', 'pay', 'nod']);
    expect(r.changed).toBe(3);
    expect(r.docs.sort()).toEqual(['month:2026-08', 'month:2026-09']);
    expect(cat('c1')).toBe('food');
  });

  it('changes nothing the second time', () => {
    const once = reconcileCardCharges(data()).data;
    const twice = reconcileCardCharges(once);
    expect(twice.changed).toBe(0);
    expect(twice.data).toBe(once);
  });

  it('a newer card file turns a no-details charge into own money (as after an import)', () => {
    const d = reconcileCardCharges(data()).data;
    d.months['2026-09']!.transactions.push(tx('c3', 'card', '2026-09-25', -80, 'food'));
    const r = reconcileCardCharges(d);
    expect(Object.values(r.data.months).flatMap((m) => m.transactions).find((t) => t.id === 'b3')!.categoryId).toBe('pay');
    expect(r.docs).toEqual(['month:2026-09']);
  });

  it('tells which lines lists leave out', () => {
    const d = reconcileCardCharges(data()).data;
    const cats = indexCategories(d);
    const all = Object.values(d.months).flatMap((m) => m.transactions);
    expect(all.filter((t) => isCoveredCardCharge(t, cats)).map((t) => t.id)).toEqual(['b2']);
  });
});

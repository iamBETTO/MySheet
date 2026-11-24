// Made-up sample data for tests (CLAUDE.md rule 20): a fictional person, round numbers, no real data.
import { emptyData, type AppData } from './types';

export function sampleData(): AppData {
  const d = emptyData();
  d.accounts = [
    { id: 'acc-bank', name: 'Main bank', kind: 'bank', currency: 'ILS', openingBalance: 1_000_000, openingDate: '2026-09-01', closed: false },
    { id: 'acc-card', name: 'Credit card', kind: 'card', currency: 'ILS', openingBalance: 0, openingDate: '2026-09-01', closed: false },
  ];
  d.categories = [
    { id: 'cat-food', name: 'Groceries', kind: 'spending', parentId: null, color: null, fixedCost: false, archived: false },
    { id: 'cat-out', name: 'Eating out', kind: 'spending', parentId: null, color: null, fixedCost: false, archived: false },
    { id: 'cat-wolt', name: 'Wolt', kind: 'spending', parentId: 'cat-out', color: null, fixedCost: false, archived: false },
    { id: 'cat-salary', name: 'Salary', kind: 'income', parentId: null, color: null, fixedCost: false, archived: false },
    { id: 'cat-move', name: 'Card payment', kind: 'transfer', parentId: null, color: null, fixedCost: false, archived: false },
  ];
  d.rules = [{ id: 'rule-wolt', priority: 1, match: { descriptionContains: 'WOLT' }, set: { categoryId: 'cat-wolt', payee: 'Wolt' } }];
  d.budgets = { limits: [{ categoryId: null, monthly: 800_000 }, { categoryId: 'cat-out', monthly: 100_000 }], overrides: [{ month: '2026-12', categoryId: 'cat-out', monthly: 150_000 }] };
  d.holdings = [{ id: 'h-savings', name: 'Savings plan', kind: 'asset', currency: 'ILS', inNetWorth: true, valuations: [{ date: '2026-09-30', value: 2_000_000, units: null, unitPrice: null }] }];
  d.notes = [{ id: 'n-trip', start: '2026-10-05', end: '2026-10-07', text: 'Trip to the north', color: 'green' }];
  const tx = (id: string, accountId: string, date: string, amount: number, description: string, categoryId: string | null) =>
    ({ id, accountId, date, amount, currency: 'ILS', description, payee: null, categoryId, note: null, importId: null, fingerprint: null });
  d.months = {
    '2026-09': { month: '2026-09', transactions: [tx('t1', 'acc-bank', '2026-09-01', 1_200_000, 'SALARY SEPT', 'cat-salary'), tx('t2', 'acc-card', '2026-09-03', -25_000, 'SUPERMARKET', 'cat-food')], transfers: [] },
    '2026-10': {
      month: '2026-10',
      transactions: [tx('t3', 'acc-card', '2026-10-02', -8_000, 'WOLT TLV', 'cat-wolt'), tx('t4', 'acc-bank', '2026-10-10', -25_000, 'CARD PAYMENT', 'cat-move'), tx('t5', 'acc-card', '2026-10-10', 25_000, 'PAYMENT RECEIVED', 'cat-move')],
      transfers: [{ id: 'x1', fromTransactionId: 't4', toTransactionId: 't5' }],
    },
  };
  return d;
}

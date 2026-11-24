// Money maths on made-up data (CLAUDE.md rule 20).
import { describe, expect, it } from 'vitest';
import { sampleData } from '../model/sample';
import { emptyData, type AppData, type Transaction } from '../model/types';
import { indexCategories, orderedCategories } from './categories';
import { byCategory, flowByMonth, flowOf, inRange, topPlaces } from './totals';
import { balanceByMonth, countsInWorth, worthOn } from './worth';
import { asOfDay, budgetMonthOf, budgetRange, limitCheck, limitFor, monthNow, regularBills, safeToSpend } from './budget';
import { resolvePeriod, periodChoices, asPeriod } from './periods';
import { findTransactions } from './query';
import { setLimit, setMonthLimit, updateTransactions } from './edits';

const tx = (id: string, date: string, amount: number, description: string, categoryId: string | null, accountId = 'acc-bank'): Transaction =>
  ({ id, accountId, date, amount, currency: 'ILS', description, payee: null, categoryId, note: null, importId: null, fingerprint: null });

describe('periods', () => {
  it('works out periods from today', () => {
    expect(resolvePeriod({ kind: 'recent', months: 12 }, '2026-10-15')).toMatchObject({ start: '2025-10-01', end: '2026-09-30', span: 'Oct 2025 – Sep 2026' });
    expect(resolvePeriod({ kind: 'this-month' }, '2026-02-10')).toMatchObject({ start: '2026-02-01', end: '2026-02-28', months: ['2026-02'] });
    expect(resolvePeriod({ kind: 'last-month' }, '2026-01-10').months).toEqual(['2025-12']);
    expect(resolvePeriod({ kind: 'all' }, '2026-10-15', sampleData()).span).toBe('Sep 2026 – Oct 2026');
  });
  it('offers each year that has data', () => {
    expect(periodChoices(sampleData()).filter((p) => p.kind === 'year')).toEqual([{ kind: 'year', year: 2026 }]);
  });
  it('reads stored periods safely', () => {
    expect(asPeriod({ kind: 'recent', months: 12 })).toEqual({ kind: 'recent', months: 12 });
    expect(asPeriod({ kind: 'recent', months: 7 })).toBeNull();
    expect(asPeriod('nonsense')).toBeNull();
  });
});

describe('totals', () => {
  const d = sampleData();
  const cats = indexCategories(d);
  it('keeps moves between own accounts out of income and spending', () => {
    expect(flowOf(inRange(d, '2026-09-01', '2026-10-31'), cats)).toEqual({ in: 1_200_000, out: 33_000, movedIn: 25_000, movedOut: 25_000 });
  });
  it('rolls sub-categories into their parent', () => {
    const rows = byCategory(inRange(d, '2026-09-01', '2026-10-31'), d, 'spending');
    expect(rows.map((r) => [r.name, r.total])).toEqual([['Groceries', 25_000], ['Eating out', 8_000]]);
    expect(rows[1]!.parts).toEqual([{ id: 'cat-wolt', name: 'Wolt', total: 8_000 }]);
  });
  it('gives each month, empty ones too', () => {
    expect(flowByMonth(d, ['2026-08', '2026-09']).map((m) => [m.month, m.in, m.out])).toEqual([['2026-08', 0, 0], ['2026-09', 1_200_000, 25_000]]);
  });
  it('lists top places by spending', () => {
    expect(topPlaces(inRange(d, '2026-09-01', '2026-10-31'), d).map((p) => p.name)).toEqual(['SUPERMARKET', 'WOLT TLV']);
  });
  it('orders categories with sub-categories under their parent', () => {
    expect(orderedCategories(d).map((c) => c.name)).toEqual(['Eating out', 'Wolt', 'Groceries', 'Salary', 'Card payment']);
  });
  it('finds sub-category transactions when filtering by the parent', () => {
    expect(findTransactions(d, { categoryId: 'cat-out' }).map((t) => t.id)).toEqual(['t3']);
    expect(findTransactions(d, { text: '80.00' }).map((t) => t.id)).toEqual(['t3']);
  });
});

describe('what you have', () => {
  it('leaves out a card whose payments sit in the bank, and counts it once its payments are in', () => {
    const d = sampleData();
    expect(countsInWorth(d, d.accounts[1]!)).toBe(true); // the sample card has its "payment received" line
    const noPay = sampleData();
    noPay.months['2026-10']!.transactions = noPay.months['2026-10']!.transactions.filter((t) => t.id !== 't5');
    expect(countsInWorth(noPay, noPay.accounts[1]!)).toBe(false);
  });
  it('adds balances and holdings, debts counting against', () => {
    const d = sampleData();
    d.holdings.push({ id: 'h-loan', name: 'Car loan', kind: 'debt', currency: 'ILS', inNetWorth: true, valuations: [{ date: '2026-09-01', value: 500_000, units: null, unitPrice: null }] });
    const w = worthOn(d, '2026-10-31');
    // bank 10,000 + 12,000 − 250 = 21,750; card −250 −80 +250 = −80; savings 20,000; loan −5,000
    expect(w.total).toBe(2_175_000 - 8_000 + 2_000_000 - 500_000);
  });
  it('gives the balance at the end of each month', () => {
    expect(balanceByMonth(sampleData(), ['2026-09', '2026-10'], '2026-10-15').map((x) => x.balance)).toEqual([2_200_000 - 25_000, 2_175_000 - 8_000]);
  });
});

describe('budget', () => {
  function withLimits(): AppData {
    let d = sampleData();
    d = setLimit(d, null, 100_000).data;
    d = setLimit(d, 'cat-out', 10_000).data;
    return setMonthLimit(d, '2026-10', 'cat-out', 5_000).data;
  }
  it('uses a one-month limit over the usual one', () => {
    const d = withLimits();
    expect(limitFor(d, '2026-10', 'cat-out')).toBe(5_000);
    expect(limitFor(d, '2026-09', 'cat-out')).toBe(10_000);
    expect(limitFor(d, '2026-09', 'cat-food')).toBeNull();
  });
  it('budget months start on the chosen day', () => {
    expect(budgetMonthOf('2026-10-09', 10)).toBe('2026-09');
    expect(budgetMonthOf('2026-10-10', 10)).toBe('2026-10');
    expect(budgetRange('2026-09', 10)).toEqual(['2026-09-10', '2026-10-09']);
    expect(budgetRange('2026-12', 1)).toEqual(['2026-12-01', '2026-12-31']);
  });
  it('this month so far: every limited type, from the month start to the as-of day', () => {
    const d = withLimits();
    const asOf = asOfDay(d, '2026-10-15');
    expect(asOf).toBe('2026-10-10');
    const n = monthNow(d, asOf, 1);
    expect([n.from, n.to, n.elapsed, n.days]).toEqual(['2026-10-01', '2026-10-31', 10, 31]);
    expect(n.lines.map((l) => [l.name, l.spent, l.limit, l.state, l.special])).toEqual([
      ['All spending', 8_000, 100_000, 'ok', false],
      ['Eating out', 8_000, 5_000, 'over', true],
    ]);
  });
  it('limits month by month: average, limit and months over', () => {
    const rows = limitCheck(withLimits(), ['2026-09', '2026-10'], 1);
    expect(rows.map((r) => [r.name, r.average, r.limit, r.monthsOver])).toEqual([['All spending', 16_500, 100_000, 0], ['Eating out', 4_000, 7_500, 1]]);
  });
  it('finds regular bills the way v1 does, and what is still due', () => {
    const d = emptyData();
    d.accounts = sampleData().accounts.slice(0, 1);
    d.accounts[0]!.openingBalance = 2_000_000;
    for (const m of ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']) {
      d.months[m] = { month: m, transactions: [tx(`r${m}`, `${m}-05`, -300_000, 'RENT', null), tx(`p${m}`, `${m}-15`, -5_000 - (m === '2026-06' ? 200 : 0), 'PHONE/123', null)], transfers: [] };
    }
    d.months['2026-10'] = { month: '2026-10', transactions: [tx('r10', '2026-10-05', -300_000, 'RENT', null)], transfers: [] };
    // A café visited three times a month at the same price is a habit, not a bill.
    for (const m of ['2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09']) for (const day of ['02', '12', '22']) d.months[m]!.transactions.push(tx(`c${m}${day}`, `${m}-${day}`, -2_000, 'CAFE', null));
    const asOf = asOfDay(d, '2026-10-12');
    const bills = regularBills(d, asOf);
    expect(bills.map((b) => [b.name, b.amount, b.next])).toEqual([['PHONE/123', 5_000, '2026-10-15'], ['RENT', 300_000, '2026-11-05']]);
    const s = safeToSpend(d, asOf, 1, bills);
    expect([s.due, s.until, s.daysLeft]).toEqual([5_000, '2026-10-31', 26]);
    expect(s.safe).toBe(s.balance - 5_000);
  });
});

describe('edits', () => {
  it('changes only the months that hold the transactions, and leaves the input alone', () => {
    const d = sampleData();
    const e = updateTransactions(d, ['t3', 't1'], { note: 'x' });
    expect(e.docs.sort()).toEqual(['month:2026-09', 'month:2026-10']);
    expect(d.months['2026-09']!.transactions[0]!.note).toBeNull();
    expect(e.data.months['2026-09']!.transactions[0]!.note).toBe('x');
  });
});

import { deleteNote, saveNote } from './edits';
describe('calendar notes', () => {
  it('adds a note with its dates in order, edits it and deletes it', () => {
    const d = sampleData();
    const a = saveNote(d, { start: '2026-10-09', end: '2026-10-07', text: ' Vacation ', color: 'green' });
    const n = a.data.notes.find((x) => x.id === a.id)!;
    expect(n).toMatchObject({ start: '2026-10-07', end: '2026-10-09', text: 'Vacation' });
    const b = saveNote(a.data, { ...n, text: 'Trip' });
    expect(b.data.notes.filter((x) => x.text === 'Trip')).toHaveLength(1);
    expect(deleteNote(b.data, a.id).data.notes.some((x) => x.id === a.id)).toBe(false);
  });
});

import { deleteHolding, saveHolding } from './edits';
describe('what you own and owe', () => {
  it('keeps a history of values, one per day, and counts debts against net worth', () => {
    let d = sampleData();
    const a = saveHolding(d, { name: 'Car loan', kind: 'debt', inNetWorth: true, value: 1_000_000, date: '2026-09-01' });
    d = saveHolding(a.data, { id: a.id, name: 'Car loan', kind: 'debt', inNetWorth: true, value: 900_000, date: '2026-10-01' }).data;
    d = saveHolding(d, { id: a.id, name: 'Car loan', kind: 'debt', inNetWorth: true, value: 950_000, date: '2026-10-01' }).data;
    expect(d.holdings.find((h) => h.id === a.id)!.valuations.map((v) => v.value)).toEqual([1_000_000, 950_000]);
    expect(worthOn(d, '2026-10-31').holdings.find((h) => h.holding.id === a.id)!.value).toBe(-950_000);
    expect(deleteHolding(d, a.id).data.holdings.some((h) => h.id === a.id)).toBe(false);
  });
});

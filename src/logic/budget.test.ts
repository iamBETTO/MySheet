// v1's own numbers for its made-up demo person (read off v1 on 8 Oct 2026): v2 must give the same.
import { describe, expect, it } from 'vitest';
import demo from '../model/demo.json';
import type { AppData } from '../model/types';
import { asOfDay, limitCheck, monthNow, regularBills, safeToSpend } from './budget';
import { monthsBetween } from './periods';

const data = demo as AppData;

describe('budget numbers match v1', () => {
  const asOf = asOfDay(data, '2026-10-12');
  it('reads the data up to 8 Oct', () => expect(asOf).toBe('2026-10-08'));
  it('this month: ₪5,070 spent of ₪8,000, day 8 of 31', () => {
    const n = monthNow(data, asOf, 1);
    expect([n.lines[0]!.spent, n.lines[0]!.limit, n.elapsed, n.days]).toEqual([507_000, 800_000, 8, 31]);
  });
  it('safe to spend ₪58,600 with ₪150 of bills still due', () => {
    const s = safeToSpend(data, asOf, 1, regularBills(data, asOf));
    expect([s.safe, s.due, s.daysLeft]).toEqual([5_860_000, 15_000, 23]);
  });
  it('over the limit on average on Scooters, Eating out and Groceries in the last 12 months', () => {
    const rows = limitCheck(data, monthsBetween('2025-10', '2026-09'), 1);
    expect(rows.filter((r) => r.limit !== null && r.average > r.limit).map((r) => r.name)).toEqual(['Scooters', 'Eating out', 'Groceries']);
  });
});

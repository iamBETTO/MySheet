import { describe, expect, it } from 'vitest';
import { salvage } from './salvage';
import { sampleData } from './sample';
import { validateAppData } from './validate';

const clone = () => JSON.parse(JSON.stringify(sampleData())) as Record<string, any>;

describe('setting aside what can\'t be read', () => {
  it('the owner\'s case: a value with no date is set aside, the holding and everything else stay', () => {
    const d = clone();
    d.holdings[0].valuations[0].date = '';
    const r = salvage(d)!;
    expect(validateAppData(r.data)).toEqual([]);
    expect(r.setAside).toEqual([{ where: 'holdings[0].valuations[0]', label: 'A value of "Savings plan"', why: 'needs a date and a whole-agorot value', record: d.holdings[0].valuations[0] }]);
    expect((r.data as any).holdings[0].name).toBe('Savings plan');
    expect((r.data as any).holdings[0].valuations).toEqual([]);
    expect((r.data as any).months).toEqual(sampleData().months);
    expect(d.holdings[0].valuations).toHaveLength(1);
  });

  it('takes out only the broken transactions, from the end of a list first so the right ones go', () => {
    const d = clone();
    const tx = d.months['2026-10'].transactions;
    const count = tx.length;
    tx[0].amount = 1.5;
    tx[2].date = '2026-09-01';
    const r = salvage(d)!;
    expect(validateAppData(r.data)).toEqual([]);
    expect((r.data as any).months['2026-10'].transactions).toHaveLength(count - 2);
    expect(r.setAside.map((s) => s.where)).toEqual(['months.2026-10.transactions[2]', 'months.2026-10.transactions[0]']);
    expect(r.setAside[0]!.label).toMatch(/^A transaction on 2026-09-01: "/);
  });

  it('a bad setting goes back to its default; a broken list item or whole list is set aside', () => {
    const d = clone();
    d.settings.budgetMonthStartDay = 40;
    d.accounts[1].kind = 'piggy bank';
    d.notes = 'nonsense';
    const r = salvage(d)!;
    expect(validateAppData(r.data)).toEqual([]);
    expect((r.data as any).settings.budgetMonthStartDay).toBe(1);
    expect((r.data as any).accounts).toHaveLength(1);
    expect((r.data as any).notes).toEqual([]);
    expect(r.setAside.map((s) => s.label).sort()).toEqual(['The account "Credit card"', 'Your notes', 'Your settings']);
  });

  it('never cuts down data from a newer version, or something that is not data', () => {
    const d = clone();
    d.settings.schemaVersion = 99;
    expect(salvage(d)).toBeNull();
    expect(salvage('hello')).toBeNull();
  });

  it('leaves valid data as it is', () => {
    expect(salvage(clone())).toEqual({ data: clone(), setAside: [] });
  });
});

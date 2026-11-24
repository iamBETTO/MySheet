import { describe, expect, it } from 'vitest';
import { validateAppData } from './validate';
import { fingerprints, hash, newId } from './ids';
import { emptyData } from './types';
import { sampleData } from './sample';

describe('validateAppData', () => {
  it('accepts empty data and the sample', () => {
    expect(validateAppData(emptyData())).toEqual([]);
    expect(validateAppData(sampleData())).toEqual([]);
  });
  it('rejects amounts that are not whole agorot', () => {
    const d = sampleData();
    d.months['2026-09']!.transactions[0]!.amount = 12.5;
    expect(validateAppData(d).join()).toContain('months.2026-09.transactions[0].amount');
  });
  it('rejects a transaction filed under the wrong month', () => {
    const d = sampleData();
    d.months['2026-09']!.transactions[0]!.date = '2026-10-01';
    expect(validateAppData(d).join()).toContain('should be a day in this month');
  });
  it('rejects unknown kinds and a newer data version', () => {
    const d = sampleData() as unknown as { accounts: { kind: string }[]; settings: { schemaVersion: number } };
    d.accounts[0]!.kind = 'piggy bank';
    d.settings.schemaVersion = 9;
    const problems = validateAppData(d).join();
    expect(problems).toContain('unknown account kind');
    expect(problems).toContain('schemaVersion');
  });
  it('checks saved page layouts', () => {
    const d = sampleData();
    d.settings.layouts = { home: { cards: [{ id: 'home-kpis', width: 'half', hidden: false }] } };
    expect(validateAppData(d)).toEqual([]);
    d.settings.layouts.spending = { cards: [{ id: 'spending-from', width: 'full', hidden: false }] };
    d.settings.layouts.budget = { cards: [{ id: 'budget-limits', width: 'half', hidden: true }] };
    expect(validateAppData(d)).toEqual([]);
    (d.settings.layouts.home!.cards[0] as unknown as { width: string }).width = 'third';
    expect(validateAppData(d).join()).toContain('needs id, width (half or full) and hidden');
    (d.settings as unknown as { layouts: unknown }).layouts = { garage: { cards: [] } };
    expect(validateAppData(d).join()).toContain('unknown page');
  });
  it('rejects something that is not data at all', () => expect(validateAppData('hello')).toEqual(['data: should be a record']));
});

describe('ids and fingerprints', () => {
  it('makes different ids', () => expect(new Set(Array.from({ length: 200 }, newId)).size).toBe(200));
  it('hashes the same text the same way every time', () => expect(hash('abc')).toBe(hash('abc')));
  it('keeps two identical coffees on the same day apart', () => {
    const coffee = { accountId: 'a', date: '2026-10-01', amount: -1200, description: 'CAFE' };
    const [first, second] = fingerprints([coffee, { ...coffee }]);
    expect(first).not.toBe(second);
  });
  it('gives the same line the same fingerprint when the file is imported again', () => {
    const lines = [{ accountId: 'a', date: '2026-10-01', amount: -1200, description: 'CAFE  ' }];
    expect(fingerprints(lines)).toEqual(fingerprints([{ ...lines[0]!, description: 'CAFE' }]));
  });
  it('tells accounts apart', () => {
    const l = { accountId: 'a', date: '2026-10-01', amount: -1200, description: 'CAFE' };
    expect(fingerprints([l])[0]).not.toBe(fingerprints([{ ...l, accountId: 'b' }])[0]);
  });
});

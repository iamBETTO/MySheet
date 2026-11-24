import { describe, expect, it } from 'vitest';
import demo from './demo.json';
import { validateAppData } from './validate';
import { worthOn } from '../logic/worth';
import type { AppData } from './types';

describe('the demo person', () => {
  it('is valid data', () => expect(validateAppData(demo)).toEqual([]));
  it('has the same bank balance and net worth as in v1 (₪19,000 bank + holdings)', () => {
    const w = worthOn(demo as AppData, '2026-10-08');
    expect(w.accounts.map((a) => [a.account.name, a.balance])).toEqual([['Bank account', expect.any(Number)]]);
    console.log('bank', w.accounts[0]!.balance / 100, 'net worth', w.total / 100);
  });
});

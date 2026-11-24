import { beforeEach, describe, expect, it } from 'vitest';
import { appData, commit, history, toast } from './data';
import { sampleData } from '../model/sample';

describe('saving changes', () => {
  beforeEach(() => { appData.value = { state: 'ready', data: sampleData() }; history.value = []; toast.value = null; });

  it('refuses a change that would make the data unreadable, and says so', () => {
    const before = appData.value;
    const bad = sampleData();
    bad.holdings[0]!.valuations[0]!.date = '';
    commit(bad, ['holdings'], 'Saved Savings plan');
    expect(appData.value).toBe(before);
    expect(history.value).toEqual([]);
    expect(toast.value?.tone).toBe('problem');
    expect(toast.value?.text).toContain('couldn’t be saved');
  });

  it('keeps a valid change', () => {
    const next = sampleData();
    next.holdings[0]!.name = 'Savings';
    commit(next, ['holdings'], 'Saved Savings');
    expect(appData.value).toEqual({ state: 'ready', data: next });
    expect(history.value).toHaveLength(1);
  });
});

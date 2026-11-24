import { describe, expect, it } from 'vitest';
import { migrateSettings } from './migrate';
import { SCHEMA_VERSION } from './types';

describe('format upgrades', () => {
  const v1 = { schemaVersion: 1, currency: 'ILS', locale: 'en-IL', budgetMonthStartDay: 10, startWithAmountsHidden: true };
  it('upgrades version 1 settings: same choices, no saved layouts yet', () => {
    expect(migrateSettings(v1)).toEqual({ ...v1, schemaVersion: SCHEMA_VERSION, layouts: {} });
    expect(v1.schemaVersion).toBe(1);
  });
  it('leaves current settings as the same object', () => {
    const now = { ...v1, schemaVersion: SCHEMA_VERSION, layouts: {} };
    expect(migrateSettings(now)).toBe(now);
  });
  it('leaves newer or odd versions for validation to report', () => {
    const newer = { ...v1, schemaVersion: 99 };
    expect(migrateSettings(newer)).toBe(newer);
    expect(migrateSettings('nonsense')).toBe('nonsense');
  });
});

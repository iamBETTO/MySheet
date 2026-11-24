import { describe, expect, it } from 'vitest';
import { formatDay, formatTimestamp } from './dates';

describe('dates', () => {
  it('shows a day without time-zone shifts', () => expect(formatDay('2026-01-01')).toBe('1 Jan 2026'));
  it('shows the day of a timestamp', () => expect(formatTimestamp('2026-10-12T12:00:00Z')).toBe('12 Oct 2026'));
  it('leaves an unreadable timestamp as it is', () => expect(formatTimestamp('soon')).toBe('soon'));
});

import { formatWeekday } from './dates';
describe('weekday', () => {
  it('names the weekday', () => expect(formatWeekday('2026-10-12')).toBe('Mon 12 Oct 2026'));
});

import { v1Date } from './dates';
describe('v1 date styles', () => {
  it('writes dates the way v1 does', () => {
    expect(['day', 'dayYear', 'dayShort', 'month', 'monthLong', 'monthOnly', 'monthAxis', 'weekday'].map((s) => v1Date('2026-10-08', s as Parameters<typeof v1Date>[1])))
      .toEqual(['Oct 8', 'Oct 8, 2026', "Oct 8 '26", 'Oct 2026', 'October 2026', 'October', "Oct '26", 'Thursday, October 8, 2026']);
  });
});

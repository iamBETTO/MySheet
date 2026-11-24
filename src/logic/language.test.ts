// Amounts, dates and period names in a given language (plans/translation.md, step 3). English stays exactly as v1 wrote
// it; Hebrew follows the browser's own Hebrew styles, with the shekel sign after the number (decision ms-d60).
import { describe, expect, it } from 'vitest';
import { formatShekels, hiddenAmount } from './money';
import { formatDay, formatWeekday, v1Date, weekdayHeads } from './dates';
import { monthName, resolvePeriod } from './periods';

describe('writing in a language', () => {
  it('writes amounts the English way unchanged, and the Hebrew way with the sign after the number', () => {
    expect(formatShekels(1234.5)).toBe('₪1,234.50');
    expect(formatShekels(-80, { decimals: 0 })).toBe('−₪80');
    expect(formatShekels(1234.5, {}, 'he')).toBe('‏‎1,234.50 ‏₪');
    expect(formatShekels(-80, { decimals: 0 }, 'he')).toBe('‏‎−80 ‏₪');
    expect(formatShekels(420, { decimals: 0, signed: true }, 'he')).toContain('+420');
    expect([hiddenAmount(), hiddenAmount('he')]).toEqual(['₪ ••••', '•••• ₪']);
  });

  it('writes dates in v1\'s English styles unchanged, and in Hebrew the browser\'s way', () => {
    expect(v1Date('2026-10-08', 'day')).toBe('Oct 8');
    expect(v1Date('2026-10-08', 'weekday')).toBe('Thursday, October 8, 2026');
    expect(formatDay('2026-10-12')).toBe('12 Oct 2026');
    expect(v1Date('2026-10-08', 'day', 'he')).toBe('8 באוק׳');
    expect(v1Date('2026-10', 'monthLong', 'he')).toBe('אוקטובר 2026');
    expect(v1Date('2026-10-08', 'weekday', 'he')).toBe('יום חמישי, 8 באוקטובר 2026');
    expect(formatDay('2026-10-12', 'he')).toBe('12 באוק׳ 2026');
    expect(formatWeekday('2026-10-12', 'he')).toContain('12 באוק׳ 2026');
  });

  it('heads the calendar\'s columns from Sunday in each language', () => {
    expect(weekdayHeads()).toEqual({ long: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], short: ['S', 'M', 'T', 'W', 'T', 'F', 'S'] });
    expect(weekdayHeads('he').short).toEqual(['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']);
  });

  it('names periods and their months in the language', () => {
    const r = resolvePeriod({ kind: 'recent', months: 12 }, '2026-10-15');
    expect([r.label, r.span]).toEqual(['Last 12 months', 'Oct 2025 – Sep 2026']);
    expect(resolvePeriod({ kind: 'recent', months: 12 }, '2026-10-15', undefined, 'he').span).toBe('אוק׳ 2025 – ספט׳ 2026');
    expect(resolvePeriod({ kind: 'month', month: '2026-03' }, '2026-10-15', undefined, 'he').label).toBe('מרץ 2026');
    expect(monthName('2026-03', false, 'he')).toBe('מרץ 2026');
  });
});

import { describe, expect, it } from 'vitest';
import { formatShekels, fromMinor } from './money';

describe('formatShekels', () => {
  it('shows two decimals by default', () => expect(formatShekels(1234.5)).toBe('₪1,234.50'));
  it('uses a real minus sign before the currency', () => expect(formatShekels(-80, { decimals: 0 })).toBe('−₪80'));
  it('adds a plus only when asked', () => {
    expect(formatShekels(12, { decimals: 0 })).toBe('₪12');
    expect(formatShekels(12, { decimals: 0, signed: true })).toBe('+₪12');
  });
  it('never shows a sign on zero, even after rounding', () => {
    expect(formatShekels(0, { signed: true })).toBe('₪0.00');
    expect(formatShekels(-0.004)).toBe('₪0.00');
  });
  it('rounds for overviews', () => expect(formatShekels(1999.6, { decimals: 0 })).toBe('₪2,000'));
});

describe('fromMinor', () => {
  it('turns agorot into shekels', () => expect(fromMinor(123456)).toBe(1234.56));
});

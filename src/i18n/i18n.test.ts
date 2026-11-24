import { describe, expect, it } from 'vitest';
import { pluralForm, text, type Key } from './text';
import { en } from './en';
import { he } from './he';
import type { Message } from './types';
import { directionOf, languageOf } from './languages';

describe('translated text', () => {
  it('fills named slots and writes numbers the language\'s way', () => {
    expect(text('en', 'arrange.open', { page: 'Spending' })).toBe('Arrange Spending');
    expect(text('en', 'arrange.hiddenCount', { n: 1 })).toBe('1 card hidden');
    expect(text('en', 'arrange.hiddenCount', { n: 1234 })).toBe('1,234 cards hidden');
  });

  it('picks plural forms by each language\'s rules, Hebrew\'s "two" included', () => {
    const forms = { one: 'יום אחד', two: 'יומיים', other: '{n} ימים' };
    expect([1, 2, 3, 10].map((n) => pluralForm('he', forms, n))).toEqual(['יום אחד', 'יומיים', '{n} ימים', '{n} ימים']);
    expect([1, 2, 3].map((n) => pluralForm('en', { one: 'day', other: 'days' }, n))).toEqual(['day', 'days', 'days']);
    expect(pluralForm('he', { other: 'x' }, 1), 'a missing form falls back to "other"').toBe('x');
  });

  it('has every text in Hebrew too, with the same slots as the English', () => {
    const slots = (m: Message) => [...new Set((typeof m === 'string' ? [m] : Object.values(m)).join(' ').match(/\{\w+\}/g) ?? [])].sort();
    const keys = Object.keys(en) as Key[];
    expect(keys.filter((k) => he[k] === undefined), 'not in Hebrew yet').toEqual([]);
    expect(keys.filter((k) => he[k] && slots(he[k]).join() !== slots(en[k]).join()), 'slots differ').toEqual([]);
    expect(text('he', 'arrange.open', { page: 'תקציב' })).toBe('סידור תקציב');
    expect(text('he', 'calendar.summary', { month: 'מרץ', total: '₪5', n: 2 })).toBe('מרץ: יצאו ₪5 ביומיים');
  });

  it('knows each language and its direction from the saved locale', () => {
    expect(languageOf('en-IL')).toBe('en');
    expect(languageOf('he-IL')).toBe('he');
    expect(languageOf('fr-FR')).toBe('en');
    expect(directionOf('he')).toBe('rtl');
    expect(directionOf('en')).toBe('ltr');
  });
});

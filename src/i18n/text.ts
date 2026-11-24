// Translated text without the current language (plans/translation.md): plain functions the money maths can use
// with a language it is given (rule 8). The screens use `t`, `rich` and `list` from ./index instead.
import { en } from './en';
import { he } from './he';
import type { Language } from './languages';
import type { Message, PluralForms } from './types';

export type Key = keyof typeof en;
export type Values = Record<string, string | number>;

const TEXTS: Record<Language, Partial<Record<Key, Message>>> = { en, he };
const plurals = new Map<Language, Intl.PluralRules>();
const numbers = new Map<Language, Intl.NumberFormat>();

/** The plural form for a count, by the language's rules; "other" when the language has no form of its own. */
export function pluralForm(lang: Language, forms: PluralForms, n: number): string {
  if (!plurals.has(lang)) plurals.set(lang, new Intl.PluralRules(lang));
  const category = plurals.get(lang)!.select(n);
  return (category === 'one' || category === 'two' ? forms[category] : undefined) ?? forms.other;
}

export function numberText(lang: Language, n: number): string {
  if (!numbers.has(lang)) numbers.set(lang, new Intl.NumberFormat(lang));
  return numbers.get(lang)!.format(n);
}

/** The text with its slots still open: the right language (or English) and the right plural form. */
export function template(lang: Language, key: Key, values?: Values): string {
  const message = TEXTS[lang][key] ?? en[key];
  if (typeof message === 'string') return message;
  const n = values?.n;
  return pluralForm(lang, message, typeof n === 'number' ? n : Number(n ?? 0));
}

/** A text in a given language, slots filled; numbers are written the language's way ("1,234"). */
export function text(lang: Language, key: Key, values?: Values): string {
  return template(lang, key, values).replace(/\{(\w+)\}/g, (slot, name: string) => {
    const v = values?.[name];
    return v === undefined ? slot : typeof v === 'number' ? numberText(lang, v) : v;
  });
}

// Translated text in the current language (plans/translation.md). `t` gives a text; `rich` puts elements (bold words,
// amounts) into a sentence's slots; `list` joins elements the language's way. Slots ({page}, {n}) and plural forms
// work as in ./text, with the browser's own rules (Intl), so no library is needed (rule 11). Missing Hebrew falls back
// to English. Right to left, each value put into a slot sits in its own direction isolate, so a name from the data
// in another script ("Eating out" in a Hebrew sentence) stays whole (Unicode bidi isolates, as Fluent does).
import type { ComponentChildren } from 'preact';
import { language } from '../state/language';
import { directionOf, type Language } from './languages';
import { numberText, template, text, type Key, type Values } from './text';

export { pluralForm, text, type Key, type Values } from './text';

const rtl = () => directionOf(language.value) === 'rtl';
const isolated = (v: string) => `\u2068${v}\u2069`;

/** A text in the current language. */
export function t(key: Key, values?: Values): string {
  if (!values || !rtl()) return text(language.value, key, values);
  return text(language.value, key, Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v === 'string' ? isolated(v) : v])));
}

/** A sentence with elements in its slots, e.g. rich('x', { amount: <Money … /> }); plain values work as in `t`. */
export function rich(key: Key, parts: Record<string, ComponentChildren>, values?: Values): ComponentChildren[] {
  const lang = language.value;
  return template(lang, key, values).split(/(\{\w+\})/).filter((s) => s !== '').map((piece) => {
    const name = /^\{(\w+)\}$/.exec(piece)?.[1];
    if (name === undefined) return piece;
    if (name in parts) return rtl() ? ['\u2068', parts[name], '\u2069'] : parts[name];
    const v = values?.[name];
    return v === undefined ? piece : typeof v === 'number' ? numberText(lang, v) : rtl() ? isolated(v) : v;
  });
}

// English lists keep v1's "A, B and C" (no comma before "and").
const LIST_LOCALE: Record<Language, string> = { en: 'en-GB', he: 'he' };

/** Elements joined the language's way: "A, B and C" / "A, B ו-C". */
export function list(items: ComponentChildren[]): ComponentChildren[] {
  const marks = items.map((_, i) => `\u0000${i}\u0000`);
  return new Intl.ListFormat(LIST_LOCALE[language.value], { type: 'conjunction' }).formatToParts(marks)
    .map((p) => (p.type !== 'element' ? p.value : rtl() ? ['\u2068', items[Number(p.value.slice(1, -1))], '\u2069'] : items[Number(p.value.slice(1, -1))]));
}

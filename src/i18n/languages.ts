// The languages MySheet speaks (plans/translation.md). English and Hebrew first (decision ms-d58); a language is the
// first part of the saved locale ('en-IL' → English, 'he-IL' → Hebrew).

export type Language = 'en' | 'he';

/** Right-to-left languages: the page's direction flips for these. */
const RIGHT_TO_LEFT: readonly Language[] = ['he'];

/** The language of a saved locale; anything MySheet doesn't speak yet falls back to English. */
export function languageOf(locale: string): Language {
  return locale.toLowerCase().startsWith('he') || locale.toLowerCase().startsWith('iw') ? 'he' : 'en';
}

export function directionOf(lang: Language): 'ltr' | 'rtl' {
  return RIGHT_TO_LEFT.includes(lang) ? 'rtl' : 'ltr';
}

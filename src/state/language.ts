// The language MySheet speaks (plans/translation.md): the person's own saved locale, also while the demo person is
// shown (the demo follows the person, not the other way round). English until the data has loaded.
import { computed } from '@preact/signals';
import { appData } from './data';
import { directionOf, languageOf, type Language } from '../i18n/languages';

export const language = computed<Language>(() => {
  const s = appData.value;
  return s.state === 'ready' ? languageOf(s.data.settings.locale) : 'en';
});

export const direction = computed(() => directionOf(language.value));

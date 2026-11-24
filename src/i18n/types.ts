// The shape of a translated text (plans/translation.md).

/** A text whose wording depends on a count {n}: one of these forms, chosen by the language's plural rules. */
export interface PluralForms {
  one?: string;
  two?: string;
  other: string;
}

export type Message = string | PluralForms;

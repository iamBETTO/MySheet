// The name a transaction is shown by: the person's own name for it, or the bank's text without reference numbers.
import type { Transaction } from '../model/types';

/** 'ישראכרט-דיירקט/5022/13009998' → 'ישראכרט-דיירקט'. Keeps text that is only numbers as it is. */
export function tidyDescription(text: string): string {
  const parts = text.split('/').map((p) => p.trim()).filter((p) => p && !/^[\d\s.-]+$/.test(p));
  return parts.length ? parts.join(' · ') : text.trim();
}

export function displayName(t: Pick<Transaction, 'payee' | 'description'>): string {
  return t.payee ?? tidyDescription(t.description);
}

/**
 * A key under which bank texts that differ only in numbers count as the same place:
 * 'LIME*4 RIDES' and 'LIME*2 RIDES' match, as do 'PAYMENT/123' and 'PAYMENT/456'.
 */
export function similarKey(description: string): string {
  return tidyDescription(description).toLowerCase().replace(/[‎‏‪-‮]/g, '').replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
}

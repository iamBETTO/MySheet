// Money formatting. Plain functions only: data in, text out, no page access (CLAUDE.md rule 8).
import type { Language } from '../i18n/languages';

/** Amounts are stored as whole agorot (1 ₪ = 100) so sums never drift; this converts for display. */
export function fromMinor(minor: number): number {
  return minor / 100;
}

/**
 * Formats an amount of shekels for display, e.g. 1234.5 → "₪1,234.50", -80 → "−₪80".
 * Uses a real minus sign. `decimals: 0` rounds for overviews. In Hebrew the sign follows the number, Hebrew's usual way
 * (decision ms-d60): "1,234.50 ₪"; marks keep the minus with the number inside right-to-left text.
 */
export function formatShekels(amount: number, opts: { decimals?: 0 | 2; signed?: boolean } = {}, lang: Language = 'en'): string {
  const decimals = opts.decimals ?? 2;
  const abs = Math.abs(amount);
  const body = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(abs);
  const isZero = Number(body.replace(/,/g, '')) === 0;
  const sign = isZero ? '' : amount < 0 ? '−' : opts.signed ? '+' : '';
  return lang === 'he' ? `\u200F\u200E${sign}${body}\u00A0\u200F₪` : `${sign}₪${body}`;
}

/** What a hidden amount shows: the currency sign and dots, in the language's order. */
export function hiddenAmount(lang: Language = 'en'): string {
  return lang === 'he' ? '•••• ₪' : '₪ ••••';
}

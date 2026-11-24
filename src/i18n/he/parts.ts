// Hebrew texts: shared parts (plans/translation.md, step 5). Drafted by Claude for the owner to check; keys match en/parts.ts.
import type { Key } from '../text';
import type { Message } from '../types';

export const parts = {
  "parts.tapForTransactions": "אפשר להקיש כדי לראות את התנועות",
  "parts.overBy": "חריגה של {amount}",
  "parts.limitOf": "תקרה {amount}",
  "parts.nothingInPeriod": "אין כלום בתקופה הזו.",
  "parts.showTransactionsOf": "{name}. הצגת התנועות",
  "parts.perMonth": "{amount} לחודש",
  "parts.nothingToCompare": "אין מה להשוות.",
  "parts.paceLabel": "{name}: {spent} מתוך {limit}, יום {day} מתוך {days}",
  "parts.overLimit": "מעל התקרה",
  "parts.aheadOfPace": "מעל הקצב",
  "parts.onPace": "בקצב",
  "parts.foldShow": "הצגה",
  "parts.foldHide": "הסתרה",
  "parts.amountHidden": "הסכום מוסתר",
  "parts.noCategory": "ללא קטגוריה",
  "parts.allCategories": "כל הקטגוריות",
  "parts.archived": "{name} (בארכיון)",
  "parts.kind.spending": "הוצאה",
  "parts.kind.income": "הכנסה",
  "parts.kind.transfer": "העברה בין החשבונות שלך",
  "parts.nothingYet": "עדיין אין כלום",
} satisfies Partial<Record<Key, Message>>;

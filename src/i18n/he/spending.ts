// Hebrew texts: Spending (plans/translation.md, step 5). Drafted by Claude for the owner to check; keys match en/spending.ts.
import type { Key } from '../text';
import type { Message } from '../types';

export const spending = {
  "spending.page": "הוצאות",
  "spending.card.went": "לאן הכסף הלך",
  "spending.card.from": "מאיפה הכסף הגיע",
  "spending.card.moves": "העברות בין החשבונות שלך",
  "spending.card.places": "המקומות המובילים",
  "spending.wentCompare": "לחודש: {period} (הפס העליון) מול {other} (באפור). השינוי הגדול ביותר ראשון.",
  "spending.wentTap": "אפשר להקיש על שורה כדי לראות את התנועות שלה.",
  "spending.fromCompare": "לחודש: {period} מול {other}. השינוי הגדול ביותר ראשון.",
  "spending.fromTap": "אפשר להקיש על שורה כדי לראות אותה.",
  "spending.movesNote": "בין החשבונות שלך, כמו יתרה באפליקציית תשלומים או חיסכון. לא הכנסה ולא הוצאה.",
  "spending.placesCard": "20 המקומות המובילים שלך בכרטיס. ביקורים = מספר החיובים. אפשר להקיש על מקום כדי לראות אותם.",
  "spending.placesAll": "20 המקומות המובילים שלך. ביקורים = מספר התשלומים. אפשר להקיש על מקום כדי לראות אותם.",
  "spending.placesTable": "המקומות המובילים, אפשר לגלול",
  "spending.place": "מקום",
  "spending.type": "קטגוריה",
  "spending.visits": "ביקורים",
  "spending.total": "סה״כ",
  "spending.noCardPurchases": "אין רכישות בכרטיס בתקופה הזו.",
  "spending.biggestChange": "השינוי הגדול ביותר: {name} {change}.",
  "spending.perMonthChange": "{change} לחודש",
} satisfies Partial<Record<Key, Message>>;

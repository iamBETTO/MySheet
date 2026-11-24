// Hebrew texts: common (plans/translation.md, step 5). Drafted by Claude for the owner to check; keys match en/common.ts.
import type { Key } from '../text';
import type { Message } from '../types';

export const common = {
  "common.done": "סיום",
  "common.cancel": "ביטול",
  "common.close": "סגירה",
  "common.save": "שמירה",
  "common.delete": "מחיקה",
  "common.undo": "ביטול הפעולה",
  "common.dismiss": "סגירת ההודעה",
  "common.refused": "לא ניתן היה לשמור את השינוי כי חלק ממנו לא הושלם. שום דבר לא השתנה.",
  "common.undone": "בוטל: {change}",
  "common.saveFailed": "לא ניתן היה לשמור את השינוי, ולכן הוא בוטל. כדאי לבדוק את החיבור ולנסות שוב.",
  "common.unreadable": "לא ניתן היה לקרוא את הנתונים השמורים שלך, ולכן שום דבר לא מוצג ושום דבר לא ישתנה. אפשר לשחזר מגיבוי, או לספר ל-Claude.",
  "common.unreachable": "אין גישה לנתונים השמורים שלך. אפשר לטעון מחדש את הדף כדי לנסות שוב.",
  "common.arrowTo": "←",
} satisfies Partial<Record<Key, Message>>;

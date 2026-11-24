// Hebrew texts: Calendar (plans/translation.md, step 5). Drafted by Claude for the owner to check; keys match en/calendar.ts.
import type { Key } from '../text';
import type { Message } from '../types';

export const calendar = {
  "calendar.previous": "החודש הקודם",
  "calendar.next": "החודש הבא",
  "calendar.summary": { one: "{month}: יצאו {total} ביום אחד", two: "{month}: יצאו {total} ביומיים", other: "{month}: יצאו {total} ב-{n} ימים" },
  "calendar.biggest": "; היום הגדול ביותר היה {date} ({amount}).",
  "calendar.daySpent": "יצאו {amount}",
  "calendar.dayCameIn": "נכנסו {amount}",
  "calendar.dayNote": "פתק: {text}",
  "calendar.range": "{from} – {to}",
  "calendar.howToRead": "ככל שצבע היום חזק יותר, כך יצא באותו יום יותר כסף. אפשר להקיש על יום כדי לראות אותו.",
  "calendar.pickDay": "בחירת יום",
  "calendar.pickDayNote": "אפשר להקיש על יום בלוח כדי לראות מה קנית.",
  "calendar.editNote": "עריכת הפתק: {text}",
  "calendar.dayTotals": { one: "תנועה אחת · יצאו {spent}", other: "{n} תנועות · יצאו {spent}" },
  "calendar.dayCame": " · נכנסו {amount}",
  "calendar.nothing": "אין כלום ביום הזה.",
  "calendar.dayTable": "{day}, אפשר לגלול",
  "calendar.description": "תיאור",
  "calendar.type": "קטגוריה",
  "calendar.amount": "סכום",
  "calendar.ownMoney": "{type} (הכסף שלך)",
  "calendar.addNote": "הוספת פתק",
} satisfies Partial<Record<Key, Message>>;

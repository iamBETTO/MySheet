// English texts: calendar (plans/translation.md). Keys are "calendar.<what>".
import type { Message } from '../types';

export const calendar = {
  "calendar.previous": "Previous month",
  "calendar.next": "Next month",
  "calendar.summary": { one: "{month}: {total} spent on {n} day", other: "{month}: {total} spent on {n} days" },
  "calendar.biggest": "; the biggest day was {date} ({amount}).",
  "calendar.daySpent": "spent {amount}",
  "calendar.dayCameIn": "came in {amount}",
  "calendar.dayNote": "note: {text}",
  "calendar.range": "{from} – {to}",
  "calendar.howToRead": "The stronger a day’s color, the more was spent that day. Tap a day to see it.",
  "calendar.pickDay": "Pick a day",
  "calendar.pickDayNote": "Tap a day in the calendar to see what you bought.",
  "calendar.editNote": "Edit note: {text}",
  "calendar.dayTotals": { one: "{n} transaction · spent {spent}", other: "{n} transactions · spent {spent}" },
  "calendar.dayCame": " · came in {amount}",
  "calendar.nothing": "Nothing on this day.",
  "calendar.dayTable": "{day}, scrollable",
  "calendar.description": "Description",
  "calendar.type": "Type",
  "calendar.amount": "Amount",
  "calendar.ownMoney": "{type} (own money)",
  "calendar.addNote": "Add a note",
} satisfies Record<string, Message>;

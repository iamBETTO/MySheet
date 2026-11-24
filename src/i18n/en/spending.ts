// English texts: spending (plans/translation.md). Keys are "spending.<what>".
import type { Message } from '../types';

export const spending = {
  "spending.page": "Spending",
  "spending.card.went": "Where it went",
  "spending.card.from": "Where it came from",
  "spending.card.moves": "Your own money moving",
  "spending.card.places": "Top places",
  "spending.wentCompare": "Per month: {period} (top bar) vs {other} (grey). Biggest change first.",
  "spending.wentTap": "Tap a row to see those transactions.",
  "spending.fromCompare": "Per month: {period} vs {other}. Biggest change first.",
  "spending.fromTap": "Tap a row to see it.",
  "spending.movesNote": "Between your own accounts, like a payment-app balance or savings. Not income, not spending.",
  "spending.placesCard": "Your top 20 on the card. Visits = number of charges. Tap a place to see them.",
  "spending.placesAll": "Your top 20. Visits = number of payments. Tap a place to see them.",
  "spending.placesTable": "Top places, scrollable",
  "spending.place": "Place",
  "spending.type": "Type",
  "spending.visits": "Visits",
  "spending.total": "Total",
  "spending.noCardPurchases": "No card purchases in this period.",
  "spending.biggestChange": "Biggest change: {name} {change}.",
  "spending.perMonthChange": "{change}/mo",
} satisfies Record<string, Message>;

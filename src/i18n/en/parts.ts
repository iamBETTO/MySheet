// English texts: parts (plans/translation.md). Keys are "parts.<what>".
import type { Message } from '../types';

export const parts = {
  "parts.tapForTransactions": "Tap to see transactions",
  "parts.overBy": "over by {amount}",
  "parts.limitOf": "limit {amount}",
  "parts.nothingInPeriod": "Nothing in this period.",
  "parts.showTransactionsOf": "{name}. Show transactions",
  "parts.perMonth": "{amount}/mo",
  "parts.nothingToCompare": "Nothing to compare.",
  "parts.paceLabel": "{name}: {spent} of {limit}, day {day} of {days}",
  "parts.overLimit": "Over limit",
  "parts.aheadOfPace": "Ahead of pace",
  "parts.onPace": "On pace",
  "parts.foldShow": "Show",
  "parts.foldHide": "Hide",
  "parts.amountHidden": "amount hidden",
  "parts.noCategory": "No category",
  "parts.allCategories": "All categories",
  "parts.archived": "{name} (archived)",
  "parts.kind.spending": "Spending",
  "parts.kind.income": "Money in",
  "parts.kind.transfer": "Own money moving",
  "parts.nothingYet": "Nothing yet",
} satisfies Record<string, Message>;

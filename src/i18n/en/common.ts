// English texts: common (plans/translation.md). Keys are "common.<what>".
import type { Message } from '../types';

export const common = {
  "common.done": "Done",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.save": "Save",
  "common.delete": "Delete",
  "common.undo": "Undo",
  "common.dismiss": "Dismiss message",
  "common.refused": "That change couldn’t be saved because part of it isn’t complete. Nothing was changed.",
  "common.undone": "Undone: {change}",
  "common.saveFailed": "That change couldn’t be saved, so it was put back. Check your connection and try again.",
  "common.unreadable": "Your saved data couldn’t be read, so nothing is shown and nothing will be changed. Restore a backup, or tell Claude.",
  "common.unreachable": "Couldn’t reach your saved data. Reload the page to try again.",
  "common.arrowTo": "→",
} satisfies Record<string, Message>;

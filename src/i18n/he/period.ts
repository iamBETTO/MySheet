// Hebrew texts: period names (plans/translation.md, step 5). Drafted by Claude for the owner to check; keys match en/period.ts.
import type { Key } from '../text';
import type { Message } from '../types';

export const period = {
  "period.thisMonth": "החודש",
  "period.lastMonth": "החודש שעבר",
  "period.recent": { one: "החודש האחרון", two: "החודשיים האחרונים", other: "{n} החודשים האחרונים" },
  "period.allTime": "כל הזמן",
  "period.span": "{from} – {to}",
} satisfies Partial<Record<Key, Message>>;

// English texts: period (plans/translation.md). Keys are "period.<what>".
import type { Message } from '../types';

export const period = {
  "period.thisMonth": "This month",
  "period.lastMonth": "Last month",
  "period.recent": { one: "Last {n} month", other: "Last {n} months" },
  "period.allTime": "All time",
  "period.span": "{from} – {to}",
} satisfies Record<string, Message>;

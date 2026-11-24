// v1's pace bar: how much of a limit is spent, coloured by pace, with a tick where even spending would be today.
import type { PaceLine } from '../../logic/budget';
import { moneyText } from '../Money';
import { t, type Key } from '../../i18n';

const FILL = { over: 'var(--chart-critical)', ahead: 'var(--color-warn)', ok: 'var(--chart-out)' } as const;

export function PaceTrack({ line, elapsed, days }: { line: PaceLine; elapsed: number; days: number }) {
  return (
    <span class="rm-pace-track" role="img" aria-label={t('parts.paceLabel', { name: line.name, spent: moneyText(line.spent), limit: moneyText(line.limit), day: elapsed, days })}>
      <span class="rm-pace-fill" style={{ width: `${Math.min(100, (100 * Math.max(0, line.spent)) / (line.limit || 1))}%`, background: FILL[line.state] }} />
      <span class="rm-pace-mark" style={{ insetInlineStart: `${(100 * elapsed) / days}%` }} />
    </span>
  );
}

export const PILL = { over: ['over', 'parts.overLimit'], ahead: ['ahead', 'parts.aheadOfPace'], ok: ['ok', 'parts.onPace'] } as const satisfies Record<string, readonly [string, Key]>;

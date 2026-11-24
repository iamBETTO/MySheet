// v1's bar lists (Spending): a row per type with a thin bar and the total, or, when comparing, two bars and the change.
import { Money, deltaText } from '../Money';
import { t, rich } from '../../i18n';

export interface BarRow {
  key: string;
  name: string;
  /** Minor units; negative = refunds outweighed spending (green, as in v1). */
  amount: number;
  perMonth: number;
  color: string;
}

export function BarRows({ rows, onPick, empty }: { rows: BarRow[]; onPick: (key: string) => void; empty?: string }) {
  if (!rows.length) return <div class="rm-note">{empty ?? t('parts.nothingInPeriod')}</div>;
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.amount)));
  return (
    <div class="rm-bars">
      {rows.map((r) => (
        <button key={r.key} type="button" class="rm-bar" aria-label={t('parts.showTransactionsOf', { name: r.name })} onClick={() => onPick(r.key)}>
          <span class="n"><bdi dir="auto">{r.name}</bdi></span>
          <span class="t"><span class="tr"><span class="f" style={{ width: `${(100 * Math.abs(r.amount)) / max}%`, background: r.amount < 0 ? 'var(--color-ok)' : r.color }} /></span></span>
          <span class={`v${r.amount < 0 ? ' up-good' : ''}`}><Money minor={r.amount} round /> <small>{rich('parts.perMonth', { amount: <Money minor={r.perMonth} round /> })}</small></span>
        </button>
      ))}
    </div>
  );
}

export interface CompareRow {
  key: string;
  name: string;
  /** Per month in the chosen period (a) and the other one (b), minor units. */
  a: number;
  b: number;
  color: string;
}

/** Biggest change first. `outIsBad`: for spending, more is worse (red); for money in, more is better (green). */
export function CompareRows({ rows, onPick, outIsBad }: { rows: CompareRow[]; onPick: (key: string) => void; outIsBad: boolean }) {
  if (!rows.length) return <div class="rm-note">{t('parts.nothingToCompare')}</div>;
  const max = Math.max(1, ...rows.flatMap((r) => [Math.abs(r.a), Math.abs(r.b)]));
  return (
    <div class="rm-bars">
      {rows.map((r) => {
        const change = r.a - r.b, good = outIsBad ? change < 0 : change > 0;
        return (
          <button key={r.key} type="button" class="rm-bar cmp" aria-label={t('parts.showTransactionsOf', { name: r.name })} onClick={() => onPick(r.key)}>
            <span class="n"><bdi dir="auto">{r.name}</bdi></span>
            <span class="t">
              {[[r.a, r.color], [r.b, 'var(--chart-muted)']].map(([v, c], i) => (
                <span key={i} class="tr"><span class="f" style={{ width: `${(100 * Math.abs(v as number)) / max}%`, background: (v as number) < 0 ? 'var(--color-ok)' : (c as string) }} /></span>
              ))}
            </span>
            <span class="v"><Money minor={r.a} round /><small> vs <Money minor={r.b} round /></small></span>
            <span class={`dl ${change === 0 ? '' : good ? 'up-good' : 'up-bad'}`}>{deltaText(change)}</span>
          </button>
        );
      })}
    </div>
  );
}

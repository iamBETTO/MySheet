// Every amount on screen goes through here, so the privacy eye hides them all (UX rule 8). As in v1, a hidden amount is
// blurred in place (class "m", see .rm.priv .m) so nothing jumps, and screen readers hear "amount hidden".
import { amountsHidden } from '../state/view';
import { fromMinor } from '../logic/money';
import { t } from '../i18n';
import { formatShekels, hiddenAmount } from './format';

interface Props {
  minor: number;
  /** Rounded to whole shekels, for overviews (UX rule 7). */
  round?: boolean;
  /** Shows + for money in. */
  signed?: boolean;
  /** On very narrow screens (large text on a phone) a whole amount drops its ".00": same value, less width. */
  trimWhole?: boolean;
  class?: string;
}

export function Money({ minor, round, signed, trimWhole, class: cls }: Props) {
  const text = formatShekels(fromMinor(minor), { decimals: round ? 0 : 2, signed });
  if (trimWhole && !round && !amountsHidden.value && minor % 100 === 0) {
    const whole = formatShekels(fromMinor(minor), { decimals: 0, signed });
    return <span class={`m${cls ? ` ${cls}` : ''}`}><span class="amt-full">{text}</span><span class="amt-whole" aria-hidden="true">{whole}</span></span>;
  }
  if (amountsHidden.value) {
    return (
      <span class={`m${cls ? ` ${cls}` : ''}`}>
        <span aria-hidden="true">{text}</span><span class="rm-sr">{t('parts.amountHidden')}</span>
      </span>
    );
  }
  return <span class={`m${cls ? ` ${cls}` : ''}`}>{text}</span>;
}

/** Plain text of an amount for chart labels, tooltips and messages: "₪ ••••" while amounts are hidden (v1). */
export function moneyText(minor: number, round = true): string {
  return amountsHidden.value ? hiddenAmount() : formatShekels(fromMinor(minor), { decimals: round ? 0 : 2 });
}

/** A signed change, e.g. "+₪420", for comparisons; "••••" while hidden. */
export function deltaText(minor: number): string {
  if (amountsHidden.value) return '••••';
  return minor === 0 ? `±${formatShekels(0, { decimals: 0 })}` : formatShekels(fromMinor(minor), { decimals: 0, signed: true });
}

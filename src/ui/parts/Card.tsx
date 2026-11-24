// v1's card: a solid panel with a title line and, on most cards, a chevron that folds the body away. Folded cards stay
// folded while moving between places; "Show hidden sections" in the header opens them all again.
import { t } from '../../i18n';
import type { ComponentChildren } from 'preact';
import { folded, toggleFold } from '../../state/view';

interface Props {
  /** Unique, starting with the place (e.g. "home-kpis"), so the header knows which place has folded cards. */
  id: string;
  title: ComponentChildren;
  /** Short text on the right of the title line (cards without a fold). */
  aside?: ComponentChildren;
  /** Cards that can't fold (v1: "This month", Calendar, the day card). */
  noFold?: boolean;
  children: ComponentChildren;
  class?: string;
}

export function Card({ id, title, aside, noFold, children, class: cls }: Props) {
  const isFolded = !noFold && folded.value.has(id);
  const headId = `${id}-h`;
  return (
    <section class={`rm-card${isFolded ? ' folded' : ''}${cls ? ` ${cls}` : ''}`} id={id} aria-labelledby={headId}>
      <div class="rm-ch">
        <h2 id={headId}>{title}</h2>
        {aside !== undefined && <span class="aside">{aside}</span>}
        {/* Named with the card's title ("Hide Bank balance"), so a screen reader can tell the chevrons apart. */}
        {!noFold && <button type="button" class="rm-fold" aria-expanded={!isFolded} aria-controls={`${id}-body`} aria-labelledby={`${id}-fold ${headId}`} onClick={() => toggleFold(id)}><span id={`${id}-fold`} class="rm-sr">{t(isFolded ? 'parts.foldShow' : 'parts.foldHide')}</span></button>}
      </div>
      {!isFolded && <div class="rm-body" id={`${id}-body`}>{children}</div>}
    </section>
  );
}

/** v1's row: a label with an optional grey line under it, and a value on the right. */
export function Row({ label, sub, value, valueClass }: { label: ComponentChildren; sub?: ComponentChildren; value: ComponentChildren; valueClass?: string }) {
  return (
    <div class="rm-row">
      <span class="lbl">{label}{sub ? <small>{sub}</small> : null}</span>
      <span class={`val${valueClass ? ` ${valueClass}` : ''}`}>{value}</span>
    </div>
  );
}

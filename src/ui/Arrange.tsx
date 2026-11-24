// Arrange a page (plans/arrange-pages.md): each card becomes a tile with a handle and buttons. Drag the handle (mouse
// or touch, see useDragOrder) or press the arrow keys on it; Earlier / Later / width / Hide do the same with a tap. Changes are a draft
// until Done, which saves them as one change with Undo. Cancel drops the draft; Reset puts the default back.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { CardPlace, PageId } from '../model/types';
import { commit, current } from '../state/data';
import { DEFAULT_LAYOUTS, isDefault, moveCard, setCardHidden, setCardWidth, setPageLayout, stepCard } from '../logic/layout';
import { Icon } from './Icons';
import { useWide } from './useWide';
import { useDragOrder } from './useDragOrder';
import { t } from '../i18n';

interface Props {
  page: PageId;
  /** What each card is called on its tile. */
  names: Record<string, string>;
  start: CardPlace[];
  pageName: string;
  onClose: () => void;
}

export function Arrange({ page, names, start, pageName, onClose }: Props) {
  const [cards, setCards] = useState<CardPlace[]>(start);
  const [said, setSaid] = useState('');
  const [focusId, setFocusId] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const latest = useRef(cards);
  latest.current = cards;
  // Width only matters where cards sit side by side, so its button is shown there only.
  const wide = useWide();
  const shown = cards.filter((c) => !c.hidden);
  const hidden = cards.filter((c) => c.hidden);
  const name = (id: string) => names[id] ?? id;
  const where = (next: CardPlace[], id: string) => {
    const s = next.filter((c) => !c.hidden);
    return t('arrange.position', { card: name(id), at: s.findIndex((c) => c.id === id) + 1, count: s.length });
  };
  const change = (next: CardPlace[], message: string, keepFocus?: string) => {
    setCards(next);
    setSaid(message);
    if (keepFocus) setFocusId(keepFocus);
  };
  const step = (id: string, by: -1 | 1, focus: 'handle' | 'button') => {
    const next = stepCard(cards, id, by);
    change(next, where(next, id), `${focus}:${id}`);
  };

  // Reordering moves the elements, which can drop keyboard focus: put it back on the control that was used, before
  // the next key press is handled (so quick presses all reach the same card).
  useLayoutEffect(() => {
    if (!focusId) return;
    const [kind, id] = focusId.split(/:(.*)/s) as [string, string];
    root.current?.querySelector<HTMLElement>(kind === 'handle' ? `[data-handle="${id}"]` : `[data-tile="${id}"] .arrange-step:not(:disabled)`)?.focus();
    setFocusId(null);
  }, [focusId]);
  useEffect(() => { root.current?.querySelector<HTMLElement>('#arrange-h')?.focus(); }, []);

  const done = () => {
    const edit = setPageLayout(current(), page, cards);
    if (JSON.stringify(edit.data.settings.layouts) !== JSON.stringify(current().settings.layouts)) commit(edit.data, edit.docs, t('arrange.saved', { page: pageName }));
    onClose();
  };

  // Dragging (useDragOrder): the held card goes to a place among the other shown cards; hidden ones keep theirs.
  const { dragging, handle } = useDragOrder({
    root,
    order: shown.map((c) => c.id),
    onMove: (id, index) => setCards((now) => {
      const others = now.filter((c) => !c.hidden && c.id !== id);
      const target = others[index];
      return moveCard(now, id, target ? now.filter((c) => c.id !== id).findIndex((c) => c.id === target.id) : now.length - 1);
    }),
    onEnd: (id) => setSaid(where(latest.current, id)),
  });

  return (
    <div class="arrange" ref={root}>
      <section class="rm-card arrange-bar" aria-labelledby="arrange-h">
        <h2 id="arrange-h" tabIndex={-1}>{t('arrange.heading', { page: pageName })}</h2>
        <p class="rm-note">{wide
          ? t('arrange.helpWide')
          : t('arrange.helpNarrow')}</p>
        <div class="actions">
          <button type="button" class="btn btn-primary" onClick={done}>{t('common.done')}</button>
          <button type="button" class="btn" onClick={onClose}>{t('common.cancel')}</button>
          <button type="button" class="link-btn" disabled={isDefault(page, cards)} onClick={() => change(DEFAULT_LAYOUTS[page].map((c) => ({ ...c })), t('arrange.resetSaid', { page: pageName }))}>{t('arrange.reset')}</button>
        </div>
      </section>

      {shown.map((c, i) => (
        <div key={c.id} class={`tile ${c.width}${dragging === c.id ? ' dragging' : ''}`} data-tile={c.id}>
          <section class="arrange-tile" aria-label={name(c.id)}>
            <div class="arrange-head">
              <button type="button" class="drag-handle" data-handle={c.id} aria-label={t('arrange.move', { card: name(c.id) })} aria-describedby="arrange-how"
                {...handle(c.id)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') { e.preventDefault(); step(c.id, -1, 'handle'); }
                  else if (e.key === 'ArrowDown') { e.preventDefault(); step(c.id, 1, 'handle'); }
                }}>
                <Icon name="grip" />
              </button>
              <h3 class="arrange-name">{name(c.id)}</h3>
            </div>
            <div class="arrange-actions">
              <button type="button" class="btn btn-small arrange-step" disabled={i === 0} aria-label={t('arrange.earlierLabel', { card: name(c.id) })} onClick={() => step(c.id, -1, 'button')}><Icon name="up" />{t('arrange.earlier')}</button>
              <button type="button" class="btn btn-small arrange-step" disabled={i === shown.length - 1} aria-label={t('arrange.laterLabel', { card: name(c.id) })} onClick={() => step(c.id, 1, 'button')}><Icon name="down" />{t('arrange.later')}</button>
              {wide && <button type="button" class="btn btn-small" aria-pressed={c.width === 'full'} onClick={() => change(setCardWidth(cards, c.id, c.width === 'full' ? 'half' : 'full'), t(c.width === 'full' ? 'arrange.halfSaid' : 'arrange.fullSaid', { card: name(c.id) }))}>{t('arrange.fullWidth')}</button>}
              <button type="button" class="btn btn-small" aria-label={t('arrange.hideLabel', { card: name(c.id) })} onClick={() => change(setCardHidden(cards, c.id, true), t('arrange.hiddenSaid', { card: name(c.id) }))}><Icon name="eyeOff" />{t('arrange.hide')}</button>
            </div>
          </section>
        </div>
      ))}

      {hidden.length > 0 && (
        <section class="rm-card" aria-labelledby="hidden-h">
          <h2 id="hidden-h">{t('arrange.hiddenCards')}</h2>
          <ul class="rows">
            {hidden.map((c) => (
              <li key={c.id} class="row row-static">
                <span class="row-main"><span class="row-title">{name(c.id)}</span></span>
                <button type="button" class="btn btn-small" aria-label={t('arrange.showLabel', { card: name(c.id) })} onClick={() => change(setCardHidden(cards, c.id, false), t('arrange.shownSaid', { card: name(c.id) }))}><Icon name="eye" />{t('arrange.show')}</button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p class="rm-sr" id="arrange-how">{t('arrange.keys')}</p>
      <p class="rm-sr" role="status" aria-live="polite">{said}</p>
    </div>
  );
}

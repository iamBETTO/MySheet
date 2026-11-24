// How a page's cards are arranged (plans/arrange-pages.md): order, half or full width, hidden. Plain functions: a
// layout in, a new layout out. Saved layouts come from the person's data and are merged with the page's default, so a
// card added in a later update shows up, and a card that no longer exists is simply dropped.
import type { AppData, CardPlace, CardWidth, PageId, PageLayout } from '../model/types';
import type { Edit } from './edits';

/** Each page's cards in their original order and width (v1's order; widths from the computer layout, 6 Nov 2026). */
export const DEFAULT_LAYOUTS: Record<PageId, readonly CardPlace[]> = {
  home: [
    { id: 'home-glance', width: 'half', hidden: false },
    { id: 'home-kpis', width: 'half', hidden: false },
    { id: 'home-flow', width: 'half', hidden: false },
    { id: 'home-balance', width: 'half', hidden: false },
    { id: 'home-have', width: 'full', hidden: false },
  ],
  // v1 shows "Where it went" and "Where it came from" as one pair; they are two cards that start side by side (ms-d57).
  spending: [
    { id: 'spending-went', width: 'half', hidden: false },
    { id: 'spending-from', width: 'half', hidden: false },
    { id: 'spending-moves', width: 'half', hidden: false },
    { id: 'spending-places', width: 'half', hidden: false },
  ],
  budget: [
    { id: 'budget-pace', width: 'half', hidden: false },
    { id: 'budget-bills', width: 'half', hidden: false },
    { id: 'budget-limits', width: 'full', hidden: false },
  ],
};

/** The cards to show, in order: the saved layout where there is one, with any new default cards put in place. */
export function resolveLayout(page: PageId, saved: PageLayout | undefined): CardPlace[] {
  const defaults = DEFAULT_LAYOUTS[page];
  if (!saved) return defaults.map((c) => ({ ...c }));
  const known = new Set(defaults.map((c) => c.id));
  const seen = new Set<string>();
  const out: CardPlace[] = [];
  for (const c of saved.cards) {
    if (!known.has(c.id) || seen.has(c.id)) continue;
    seen.add(c.id);
    out.push({ id: c.id, width: c.width, hidden: c.hidden });
  }
  // A card the saved layout doesn't know goes right after the card it follows in the default (or first).
  defaults.forEach((c, i) => {
    if (seen.has(c.id)) return;
    const before = defaults.slice(0, i).reverse().find((d) => seen.has(d.id));
    const at = before ? out.findIndex((x) => x.id === before.id) + 1 : 0;
    out.splice(at, 0, { ...c });
    seen.add(c.id);
  });
  return out;
}

/** Moves a card to a new position (0 = first), counting all cards, shown or hidden. */
export function moveCard(cards: readonly CardPlace[], id: string, to: number): CardPlace[] {
  const from = cards.findIndex((c) => c.id === id);
  if (from < 0) return [...cards];
  const out = [...cards];
  const [card] = out.splice(from, 1);
  out.splice(Math.max(0, Math.min(out.length, to)), 0, card!);
  return out;
}

/** Moves a card one place earlier (-1) or later (+1) among the cards that are shown. */
export function stepCard(cards: readonly CardPlace[], id: string, step: -1 | 1): CardPlace[] {
  const shown = cards.filter((c) => !c.hidden);
  const i = shown.findIndex((c) => c.id === id);
  const neighbour = shown[i + step];
  if (i < 0 || !neighbour) return [...cards];
  return moveCard(cards, id, cards.findIndex((c) => c.id === neighbour.id));
}

export function setCardWidth(cards: readonly CardPlace[], id: string, width: CardWidth): CardPlace[] {
  return cards.map((c) => (c.id === id ? { ...c, width } : c));
}

export function setCardHidden(cards: readonly CardPlace[], id: string, hidden: boolean): CardPlace[] {
  return cards.map((c) => (c.id === id ? { ...c, hidden } : c));
}

export function isDefault(page: PageId, cards: readonly CardPlace[]): boolean {
  const d = DEFAULT_LAYOUTS[page];
  return d.length === cards.length && d.every((c, i) => c.id === cards[i]!.id && c.width === cards[i]!.width && c.hidden === cards[i]!.hidden);
}

/** Saves a page's layout. The default layout is saved as "no layout", so later changes to the default reach it. */
export function setPageLayout(data: AppData, page: PageId, cards: readonly CardPlace[]): Edit {
  const layouts = { ...data.settings.layouts };
  if (isDefault(page, cards)) delete layouts[page];
  else layouts[page] = { cards: cards.map((c) => ({ ...c })) };
  return { data: { ...data, settings: { ...data.settings, layouts } }, docs: ['settings'] };
}

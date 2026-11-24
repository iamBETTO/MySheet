import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUTS, isDefault, moveCard, resolveLayout, setCardHidden, setCardWidth, setPageLayout, stepCard } from './layout';
import { sampleData } from '../model/sample';
import type { CardPlace } from '../model/types';

const ids = (cards: CardPlace[]) => cards.map((c) => c.id.replace('home-', ''));
const home = () => resolveLayout('home', undefined);

describe('page layouts', () => {
  it('starts with the default: v1\'s order', () => {
    expect(ids(home())).toEqual(['glance', 'kpis', 'flow', 'balance', 'have']);
    expect(isDefault('home', home())).toBe(true);
  });

  it('keeps a saved order and widths, drops cards that no longer exist and adds new ones where the default has them', () => {
    const saved = { cards: [
      { id: 'home-have', width: 'half' as const, hidden: false },
      { id: 'home-gone', width: 'full' as const, hidden: false },
      { id: 'home-glance', width: 'full' as const, hidden: true },
      { id: 'home-have', width: 'full' as const, hidden: false },
    ] };
    const out = resolveLayout('home', saved);
    expect(ids(out)).toEqual(['have', 'glance', 'kpis', 'flow', 'balance']);
    expect(out[0]).toEqual({ id: 'home-have', width: 'half', hidden: false });
    expect(out[1]!.hidden).toBe(true);
  });

  it('moves a card to any place, and one step among the cards shown', () => {
    expect(ids(moveCard(home(), 'home-have', 0))).toEqual(['have', 'glance', 'kpis', 'flow', 'balance']);
    expect(ids(moveCard(home(), 'home-glance', 99))).toEqual(['kpis', 'flow', 'balance', 'have', 'glance']);
    const withHidden = setCardHidden(home(), 'home-kpis', true);
    expect(ids(stepCard(withHidden, 'home-glance', 1))).toEqual(['kpis', 'flow', 'glance', 'balance', 'have']);
    expect(ids(stepCard(withHidden, 'home-flow', -1))).toEqual(['flow', 'glance', 'kpis', 'balance', 'have']);
    expect(ids(stepCard(home(), 'home-glance', -1))).toEqual(ids(home()));
    expect(ids(stepCard(home(), 'home-have', 1))).toEqual(ids(home()));
  });

  it('changes width and hides or shows a card', () => {
    expect(setCardWidth(home(), 'home-kpis', 'full')[1]).toEqual({ id: 'home-kpis', width: 'full', hidden: false });
    expect(setCardHidden(home(), 'home-flow', true)[2]!.hidden).toBe(true);
  });

  it('saves a changed layout in the settings, and the default as no layout', () => {
    const data = sampleData();
    const changed = setPageLayout(data, 'home', moveCard(home(), 'home-have', 0));
    expect(changed.docs).toEqual(['settings']);
    expect(changed.data.settings.layouts.home!.cards[0]!.id).toBe('home-have');
    expect(data.settings.layouts).toEqual({});
    const back = setPageLayout(changed.data, 'home', [...DEFAULT_LAYOUTS.home]);
    expect(back.data.settings.layouts).toEqual({});
  });

  it('Spending and Budget start in v1\'s order, Spending\'s pair as two half cards side by side', () => {
    const spending = resolveLayout('spending', undefined), budget = resolveLayout('budget', undefined);
    expect(spending.map((c) => `${c.id.replace('spending-', '')} ${c.width}`)).toEqual(['went half', 'from half', 'moves half', 'places half']);
    expect(budget.map((c) => `${c.id.replace('budget-', '')} ${c.width}`)).toEqual(['pace half', 'bills half', 'limits full']);
  });

  it('each page keeps its own layout', () => {
    const data = sampleData();
    const a = setPageLayout(data, 'spending', setCardHidden(resolveLayout('spending', undefined), 'spending-from', true));
    const b = setPageLayout(a.data, 'budget', moveCard(resolveLayout('budget', undefined), 'budget-limits', 0));
    expect(Object.keys(b.data.settings.layouts).sort()).toEqual(['budget', 'spending']);
    expect(resolveLayout('spending', b.data.settings.layouts.spending).find((c) => c.id === 'spending-from')!.hidden).toBe(true);
    expect(resolveLayout('budget', b.data.settings.layouts.budget)[0]!.id).toBe('budget-limits');
    expect(isDefault('home', resolveLayout('home', b.data.settings.layouts.home))).toBe(true);
  });
});

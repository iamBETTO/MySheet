// A page's cards in the person's arrangement (plans/arrange-pages.md, plans/arrange-spending-budget.md): each shown card
// in a tile, then "Arrange <page>" and how many cards are hidden; or, while arranging, the Arrange mode. Used by Home,
// Spending and Budget, so the three behave the same.
import { useState } from 'preact/hooks';
import type { JSX } from 'preact';
import type { AppData, PageId } from '../model/types';
import { resolveLayout } from '../logic/layout';
import { Arrange } from './Arrange';
import { t } from '../i18n';

interface Props {
  data: AppData;
  page: PageId;
  /** The page's name in "Arrange Home" and "Arranging Home". */
  pageName: string;
  /** What each card is called while arranging. */
  names: Record<string, string>;
  /** Each card, by its id. */
  cards: Record<string, JSX.Element>;
}

export function ArrangedCards({ data, page, pageName, names, cards }: Props) {
  const [arranging, setArranging] = useState(false);
  const layout = resolveLayout(page, data.settings.layouts[page]);
  if (arranging) return <Arrange page={page} pageName={pageName} names={names} start={layout} onClose={() => setArranging(false)} />;
  const hiddenCount = layout.filter((c) => c.hidden).length;
  return (
    <>
      {layout.filter((c) => !c.hidden).map((c) => <div key={c.id} class={`tile ${c.width}`}>{cards[c.id]}</div>)}
      <p class="arrange-open">
        <button type="button" class="rm-linkbtn" onClick={() => setArranging(true)}>{t('arrange.open', { page: pageName })}</button>
        {hiddenCount > 0 && <span class="rm-note"> · {t('arrange.hiddenCount', { n: hiddenCount })}</span>}
      </p>
    </>
  );
}

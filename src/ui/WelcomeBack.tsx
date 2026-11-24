// After a break (a week or more), a calm summary of what happened since the last visit, with a way to catch up
// or skip it. No streaks, no guilt (UX rule 5).
import type { AppData, IsoDate } from '../model/types';
import { previousVisit, showTransactions, welcomeDismissed } from '../state/view';
import { flowOf, inRange } from '../logic/totals';
import { Money } from './Money';
import { t, rich } from '../i18n';
import { formatDay, indexCategories } from './format';

export function WelcomeBack({ data, today }: { data: AppData; today: IsoDate }) {
  const since = previousVisit.value;
  if (!since || welcomeDismissed.value) return null;
  const days = Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${since}T00:00:00Z`)) / 86_400_000);
  if (days < 7) return null;
  const list = inRange(data, since, today);
  const flow = flowOf(list, indexCategories(data));
  return (
    <section class="card welcome" aria-labelledby="wb-h">
      <h2 id="wb-h">{t('notice.welcome')}</h2>
      <p>{rich('notice.since', { date: formatDay(since), news: list.length ? rich('notice.news', { out: <Money minor={flow.out} round />, in: <Money minor={flow.in} round /> }, { n: list.length }) : t('notice.noNews') })}</p>
      <div class="actions">
        {list.length > 0 && <button type="button" class="btn btn-primary" onClick={() => showTransactions({ start: since, end: today })}>{t('notice.seeNew')}</button>}
        <button type="button" class="btn" onClick={() => { welcomeDismissed.value = true; }}>{t('notice.skip')}</button>
      </div>
    </section>
  );
}

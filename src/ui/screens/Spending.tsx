// Spending, as v1 (V1_REFERENCE.md, Spending): Where it went, Where it came from, Your own money moving and Top places,
// each tapping into Activity; with a comparison, two bars per row and the change. The cards follow the person's
// arrangement (plans/arrange-spending-budget.md); the comparison sentence stays on top.
import { useMemo } from 'preact/hooks';
import type { AppData, IsoDate } from '../../model/types';
import { compareWith, period, showTransactions } from '../../state/view';
import { inRange, topPlaces } from '../../logic/totals';
import { hasTransactions, monthsWithData, periodSummary, typeTotals, type TypeTotal } from '../../logic/overview';
import { Money, deltaText } from '../Money';
import { Card } from '../parts/Card';
import { BarRows, CompareRows, type CompareRow } from '../parts/bars';
import { Legend } from '../parts/charts';
import { ArrangedCards } from '../ArrangedCards';
import type { JSX } from 'preact';
import { t, rich, type Key } from '../../i18n';
import { formatNumber, indexCategories, resolvePeriod } from '../format';

/** What Spending's cards are called while arranging. */
const CARD_NAMES: Record<string, Key> = { 'spending-went': 'spending.card.went', 'spending-from': 'spending.card.from', 'spending-moves': 'spending.card.moves', 'spending-places': 'spending.card.places' };

export function Spending({ data, asOf }: { data: AppData; asOf: IsoDate }) {
  const p = resolvePeriod(period.value, asOf, data);
  const q = compareWith.value ? resolvePeriod(compareWith.value, asOf, data) : null;
  const list = useMemo(() => inRange(data, p.start, p.end), [data, p.start, p.end]);
  const other = useMemo(() => (q ? inRange(data, q.start, q.end) : []), [data, q?.start, q?.end]);
  const n = Math.max(1, monthsWithData(data, p).length), m = q ? Math.max(1, monthsWithData(data, q).length) : 1;
  const cats = indexCategories(data);
  const cards = useMemo(() => new Set(data.accounts.filter((a) => a.kind === 'card').map((a) => a.id)), [data]);
  const pick = (key: string) => showTransactions({ categoryId: key === 'none' ? 'none' : key });

  const out = typeTotals(data, list, 'spending', n), inc = typeTotals(data, list, 'income', n), moved = typeTotals(data, list, 'transfer', n);
  const compare = (kind: 'spending' | 'income' | 'transfer'): CompareRow[] => {
    const a = typeTotals(data, list, kind, n), b = typeTotals(data, other, kind, m);
    const keys = [...new Set([...a, ...b].map((r) => r.key))];
    const find = (rows: TypeTotal[], k: string) => rows.find((r) => r.key === k);
    return keys.map((k) => ({ key: k, name: (find(a, k) ?? find(b, k))!.name, a: find(a, k)?.perMonth ?? 0, b: find(b, k)?.perMonth ?? 0, color: (find(a, k) ?? find(b, k))!.color }))
      .sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b) || y.a - x.a);
  };

  const places = topPlaces(list, data, 20, cards.size ? cards : undefined);
  const s = periodSummary(data, p, asOf), sq = q ? periodSummary(data, q, asOf) : null;
  const biggest = q ? compare('spending').filter((r) => r.a !== r.b)[0] : null;

  // Before the first import each card keeps its title and says "Nothing yet" (plans/empty-screens.md).
  const cardsById: Record<string, JSX.Element> = !hasTransactions(data) ? Object.fromEntries(Object.entries(CARD_NAMES).map(([id, key]) => [id,
    <Card id={id} title={t(key)}><p class="rm-note">{t('parts.nothingYet')}</p></Card>])) : {
    'spending-went': (
      <Card id="spending-went" title={t('spending.card.went')}>
        <p class="rm-note">{q ? t('spending.wentCompare', { period: p.label, other: q.label }) : t('spending.wentTap')}</p>
        {q && <Legend items={[{ name: p.label, color: 'var(--chart-out)' }, { name: q.label, color: 'var(--chart-muted)' }]} />}
        {q ? <CompareRows rows={compare('spending')} onPick={pick} outIsBad /> : <BarRows rows={out} onPick={pick} />}
      </Card>
    ),
    'spending-from': (
      <Card id="spending-from" title={t('spending.card.from')}>
        <p class="rm-note">{q ? t('spending.fromCompare', { period: p.label, other: q.label }) : t('spending.fromTap')}</p>
        {q && <Legend items={[{ name: p.label, color: 'var(--chart-in)' }, { name: q.label, color: 'var(--chart-muted)' }]} />}
        {q ? <CompareRows rows={compare('income')} onPick={pick} outIsBad={false} /> : <BarRows rows={inc} onPick={pick} />}
      </Card>
    ),
    'spending-moves': (
      <Card id="spending-moves" title={t('spending.card.moves')}>
        <p class="rm-note">{t('spending.movesNote')}</p>
        {q ? <CompareRows rows={compare('transfer')} onPick={pick} outIsBad={false} /> : <BarRows rows={moved} onPick={pick} />}
      </Card>
    ),
    'spending-places': (
      <Card id="spending-places" title={t('spending.card.places')}>
        <p class="rm-note">{t(cards.size ? 'spending.placesCard' : 'spending.placesAll')}</p>
        <div class="rm-tablebox" style="max-height:440px" tabIndex={0} role="region" aria-label={t('spending.placesTable')}>
          <table>
            <thead><tr><th>{t('spending.place')}</th><th class="hide-narrow">{t('spending.type')}</th><th class="num">{t('spending.visits')}</th><th class="num">{t('spending.total')}</th></tr></thead>
            <tbody>
              {!places.length && <tr><td colSpan={4} class="rm-note">{t('spending.noCardPurchases')}</td></tr>}
              {places.map((pl) => {
                const max = places[0]!.total || 1;
                return (
                  <tr key={pl.key} class="click" tabIndex={0} onClick={() => showTransactions({ place: pl.key, placeName: pl.name })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showTransactions({ place: pl.key, placeName: pl.name }); } }}>
                    <td><bdi dir="auto">{pl.name}</bdi></td>
                    <td class="hide-narrow">{cats.name(pl.categoryId)}</td>
                    <td class="num">{formatNumber(pl.count)}</td>
                    <td class="num"><div class="cellbar"><i style={{ width: `${Math.max(2, (70 * pl.total) / max)}px`, background: cats.byId.get(pl.categoryId ?? '')?.color ?? 'var(--chart-out)' }} /><Money minor={pl.total} round /></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    ),
  };

  return (
    <>
      {q && sq && hasTransactions(data) && (
        <p class="rm-take" style="margin:0">{rich('common.compareTake', { period: <b>{p.label}</b>, other: <b>{q.label}</b>, out: <b class={s.avgOut - sq.avgOut > 0 ? 'up-bad' : 'down-good'}>{deltaText(s.avgOut - sq.avgOut)}</b>, in: <b class={s.avgIn - sq.avgIn >= 0 ? 'up-good' : 'down-bad'}>{deltaText(s.avgIn - sq.avgIn)}</b> })}
          {biggest && <> {rich('spending.biggestChange', { name: <b><bdi dir="auto">{biggest.name}</bdi></b>, change: <b class={biggest.a > biggest.b ? 'up-bad' : 'down-good'}>{t('spending.perMonthChange', { change: deltaText(biggest.a - biggest.b) })}</b> })}</>}</p>
      )}
      <ArrangedCards data={data} page="spending" pageName={t('spending.page')} names={Object.fromEntries(Object.entries(CARD_NAMES).map(([id, key]) => [id, t(key)]))} cards={cardsById} />
    </>
  );
}

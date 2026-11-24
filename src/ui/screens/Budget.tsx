// Budget, as v1 (V1_REFERENCE.md, Budget): the month-start setting, This month so far, Bills and safe to spend, and
// Limits month by month. v2 adds setting and changing limits in place (Add a limit, Change limit), and arranging the
// cards (plans/arrange-spending-budget.md); the month-start setting stays on top.
import { t, list, rich, type Key } from '../../i18n';
import { useMemo, useState } from 'preact/hooks';
import type { AppData, Id, IsoDate, MonthKey } from '../../model/types';
import { commit } from '../../state/data';
import { period, showTransactions } from '../../state/view';
import { budgetRange, regularBills, safeToSpend, type LimitCheck } from '../../logic/budget';
import { setBudgetMonthStartDay } from '../../logic/edits';
import { Money, moneyText } from '../Money';
import { Card, Row } from '../parts/Card';
import { hasTransactions } from '../../logic/overview';
import { MiniBars } from '../parts/charts';
import { PaceTrack, PILL } from '../parts/pace';
import { LimitSheet, type Editing } from './LimitSheet';
import { ArrangedCards } from '../ArrangedCards';
import { limitCheck, monthNow, resolvePeriod, v1Date } from '../format';

/** What Budget's cards are called while arranging. */
const CARD_NAMES: Record<string, Key> = { 'budget-pace': 'budget.card.pace', 'budget-bills': 'budget.card.bills', 'budget-limits': 'budget.card.limits' };

export function Budget({ data, asOf }: { data: AppData; asOf: IsoDate }) {
  const start = data.settings.budgetMonthStartDay;
  const [editing, setEditing] = useState<Editing | null>(null);
  const n = monthNow(data, asOf, start);
  const empty = !hasTransactions(data);
  const addLimit = () => setEditing({ categoryId: null, isNew: true });
  return (
    <>
      <p class="rm-mstart">
        <label for="mstart">{t('budget.monthStarts')}</label>
        <select class="rm-select" id="mstart" value={String(start)} onChange={(e) => {
          const v = Number((e.currentTarget as HTMLSelectElement).value);
          const x = setBudgetMonthStartDay(data, v);
          commit(x.data, x.docs, t('budget.monthStartsSaved', { day: v }));
        }}>
          {Array.from({ length: 28 }, (_, i) => <option key={i} value={String(i + 1)}>{i + 1}</option>)}
        </select>
      </p>
      <ArrangedCards data={data} page="budget" pageName={t('budget.page')} names={Object.fromEntries(Object.entries(CARD_NAMES).map(([id, key]) => [id, t(key)]))} cards={empty ? {
        // Before the first import each card keeps its title, with "—" where a number will be; limits can already be set
        // (plans/empty-screens.md).
        'budget-pace': <Card id="budget-pace" title={t('budget.card.pace')}><p class="rm-note">{t('parts.nothingYet')}</p><button type="button" class="rm-linkbtn" onClick={addLimit}>{t('budget.addLimit')}</button></Card>,
        'budget-bills': <Card id="budget-bills" title={t('budget.card.bills')}><Row label={t('home.safeToSpend')} value="—" /><Row label={t('budget.bills')} value="—" /></Card>,
        'budget-limits': <Card id="budget-limits" title={t('budget.card.limits')}><p class="rm-note">{t('parts.nothingYet')}</p></Card>,
      } : {
        'budget-pace': <ThisMonth data={data} n={n} start={start} onAdd={addLimit} />,
        'budget-bills': <Bills data={data} asOf={asOf} start={start} />,
        'budget-limits': <Limits data={data} asOf={asOf} start={start} onEdit={setEditing} />,
      }} />
      {editing && <LimitSheet data={data} month={n.month} editing={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function ThisMonth({ data, n, start, onAdd }: { data: AppData; n: ReturnType<typeof monthNow>; start: number; onAdd: () => void }) {
  const left = n.days - n.elapsed;
  const cardsBehind = data.accounts.filter((a) => a.kind === 'card').map((a) => lastLine(data, a.id)).filter((d): d is string => !!d && d < n.asOf).sort()[0];
  return (
    <Card id="budget-pace" title={t('budget.card.pace')}>
      <p class="rm-note">{t('budget.paceNote', { from: v1Date(n.from, 'day'), to: v1Date(n.to, 'dayYear'), day: n.elapsed, days: n.days })}
        {cardsBehind ? ` ${t('budget.cardsBehind', { date: v1Date(cardsBehind, 'day') })}` : ''}</p>
      {!n.lines.length && <p class="rm-note">{t('budget.noLimits')}</p>}
      <div class="rm-paces">
        {n.lines.map((l) => {
          const [cls, text] = PILL[l.state];
          const open = () => showTransactions({ categoryId: l.categoryId, start: n.from, end: n.to, label: start > 1 ? t('budget.range', { from: v1Date(n.from, 'day'), to: v1Date(n.to, 'dayYear') }) : v1Date(n.month, 'monthLong') });
          const amount = <div class="rm-pace-amt">{rich(l.special ? 'budget.amountOfOwn' : 'budget.amountOf', { spent: <Money minor={l.spent} round />, limit: <Money minor={l.limit} round /> })}</div>;
          return (
            <div key={l.categoryId ?? 'all'} class={`rm-pace${l.categoryId === null ? ' total' : ''}`}>
              <div class="rm-pace-h">
                <button type="button" onClick={open} aria-label={l.categoryId === null ? undefined : t('budget.seeMonth', { name: l.name })}><bdi dir="auto">{l.name}</bdi></button>
                <span class={`rm-pill ${cls}`}>{t(text)}</span>
              </div>
              {l.categoryId === null ? (
                <>
                  {amount}
                  <PaceTrack line={l} elapsed={n.elapsed} days={n.days} />
                  <div class="meta">{l.state === 'over' ? rich('budget.over', { amount: <Money minor={l.spent - l.limit} round /> }) : <>{rich('budget.left', { amount: <Money minor={l.limit - l.spent} round /> })}{left > 0 ? rich('budget.leftPerDay', { perDay: <Money minor={(l.limit - l.spent) / left} round /> }, { n: left }) : null}</>}</div>
                </>
              ) : (
                <>
                  <PaceTrack line={l} elapsed={n.elapsed} days={n.days} />
                  {amount}
                  {l.state === 'over' && <p class="rm-pace-hint">{rich('budget.overTheLimit', { amount: <Money minor={l.spent - l.limit} round /> })}</p>}
                  {l.state === 'ahead' && left > 0 && <p class="rm-pace-hint">{rich('budget.leftAboutADay', { amount: <Money minor={l.limit - l.spent} round />, perDay: <Money minor={(l.limit - l.spent) / left} round /> })}</p>}
                </>
              )}
            </div>
          );
        })}
      </div>
      <button type="button" class="rm-linkbtn" onClick={onAdd}>{t('budget.addLimit')}</button>
    </Card>
  );
}

function lastLine(data: AppData, accountId: Id): IsoDate | null {
  let last: IsoDate | null = null;
  for (const m of Object.values(data.months)) for (const t of m.transactions) if (t.accountId === accountId && (!last || t.date > last)) last = t.date;
  return last;
}

function Bills({ data, asOf, start }: { data: AppData; asOf: IsoDate; start: number }) {
  const bills = useMemo(() => regularBills(data, asOf), [data, asOf]);
  const s = safeToSpend(data, asOf, start, bills);
  const names = new Map(data.categories.map((c) => [c.id, c.name]));
  const monthly = bills.reduce((n, b) => n + b.amount, 0);
  return (
    <Card id="budget-bills" title={t('budget.card.bills')}>
      <div class="rm-safe">
        <span class="lbl">{t('budget.safeUntil', { date: v1Date(s.until, 'day') })}</span>
        <span class={`big${s.safe < 0 ? ' bad' : ''}`}><Money minor={s.safe} round /></span>
        {s.daysLeft > 0 && <span class="meta">{rich('budget.perDayLeft', { perDay: <Money minor={Math.max(0, s.safe) / s.daysLeft} round /> }, { n: s.daysLeft })}</span>}
      </div>
      <p class="rm-note">{rich('budget.safeNote', { balance: <Money minor={s.balance} round />, due: <Money minor={s.due} round /> }, { date: v1Date(s.asOf, 'day'), until: v1Date(s.until, 'day') })}{data.accounts.some((a) => a.kind === 'card') ? ` ${t('budget.cardsNotSubtracted')}` : ''}</p>
      <div class="rm-sub">{bills.length ? rich('budget.billsAbout', { amount: <Money minor={monthly} round /> }) : t('budget.bills')}</div>
      <div class="rm-tablebox" tabIndex={0} role="region" aria-label={t('budget.billsTable')}>
        <table>
          <thead><tr><th>{t('budget.bill')}</th><th class="hide-narrow">{t('budget.type')}</th><th class="num">{t('budget.about')}</th><th>{t('budget.next')}</th></tr></thead>
          <tbody>
            {!bills.length && <tr><td colSpan={4}>{t('budget.noBills')}</td></tr>}
            {bills.map((b) => {
              const due = b.next <= s.until;
              const open = () => showTransactions({ categoryId: b.categoryId, text: b.id });
              return (
                <tr key={b.id} class="click" tabIndex={0} onClick={open} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }}>
                  <td class="desc" title={b.name}><bdi dir="auto">{b.name}</bdi></td>
                  <td class="hide-narrow">{b.categoryId ? names.get(b.categoryId) ?? '' : ''}</td>
                  <td class="num"><Money minor={b.amount} round /></td>
                  <td>{v1Date(b.next, 'day')}<span class={`tag${due ? ' due' : ''}`}>{t(due ? 'budget.due' : 'budget.paid')}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p class="rm-note" style="margin:8px 0 0">{t('budget.billsFound')}</p>
    </Card>
  );
}

function Limits({ data, asOf, start, onEdit }: { data: AppData; asOf: IsoDate; start: number; onEdit: (e: Editing) => void }) {
  const p = resolvePeriod(period.value, asOf, data);
  // Budget months inside the period that have started (a running month counts so far, as in v1).
  const months = p.months.filter((m) => budgetRange(m, start)[0] <= asOf && Object.keys(data.months).some((k) => k <= m));
  const rows = useMemo(() => limitCheck(data, months, start), [data, months.join(), start]);
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const over = rows.filter((r) => r.limit !== null && r.average > r.limit).sort((a, b) => b.average / b.limit! - a.average / a.limit!);
  const single = period.value.kind === 'month';
  const span = (m: MonthKey) => (start <= 1 ? v1Date(m, 'monthLong') : t('budget.range', { from: v1Date(budgetRange(m, start)[0], 'day'), to: v1Date(budgetRange(m, start)[1], 'dayYear') }));
  return (
    <Card id="budget-limits" title={t('budget.card.limits')}>
      <p class="rm-note">{t('budget.limitsNote')}</p>
      <p class="rm-lim-sum">
        {!months.length ? t('budget.noMonths')
          : over.length ? rich(single ? 'budget.overThisMonth' : 'budget.overOnAverage', { list: list(over.map((r) => <b key={r.name}>{r.name}</b>)) })
          : t('budget.underAll')}
      </p>
      <div class="rm-lims">
        {months.length > 0 && rows.map((r) => <LimitRow key={r.categoryId ?? 'all'} r={r} start={start} single={single} isOpen={open.has(r.categoryId ?? '*')} span={span}
          onToggle={() => setOpen((s) => { const k = r.categoryId ?? '*'; const nx = new Set(s); if (nx.has(k)) nx.delete(k); else nx.add(k); return nx; })}
          onEdit={() => onEdit({ categoryId: r.categoryId, isNew: false })} />)}
      </div>
      <button type="button" class="rm-linkbtn" onClick={() => onEdit({ categoryId: null, isNew: true })}>{t('budget.addLimit')}</button>
    </Card>
  );
}

function LimitRow({ r, start, single, isOpen, span, onToggle, onEdit }: { r: LimitCheck; start: number; single: boolean; isOpen: boolean; span: (m: MonthKey) => string; onToggle: () => void; onEdit: () => void }) {
  const id = `lim-${(r.categoryId ?? 'all').replace(/[^\w-]/g, '_')}`;
  const per = t(single ? 'budget.thisMonth' : 'budget.monthOnAverage');
  const limitText = r.limit === null ? null : single || !r.special.length || r.usual === null ? moneyText(r.limit)
    : `${moneyText(r.usual)} (${r.special.slice(0, 2).map((x) => t('budget.limitIn', { amount: moneyText(x.limit), month: v1Date(x.month, 'month') })).join(', ')}${r.special.length > 2 ? ', …' : ''})`;
  return (
    <div class={`rm-lim${r.categoryId === null ? ' total' : ''}`}>
      <button type="button" class="rm-lim-row" aria-expanded={isOpen} aria-controls={id} onClick={onToggle}>
        <span class="lbl">
          <span class="nm"><bdi dir="auto">{r.name}</bdi></span>
          <span class="meta">{limitText !== null ? t('budget.limitMeta', { per, limit: limitText, over: r.monthsOver, n: r.months }) : per}</span>
        </span>
        <span class="right">
          <span class="big"><Money minor={r.average} round /></span>
          <span class={`rm-pill ${r.limit === null ? 'none' : r.average > r.limit ? 'over' : 'ok'}`}>{t(r.limit === null ? 'budget.noLimit' : r.average > r.limit ? 'budget.overPill' : 'budget.under')}</span>
        </span>
      </button>
      {isOpen && (
        <div class="rm-lim-detail" id={id}>
          <MiniBars rows={r.byMonth} monthName={span} onPick={(m) => { const [a, b] = budgetRange(m, start); showTransactions({ categoryId: r.categoryId, start: a, end: b, label: span(m) }); }}
            label={t('budget.chartLabel', { name: r.name })} />
          <div class="rm-lim-actions">
            <button type="button" class="rm-linkbtn" onClick={() => showTransactions({ categoryId: r.categoryId })}>{r.categoryId === null ? t('budget.seeAll') : t('budget.seeName', { name: r.name })}</button>
            <button type="button" class="rm-linkbtn" onClick={onEdit}>{t(r.limit === null ? 'budget.setLimit' : 'budget.changeLimit')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

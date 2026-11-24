// Home, as v1 (V1_REFERENCE.md, Home): net worth, This month, the period card, In and out by month, Bank balance and
// What you have. A welcome-back card leads after a week away (a v2 ability placed in v1's design). The cards follow
// the person's arrangement (plans/arrange-pages.md); "Arrange Home" under them changes it. Before the first import the
// welcome box sits above the same cards, each saying what will appear there (plans/empty-screens.md).
import { useMemo, useState } from 'preact/hooks';
import type { AppData, Holding, IsoDate } from '../../model/types';
import { compareWith, go, openImport, period, resetForDemo, showTransactions } from '../../state/view';
import { toggleDemo } from '../../state/data';
import { addMonths, lastDayOf, monthsBetween } from '../../logic/periods';
import { regularBills, safeToSpend } from '../../logic/budget';
import { hasTransactions, history, periodSummary } from '../../logic/overview';
import { bankBalance, valueOn } from '../../logic/worth';
import { Money, deltaText, moneyText } from '../Money';
import { Card, Row } from '../parts/Card';
import { LineChart, Legend } from '../parts/charts';
import { PaceTrack } from '../parts/pace';
import { WelcomeBack } from '../WelcomeBack';
import { BackupReminder } from '../BackupReminder';
import { SetAsideNotice } from '../SetAsideNotice';
import { HoldingSheet } from './SettingsSheets';
import { ArrangedCards } from '../ArrangedCards';
import type { JSX } from 'preact';
import { t, rich, type Key } from '../../i18n';
import { monthNow, resolvePeriod, v1Date } from '../format';

/** What Home's cards are called while arranging. */
const CARD_NAMES: Record<string, Key> = { 'home-glance': 'home.card.glance', 'home-kpis': 'home.card.kpis', 'home-flow': 'home.card.flow', 'home-balance': 'home.card.balance', 'home-have': 'home.card.have' };

const KINDS = [['asset', 'home.kind.asset', 'home.kind.assetExamples'], ['property', 'home.kind.property', 'home.kind.propertyExamples'], ['debt', 'home.kind.debt', 'home.kind.debtExamples']] as const;

export function Home({ data, asOf }: { data: AppData; asOf: IsoDate }) {
  const p = resolvePeriod(period.value, asOf, data);
  const q = compareWith.value ? resolvePeriod(compareWith.value, asOf, data) : null;
  const months = useMemo(() => history(data, asOf), [data, asOf]);
  const start = data.settings.budgetMonthStartDay;

  const empty = !hasTransactions(data);
  const bank = bankBalance(data, asOf);
  const prevEnd = lastDayOf(addMonths(asOf.slice(0, 7), -1));
  const change = bank - bankBalance(data, prevEnd);
  const holdingsBy = (k: Holding['kind']) => data.holdings.filter((h) => h.kind === k && h.inNetWorth).map((h) => ({ h, v: valueOn(h, '9999-12-31') ?? 0 }));
  const sumOf = (k: Holding['kind']) => holdingsBy(k).reduce((n, x) => n + Math.abs(x.v), 0);
  const worth = bank + sumOf('asset') + sumOf('property') - sumOf('debt');

  const s = periodSummary(data, p, asOf);
  const other = q ? periodSummary(data, q, asOf) : null;
  const bandA = period.value.kind === 'all' ? null : p, bandB = q && compareWith.value?.kind !== 'all' ? q : null;
  const flowRows = months.map((m) => ({ month: m.month, in: m.in / 100, out: m.out / 100 }));
  const balRows = months.map((m) => ({ month: m.month, balance: m.balance / 100 }));
  const inP = months.filter((m) => m.month >= p.start.slice(0, 7) && m.month <= p.end.slice(0, 7));
  const hiOut = [...inP].sort((a, b) => b.out - a.out)[0];

  const have = <WhatYouHave data={data} bank={bank} holdingsBy={holdingsBy} sumOf={sumOf} asOf={asOf} />;
  const cardsById: Record<string, JSX.Element> = empty ? emptyCards(data, p.label, asOf, start, have) : {
    'home-glance': <Glance data={data} asOf={asOf} start={start} />,
    'home-kpis': (
      <Card id="home-kpis" title={q ? t('home.kpisVs', { period: p.label, other: q.label }) : p.label}>
        <div class="rm-rows">
          {!other ? (
            <>
              <Row label={t('home.moneyIn')} sub={rich('home.aMonth', { amount: <Money minor={s.avgIn} round /> })} value={<Money minor={s.in} round />} />
              <Row label={t('home.moneyOut')} sub={rich('home.aMonth', { amount: <Money minor={s.avgOut} round /> })} value={<Money minor={s.out} round />} />
              <Row label={t('home.leftOver')} sub={rich('home.aMonth', { amount: <Money minor={s.avgNet} round /> })} value={<Money minor={s.net} round />} valueClass={s.net >= 0 ? 'good' : 'bad'} />
              <Row label={t('home.endBalance')} value={<Money minor={s.endBalance} round />} />
            </>
          ) : (
            <>
              <Row label={t('home.moneyInPerMonth')} sub={<Vs a={s.avgIn} b={other.avgIn} upGood />} value={<Money minor={s.avgIn} round />} />
              <Row label={t('home.moneyOutPerMonth')} sub={<Vs a={s.avgOut} b={other.avgOut} upGood={false} />} value={<Money minor={s.avgOut} round />} />
              <Row label={t('home.leftOverPerMonth')} sub={<Vs a={s.avgNet} b={other.avgNet} upGood />} value={<Money minor={s.avgNet} round />} valueClass={s.avgNet >= 0 ? 'good' : 'bad'} />
              <Row label={t('home.endBalance')} sub={<Vs a={s.endBalance} b={other.endBalance} upGood />} value={<Money minor={s.endBalance} round />} />
            </>
          )}
        </div>
        {!other && s.moved !== 0 && (
          <p class="rm-take">{rich(s.moved > 0 ? 'home.movedIn' : 'home.movedOut', { amount: <b><Money minor={Math.abs(s.moved)} round /></b> })}</p>
        )}
        {other && <CompareTake s={s} other={other} p={p.label} q={q!.label} />}
      </Card>
    ),
    'home-flow': (
      <Card id="home-flow" title={t('home.card.flow')}>
        <Legend items={[{ name: t('home.moneyIn'), color: 'var(--chart-in)', kind: 'line' }, { name: t('home.moneyOut'), color: 'var(--chart-out)', kind: 'line' }, ...(bandA ? [{ name: p.label, color: 'var(--chart-grid)' }] : []), ...(bandB ? [{ name: q!.label, kind: 'band' as const }] : [])]} />
        <LineChart rows={flowRows} height={260} bandA={bandA} bandB={bandB} onPick={(m) => showTransactions({ start: `${m}-01`, end: lastDayOf(m), label: v1Date(m, 'monthLong') })}
          series={[{ key: 'in', name: t('home.in'), color: 'var(--chart-in)' }, { key: 'out', name: t('home.out'), color: 'var(--chart-out)' }]}
          label={t('home.flowLabel', { from: v1Date(months[0]?.month ?? asOf, 'month'), to: v1Date(asOf, 'month') }) + (hiOut ? ` ${t('home.flowMost', { period: p.label, month: v1Date(hiOut.month, 'monthLong') })}` : '')} />
        <p class="rm-note" style="margin:8px 0 0">{t('home.flowNote')}</p>
      </Card>
    ),
    'home-balance': <BalanceCard rows={balRows} months={inP} bandA={bandA} bandB={bandB} now={bank} />,
    'home-have': have,
  };

  return (
    <>
      <SetAsideNotice />
      {empty ? <Welcome /> : <><BackupReminder data={data} /><WelcomeBack data={data} today={asOf} /></>}
      <section class="rm-hero" aria-labelledby="nw-l">
        <div class="lbl" id="nw-l">{t('home.netWorth')}</div>
        {/* Net worth is real as soon as there is an account or something you own; before that, no made-up zero. */}
        <div class="big">{data.accounts.length || data.holdings.length ? <Money minor={worth} round /> : '—'}</div>
        {!empty && <p class="chg">{rich('home.sinceEndOf', { change: <span class={change >= 0 ? 'up-good' : 'up-bad'}>{change >= 0 ? '↑ ' : '↓ '}<Money minor={Math.abs(change)} round /></span>, month: v1Date(prevEnd, 'monthOnly') })}</p>}
      </section>

      <ArrangedCards data={data} page="home" pageName={t('home.page')} names={Object.fromEntries(Object.entries(CARD_NAMES).map(([id, key]) => [id, t(key)]))} cards={cardsById} />
    </>
  );
}

/** The welcome box above Home's cards before the first import: one way to start, or the demo. */
function Welcome() {
  return (
    <section class="rm-card rm-welcome">
      <div class="rm-ch"><h2>{t('home.welcome')}</h2></div>
      <div class="rm-lim-actions">
        <button type="button" class="rm-btn" onClick={openImport}>{t('home.importFile')}</button>
        <button type="button" class="rm-btn ghost" onClick={() => { resetForDemo(); toggleDemo(); }}>{t('home.exploreDemo')}</button>
      </div>
    </section>
  );
}

/** Home's cards before the first import: the same titles, labels and charts, with "—" where a number will be. */
function emptyCards(data: AppData, periodName: string, asOf: IsoDate, start: number, have: JSX.Element): Record<string, JSX.Element> {
  const n = monthNow(data, asOf, start);
  const frame = monthsBetween(addMonths(asOf.slice(0, 7), -11), asOf.slice(0, 7)).map((month) => ({ month }));
  return {
    'home-glance': (
      <Card id="home-glance" title={t('home.card.glance')} aside={`${v1Date(n.from, 'day')} – ${v1Date(n.to, 'day')}`} noFold>
        <span class="rm-glance-body">
          <span class="rm-pace-amt">{t('home.spentOf', { spent: '—', limit: '—', day: n.elapsed, days: n.days })}</span>
          <span class="rm-pace-track" aria-hidden="true" />
          <Row label={t('home.safeToSpend')} value="—" />
        </span>
      </Card>
    ),
    'home-kpis': (
      <Card id="home-kpis" title={periodName}>
        <Row label={t('home.moneyIn')} value="—" />
        <Row label={t('home.moneyOut')} value="—" />
        <Row label={t('home.leftOver')} value="—" />
      </Card>
    ),
    'home-flow': <Card id="home-flow" title={t('home.card.flow')}><LineChart rows={frame} series={[]} height={260} bandA={null} bandB={null} label={t('home.card.flow')} /></Card>,
    'home-balance': <Card id="home-balance" title={t('home.card.balance')}><LineChart rows={frame} series={[]} height={200} bandA={null} bandB={null} label={t('home.card.balance')} /></Card>,
    'home-have': have,
  };
}

function Vs({ a, b, upGood }: { a: number; b: number; upGood: boolean }) {
  const d = a - b;
  return <>{rich('home.vs', { amount: <Money minor={b} round />, change: <span class={d === 0 ? '' : (d > 0) === upGood ? 'up-good' : 'up-bad'}>{deltaText(d)}</span> })}</>;
}

function CompareTake({ s, other, p, q }: { s: ReturnType<typeof periodSummary>; other: ReturnType<typeof periodSummary>; p: string; q: string }) {
  const dOut = s.avgOut - other.avgOut, dIn = s.avgIn - other.avgIn;
  return (
    <p class="rm-take">{rich('common.compareTake', { period: <b>{p}</b>, other: <b>{q}</b>, out: <b class={dOut > 0 ? 'up-bad' : 'down-good'}>{deltaText(dOut)}</b>, in: <b class={dIn >= 0 ? 'up-good' : 'down-bad'}>{deltaText(dIn)}</b> })}</p>
  );
}

/** v1's "This month" card: spent of the All spending limit with its pace, and Safe to spend. The whole card opens Budget. */
function Glance({ data, asOf, start }: { data: AppData; asOf: IsoDate; start: number }) {
  const n = monthNow(data, asOf, start);
  const total = n.lines.find((l) => l.categoryId === null);
  const safe = safeToSpend(data, asOf, start, regularBills(data, asOf));
  return (
    <Card id="home-glance" title={t('home.card.glance')} aside={`${v1Date(n.from, 'day')} – ${v1Date(n.to, 'day')}`} noFold>
      <button type="button" class="rm-glance" aria-label={t('home.glanceOpen')} onClick={() => go('budget')}>
        <span class="rm-glance-body">
          {total && (
            <>
              <span class="rm-pace-amt">{rich('home.spentOf', { spent: <Money minor={total.spent} round />, limit: <Money minor={total.limit} round /> }, { day: n.elapsed, days: n.days })}</span>
              <PaceTrack line={total} elapsed={n.elapsed} days={n.days} />
            </>
          )}
          <span class="rm-row rm-row-flat">
            <span class="lbl">{t('home.safeToSpend')}<small>{t('home.until', { date: v1Date(safe.until, 'day') })}{safe.daysLeft > 0 ? rich('home.aboutADay', { amount: <Money minor={Math.max(0, safe.safe) / safe.daysLeft} round /> }) : null}</small></span>
            <span class={`val${safe.safe < 0 ? ' bad' : ''}`}><Money minor={safe.safe} round /></span>
          </span>
        </span>
      </button>
    </Card>
  );
}

function BalanceCard({ rows, months, bandA, bandB, now }: { rows: { month: string; balance: number }[]; months: ReturnType<typeof history>; bandA: { start: string; end: string } | null; bandB: { start: string; end: string } | null; now: number }) {
  const label = t('home.balanceLabel', { amount: moneyText(now) });
  const [open, setOpen] = useState(false);
  return (
    <Card id="home-balance" title={t('home.card.balance')}>
      <LineChart rows={rows} height={200} bandA={bandA} bandB={bandB} series={[{ key: 'balance', name: t('home.balance'), color: 'var(--chart-balance)' }]} label={label} />
      <button type="button" class="rm-linkbtn" aria-expanded={open} aria-controls="home-nums" onClick={() => setOpen(!open)}>{t(open ? 'home.hideNumbers' : 'home.showNumbers')}</button>
      {open && (
        <div class="rm-numbers" id="home-nums">
          <div class="rm-tablebox" style="max-height:360px" tabIndex={0} role="region" aria-label={t('home.balanceTable')}>
            <table>
              <thead><tr><th>{t('home.month')}</th><th class="num">{t('home.in')}</th><th class="num">{t('home.out')}</th><th class="num">{t('home.balance')}</th></tr></thead>
              <tbody>{[...months].reverse().map((m) => (
                <tr key={m.month}><td>{v1Date(m.month, 'month')}</td><td class="num"><Money minor={m.in} round /></td><td class="num"><Money minor={m.out} round /></td><td class="num"><Money minor={m.balance} round /></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

function WhatYouHave({ data, bank, holdingsBy, sumOf, asOf }: { data: AppData; bank: number; holdingsBy: (k: Holding['kind']) => { h: Holding; v: number }[]; sumOf: (k: Holding['kind']) => number; asOf: IsoDate }) {
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const [editing, setEditing] = useState<{ id: string | 'new'; kind: Holding['kind'] } | null>(null);
  const toggle = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <Card id="home-have" title={t('home.card.have')}>
      <div class="rm-rows">
        {data.accounts.length
          ? <Row label={t('home.bankAccount')} sub={t('home.latestBalance')} value={<Money minor={bank} round />} />
          : <Row label={t('home.bankAccount')} value="—" />}
        {KINDS.map(([kind, name, examples]) => {
          const items = holdingsBy(kind), total = sumOf(kind), isOpen = open.has(kind);
          return (
            <div key={kind}>
              <button type="button" class="rm-row" aria-expanded={isOpen} aria-controls={`part-${kind}`} onClick={() => toggle(kind)}>
                <span class="lbl">{t(name)}<small>{items.length ? t('home.items', { n: items.length }) : t('home.nothingYet')}</small></span>
                <span class={`val${kind === 'debt' && total > 0 ? ' bad' : !total ? ' soft' : ''}`}><Money minor={total} round /></span>
              </button>
              {isOpen && (
                <div class="rm-part-panel" id={`part-${kind}`}>
                  {items.length === 0 && <p class="rm-part-empty">{t('home.nothingHere', { examples: t(examples) })}</p>}
                  {items.map(({ h, v }) => (
                    <button key={h.id} type="button" class="rm-part-item" onClick={() => setEditing({ id: h.id, kind })}>
                      <span class="lbl"><bdi dir="auto">{h.name}</bdi><small>{h.valuations.at(-1) ? v1Date(h.valuations.at(-1)!.date, 'dayYear') : ''}</small></span>
                      <span class={`val${kind === 'debt' ? ' bad' : ''}`}><Money minor={Math.abs(v)} round /></span>
                    </button>
                  ))}
                  <button type="button" class="rm-linkbtn" onClick={() => setEditing({ id: 'new', kind })}>{t('home.add')}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!data.holdings.length && data.accounts.length > 0 && <p class="rm-note" style="margin:8px 0 0">{t('home.onlyBank')}</p>}
      {editing && <HoldingSheet data={data} id={editing.id} kind={editing.kind} today={asOf} onClose={() => setEditing(null)} />}
    </Card>
  );
}

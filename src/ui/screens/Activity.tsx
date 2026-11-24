// Activity, as v1 (V1_REFERENCE.md, Activity): Back to where you came from, search, filter chips, the count line, a
// sortable table where tapping rows selects them, and the dark selection bar with their total. v2 abilities sit in v1's
// patterns: Change type now saves (with Undo), Edit opens one transaction's details, and Import sits beside the search.
import { useMemo, useState } from 'preact/hooks';
import type { AppData, Id, IsoDate, Transaction } from '../../model/types';
import { commit, demoOn } from '../../state/data';
import { amountsHidden, backTo, filter, goBack, NO_FILTER, openImport, period, setFilter } from '../../state/view';
import { findTransactions } from '../../logic/query';
import { isCoveredCardCharge } from '../../logic/cardCharges';
import { addCategory, updateTransactions } from '../../logic/edits';
import { displayName } from '../../logic/names';
import { hasTransactions } from '../../logic/overview';
import { fromMinor } from '../../logic/money';
import { Money } from '../Money';
import { CategorySelect } from '../CategorySelect';
import { TransactionSheet } from './TransactionSheet';
import { useWide } from '../useWide';
import { t, rich } from '../../i18n';
import { formatShekels, hiddenAmount, indexCategories, resolvePeriod, v1Date } from '../format';

type SortKey = 'date' | 'desc' | 'category' | 'paid' | 'amount';
const PLACE_NAMES = { home: 'frame.tab.home', spending: 'frame.tab.spending', budget: 'frame.tab.budget', calendar: 'frame.tab.calendar', activity: 'frame.tab.activity', settings: 'frame.title.settings' } as const;

export function Activity({ data, asOf }: { data: AppData; asOf: IsoDate }) {
  const f = filter.value;
  const p = resolvePeriod(period.value, asOf, data);
  const cats = indexCategories(data);
  const accounts = new Map(data.accounts.map((a) => [a.id, a.name]));
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'date', dir: -1 });
  const [limit, setLimit] = useState(200);
  const [picked, setPicked] = useState<ReadonlySet<Id>>(new Set());
  const [moving, setMoving] = useState(false);
  const [editing, setEditing] = useState<Id | null>(null);
  const wide = useWide();

  const showsCharges = f.kind === 'transfer' || (!!f.categoryId && f.categoryId !== 'none' && !!cats.byId.get(f.categoryId)?.paysAccountId);
  const rows = useMemo(() => {
    const list = findTransactions(data, { start: f.start ?? p.start, end: f.end ?? p.end, accountId: f.accountId, categoryId: f.categoryId, kind: f.kind, place: f.place, text: f.text })
      // Card purchases already show this money; the bank's matching charges stay out of the list, as in v1.
      .filter((t) => showsCharges || !isCoveredCardCharge(t, cats));
    const val = (t: Transaction): string | number => sort.key === 'date' ? t.date : sort.key === 'amount' ? t.amount : sort.key === 'desc' ? displayName(t).toLowerCase()
      : sort.key === 'category' ? cats.name(t.categoryId).toLowerCase() : (accounts.get(t.accountId) ?? '').toLowerCase();
    return list.sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || b.id.localeCompare(a.id); });
  }, [data, f, p.start, p.end, sort, showsCharges]);
  const shown = rows.slice(0, limit);
  const total = rows.reduce((n, t) => n + t.amount, 0);
  const pickedRows = useMemo(() => Object.values(data.months).flatMap((m) => m.transactions).filter((t) => picked.has(t.id)), [data, picked]);

  const toggle = (id: Id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allShown = shown.length > 0 && shown.every((t) => picked.has(t.id));
  const someShown = shown.some((t) => picked.has(t.id));
  const sortBy = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === 'date' || key === 'amount' ? -1 : 1 }));
  const ariaSort = (key: SortKey) => (sort.key === key ? (sort.dir > 0 ? 'ascending' : 'descending') : undefined);
  const chips: { text: string; clear: () => void }[] = [];
  if (f.start) chips.push({ text: f.label ?? (f.start === f.end ? v1Date(f.start, 'day') : t('activity.range', { from: v1Date(f.start, 'day'), to: v1Date(f.end ?? f.start, 'dayYear') })), clear: () => setFilter({ start: null, end: null, label: null }) });
  if (f.categoryId) chips.push({ text: f.categoryId === 'none' ? t('activity.noType') : cats.name(f.categoryId), clear: () => setFilter({ categoryId: null }) });
  if (f.place) chips.push({ text: f.placeName ?? t('activity.place'), clear: () => setFilter({ place: null, placeName: null }) });
  if (f.kind) chips.push({ text: t(f.kind === 'transfer' ? 'parts.kind.transfer' : f.kind === 'income' ? 'parts.kind.income' : 'parts.kind.spending'), clear: () => setFilter({ kind: null }) });
  if (f.accountId) chips.push({ text: accounts.get(f.accountId) ?? t('activity.account'), clear: () => setFilter({ accountId: null }) });
  if (f.text.trim()) chips.push({ text: t('activity.search', { text: f.text.trim() }), clear: () => setFilter({ text: '' }) });
  const cards = data.accounts.filter((a) => a.kind === 'card').map((a) => a.id);
  const cardSpan = cards.length ? spanOf(data, new Set(cards)) : null;
  const dataSpan = spanOf(data, new Set(data.accounts.map((a) => a.id)));
  // Only worth saying when the card files cover less time than the rest of the data.
  const empty = !hasTransactions(data);
  const cardNote = cardSpan && dataSpan && (cardSpan[0] > dataSpan[0] || cardSpan[1] < dataSpan[1]) ? cardSpan : null;

  return (
    <>
      {backTo.value && (
        <button type="button" class="rm-back rm-pill-btn" onClick={goBack}><span aria-hidden="true">‹</span> {t('activity.backTo', { place: t(PLACE_NAMES[backTo.value.place]) })}</button>
      )}
      <section class="rm-card" id="activity-list" aria-label={t('activity.transactions')}>
        <div class="rm-tools">
          <input type="search" placeholder={t('activity.searchPlaceholder')} aria-label={t('activity.searchLabel')} dir="auto" value={f.text}
            onInput={(e) => { setFilter({ text: (e.currentTarget as HTMLInputElement).value }); setLimit(200); }} />
          {chips.length > 0 && <span class="rm-chips">{chips.map((c) => <button key={c.text} type="button" class="rm-chip" aria-label={t('activity.clearFilter', { filter: c.text })} onClick={c.clear}>{c.text} ×</button>)}</span>}
          {!empty && <span class="rm-count" aria-live="polite">{rich('activity.count', { total: <Money minor={total} round /> }, { n: rows.length })}{f.start ? '' : ` · ${p.label}`}</span>}
          {!demoOn.value && <button type="button" class="rm-pill-btn rm-import" onClick={openImport}>{t('activity.importFile')}</button>}
          {picked.size > 0 && <SelBar rows={pickedRows} inView={shown.filter((t) => picked.has(t.id)).length} onMove={() => setMoving(true)} onEdit={pickedRows.length === 1 ? () => setEditing(pickedRows[0]!.id) : null} onClear={() => { setPicked(new Set()); setMoving(false); }} />}
        </div>
        {moving && picked.size > 0 && <MovePanel data={data} rows={pickedRows} onDone={() => { setMoving(false); setPicked(new Set()); }} onCancel={() => setMoving(false)} />}
        <div class="rm-tablebox" id="tx-list" tabIndex={0} role="region" aria-label={t('activity.table')}>
          <table>
            <thead><tr>
              <th class="ck"><input type="checkbox" aria-label={t('activity.selectAll')} checked={allShown} ref={(el) => { if (el) el.indeterminate = someShown && !allShown; }}
                onChange={(e) => { const on = (e.currentTarget as HTMLInputElement).checked; setPicked((s) => { const n = new Set(s); for (const t of shown) { if (on) n.add(t.id); else n.delete(t.id); } return n; }); }} /></th>
              <th aria-sort={ariaSort('date')}><button type="button" onClick={() => sortBy('date')}>{t('activity.date')}</button></th>
              <th class="desc" aria-sort={ariaSort('desc')}><button type="button" onClick={() => sortBy('desc')}>{t('activity.description')}</button></th>
              <th class="hide-narrow" aria-sort={ariaSort('category')}><button type="button" onClick={() => sortBy('category')}>{t('activity.type')}</button></th>
              <th class="hide-narrow" aria-sort={ariaSort('paid')}><button type="button" onClick={() => sortBy('paid')}>{t('activity.paidWith')}</button></th>
              <th class="num" aria-sort={ariaSort('amount')}><button type="button" onClick={() => sortBy('amount')}>{t('activity.amount')}</button></th>
            </tr></thead>
            <tbody>
              {!rows.length && <tr><td colSpan={6} class="rm-empty-row">{t(empty ? 'activity.nothingYet' : 'activity.nothingMatches')}</td></tr>}
              {shown.map((tx) => {
                const on = picked.has(tx.id);
                return (
                  <tr key={tx.id} class={on ? 'sel' : ''} onClick={(e) => { if ((e.target as Element).closest('input')) return; toggle(tx.id); }}>
                    <td class="ck"><input type="checkbox" aria-label={t('activity.select', { name: displayName(tx), date: v1Date(tx.date, 'day') })} checked={on} onChange={() => toggle(tx.id)} /></td>
                    <td class="dt"><span class="dt-long">{v1Date(tx.date, 'dayYear')}</span><span class="dt-short">{v1Date(tx.date, 'dayShort')}</span></td>
                    <td class="desc" title={tx.description}><bdi dir="auto">{displayName(tx)}</bdi>{tx.note ? <small class="desc-note"><bdi dir="auto">{tx.note}</bdi></small> : null}</td>
                    <td class="hide-narrow">{cats.name(tx.categoryId)}</td>
                    <td class="hide-narrow">{accounts.get(tx.accountId) ?? ''}</td>
                    <td class={`num${tx.amount > 0 ? ' pos' : ''}`}><Money minor={tx.amount} signed trimWhole /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length > limit && <button type="button" class="rm-more" onClick={() => setLimit(limit + 300)}>{t('activity.showMore', { n: rows.length - limit })}</button>}
        {!empty && <p class="rm-note" style="margin:10px 0 0">{t('activity.hint')}{cardNote ? ` ${t('activity.cardNote', { from: v1Date(cardNote[0], 'month'), to: v1Date(cardNote[1], 'dayYear') })}` : ''}</p>}
        {chips.length > 1 && <button type="button" class="rm-showall" onClick={() => { filter.value = { ...NO_FILTER }; }}>{t('activity.clearAll')}</button>}
      </section>
      {editing && <TransactionSheet key={editing} data={data} id={editing} docked={wide} onClose={() => { setEditing(null); setPicked(new Set()); document.getElementById('tx-list')?.focus(); }} />}
    </>
  );
}

function spanOf(data: AppData, ids: ReadonlySet<Id>): [IsoDate, IsoDate] | null {
  let a: IsoDate | null = null, b: IsoDate | null = null;
  for (const m of Object.values(data.months)) for (const t of m.transactions) if (ids.has(t.accountId)) { if (!a || t.date < a) a = t.date; if (!b || t.date > b) b = t.date; }
  return a && b ? [a, b] : null;
}

/** v1's dark selection bar: how many, their total (and out/in when mixed), Change type, Edit (one) and Clear. */
function SelBar({ rows, inView, onMove, onEdit, onClear }: { rows: Transaction[]; inView: number; onMove: () => void; onEdit: (() => void) | null; onClear: () => void }) {
  const total = rows.reduce((n, t) => n + t.amount, 0);
  const out = -rows.filter((t) => t.amount < 0).reduce((n, t) => n + t.amount, 0), inc = rows.filter((t) => t.amount > 0).reduce((n, t) => n + t.amount, 0);
  const money = (v: number, signed = true) => amountsHidden.value ? hiddenAmount() : formatShekels(fromMinor(v), { signed });
  return (
    <section class="rm-selbar" aria-label={t('activity.selected')}>
      <span aria-live="polite">{rich('activity.selectedTotal', { total: <b>{money(total)}</b> }, { n: rows.length })}{out && inc ? t('activity.outIn', { out: money(out, false), in: money(inc, false) }) : ''}{rows.length > inView ? t('activity.notInList', { n: rows.length - inView }) : ''}</span>
      <button type="button" onClick={onMove}>{t('activity.changeType')}</button>
      {onEdit && <button type="button" onClick={onEdit}>{t('activity.edit')}</button>}
      <button type="button" onClick={onClear}>{t('activity.clear')}</button>
    </section>
  );
}

/** v1's "Move … selected to" panel; in v2 it saves at once, and Undo puts it back. */
function MovePanel({ data, rows, onDone, onCancel }: { data: AppData; rows: Transaction[]; onDone: () => void; onCancel: () => void }) {
  const [to, setTo] = useState<Id | 'none' | 'new' | null>(null);
  const [name, setName] = useState('');
  const n = rows.length;
  const save = () => {
    let d = data, target: Id | null = to === 'none' ? null : (to as Id | null);
    let label = to === 'none' ? t('activity.noTypeLower') : data.categories.find((c) => c.id === to)?.name ?? '';
    const docs = new Set<string>();
    if (to === 'new') {
      const nm = name.trim();
      if (!nm) return;
      const kind = rows.every((t) => t.amount > 0) ? 'income' : 'spending';
      const a = addCategory(d, { name: nm, kind, parentId: null, color: null, fixedCost: false });
      d = a.data; target = a.id; label = nm; a.docs.forEach((k) => docs.add(k));
    }
    const e = updateTransactions(d, rows.map((t) => t.id), { categoryId: target });
    e.docs.forEach((k) => docs.add(k));
    commit(e.data, [...docs] as Parameters<typeof commit>[1], t('activity.moved', { n, type: label }));
    onDone();
  };
  return (
    <div class="rm-move">
      <div class="row">
        <label for="move-cat">{t('activity.moveTo', { n })}</label>
        <span class="move-pick">
          <CategorySelect data={data} id="move-cat" class="rm-select" value={to === 'new' || to === null ? null : to} placeholder={t('activity.pickType')} noneLabel={t('activity.noType')}
            onChange={(v) => setTo(v === null ? null : v)} />
        </span>
        <button type="button" class="rm-btn ghost" onClick={() => setTo('new')} aria-pressed={to === 'new'}>{t('activity.newType')}</button>
        {to === 'new' && <input aria-label={t('activity.newTypeName')} placeholder={t('activity.newTypeName')} dir="auto" maxLength={40} value={name} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} />}
      </div>
      <div class="row">
        <button type="button" class="rm-btn" disabled={to === null || (to === 'new' && !name.trim())} onClick={save}>{t('activity.move')}</button>
        <button type="button" class="rm-btn ghost" onClick={onCancel}>{t('common.cancel')}</button>
      </div>
    </div>
  );
}


// Settings: accounts, categories, comfort and privacy, backup, and any problems this session.
import { t } from '../../i18n';
import { useState } from 'preact/hooks';
import type { AppData, Id } from '../../model/types';
import { commit, demoOn, toggleDemo } from '../../state/data';
import { connection } from '../../state/app';
import { openImport, resetForDemo } from '../../state/view';
import { errorLog } from '../../state/errors';
import { deleteRule, setStartHidden } from '../../logic/edits';
import { AccountSheet, ACCOUNT_KINDS, CategorySheet, HOLDING_KINDS, HoldingSheet } from './SettingsSheets';
import { valueOn } from '../../logic/worth';
import { isoDay } from '../../logic/periods';
import { KIND_LABEL, orderedCategories } from '../../logic/categories';
import { accountBalance, lastDataDay } from '../../logic/totals';
import { sumOf } from '../../logic/query';
import { Money } from '../Money';
import { BackupCard } from '../BackupCard';
import { Icon } from '../Icons';
import { formatDay, formatNumber, formatTimestamp, monthName } from '../format';


function switchDemo(): void {
  resetForDemo();
  toggleDemo();
}

export function Settings({ data }: { data: AppData }) {
  const [account, setAccount] = useState<Id | 'new' | null>(null);
  const [category, setCategory] = useState<Id | 'new' | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [holding, setHolding] = useState<Id | 'new' | null>(null);
  const today = isoDay(new Date());
  const c = connection.value;
  const cats = orderedCategories(data, { includeArchived: showArchived });
  const used = new Map<Id, number>();
  for (const m of Object.values(data.months)) for (const t of m.transactions) if (t.categoryId) used.set(t.categoryId, (used.get(t.categoryId) ?? 0) + 1);

  return (
    <div class="stack">
      {demoOn.value ? (
        <section class="card" aria-labelledby="imp-h">
          <h2 id="imp-h">{t('settings.demoTitle')}</h2>
          <p>{t('settings.demoText')}</p>
          <div class="actions"><button type="button" class="btn btn-primary" onClick={switchDemo}>{t('frame.backToMine')}</button></div>
        </section>
      ) : (
        <section class="card" aria-labelledby="imp-h">
          <h2 id="imp-h">{t('settings.importTitle')}</h2>
          <p>{t('settings.importText')}</p>
          <div class="actions"><button type="button" class="btn btn-primary" onClick={openImport}><Icon name="upload" />{t('settings.importFile')}</button></div>
        </section>
      )}

      <section class="card" aria-labelledby="acc-h">
        <div class="card-head"><h2 id="acc-h">{t('settings.accounts')}</h2>
          <button type="button" class="btn btn-small" onClick={() => setAccount('new')}><Icon name="plus" />{t('settings.add')}</button></div>
        <ul class="rows">
          {data.accounts.map((a) => {
            const last = lastDataDay(data, a.id);
            // A card paid in full from the bank has no meaningful running balance here: show its latest month instead.
            const month = last?.slice(0, 7);
            const cardMonth = a.kind === 'card' && month ? -sumOf((data.months[month]?.transactions ?? []).filter((t) => t.accountId === a.id)) : null;
            return (
              <li key={a.id}>
                <button type="button" class="row" onClick={() => setAccount(a.id)}>
                  <span class="row-main"><span class="row-title"><bdi dir="auto">{a.closed ? t('settings.closedSuffix', { name: a.name }) : a.name}</bdi></span>
                    <span class="row-sub">{t(ACCOUNT_KINDS[a.kind])}{last ? t('settings.upTo', { date: formatDay(last) }) : t('settings.noTransactions')}{cardMonth !== null && month ? t('settings.spentIn', { month: monthName(month) }) : ''}</span></span>
                  <Money minor={cardMonth ?? accountBalance(data, a.id)} class="row-amount" />
                </button>
              </li>
            );
          })}
        </ul>
        {data.accounts.some((a) => a.kind === 'card') && <p class="hint">{t('settings.cardHint')}</p>}
      </section>

      <section class="card" aria-labelledby="own-h">
        <div class="card-head"><h2 id="own-h">{t('settings.ownOwe')}</h2>
          <button type="button" class="btn btn-small" onClick={() => setHolding('new')}><Icon name="plus" />{t('settings.add')}</button></div>
        {data.holdings.length ? (
          <ul class="rows">{data.holdings.map((h) => {
            const last = h.valuations.at(-1);
            return (
              <li key={h.id}><button type="button" class="row" onClick={() => setHolding(h.id)}>
                <span class="row-main"><span class="row-title"><bdi dir="auto">{h.name}</bdi></span>
                  <span class="row-sub">{t(HOLDING_KINDS[h.kind])}{last ? t('settings.valueOn', { date: formatDay(last.date) }) : t('settings.noValue')}{h.inNetWorth ? '' : t('settings.notInNetWorth')}</span></span>
                <Money minor={(h.kind === 'debt' ? -1 : 1) * Math.abs(valueOn(h, today) ?? 0)} class="row-amount" />
              </button></li>
            );
          })}</ul>
        ) : <p>{t('settings.ownOweEmpty')}</p>}
      </section>

      <section class="card" aria-labelledby="cat-h">
        <div class="card-head"><h2 id="cat-h">{t('settings.categories')}</h2>
          <button type="button" class="btn btn-small" onClick={() => setCategory('new')}><Icon name="plus" />{t('settings.add')}</button></div>
        {(['spending', 'income', 'transfer'] as const).map((k) => {
          const list = cats.filter((x) => x.kind === k);
          if (!list.length) return null;
          return (
            <div key={k}>
              <h3 class="day-head">{t(KIND_LABEL[k])}</h3>
              <ul class="rows">
                {list.map((x) => (
                  <li key={x.id}>
                    <button type="button" class={`row${x.parentId ? ' row-child' : ''}`} onClick={() => setCategory(x.id)}>
                      <span class="row-main"><span class="row-title"><bdi dir="auto">{x.archived ? t('settings.archivedSuffix', { name: x.name }) : x.name}</bdi></span></span>
                      <span class="row-count">{formatNumber(used.get(x.id) ?? 0)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {data.categories.some((x) => x.archived) && (
          <button type="button" class="link-btn" onClick={() => setShowArchived(!showArchived)}>{t(showArchived ? 'settings.hideArchived' : 'settings.showArchived')}</button>
        )}
      </section>

      {data.rules.length > 0 && (
        <section class="card" aria-labelledby="rules-h">
          <h2 id="rules-h">{t('settings.rules')}</h2>
          <p>{t('settings.rulesText')}</p>
          <ul class="rows">
            {[...data.rules].sort((a, b) => a.priority - b.priority).map((r) => (
              <li key={r.id} class="row row-static">
                <span class="row-main"><span class="row-title"><bdi dir="auto">{r.match.descriptionEquals ?? r.match.descriptionContains ?? '—'}</bdi></span>
                  <span class="row-sub">{t('common.arrowTo')} {data.categories.find((x) => x.id === r.set.categoryId)?.name ?? t('parts.noCategory')}{r.set.payee ? t('settings.shownAs', { name: r.set.payee }) : ''}</span></span>
                <button type="button" class="btn btn-small" onClick={() => { const e = deleteRule(data, r.id); commit(e.data, e.docs, t('settings.ruleDeleted')); }}>{t('common.delete')}</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section class="card" aria-labelledby="comfort-h">
        <h2 id="comfort-h">{t('settings.privacy')}</h2>
        <label class="check">
          <input type="checkbox" checked={data.settings.startWithAmountsHidden} onChange={(e) => { const v = (e.currentTarget as HTMLInputElement).checked; const x = setStartHidden(data, v); commit(x.data, x.docs, t(v ? 'settings.startHidden' : 'settings.startShown')); }} />
          <span>{t('settings.startHiddenLabel')}</span>
        </label>
      </section>

      {c.state === 'ready' && !demoOn.value && <BackupCard store={c.store} data={data} />}

      {errorLog.value.length > 0 && (
        <section class="card" aria-labelledby="err-h">
          <h2 id="err-h">{t('settings.problems')}</h2>
          <p>{t('settings.problemsText')}</p>
          <ul class="plain">{errorLog.value.slice(-10).reverse().map((e, i) => <li key={i}><bdi>{formatTimestamp(e.at)} · {e.where}: {e.message}</bdi></li>)}</ul>
        </section>
      )}

      {holding && <HoldingSheet data={data} id={holding} onClose={() => setHolding(null)} />}
      {account && <AccountSheet data={data} id={account} onClose={() => setAccount(null)} />}
      {category && <CategorySheet data={data} id={category} onClose={() => setCategory(null)} />}
    </div>
  );
}

// The edit sheets behind Settings: an account, a category, something you own or owe.
import { t, rich, type Key } from '../../i18n';
import { useState } from 'preact/hooks';
import type { Account, AccountKind, AppData, Category, CategoryKind, Holding, Id } from '../../model/types';
import { commit } from '../../state/data';
import { addAccount, addCategory, deleteHolding, saveHolding, updateAccount, updateCategory } from '../../logic/edits';
import { KIND_LABEL } from '../../logic/categories';
import { isoDay } from '../../logic/periods';
import { Money } from '../Money';
import { Sheet } from '../Sheet';
import { formatDay } from '../format';

export const HOLDING_KINDS: Record<Holding['kind'], Key> = { asset: 'settings.holding.asset', property: 'settings.holding.property', debt: 'settings.holding.debt' };
export const ACCOUNT_KINDS: Record<AccountKind, Key> = { bank: 'settings.account.bank', card: 'settings.account.card', cash: 'settings.account.cash', savings: 'settings.account.savings', loan: 'settings.account.loan', wallet: 'settings.account.wallet' };

function shekelsToMinor(text: string): number | null {
  const t = text.replace(/[,\s₪]/g, '').replace('−', '-');
  return /^-?\d+(\.\d{1,2})?$/.test(t) ? Math.round(Number(t) * 100) : null;
}

export function AccountSheet({ data, id, onClose }: { data: AppData; id: Id | 'new'; onClose: () => void }) {
  const a: Account | undefined = id === 'new' ? undefined : data.accounts.find((x) => x.id === id);
  const [name, setName] = useState(a?.name ?? '');
  const [kind, setKind] = useState<AccountKind>(a?.kind ?? 'bank');
  const [opening, setOpening] = useState(((a?.openingBalance ?? 0) / 100).toFixed(2));
  const [closed, setClosed] = useState(a?.closed ?? false);
  const [problem, setProblem] = useState('');
  const save = () => {
    const minor = shekelsToMinor(opening);
    if (!name.trim()) return setProblem(t('settings.accountName'));
    if (minor === null) return setProblem(t('settings.openingNumber'));
    if (!a) { const e = addAccount(data, { name: name.trim(), kind, currency: 'ILS', openingBalance: minor, openingDate: null }); commit(e.data, e.docs, t('settings.added', { name: name.trim() })); }
    else { const e = updateAccount(data, a.id, { name: name.trim(), kind, openingBalance: minor, closed }); commit(e.data, e.docs, t('settings.saved', { name: name.trim() })); }
    onClose();
  };
  return (
    <Sheet title={t(a ? 'settings.accountTitle' : 'settings.newAccount')} onClose={onClose} footer={<><button type="button" class="btn btn-primary" onClick={save}>{t('common.save')}</button><button type="button" class="btn" onClick={onClose}>{t('common.cancel')}</button></>}>
      <div class="form">
        <label class="form-row"><span>{t('settings.name')}</span><input class="field" dir="auto" value={name} maxLength={60} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} /></label>
        <label class="form-row"><span>{t('settings.kind')}</span>
          <select class="field" value={kind} onChange={(e) => setKind((e.currentTarget as HTMLSelectElement).value as AccountKind)}>
            {Object.entries(ACCOUNT_KINDS).map(([k, label]) => <option key={k} value={k}>{t(label)}</option>)}
          </select></label>
        <label class="form-row"><span>{t('settings.opening')}</span><input class="field" inputMode="decimal" value={opening} onInput={(e) => setOpening((e.currentTarget as HTMLInputElement).value)} /></label>
        {a && <label class="check"><input type="checkbox" checked={closed} onChange={(e) => setClosed((e.currentTarget as HTMLInputElement).checked)} /><span>{t('settings.closed')}</span></label>}
        {problem && <p class="note note-problem" role="alert">{problem}</p>}
      </div>
    </Sheet>
  );
}

export function CategorySheet({ data, id, onClose }: { data: AppData; id: Id | 'new'; onClose: () => void }) {
  const c: Category | undefined = id === 'new' ? undefined : data.categories.find((x) => x.id === id);
  const [name, setName] = useState(c?.name ?? '');
  const [kind, setKind] = useState<CategoryKind>(c?.kind ?? 'spending');
  const [parentId, setParentId] = useState<Id | null>(c?.parentId ?? null);
  const [fixedCost, setFixedCost] = useState(c?.fixedCost ?? false);
  const [archived, setArchived] = useState(c?.archived ?? false);
  const [problem, setProblem] = useState('');
  const hasChildren = c ? data.categories.some((x) => x.parentId === c.id) : false;
  const parents = data.categories.filter((x) => x.kind === kind && !x.parentId && x.id !== c?.id && !x.archived);
  const save = () => {
    const n = name.trim();
    if (!n) return setProblem(t('settings.categoryName'));
    if (data.categories.some((x) => x.id !== c?.id && x.name.toLowerCase() === n.toLowerCase())) return setProblem(t('settings.categoryExists'));
    const parent = hasChildren ? null : parents.some((p) => p.id === parentId) ? parentId : null;
    if (!c) { const e = addCategory(data, { name: n, kind, parentId: parent, color: null, fixedCost }); commit(e.data, e.docs, t('settings.added', { name: n })); }
    else { const e = updateCategory(data, c.id, { name: n, kind, parentId: parent, fixedCost, archived }); commit(e.data, e.docs, t('settings.saved', { name: n })); }
    onClose();
  };
  return (
    <Sheet title={t(c ? 'settings.categoryTitle' : 'settings.newCategory')} onClose={onClose} footer={<><button type="button" class="btn btn-primary" onClick={save}>{t('common.save')}</button><button type="button" class="btn" onClick={onClose}>{t('common.cancel')}</button></>}>
      <div class="form">
        <label class="form-row"><span>{t('settings.name')}</span><input class="field" dir="auto" value={name} maxLength={40} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} /></label>
        <label class="form-row"><span>{t('settings.kind')}</span>
          <select class="field" value={kind} onChange={(e) => { setKind((e.currentTarget as HTMLSelectElement).value as CategoryKind); setParentId(null); }}>
            {(['spending', 'income', 'transfer'] as const).map((k) => <option key={k} value={k}>{t(KIND_LABEL[k])}</option>)}
          </select></label>
        {!hasChildren && (
          <label class="form-row"><span>{t('settings.inside')} <span class="hint">{t('sheets.optional')}</span></span>
            <select class="field" value={parentId ?? ''} onChange={(e) => setParentId((e.currentTarget as HTMLSelectElement).value || null)}>
              <option value="">{t('settings.mainCategory')}</option>
              {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select></label>
        )}
        {kind === 'spending' && <label class="check"><input type="checkbox" checked={fixedCost} onChange={(e) => setFixedCost((e.currentTarget as HTMLInputElement).checked)} /><span>{t('settings.fixedCost')}</span></label>}
        {c && <label class="check"><input type="checkbox" checked={archived} onChange={(e) => setArchived((e.currentTarget as HTMLInputElement).checked)} /><span>{t('settings.archivedHint')}</span></label>}
        {problem && <p class="note note-problem" role="alert">{problem}</p>}
      </div>
    </Sheet>
  );
}

export function HoldingSheet({ data, id, kind: startKind = 'asset', today = isoDay(new Date()), onClose }: { data: AppData; id: Id | 'new'; kind?: Holding['kind']; today?: string; onClose: () => void }) {
  const h: Holding | undefined = id === 'new' ? undefined : data.holdings.find((x) => x.id === id);
  const last = h?.valuations.at(-1);
  const [name, setName] = useState(h?.name ?? '');
  const [kind, setKind] = useState<Holding['kind']>(h?.kind ?? startKind);
  const [value, setValue] = useState(last ? String(Math.abs(last.value) / 100) : '');
  const [date, setDate] = useState(today);
  const [inNetWorth, setInNetWorth] = useState(h?.inNetWorth ?? true);
  const [problem, setProblem] = useState('');
  const save = () => {
    if (!name.trim()) return setProblem(t('settings.holdingName'));
    const minor = value.trim() ? shekelsToMinor(value) : null;
    if (value.trim() && (minor === null || minor < 0)) return setProblem(t('settings.valueNumber'));
    // A phone's date box can be emptied; a value with no date can't be placed in time (bug found 6 Nov 2026).
    if (minor !== null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return setProblem(t('settings.valueDate'));
    const changedValue = minor !== null && (!last || minor !== Math.abs(last.value) || date !== last.date);
    const e = saveHolding(data, { id: h?.id, name, kind, inNetWorth, value: changedValue ? minor : null, date });
    commit(e.data, e.docs, t(h ? 'settings.saved' : 'settings.added', { name: name.trim() }));
    onClose();
  };
  const remove = () => { if (!h) return; const e = deleteHolding(data, h.id); commit(e.data, e.docs, t('settings.deleted', { name: h.name })); onClose(); };
  return (
    <Sheet title={h ? h.name : t('settings.holdingNew')} onClose={onClose} footer={<>
      <button type="button" class="btn btn-primary" onClick={save}>{t('common.save')}</button>
      {h && <button type="button" class="btn" onClick={remove}>{t('common.delete')}</button>}
      <button type="button" class="btn" onClick={onClose}>{t('common.cancel')}</button>
    </>}>
      <div class="form">
        <label class="form-row"><span>{t('settings.name')}</span><input class="field" dir="auto" value={name} maxLength={60} placeholder={t('settings.holdingPlaceholder')} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} /></label>
        <label class="form-row"><span>{t('settings.kind')}</span>
          <select class="field" value={kind} onChange={(e) => setKind((e.currentTarget as HTMLSelectElement).value as Holding['kind'])}>
            {Object.entries(HOLDING_KINDS).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}
          </select></label>
        <div class="form-pair">
          <label class="form-row"><span>{t(kind === 'debt' ? 'settings.stillOwed' : 'settings.value')}</span><input class="field" inputMode="decimal" value={value} onInput={(e) => setValue((e.currentTarget as HTMLInputElement).value)} /></label>
          <label class="form-row"><span>{t('settings.on')}</span><input class="field" type="date" value={date} max={today} onInput={(e) => setDate((e.currentTarget as HTMLInputElement).value)} /></label>
        </div>
        <label class="check"><input type="checkbox" checked={inNetWorth} onChange={(e) => setInNetWorth((e.currentTarget as HTMLInputElement).checked)} /><span>{t('settings.inNetWorth')}</span></label>
        {h && h.valuations.length > 1 && (
          <div><h3 class="day-head">{t('settings.earlierValues')}</h3>
            <ul class="plain">{[...h.valuations].reverse().slice(1, 6).map((v) => <li key={v.date}>{rich('settings.valueOnDate', { amount: <Money minor={Math.abs(v.value)} round /> }, { date: formatDay(v.date) })}</li>)}</ul></div>
        )}
        {problem && <p class="note note-problem" role="alert">{problem}</p>}
      </div>
    </Sheet>
  );
}

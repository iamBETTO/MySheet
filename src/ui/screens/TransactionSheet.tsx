// Edit one transaction: category, a clearer name, a note. Can apply to every line with the same description,
// and remember it as a rule for future imports. Saved with Undo (UX rule 4).
import { useState } from 'preact/hooks';
import type { AppData, Id } from '../../model/types';
import { commit } from '../../state/data';
import { findTransaction, saveRule, updateTransactions, type TransactionPatch } from '../../logic/edits';
import { similarKey } from '../../logic/names';
import { Sheet } from '../Sheet';
import { Money } from '../Money';
import { CategorySelect } from '../CategorySelect';
import { t } from '../../i18n';
import { formatWeekday } from '../format';

export function TransactionSheet({ data, id, onClose, docked }: { data: AppData; id: Id; onClose: () => void; docked?: boolean }) {
  const tx = findTransaction(data, id);
  const [categoryId, setCategoryId] = useState<Id | null>(tx?.categoryId ?? null);
  const [payee, setPayee] = useState(tx?.payee ?? '');
  const [note, setNote] = useState(tx?.note ?? '');
  const [allSame, setAllSame] = useState(false);
  const [remember, setRemember] = useState(false);
  if (!tx) return null;

  // "The same" means the same name when the line has one (e.g. from Bit details), otherwise the same bank text.
  const byName = tx.payee !== null;
  const key = similarKey(tx.description);
  const sameIds = Object.values(data.months).flatMap((m) => m.transactions)
    .filter((x) => x.id !== tx.id && (byName ? x.payee === tx.payee : x.payee === null && similarKey(x.description) === key)).map((x) => x.id);
  const account = data.accounts.find((a) => a.id === tx.accountId);
  const hasRule = data.rules.some((r) => r.match.descriptionEquals === tx.description);

  const save = () => {
    const patch: TransactionPatch = {};
    if (categoryId !== tx.categoryId) patch.categoryId = categoryId;
    const p = payee.trim() || null;
    if (p !== tx.payee) patch.payee = p;
    const n = note.trim() || null;
    if (n !== tx.note) patch.note = n;
    const shared: TransactionPatch = { categoryId, payee: p };
    if (!Object.keys(patch).length && !allSame && !remember) { onClose(); return; }
    let edit = updateTransactions(data, [tx.id], patch);
    let count = 1;
    if (allSame && sameIds.length) {
      const more = updateTransactions(edit.data, sameIds, shared);
      edit = { data: more.data, docs: [...edit.docs, ...more.docs] };
      count += sameIds.length;
    }
    if (remember) {
      const existing = data.rules.find((r) => r.match.descriptionEquals === tx.description);
      const r = saveRule(edit.data, { id: existing?.id, match: { descriptionEquals: tx.description }, set: { categoryId, payee: p } });
      edit = { data: r.data, docs: [...edit.docs, ...r.docs] };
    }
    commit(edit.data, edit.docs, t(remember ? 'sheets.txSavedRule' : 'sheets.txSaved', { n: count }));
    onClose();
  };

  return (
    <Sheet docked={docked} title={t('sheets.transaction')} onClose={onClose} footer={<>
      <button type="button" class="btn btn-primary" onClick={save}>{t('common.save')}</button>
      <button type="button" class="btn" onClick={onClose}>{t('common.cancel')}</button>
    </>}>
      <div class="tx-head">
        <Money minor={tx.amount} signed class="tx-amount" />
        <p class="tx-meta">{formatWeekday(tx.date)} · {account?.name ?? t('sheets.unknownAccount')}</p>
        <p class="tx-desc"><span class="visually-hidden">{t('sheets.asBankWrote')}</span><bdi dir="auto">{tx.description}</bdi></p>
      </div>
      <div class="form">
        <label class="form-row">
          <span>{t('sheets.category')}</span>
          <CategorySelect data={data} value={categoryId} onChange={(v) => setCategoryId(v === 'none' ? null : v)} />
        </label>
        <label class="form-row">
          <span>{t('sheets.nameToShow')} <span class="hint">{t('sheets.nameHint')}</span></span>
          <input class="field" type="text" dir="auto" value={payee} maxLength={80} onInput={(e) => setPayee((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <label class="form-row">
          <span>{t('sheets.note')} <span class="hint">{t('sheets.optional')}</span></span>
          <textarea class="field" dir="auto" rows={2} maxLength={500} value={note} onInput={(e) => setNote((e.currentTarget as HTMLTextAreaElement).value)} />
        </label>
        {sameIds.length > 0 && (
          <label class="check">
            <input type="checkbox" checked={allSame} onChange={(e) => setAllSame((e.currentTarget as HTMLInputElement).checked)} />
            <span>{t('sheets.alsoSame', { n: sameIds.length })}</span>
          </label>
        )}
        <label class="check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember((e.currentTarget as HTMLInputElement).checked)} />
          <span>{t(hasRule ? 'sheets.updateRule' : 'sheets.makeRule')}</span>
        </label>
      </div>
    </Sheet>
  );
}

// Setting a limit: for every month, or for one month only (v2 ability, placed in Limits, month by month).
import { useState } from 'preact/hooks';
import type { AppData, Id, MonthKey } from '../../model/types';
import { commit } from '../../state/data';
import { limitFor } from '../../logic/budget';
import { setLimit, setMonthLimit } from '../../logic/edits';
import { Money, moneyText } from '../Money';
import { Sheet } from '../Sheet';
import { CategorySelect } from '../CategorySelect';
import { t, rich } from '../../i18n';
import { v1Date } from '../format';

export type Editing = { categoryId: Id | null; isNew: boolean };

export function LimitSheet({ data, month, editing, onClose }: { data: AppData; month: MonthKey; editing: Editing; onClose: () => void }) {
  const [categoryId, setCategoryId] = useState<Id | null>(editing.categoryId);
  const usual = data.budgets.limits.find((l) => l.categoryId === categoryId)?.monthly ?? null;
  const override = data.budgets.overrides.find((o) => o.month === month && o.categoryId === categoryId)?.monthly ?? null;
  const current = limitFor(data, month, categoryId);
  const [amount, setAmount] = useState(current === null ? '' : String(Math.round(current / 100)));
  const [scope, setScope] = useState<'usual' | 'month'>(override !== null ? 'month' : 'usual');
  const [problem, setProblem] = useState('');
  const name = categoryId === null ? t('sheets.allSpending') : data.categories.find((c) => c.id === categoryId)?.name ?? t('sheets.categoryFallback');

  const save = () => {
    const v = Number(amount.replace(/[,\s₪]/g, ''));
    if (!amount.trim() || !Number.isFinite(v) || v <= 0) return setProblem(t('sheets.limitNumber'));
    const minor = Math.round(v * 100);
    const e = scope === 'usual' ? setLimit(data, categoryId, minor) : setMonthLimit(data, month, categoryId, minor);
    commit(e.data, e.docs, scope === 'month' ? t('sheets.limitSavedOnly', { name, amount: moneyText(minor, true), month: v1Date(month, 'monthLong') }) : t('sheets.limitSavedMonthly', { name, amount: moneyText(minor, true) }));
    onClose();
  };
  // Removing follows the choice below: the one-month limit for this month, or the usual limit (and this month's with it).
  const canRemove = scope === 'month' ? override !== null : usual !== null || override !== null;
  const remove = () => {
    let d = data;
    if (override !== null) d = setMonthLimit(d, month, categoryId, null).data;
    if (scope === 'usual' && usual !== null) d = setLimit(d, categoryId, null).data;
    commit(d, ['budgets'], scope === 'month' ? t('sheets.monthLimitRemoved', { name, month: v1Date(month, 'monthLong') }) : t('sheets.limitRemoved', { name }));
    onClose();
  };

  return (
    <Sheet title={editing.isNew ? t('sheets.addLimit') : t('sheets.limitFor', { name })} onClose={onClose} footer={<>
      <button type="button" class="btn btn-primary" onClick={save}>{t('common.save')}</button>
      {!editing.isNew && current !== null && canRemove && <button type="button" class="btn" onClick={remove}>{t('sheets.removeLimit')}</button>}
      <button type="button" class="btn" onClick={onClose}>{t('common.cancel')}</button>
    </>}>
      <div class="form">
        {editing.isNew && (
          <label class="form-row"><span>{t('sheets.for')}</span>
            <CategorySelect data={data} value={categoryId} noneLabel={t('sheets.allSpending')} kinds={['spending']} onChange={(v) => setCategoryId(v === 'none' ? null : v)} />
          </label>
        )}
        <label class="form-row"><span>{t('sheets.limitAMonth')}</span>
          <input class="field" inputMode="numeric" value={amount} onInput={(e) => setAmount((e.currentTarget as HTMLInputElement).value)} />
        </label>
        <fieldset class="fieldset">
          <legend>{t('sheets.appliesTo')}</legend>
          <label class="check"><input type="radio" name="scope" checked={scope === 'usual'} onChange={() => setScope('usual')} /><span>{t('sheets.everyMonth')}{usual !== null ? rich('sheets.nowAmount', { amount: <Money minor={usual} round /> }) : ''}</span></label>
          <label class="check"><input type="radio" name="scope" checked={scope === 'month'} onChange={() => setScope('month')} /><span>{t('sheets.onlyMonth', { month: v1Date(month, 'monthLong') })}</span></label>
        </fieldset>
        {problem && <p class="note note-problem" role="alert">{problem}</p>}
      </div>
    </Sheet>
  );
}

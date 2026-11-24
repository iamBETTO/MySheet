// v1's period panel: opens under the header, stays open while choosing (the owner, 11 Oct 2026), so a period and a
// comparison can be picked in one go. Done, Escape or a tap outside close it.
import { useEffect, useRef } from 'preact/hooks';
import type { AppData, IsoDate } from '../../model/types';
import { compareChoices, monthChoices, periodChoices, samePeriod, type Period } from '../../logic/periods';
import { compareWith, period, setCompare, setPeriod } from '../../state/view';
import { t } from '../../i18n';
import { resolvePeriod } from '../format';

const key = (p: Period) => JSON.stringify(p);

export function PeriodPanel({ data, today, onClose }: { data: AppData; today: IsoDate; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const p = period.value, q = compareWith.value;
  const name = (x: Period) => resolvePeriod(x, today, data).label;
  const months = monthChoices(data);
  const pickedMonth = p.kind === 'month';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onClickOutside = (e: MouseEvent) => {
      const t = e.target as Element | null;
      if (t?.isConnected && !t.closest('#period-sheet, #period-btn')) onClose();
    };
    document.addEventListener('keydown', onKey);
    // A click, not a pointer press: on a phone every scroll starts with a press, and scrolling must not close the panel
    // (the owner's phone test, 6 Nov 2026). A click only comes from a real tap or mouse click.
    document.addEventListener('click', onClickOutside);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('click', onClickOutside); };
  }, []);

  return (
    <div ref={box} class="rm-sheet" id="period-sheet">
      <div>
        <h3>{t('frame.show')}</h3>
        <div class="rm-periods" role="group" aria-label={t('frame.timePeriod')}>
          {periodChoices(data).map((x) => (
            <button key={key(x)} type="button" class="rm-pbtn" aria-pressed={samePeriod(x, p)} onClick={() => { setPeriod(x); if (q && samePeriod(q, x)) setCompare(null); }}>{name(x)}</button>
          ))}
          <select class={`rm-select${pickedMonth ? ' on' : ''}`} aria-label={t('frame.pickMonth')} value={pickedMonth ? key(p) : ''}
            onChange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value; if (v) setPeriod(JSON.parse(v) as Period); }}>
            <option value="">{t('frame.month')}</option>
            {months.map((m) => <option key={key(m)} value={key(m)}>{name(m)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <h3><label for="cmp">{t('frame.compareWith')}</label></h3>
        <select id="cmp" class={`rm-select${q ? ' on' : ''}`} value={q ? key(q) : ''} onChange={(e) => { const v = (e.currentTarget as HTMLSelectElement).value; setCompare(v ? (JSON.parse(v) as Period) : null); }}>
          <option value="">{t('frame.nothing')}</option>
          {compareChoices(data, p).map((x) => <option key={key(x)} value={key(x)}>{name(x)}</option>)}
        </select>
      </div>
      <div class="rm-sheet-foot"><button type="button" class="rm-btn" onClick={onClose}>{t('common.done')}</button></div>
    </div>
  );
}

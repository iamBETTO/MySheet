// Calendar, as v1 (V1_REFERENCE.md, Calendar): a month of day boxes tinted by what was spent, notes as coloured strips,
// and the picked day's transactions. v2 adds adding and editing notes from the day card.
import { useMemo, useState } from 'preact/hooks';
import type { AppData, CalendarNote, IsoDate } from '../../model/types';
import { amountsHidden, calendarDay, calendarMonth } from '../../state/view';
import { daysInMonth, monthsBetween } from '../../logic/periods';
import { isCoveredCardCharge } from '../../logic/cardCharges';
import { inRange } from '../../logic/totals';
import { displayName } from '../../logic/names';
import { hasTransactions } from '../../logic/overview';
import { Money, moneyText } from '../Money';
import { NoteSheet, noteColor } from './NoteSheet';
import { t, rich } from '../../i18n';
import { formatNumber, hiddenAmount, indexCategories, v1Date, weekdayHeads } from '../format';
import { language } from '../../state/language';

/** v1's short amount for narrow boxes: ₪1.2k from 1,000 up. In Hebrew the sign follows the number (decision ms-d60)
 *  with no space, so it fits a day's box; on screen it still sits left of the number, as in English. */
function shortAmount(minor: number): string {
  const v = Math.abs(minor / 100), sign = minor < 0 ? '−' : '';
  const k = v / 1000;
  const body = v < 1000 ? formatNumber(Math.round(v)) : `${k >= 10 ? Math.round(k) : Math.round(k * 10) / 10}k`;
  return language.value === 'he' ? `\u200F\u200E${sign}${body}\u200F₪` : `${sign}₪${body}`;
}

/** For large text on a phone (the owner, 6 Nov 2026): no ₪ and whole thousands, "350", "4k", "12k"; exact in the day card. */
function tinyAmount(minor: number): string {
  const v = Math.abs(minor / 100);
  if (v < 1000) return String(Math.round(v));
  if (v < 999_500) return `${Math.round(v / 1000)}k`;
  return `${Math.round(v / 1_000_000)}m`;
}

export function Calendar({ data, asOf }: { data: AppData; asOf: IsoDate }) {
  const [note, setNote] = useState<Partial<CalendarNote> | null>(null);
  const keys = Object.keys(data.months).sort();
  const months = keys.length ? monthsBetween(keys[0]!, keys.at(-1)!) : [asOf.slice(0, 7)];
  const mon = calendarMonth.value && months.includes(calendarMonth.value) ? calendarMonth.value : months.at(-1)!;
  const i = months.indexOf(mon);
  const lastDate = asOf;
  const picked = calendarDay.value;
  const sel = picked && picked.startsWith(mon) ? picked : lastDate.startsWith(mon) ? lastDate : null;
  const cats = indexCategories(data);
  const days = useMemo(() => {
    const m = new Map<IsoDate, { spent: number; income: number }>();
    for (const t of inRange(data, `${mon}-01`, `${mon}-31`)) {
      const k = cats.kindOf(t);
      if (k === 'transfer') continue;
      const d = m.get(t.date) ?? { spent: 0, income: 0 };
      if (k === 'spending') d.spent -= t.amount; else d.income += t.amount;
      m.set(t.date, d);
    }
    return m;
  }, [data, mon]);
  const [y, mm] = mon.split('-').map(Number) as [number, number];
  const first = new Date(Date.UTC(y, mm - 1, 1)).getUTCDay(), dim = daysInMonth(mon);
  const max = Math.max(1, ...[...days.values()].map((d) => d.spent));
  const notes = data.notes;
  const notesOn = (date: IsoDate) => notes.filter((n) => date >= n.start && date <= n.end);
  const inMonth = notes.filter((n) => n.start <= `${mon}-${String(dim).padStart(2, '0')}` && n.end >= `${mon}-01`).sort((a, b) => a.start.localeCompare(b.start));
  const rows = [...days.entries()];
  const total = rows.reduce((n, [, d]) => n + d.spent, 0), spentDays = rows.filter(([, d]) => d.spent > 0).length;
  const top = [...rows].sort((a, b) => b[1].spent - a[1].spent)[0];
  const heads = weekdayHeads();
  const step = (k: number) => { const j = i + k; if (j >= 0 && j < months.length) { calendarMonth.value = months[j]!; calendarDay.value = null; } };

  return (
    <>
      <section class="rm-card half" id="calendar-month" aria-labelledby="cal-title">
        <div class="rm-calnav">
          <button type="button" class="rm-icon" aria-label={t('calendar.previous')} disabled={i <= 0} onClick={() => step(-1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg></button>
          <h2 class="rm-caltitle" id="cal-title">{v1Date(mon, 'monthLong')}</h2>
          <button type="button" class="rm-icon" aria-label={t('calendar.next')} disabled={i >= months.length - 1} onClick={() => step(1)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg></button>
        </div>
        {hasTransactions(data) && <p class="rm-lim-sum">{rich('calendar.summary', { total: <b><Money minor={total} round /></b> }, { month: v1Date(mon, 'monthLong'), n: spentDays })}{top && top[1].spent > 0 ? rich('calendar.biggest', { amount: <b><Money minor={top[1].spent} round /></b> }, { date: v1Date(top[0], 'day') }) : '.'}</p>}
        <div class="rm-calhead" aria-hidden="true">{heads.long.map((d, i) => <span key={i}><span class="wd-long">{d}</span><span class="wd-short">{heads.short[i]}</span></span>)}</div>
        <div class="rm-cal">
          {Array.from({ length: first }, (_, k) => <div key={`e${k}`} class="rm-day empty" />)}
          {Array.from({ length: dim }, (_, k) => {
            const date = `${mon}-${String(k + 1).padStart(2, '0')}`;
            const d = days.get(date), on = notesOn(date);
            const label = [v1Date(date, 'weekday').replace(/, \d{4}$/, ''),
              ...(d?.spent ? [t('calendar.daySpent', { amount: moneyText(d.spent) })] : []),
              ...(d && d.income > 0 ? [t('calendar.dayCameIn', { amount: moneyText(d.income) })] : []),
              ...on.map((n) => t('calendar.dayNote', { text: n.text }))].join(', ');
            return (
              <button key={date} type="button" class={`rm-day${date > lastDate ? ' future' : ''}`} aria-pressed={date === sel} aria-label={label}
                style={d && d.spent > 0 ? { background: `color-mix(in srgb, var(--chart-out) ${Math.round(5 + (20 * d.spent) / max)}%, var(--color-panel))` } : undefined}
                onClick={() => { calendarMonth.value = mon; calendarDay.value = date; }}>
                <span class="dn">{k + 1}</span>
                {d?.spent ? <span class="amt m">{amountsHidden.value ? hiddenAmount() : <><span class="amt-long">{moneyText(d.spent)}</span><span class="amt-short">{shortAmount(d.spent)}</span><span class="amt-tiny" aria-hidden="true">{tinyAmount(d.spent)}</span></>}</span> : null}
                {d && d.income > 0 ? <span class="inc m">+{amountsHidden.value ? '••••' : shortAmount(d.income)}</span> : null}
                {on.map((n) => <span key={n.id} class="nt" dir="auto" aria-hidden="true" title={n.text} style={{ '--nc': noteColor(n.color) }}><span class="nt-text">{n.text}</span></span>)}
              </button>
            );
          })}
        </div>
        {inMonth.length > 0 && (
          <ul class="rm-calnotes">
            {inMonth.map((n) => (
              <li key={n.id}><i style={{ background: noteColor(n.color) }} aria-hidden="true" /><span>{n.end !== n.start ? t('calendar.range', { from: v1Date(n.start, 'day'), to: v1Date(n.end, 'day') }) : v1Date(n.start, 'day')}</span><b dir="auto" style="font-weight:500">{n.text}</b></li>
            ))}
          </ul>
        )}
        <p class="rm-note" style="margin:10px 0 0">{t('calendar.howToRead')}</p>
      </section>
      <DayCard data={data} sel={sel} notes={notesOn} onNote={setNote} />
      {note && <NoteSheet data={data} note={note} onClose={() => setNote(null)} />}
    </>
  );
}

function DayCard({ data, sel, notes, onNote }: { data: AppData; sel: IsoDate | null; notes: (d: IsoDate) => CalendarNote[]; onNote: (n: Partial<CalendarNote>) => void }) {
  const cats = indexCategories(data);
  if (!sel) {
    return (
      <section class="rm-card half" id="calendar-day" aria-labelledby="day-title">
        <div class="rm-ch"><h2 id="day-title">{t('calendar.pickDay')}</h2></div>
        <div class="rm-body"><p class="rm-note">{t('calendar.pickDayNote')}</p></div>
      </section>
    );
  }
  const rows = (data.months[sel.slice(0, 7)]?.transactions ?? []).filter((t) => t.date === sel && !isCoveredCardCharge(t, cats)).sort((a, b) => a.amount - b.amount);
  let spent = 0, came = 0;
  for (const tx of rows) { const k = cats.kindOf(tx); if (k === 'spending') spent -= tx.amount; else if (k === 'income') came += tx.amount; }
  return (
    <section class="rm-card half" id="calendar-day" aria-labelledby="day-title">
      <div class="rm-ch"><h2 id="day-title">{v1Date(sel, 'weekday')}</h2></div>
      <div class="rm-body">
        {notes(sel).length > 0 && (
          <div class="rm-daynotes">
            {notes(sel).map((n) => (
              <button key={n.id} type="button" class="rm-daynote" style={{ '--nc': noteColor(n.color) }} aria-label={t('calendar.editNote', { text: n.text })} onClick={() => onNote(n)}>
                <bdi>{n.text}</bdi>{n.end !== n.start ? ` (${t('calendar.range', { from: v1Date(n.start, 'day'), to: v1Date(n.end, 'day') })})` : ''}
              </button>
            ))}
          </div>
        )}
        <p class="rm-note">{rows.length ? <>{rich('calendar.dayTotals', { spent: <Money minor={spent} round /> }, { n: rows.length })}{came > 0 ? rich('calendar.dayCame', { amount: <Money minor={came} round /> }) : null}</> : t('calendar.nothing')}</p>
        {rows.length > 0 && (
          <div class="rm-tablebox" style="max-height:420px" tabIndex={0} role="region" aria-label={t('calendar.dayTable', { day: v1Date(sel, 'weekday') })}>
            <table>
              <thead><tr><th>{t('calendar.description')}</th><th class="hide-narrow">{t('calendar.type')}</th><th class="num">{t('calendar.amount')}</th></tr></thead>
              <tbody>{rows.map((tx) => (
                <tr key={tx.id}>
                  <td class="desc" title={tx.description}><bdi dir="auto">{displayName(tx)}</bdi></td>
                  <td class="hide-narrow">{cats.kindOf(tx) === 'transfer' ? t('calendar.ownMoney', { type: cats.name(tx.categoryId) }) : cats.name(tx.categoryId)}</td>
                  <td class={`num${tx.amount > 0 ? ' pos' : ''}`}><Money minor={tx.amount} signed /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        <button type="button" class="rm-linkbtn" onClick={() => onNote({ start: sel, end: sel })}>{t('calendar.addNote')}</button>
      </div>
    </section>
  );
}


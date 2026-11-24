// Adding and editing a calendar note over one day or a range (v2 ability, placed in Calendar's day card).
import { useState } from 'preact/hooks';
import type { AppData, CalendarNote } from '../../model/types';
import { commit } from '../../state/data';
import { deleteNote, saveNote } from '../../logic/edits';
import { Sheet } from '../Sheet';
import { t } from '../../i18n';

/** v1's note colours, by the name stored on the note. */
export const NOTE_COLORS = [['blue', 'sheets.color.blue', 'var(--chart-in)'], ['red', 'sheets.color.red', 'var(--chart-critical)'], ['green', 'sheets.color.green', 'var(--chart-balance)'], ['orange', 'sheets.color.orange', 'var(--chart-4)'], ['purple', 'sheets.color.purple', 'var(--chart-5)'], ['pink', 'sheets.color.pink', 'var(--chart-6)']] as const;
export const noteColor = (name: string | null) => NOTE_COLORS.find(([c]) => c === (name ?? '').toLowerCase())?.[2] ?? 'var(--chart-in)';

export function NoteSheet({ data, note, onClose }: { data: AppData; note: Partial<CalendarNote>; onClose: () => void }) {
  const [text, setText] = useState(note.text ?? '');
  const [start, setStart] = useState(note.start ?? '');
  const [end, setEnd] = useState(note.end ?? note.start ?? '');
  const [color, setColor] = useState(note.color ?? 'blue');
  const [problem, setProblem] = useState('');
  const save = () => {
    if (!text.trim()) return setProblem(t('sheets.writeNote'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return setProblem(t('sheets.pickDates'));
    const e = saveNote(data, { id: note.id, start, end, text, color });
    commit(e.data, e.docs, t(note.id ? 'sheets.noteSaved' : 'sheets.noteAdded'));
    onClose();
  };
  const remove = () => { if (!note.id) return; const e = deleteNote(data, note.id); commit(e.data, e.docs, t('sheets.noteDeleted')); onClose(); };
  return (
    <Sheet title={t(note.id ? 'sheets.noteTitle' : 'sheets.newNote')} onClose={onClose} footer={<>
      <button type="button" class="btn btn-primary" onClick={save}>{t('common.save')}</button>
      {note.id && <button type="button" class="btn" onClick={remove}>{t('sheets.deleteNote')}</button>}
      <button type="button" class="btn" onClick={onClose}>{t('common.cancel')}</button>
    </>}>
      <div class="form">
        <label class="form-row"><span>{t('sheets.noteTitle')}</span><input class="field" dir="auto" maxLength={120} value={text} placeholder={t('sheets.notePlaceholder')} onInput={(e) => setText((e.currentTarget as HTMLInputElement).value)} /></label>
        <div class="form-pair">
          <label class="form-row"><span>{t('sheets.from')}</span><input class="field" type="date" value={start} onInput={(e) => { const v = (e.currentTarget as HTMLInputElement).value; setStart(v); if (v > end) setEnd(v); }} /></label>
          <label class="form-row"><span>{t('sheets.to')}</span><input class="field" type="date" value={end} min={start} onInput={(e) => setEnd((e.currentTarget as HTMLInputElement).value)} /></label>
        </div>
        <fieldset class="fieldset"><legend>{t('sheets.colour')}</legend>
          <div class="swatches">{NOTE_COLORS.map(([c, name, css]) => (
            <label key={c} class="swatch-choice"><input type="radio" name="note-color" checked={color === c} onChange={() => setColor(c)} /><span class="note-swatch" style={{ background: css }} aria-hidden="true" />{t(name)}</label>
          ))}</div>
        </fieldset>
        {problem && <p class="note note-problem" role="alert">{problem}</p>}
      </div>
    </Sheet>
  );
}

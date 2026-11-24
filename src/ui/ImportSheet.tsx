// Import a bank or card file: pick it, match its columns once if it's new, choose the account, check, import.
// Lines already imported are skipped; new lines get categories from rules and past choices; Undo takes it all back.
import { useMemo, useState } from 'preact/hooks';
import type { AccountKind, AppData, ColumnLayout, Id } from '../model/types';
import { commit } from '../state/data';
import { reportError } from '../state/errors';
import { readRows, FileFormatError } from '../import/readFile';
import { detectLayout, findLayout, fromSaved, type DateFormat, type FoundLayout } from '../import/presets';
import { type ParseResult } from '../import/parse';
import { addImport } from '../import/apply';
import { reconcileCardCharges } from '../logic/cardCharges';
import { makeCategorizer } from '../import/categorize';
import { bitDetails, matchBit, readBit, type BitEntry } from '../import/bit';
import { findTransaction, updateTransactions } from '../logic/edits';
import { cellText, type Row } from '../import/rows';
import { addAccount } from '../logic/edits';
import { newId } from '../model/ids';
import type { DocKey } from '../storage/repository';
import { Sheet } from './Sheet';
import { Money } from './Money';
import { Icon } from './Icons';
import { ACCOUNT_KINDS } from './screens/SettingsSheets';
import { t } from '../i18n';
import { formatDay, readLines } from './format';

type Step =
  | { kind: 'pick'; problem?: string }
  | { kind: 'match'; fileName: string; rows: Row[] }
  | { kind: 'review'; fileName: string; rows: Row[]; layout: FoundLayout; newLayout: ColumnLayout | null }
  | { kind: 'bit'; fileName: string; entries: BitEntry[] };


export function ImportSheet({ data, onClose }: { data: AppData; onClose: () => void }) {
  const [step, setStep] = useState<Step>({ kind: 'pick' });
  const [busy, setBusy] = useState(false);

  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const { rows } = await readRows(new Uint8Array(await file.arrayBuffer()));
      const bit = readBit(rows);
      if (bit) { setStep({ kind: 'bit', fileName: file.name, entries: bit }); return; }
      const layout = detectLayout(rows, data.imports.layouts);
      setStep(layout ? { kind: 'review', fileName: file.name, rows, layout, newLayout: null } : { kind: 'match', fileName: file.name, rows });
    } catch (err) {
      if (!(err instanceof FileFormatError)) reportError('read import file', err);
      setStep({ kind: 'pick', problem: t('import.unreadable', { file: file.name }) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet title={t('import.title')} onClose={onClose}>
      {step.kind === 'pick' && (
        <div class="form">
          <p class="hint">{t('import.pickHint')}</p>
          <label class={`btn btn-primary btn-wide${busy ? ' is-disabled' : ''}`}>
            <Icon name="upload" />{t(busy ? 'import.reading' : 'import.choose')}
            <input id="import-file" type="file" accept=".csv,.txt,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="visually-hidden" onChange={onFile} disabled={busy} />
          </label>
          {step.problem && <p class="note note-problem" role="alert">{step.problem}</p>}
          {data.imports.records.length > 0 && <RecentImports data={data} />}
        </div>
      )}
      {step.kind === 'match' && (
        <MatchColumns rows={step.rows} fileName={step.fileName} onBack={() => setStep({ kind: 'pick' })}
          onDone={(layout, saved) => setStep({ kind: 'review', fileName: step.fileName, rows: step.rows, layout, newLayout: saved })} />
      )}
      {step.kind === 'review' && <Review data={data} step={step} onBack={() => setStep({ kind: 'pick' })} onDone={onClose} />}
      {step.kind === 'bit' && <BitReview data={data} fileName={step.fileName} entries={step.entries} onBack={() => setStep({ kind: 'pick' })} onDone={onClose} />}
    </Sheet>
  );
}

function RecentImports({ data }: { data: AppData }) {
  const names = new Map(data.accounts.map((a) => [a.id, a.name]));
  return (
    <div>
      <h3 class="day-head">{t('import.recent')}</h3>
      <ul class="plain">{[...data.imports.records].slice(-5).reverse().map((r) => (
        <li key={r.id}><bdi dir="auto">{r.fileName}</bdi> {t('common.arrowTo')} {names.get(r.accountId) ?? t('import.anAccount')} · {t('import.recentNew', { n: r.rowsAdded })}{r.duplicatesSkipped ? t('import.recentSkipped', { n: r.duplicatesSkipped }) : ''} · {formatDay(r.at.slice(0, 10))}</li>
      ))}</ul>
    </div>
  );
}

/** The first rows that look like a header: at least three cells of text. */
function guessHeaderRow(rows: Row[]): number {
  const i = rows.findIndex((r) => r.filter((c) => typeof c === 'string' && c.trim() && !/^[\d.,/-]+$/.test(c.trim())).length >= 3);
  return Math.max(0, i);
}

function MatchColumns({ rows, fileName, onBack, onDone }: { rows: Row[]; fileName: string; onBack: () => void; onDone: (l: FoundLayout, saved: ColumnLayout | null) => void }) {
  const [headerRow, setHeaderRow] = useState(guessHeaderRow(rows));
  const titles = (rows[headerRow] ?? []).map(cellText).filter(Boolean);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'one' | 'two'>('one');
  const [amount, setAmount] = useState('');
  const [debit, setDebit] = useState('');
  const [credit, setCredit] = useState('');
  const [dateFormat, setDateFormat] = useState<DateFormat>('DD/MM/YYYY');
  const [sign, setSign] = useState<'signed' | 'outPositive'>('signed');
  const [name, setName] = useState(fileName.replace(/\.[^.]+$/, '').replace(/[\d_.-]+$/, '').trim() || t('import.defaultLayoutName'));
  const [save, setSave] = useState(true);
  const [problem, setProblem] = useState('');
  const pick = (label: string, value: string, set: (v: string) => void) => (
    <label class="form-row"><span>{label}</span>
      <select class="field" value={value} onChange={(e) => set((e.currentTarget as HTMLSelectElement).value)}>
        <option value="">{t('import.chooseColumn')}</option>
        {titles.map((t) => <option key={t} value={t}>{t}</option>)}
      </select></label>
  );
  const done = () => {
    const ok = date && description && (mode === 'one' ? amount : debit && credit);
    if (!ok) return setProblem(t('import.answerAll'));
    const saved: ColumnLayout = { id: `layout:${newId()}`, name: name.trim() || t('import.defaultLayoutName'), headerRow, dateFormat,
      columns: mode === 'one' ? { date, description, amount } : { date, description, debit, credit }, amountSign: mode === 'one' ? sign : 'signed' };
    const found = findLayout(rows, fromSaved(saved));
    if (!found) return setProblem(t('import.notTogether'));
    const test = readLines(rows, found, 'ILS');
    if (!test.lines.length) return setProblem(t('import.nothingRead'));
    onDone(found, save ? saved : null);
  };
  return (
    <div class="form">
      <p class="hint">{t('import.newLayout')}</p>
      <label class="form-row"><span>{t('import.titleRow')}</span>
        <select class="field" value={headerRow} onChange={(e) => { setHeaderRow(Number((e.currentTarget as HTMLSelectElement).value)); setDate(''); setDescription(''); setAmount(''); setDebit(''); setCredit(''); }}>
          {rows.slice(0, 30).map((r, i) => r.some((c) => c !== null) ? <option key={i} value={i}>{t('import.rowOption', { n: i + 1, cells: r.map(cellText).filter(Boolean).slice(0, 4).join(' · ').slice(0, 60) })}</option> : null)}
        </select></label>
      {pick(t('import.date'), date, setDate)}
      <label class="form-row"><span>{t('import.datesAs')}</span>
        <select class="field" value={dateFormat} onChange={(e) => setDateFormat((e.currentTarget as HTMLSelectElement).value as DateFormat)}>
          <option value="DD/MM/YYYY">31/12/2026</option><option value="DD.MM.YYYY">31.12.2026</option><option value="DD.MM.YY">31.12.26</option><option value="YYYY-MM-DD">2026-12-31</option>
        </select></label>
      {pick(t('import.description'), description, setDescription)}
      <fieldset class="fieldset"><legend>{t('import.amountsIn')}</legend>
        <label class="check"><input type="radio" name="amode" checked={mode === 'one'} onChange={() => setMode('one')} /><span>{t('import.oneColumn')}</span></label>
        <label class="check"><input type="radio" name="amode" checked={mode === 'two'} onChange={() => setMode('two')} /><span>{t('import.twoColumns')}</span></label>
      </fieldset>
      {mode === 'one' ? <>
        {pick(t('import.amount'), amount, setAmount)}
        <fieldset class="fieldset"><legend>{t('import.outShownAs')}</legend>
          <label class="check"><input type="radio" name="asign" checked={sign === 'signed'} onChange={() => setSign('signed')} /><span>{t('import.negative')}</span></label>
          <label class="check"><input type="radio" name="asign" checked={sign === 'outPositive'} onChange={() => setSign('outPositive')} /><span>{t('import.positive')}</span></label>
        </fieldset>
      </> : <>{pick(t('import.moneyOut'), debit, setDebit)}{pick(t('import.moneyIn'), credit, setCredit)}</>}
      <label class="check"><input type="checkbox" checked={save} onChange={(e) => setSave((e.currentTarget as HTMLInputElement).checked)} /><span>{t('import.remember')}</span></label>
      {save && <label class="form-row"><span>{t('import.layoutName')}</span><input class="field" dir="auto" value={name} maxLength={50} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} /></label>}
      {problem && <p class="note note-problem" role="alert">{problem}</p>}
      <div class="actions"><button type="button" class="btn btn-primary" onClick={done}>{t('import.continue')}</button><button type="button" class="btn" onClick={onBack}>{t('import.another')}</button></div>
    </div>
  );
}

function Review({ data, step, onBack, onDone }: { data: AppData; step: Extract<Step, { kind: 'review' }>; onBack: () => void; onDone: () => void }) {
  const layoutId = step.newLayout?.id ?? step.layout.preset.id;
  const lastUsed = [...data.imports.records].reverse().find((r) => r.layoutId === layoutId)?.accountId;
  const sameKind = data.accounts.find((a) => a.kind === step.layout.preset.accountKind && !a.closed)?.id;
  const [accountId, setAccountId] = useState<Id | 'new'>(lastUsed ?? sameKind ?? (data.accounts.length ? data.accounts[0]!.id : 'new'));
  const [newName, setNewName] = useState(step.layout.preset.name.replace(/ (bank account|card statement)$/, ''));
  const [newKind, setNewKind] = useState<AccountKind>(step.layout.preset.accountKind);
  const parsed: ParseResult = useMemo(() => readLines(step.rows, step.layout, data.settings.currency), [step]);

  const plan = useMemo(() => {
    let d = data;
    let target = accountId;
    if (accountId === 'new') { const a = addAccount(d, { name: newName.trim() || t('import.newAccount'), kind: newKind, currency: d.settings.currency, openingBalance: 0, openingDate: null }); d = a.data; target = a.id; }
    if (step.newLayout) d = { ...d, imports: { ...d.imports, layouts: [...d.imports.layouts, step.newLayout] } };
    const out = addImport(d, { accountId: target as Id, fileName: step.fileName, layoutId, lines: parsed.lines, at: new Date().toISOString(), categorize: makeCategorizer(d) });
    const fresh = Object.values(out.data.months).flatMap((m) => m.transactions).filter((t) => t.importId === out.record.id);
    return { out, fresh, target };
  }, [data, accountId, newName, newKind, parsed]);

  const { out, fresh } = plan;
  const categorised = fresh.filter((t) => t.categoryId).length;
  const dates = fresh.map((t) => t.date).sort();
  const names = new Map(out.data.categories.map((c) => [c.id, c.name]));

  const doImport = () => {
    const docs: DocKey[] = ['imports', ...out.changedMonths.map((m) => `month:${m}` as DocKey)];
    if (accountId === 'new') docs.push('accounts');
    const n = out.record.rowsAdded;
    // New card lines (or new bank charges) change which charges the card's file covers.
    const cards = reconcileCardCharges(out.data);
    for (const k of cards.docs) if (!docs.includes(k)) docs.push(k);
    commit(cards.data, docs, n ? t('import.imported', { n, file: step.fileName }) : t('import.nothingNew', { file: step.fileName }));
    onDone();
  };

  return (
    <div class="form">
      <p class="lead">{step.newLayout ? t('import.layoutNew', { name: step.newLayout.name }) : t('import.recognised', { name: step.layout.preset.name })}</p>
      <label class="form-row"><span>{t('import.intoAccount')}</span>
        <select class="field" value={accountId} onChange={(e) => setAccountId((e.currentTarget as HTMLSelectElement).value)}>
          {data.accounts.filter((a) => !a.closed).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          <option value="new">{t('import.aNewAccount')}</option>
        </select></label>
      {accountId === 'new' && (
        <div class="form-pair">
          <label class="form-row"><span>{t('import.name')}</span><input class="field" dir="auto" value={newName} maxLength={60} onInput={(e) => setNewName((e.currentTarget as HTMLInputElement).value)} /></label>
          <label class="form-row"><span>{t('import.kind')}</span><select class="field" value={newKind} onChange={(e) => setNewKind((e.currentTarget as HTMLSelectElement).value as AccountKind)}>
            {Object.entries(ACCOUNT_KINDS).map(([k, l]) => <option key={k} value={k}>{t(l)}</option>)}</select></label>
        </div>
      )}
      <dl class="kvs import-summary">
        <div class="kv"><dt>{t('import.lines')}</dt><dd class="kv-value">{t('import.count', { n: parsed.lines.length })}</dd></div>
        <div class="kv"><dt>{t('import.new')}{dates.length ? <span class="kv-sub">{t('import.range', { from: formatDay(dates[0]!), to: formatDay(dates.at(-1)!) })}</span> : null}</dt><dd class="kv-value">{t('import.count', { n: out.record.rowsAdded })}</dd></div>
        <div class="kv"><dt>{t('import.skipped')}</dt><dd class="kv-value">{t('import.count', { n: out.record.duplicatesSkipped })}</dd></div>
        <div class="kv"><dt>{t('import.categorised')}</dt><dd class="kv-value">{t('import.count', { n: categorised })}</dd></div>
      </dl>
      {parsed.problems.length > 0 && (
        <div class="note note-problem" role="alert">
          {t('import.problems', { n: parsed.problems.length })}
          <ul class="plain">{parsed.problems.slice(0, 5).map((p) => <li key={p.row}>{t('import.rowProblem', { n: p.row, message: p.message })}</li>)}</ul>
        </div>
      )}
      {fresh.length > 0 && (
        <div class="table-wrap" tabIndex={0} role="region" aria-label={t('import.firstLines')}>
          <table class="table">
            <caption class="table-caption">{t('import.firstLines')}</caption>
            <thead><tr><th scope="col">{t('import.date')}</th><th scope="col">{t('import.description')}</th><th scope="col">{t('import.amount')}</th><th scope="col">{t('import.category')}</th></tr></thead>
            <tbody>{fresh.slice(0, 8).map((tx) => (
              <tr key={tx.id}><th scope="row">{formatDay(tx.date)}</th><td class="cell-text"><bdi dir="auto">{tx.payee ?? tx.description}</bdi></td><td><Money minor={tx.amount} /></td><td class="cell-text">{tx.categoryId ? names.get(tx.categoryId) : '—'}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div class="actions">
        <button type="button" class="btn btn-primary" onClick={doImport} disabled={!out.record.rowsAdded && accountId !== 'new'}>
          {out.record.rowsAdded ? t('import.importN', { n: out.record.rowsAdded }) : t('import.nothingToImport')}
        </button>
        <button type="button" class="btn" onClick={onBack}>{t('import.another')}</button>
      </div>
    </div>
  );
}

/** A Bit history file: shows how many payments match bank or card lines, then adds their details. */
function BitReview({ data, fileName, entries, onBack, onDone }: { data: AppData; fileName: string; entries: BitEntry[]; onBack: () => void; onDone: () => void }) {
  const { matches, unmatched } = useMemo(() => matchBit(data, entries), [data, entries]);
  const changes = matches.flatMap((m) => {
    const t = findTransaction(data, m.transactionId);
    if (!t) return [];
    const next = bitDetails(t, m.entry);
    return next.payee !== t.payee || next.note !== t.note ? [{ t, next }] : [];
  });
  const fromBalance = unmatched.filter((u) => u.via === 'balance').length;
  const apply = () => {
    let d = data;
    const docs = new Set<DocKey>();
    for (const c of changes) { const e = updateTransactions(d, [c.t.id], c.next); d = e.data; e.docs.forEach((k) => docs.add(k)); }
    commit(d, [...docs], t('import.bitAdded', { n: changes.length }));
    onDone();
  };
  return (
    <div class="form">
      <p class="lead">{t('import.bitRecognised')}</p>
      <dl class="kvs import-summary">
        <div class="kv"><dt>{t('import.bitPayments')}</dt><dd class="kv-value">{t('import.count', { n: entries.length })}</dd></div>
        <div class="kv"><dt>{t('import.bitMatched')}</dt><dd class="kv-value">{t('import.count', { n: matches.length })}</dd></div>
        <div class="kv"><dt>{t('import.bitWillGet')}<span class="kv-sub">{t('import.bitWillGetSub')}</span></dt><dd class="kv-value">{t('import.count', { n: changes.length })}</dd></div>
        <div class="kv"><dt>{t('import.bitBalance')}<span class="kv-sub">{t('import.bitBalanceSub')}</span></dt><dd class="kv-value">{t('import.count', { n: fromBalance })}</dd></div>
      </dl>
      {changes.length > 0 && (
        <div class="table-wrap" tabIndex={0} role="region" aria-label={t('import.bitFirst')}>
          <table class="table">
            <caption class="table-caption">{t('import.bitFirst')}</caption>
            <thead><tr><th scope="col">{t('import.date')}</th><th scope="col">{t('import.amount')}</th><th scope="col">{t('import.willShowAs')}</th></tr></thead>
            <tbody>{changes.slice(0, 8).map((c) => (
              <tr key={c.t.id}><th scope="row">{formatDay(c.t.date)}</th><td><Money minor={c.t.amount} /></td><td class="cell-text"><bdi dir="auto">{c.next.payee}{c.next.note ? ` · ${c.next.note}` : ''}</bdi></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <div class="actions">
        <button type="button" class="btn btn-primary" onClick={apply} disabled={!changes.length}>{changes.length ? t('import.addDetails', { n: changes.length }) : t('import.nothingToAdd')}</button>
        <button type="button" class="btn" onClick={onBack}>{t('import.another')}</button>
      </div>
      <p class="hint"><bdi dir="auto">{fileName}</bdi></p>
    </div>
  );
}

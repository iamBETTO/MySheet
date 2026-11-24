// Backup and restore: a file with everything, which the person keeps anywhere and can bring back.
import { signal } from '@preact/signals';
import type { AppData } from '../model/types';
import type { Store } from '../storage/store';
import { type BackupSummary } from '../logic/backup';
import { beforeRestore, restoreBackup, undoRestore } from '../state/data';
import { lastBackup, saveBackup } from '../state/backups';
import { t } from '../i18n';
import { formatTimestamp, parseBackupFile } from './format';

type Pending = { data: AppData; summary: BackupSummary };
const message = signal<{ text: string; tone: 'info' | 'problem'; restored?: boolean } | null>(null);
const pending = signal<Pending | null>(null);
const busy = signal(false);

const SAVE_TEXT = { saved: 'backup.saved', declined: 'backup.declined', unavailable: 'backup.unavailable', failed: 'backup.failed' } as const;

function describe(s: BackupSummary): string {
  const parts = { accounts: t('backup.accounts', { n: s.accounts }), transactions: t('backup.transactions', { n: s.transactions }), months: t('backup.months', { n: s.months }) };
  return s.exportedAt ? t('backup.describeFrom', { date: formatTimestamp(s.exportedAt), ...parts }) : t('backup.describe', parts);
}

export function BackupCard({ store, data }: { store: Store; data: AppData }) {
  const run = async (work: () => Promise<void>) => { busy.value = true; try { await work(); } finally { busy.value = false; } };

  const onDownload = () => run(async () => {
    const outcome = await saveBackup(data);
    message.value = { text: t(SAVE_TEXT[outcome]), tone: outcome === 'failed' ? 'problem' : 'info' };
  });

  const onFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const parsed = parseBackupFile(await file.text());
    pending.value = parsed.ok ? { data: parsed.data, summary: parsed.summary } : null;
    message.value = parsed.ok ? null : { text: parsed.message, tone: 'problem' };
  };

  const onReplace = () => run(async () => {
    const p = pending.value;
    if (!p) return;
    const ok = await restoreBackup(store, p.data);
    pending.value = null;
    message.value = ok ? { text: t('backup.restored'), tone: 'info', restored: true } : { text: t('backup.restoreFailed'), tone: 'problem' };
  });

  const onUndo = () => run(async () => {
    const ok = await undoRestore(store);
    message.value = ok ? { text: t('backup.undone'), tone: 'info' } : { text: t('backup.undoFailed'), tone: 'problem' };
  });

  return (
    <section class="card" aria-labelledby="backup-h">
      <h2 id="backup-h">{t('backup.title')}</h2>
      <p>{t('backup.text')}</p>
      <p class="note">{lastBackup.value ? t('backup.last', { date: formatTimestamp(lastBackup.value) }) : t('backup.none')}</p>
      <div class="actions">
        <button type="button" class="btn" onClick={onDownload} disabled={busy.value}>{t('backup.download')}</button>
        <label class={`btn${busy.value ? ' is-disabled' : ''}`}>
          {t('backup.restore')}
          <input id="restore-file" type="file" accept=".json,application/json" class="visually-hidden" onChange={onFile} disabled={busy.value} />
        </label>
      </div>
      {pending.value && (
        <div class="confirm" role="group" aria-labelledby="restore-q">
          <p id="restore-q">{describe(pending.value.summary)} {t('backup.replaceWarning')}</p>
          <div class="actions">
            <button type="button" class="btn btn-danger" onClick={onReplace} disabled={busy.value}>{t('backup.replace')}</button>
            <button type="button" class="btn" onClick={() => { pending.value = null; }} disabled={busy.value}>{t('backup.keep')}</button>
          </div>
        </div>
      )}
      {message.value && (
        <p class={message.value.tone === 'problem' ? 'note note-problem' : 'note'} role={message.value.tone === 'problem' ? 'alert' : 'status'}>
          {message.value.text}
          {beforeRestore.value && message.value.restored && (
            <> <button type="button" class="link-btn" onClick={onUndo} disabled={busy.value}>{t('common.undo')}</button></>
          )}
        </p>
      )}
    </section>
  );
}

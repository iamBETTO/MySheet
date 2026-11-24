// On MySheet's own website the data lives only on this device, so Home reminds you to keep a backup when the last one
// is more than 30 days old, or there is none yet (plans/offline-app.md). Inside Claude the data is kept for you.
import type { AppData } from '../model/types';
import { savesOnDevice } from '../storage/store';
import { hasTransactions } from '../logic/overview';
import { backupDue, lastBackup, reminderSnoozedUntil, saveBackup, snoozeBackupReminder } from '../state/backups';
import { t } from '../i18n';
import { formatDay } from './format';

export function BackupReminder({ data }: { data: AppData }) {
  if (!savesOnDevice() || !hasTransactions(data) || !backupDue(lastBackup.value, reminderSnoozedUntil.value)) return null;
  const last = lastBackup.value;
  return (
    <section class="card welcome" aria-labelledby="br-h">
      <h2 id="br-h">{t('backup.remindTitle')}</h2>
      <p>{last ? t('backup.remindLast', { date: formatDay(last.slice(0, 10)) }) : t('backup.remindNone')}</p>
      <div class="actions">
        <button type="button" class="btn btn-primary" onClick={() => void saveBackup(data)}>{t('backup.download')}</button>
        <button type="button" class="btn" onClick={() => snoozeBackupReminder()}>{t('backup.remindLater')}</button>
      </div>
    </section>
  );
}

// Backups this device has made (plans/offline-app.md). When the last one was saved is a per-device convenience, so it
// lives in browser storage, not in the data; on MySheet's own website it drives the reminder on Home.
import { signal } from '@preact/signals';
import type { AppData } from '../model/types';
import type { SaveOutcome } from '../storage/downloads';
import { downloadBackup } from './data';

const LAST_KEY = 'mysheet.lastBackup.v1';
const SNOOZE_KEY = 'mysheet.backupReminderSnoozed.v1';
const isTime = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}T/.test(v) ? v : null);

function read(key: string): string | null {
  try { return isTime(localStorage.getItem(key)); }
  catch { return null; /* Browser storage off: no backup is known on this device, and the reminder isn't snoozed. */ }
}
function write(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* Browser storage off: remembered until the page reloads. */ }
}

/** When this device last saved a backup (ISO time), or null. */
export const lastBackup = signal<string | null>(read(LAST_KEY));
/** Until when the backup reminder is put off (ISO time), or null. */
export const reminderSnoozedUntil = signal<string | null>(read(SNOOZE_KEY));

/** Action: offer a backup file and remember the time when it was saved. */
export async function saveBackup(data: AppData): Promise<SaveOutcome> {
  const outcome = await downloadBackup(data);
  if (outcome === 'saved') {
    lastBackup.value = new Date().toISOString();
    write(LAST_KEY, lastBackup.value);
  }
  return outcome;
}

/** Action: put the backup reminder off for a week. */
export function snoozeBackupReminder(now = new Date()): void {
  reminderSnoozedUntil.value = new Date(now.getTime() + 7 * 86_400_000).toISOString();
  write(SNOOZE_KEY, reminderSnoozedUntil.value);
}

/** Whether a backup is due: none yet, or the last one is more than 30 days old, and the reminder isn't put off. */
export function backupDue(last: string | null, snoozedUntil: string | null, now = new Date()): boolean {
  if (snoozedUntil && Date.parse(snoozedUntil) > now.getTime()) return false;
  return !last || now.getTime() - Date.parse(last) > 30 * 86_400_000;
}

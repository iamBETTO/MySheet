// The backup file: everything a person has saved, in one JSON file they can keep anywhere and restore later.
import { SCHEMA_VERSION, type AppData } from '../model/types';
import { validateAppData } from '../model/validate';
import { migrateSettings } from '../model/migrate';
import type { Language } from '../i18n/languages';
import { text as textIn } from '../i18n/text';

export const BACKUP_KIND = 'mysheet-backup';

export interface BackupSummary {
  exportedAt: string;
  accounts: number;
  months: number;
  transactions: number;
}

export function summarize(data: AppData, exportedAt: string): BackupSummary {
  const months = Object.values(data.months);
  return { exportedAt, accounts: data.accounts.length, months: months.length, transactions: months.reduce((n, m) => n + m.transactions.length, 0) };
}

/** The file's text. `now` is passed in so the result is the same in tests. */
export function toBackupFile(data: AppData, now: Date): string {
  return JSON.stringify({ kind: BACKUP_KIND, schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), data }, null, 1);
}

export function backupFileName(now: Date): string {
  return `mysheet-backup-${now.toISOString().slice(0, 10)}.json`;
}

export type ParsedBackup = { ok: true; data: AppData; summary: BackupSummary } | { ok: false; message: string };

/** Reads a backup file's text. Never throws: a bad file comes back with a message a person can act on. */
export function parseBackupFile(text: string, lang: Language = 'en'): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, message: textIn(lang, 'backup.notJson') };
  }
  const f = raw as { kind?: unknown; schemaVersion?: unknown; exportedAt?: unknown; data?: unknown };
  if (typeof raw !== 'object' || raw === null || f.kind !== BACKUP_KIND) return { ok: false, message: textIn(lang, 'backup.notBackup') };
  if (typeof f.schemaVersion !== 'number' || f.schemaVersion > SCHEMA_VERSION) return { ok: false, message: textIn(lang, 'backup.newer', { format: String(f.schemaVersion) }) };
  // A backup from an older version is upgraded first (CLAUDE.md rule 17), then checked like any other.
  if (typeof f.data === 'object' && f.data !== null && f.schemaVersion < SCHEMA_VERSION) {
    const d = f.data as Record<string, unknown>;
    f.data = { ...d, settings: migrateSettings(d.settings) };
  }
  const problems = validateAppData(f.data);
  if (problems.length) return { ok: false, message: textIn(lang, 'backup.damaged', { problem: problems[0]! }) };
  const data = f.data as AppData;
  return { ok: true, data, summary: summarize(data, typeof f.exportedAt === 'string' ? f.exportedAt : '') };
}

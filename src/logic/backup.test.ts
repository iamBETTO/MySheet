import { describe, expect, it } from 'vitest';
import { backupFileName, parseBackupFile, toBackupFile } from './backup';
import { sampleData } from '../model/sample';

const now = new Date('2026-10-12T09:00:00Z');

describe('backup file', () => {
  it('restores exactly what was backed up', () => {
    const parsed = parseBackupFile(toBackupFile(sampleData(), now));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data).toEqual(sampleData());
      expect(parsed.summary).toEqual({ exportedAt: '2026-10-12T09:00:00.000Z', accounts: 2, months: 2, transactions: 5 });
    }
  });
  it('names the file by date', () => expect(backupFileName(now)).toBe('mysheet-backup-2026-10-12.json'));
  it('explains a file that is not JSON', () => expect(parseBackupFile('not json')).toEqual({ ok: false, message: expect.stringContaining('couldn’t be read') }));
  it('explains a JSON file that is not a MySheet backup', () => expect(parseBackupFile('{"hello":1}')).toEqual({ ok: false, message: 'This file isn’t a MySheet backup.' }));
  it('refuses a backup from a newer format version', () => {
    const text = toBackupFile(sampleData(), now).replace('"schemaVersion": 2,', '"schemaVersion": 9,');
    expect(parseBackupFile(text)).toEqual({ ok: false, message: expect.stringContaining('format 9') });
  });
  it('upgrades a backup made before page layouts (format 1) and restores it', () => {
    const d = sampleData() as unknown as { settings: Record<string, unknown> };
    delete d.settings.layouts;
    d.settings.schemaVersion = 1;
    const text = JSON.stringify({ kind: 'mysheet-backup', schemaVersion: 1, exportedAt: now.toISOString(), data: d });
    const parsed = parseBackupFile(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.data.settings).toEqual(sampleData().settings);
  });
  it('refuses a damaged backup and says where', () => {
    const d = sampleData();
    d.months['2026-10']!.transactions[0]!.amount = 1.5;
    const parsed = parseBackupFile(toBackupFile(d, now));
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.message).toContain('nothing was changed');
  });
});

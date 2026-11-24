// When Home reminds you to back up on MySheet's own website (plans/offline-app.md).
import { describe, expect, it } from 'vitest';
import { backupDue } from './backups';

describe('backup reminder', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  it('is due with no backup yet, or one more than 30 days old', () => {
    expect(backupDue(null, null, now)).toBe(true);
    expect(backupDue('2026-10-01T09:00:00Z', null, now)).toBe(true);
    expect(backupDue('2026-10-20T09:00:00Z', null, now)).toBe(false);
  });
  it('waits while put off', () => {
    expect(backupDue(null, '2026-11-15T00:00:00Z', now)).toBe(false);
    expect(backupDue(null, '2026-11-09T00:00:00Z', now)).toBe(true);
  });
});

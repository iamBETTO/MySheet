// No silent failures (CLAUDE.md rule 12): every caught error lands in this log, which the app can show.
import { signal } from '@preact/signals';

export interface LoggedError { at: string; where: string; message: string }

export const errorLog = signal<LoggedError[]>([]);

/** Records an error with where it happened. Keeps the last 50. */
export function reportError(where: string, e: unknown): void {
  const message = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
  errorLog.value = [...errorLog.value.slice(-49), { at: new Date().toISOString(), where, message }];
  console.error(`[MySheet] ${where}:`, e);
}

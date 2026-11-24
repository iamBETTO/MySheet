// App state (CLAUDE.md rule 9): signals, changed only through the actions in this folder.
import { signal } from '@preact/signals';
import { connect, type Store } from '../storage/store';
import { reportError } from './errors';
import { loadData } from './data';
import { t } from '../i18n';

export type Connection =
  | { state: 'connecting' }
  | { state: 'ready'; store: Store }
  | { state: 'unavailable'; reason: 'no-runtime' | 'no-db' | 'signed-out' }
  | { state: 'error'; message: string };

export const connection = signal<Connection>({ state: 'connecting' });

/** Action: connect to the user's saved data once, at start. */
export async function startConnection(): Promise<void> {
  try {
    const result = await connect();
    if (result.kind === 'ready') {
      connection.value = { state: 'ready', store: result.store };
      await loadData(result.store);
    } else {
      connection.value = { state: 'unavailable', reason: result.reason };
    }
  } catch (e) {
    reportError('connect', e);
    connection.value = { state: 'error', message: t('common.unreachable') };
  }
}

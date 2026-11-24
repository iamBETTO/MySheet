// Where MySheet keeps the data on its own website (plans/offline-app.md): on this device, in the browser's IndexedDB,
// with the same documents under the same names as the private store inside Claude, so the saved shape is unchanged
// (rule 17). Only the documents MySheet uses are kept: one object store, keyed by the document's name.
import type { Store } from './store';
import type { DbError, DocumentReference, DocumentSnapshot } from './claude';

const DB_NAME = 'mysheet';
const DOCS = 'docs';

/** The device store, or null when this browser has no IndexedDB or won't open it (some private windows). */
export async function deviceStore(): Promise<Store | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await open();
    return { doc: (id: string) => ref(db, id) };
  } catch {
    return null; // The caller shows "can't reach your data", the same as any other missing store.
  }
}

/** Asks the browser to keep MySheet's data even when space runs low. Best effort: some browsers decide alone. */
export async function askToKeepData(): Promise<boolean> {
  try { return (await navigator.storage?.persist?.()) ?? false; }
  catch { return false; /* Not offered by this browser: the data is kept as long as the browser keeps site data. */ }
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(DOCS)) req.result.createObjectStore(DOCS); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('MySheet is open in another tab with an older version.'));
  });
}

/** Runs one request in its own transaction and settles when the transaction is done, so a write is really saved. */
function run<T>(db: IDBDatabase, mode: IDBTransactionMode, work: (docs: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DOCS, mode);
    const req = work(tx.objectStore(DOCS));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(dbError(tx.error));
    tx.onabort = () => reject(dbError(tx.error));
  });
}

function dbError(e: DOMException | null): DbError {
  return { code: e?.name === 'QuotaExceededError' ? 'quota_exceeded' : 'unavailable', message: e?.message ?? 'The device storage failed.' };
}

function snapshot(id: string, body: unknown): DocumentSnapshot {
  const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;
  return { id, exists: data !== undefined, data: () => (data ? structuredClone(data) : undefined), metadata: { fromCache: false, hasPendingWrites: false } };
}

function ref(db: IDBDatabase, id: string): DocumentReference {
  const get = async () => snapshot(id, await run(db, 'readonly', (docs) => docs.get(id)));
  return {
    id,
    path: id,
    get,
    set: async (data) => { await run(db, 'readwrite', (docs) => docs.put(structuredClone(data), id)); },
    update: async (data) => {
      const cur = (await get()).data();
      if (!cur) throw { code: 'invalid_argument', message: 'update needs an existing document' } satisfies DbError;
      await run(db, 'readwrite', (docs) => docs.put({ ...cur, ...structuredClone(data) }, id));
    },
    delete: async () => { await run(db, 'readwrite', (docs) => docs.delete(id)); },
    onSnapshot: (next, error) => { get().then(next, (e: DbError) => error?.(e)); return () => {}; },
  };
}

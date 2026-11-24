// Where MySheet keeps the user's data. Inside Claude: the artifact's private per-person store, synced between their
// devices; everything lives under data/users/<id>/, which only that person can read or write (decision d46). On its own
// website: this device's browser storage, with the same documents (plans/offline-app.md, decision ms-d63).
import { runtime, type Db, type DocumentReference } from './claude';
import { askToKeepData, deviceStore } from './deviceStore';

export interface Store {
  /** A document in the user's own private space, e.g. doc('meta'). */
  doc(id: string): DocumentReference;
}

export type ConnectResult =
  | { kind: 'ready'; store: Store }
  | { kind: 'unavailable'; reason: 'no-runtime' | 'no-db' | 'signed-out' };

/** Whether the data lives only on this device: MySheet on its own website rather than inside Claude. */
export const savesOnDevice = (): boolean => runtime() === null;

/** Connects to the user's private data. Never throws: an absent store is a normal state the screens show. */
export async function connect(): Promise<ConnectResult> {
  const rt = runtime();
  if (!rt) {
    const device = await deviceStore();
    if (!device) return { kind: 'unavailable', reason: 'no-runtime' };
    void askToKeepData();
    return { kind: 'ready', store: device };
  }
  const [db, user] = await Promise.all([rt.use('db'), rt.use('user')]);
  if (!db || !user) return { kind: 'unavailable', reason: 'no-db' };
  const id = await user.id();
  if (!id) return { kind: 'unavailable', reason: 'signed-out' };
  return { kind: 'ready', store: privateStore(db, id) };
}

function privateStore(db: Db, userId: string): Store {
  const base = `data/users/${userId}`;
  return { doc: (id: string) => db.doc(`${base}/${id}`) };
}

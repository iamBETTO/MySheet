// An in-memory Store with the same behaviour as the private store: used by unit tests and by screen tests.
import type { Store } from './store';
import type { DocumentReference, DocumentSnapshot } from './claude';

export function memoryStore(initial: Record<string, Record<string, unknown>> = {}): Store & { dump(): Record<string, Record<string, unknown>> } {
  const docs = new Map(Object.entries(structuredClone(initial)));
  const snap = (path: string): DocumentSnapshot => {
    const body = docs.get(path);
    return { id: path.split('/').pop() ?? path, exists: body !== undefined, data: () => (body ? structuredClone(body) : undefined), metadata: { fromCache: false, hasPendingWrites: false } };
  };
  const ref = (path: string): DocumentReference => ({
    id: path.split('/').pop() ?? path,
    path,
    get: async () => snap(path),
    set: async (d) => { docs.set(path, structuredClone(d)); },
    update: async (d) => {
      const cur = docs.get(path);
      if (!cur) throw { code: 'invalid_argument', message: 'update needs an existing document' };
      docs.set(path, { ...cur, ...structuredClone(d) });
    },
    delete: async () => { docs.delete(path); },
    onSnapshot: (next) => { next(snap(path)); return () => {}; },
  });
  return { doc: ref, dump: () => Object.fromEntries(docs) };
}

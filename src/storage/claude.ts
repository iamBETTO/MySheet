// The small part of the Claude artifact runtime MySheet uses (contract 0.2.75: claude.use('db'), claude.use('user')).
// Only what we call is typed here; the platform's own type definitions are the authority.

export type DbErrorCode =
  | 'invalid_argument' | 'resource_exhausted' | 'quota_exceeded' | 'unavailable' | 'revoked'
  | 'not_granted' | 'capability_disabled' | 'capability_removed' | 'transform_error';

export interface DbError { code: DbErrorCode; message: string }

export interface DocumentSnapshot {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
  metadata: { fromCache: boolean; hasPendingWrites: boolean };
}

export interface DocumentReference {
  id: string;
  path: string;
  get(): Promise<DocumentSnapshot>;
  set(data: Record<string, unknown>): Promise<void>;
  update(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
  onSnapshot(next: (snap: DocumentSnapshot) => void, error?: (e: DbError) => void): () => void;
}

export interface QuerySnapshot { docs: DocumentSnapshot[]; size: number; empty: boolean }

export interface CollectionReference {
  path: string;
  doc(id?: string): DocumentReference;
  get(): Promise<QuerySnapshot>;
  onSnapshot(next: (snap: QuerySnapshot) => void, error?: (e: DbError) => void): () => void;
}

export interface Db {
  doc(path: string): DocumentReference;
  collection(path: string): CollectionReference;
}

export interface User {
  id(): Promise<string | null>;
}

export interface Downloads {
  save(request: { filename: string; data: string | Blob }): Promise<{ status: 'saved' | 'delivered' }>;
}

export interface ClaudeRuntime {
  use(name: 'db'): Promise<Db | null>;
  use(name: 'user'): Promise<User | null>;
  use(name: 'downloads'): Promise<Downloads | null>;
}

/** The runtime, when the page runs inside the Claude viewer; otherwise null (a saved copy, a test page). */
export function runtime(): ClaudeRuntime | null {
  const c = (globalThis as { claude?: { use?: unknown } }).claude;
  return c && typeof c.use === 'function' ? (c as ClaudeRuntime) : null;
}

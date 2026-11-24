// Ids for new records, and fingerprints that let a re-imported file skip lines it already added.

/** A short random id, e.g. 'k3x9q2m8a1'. Uses the browser's secure random source. */
export function newId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('') + Date.now().toString(36).slice(-2);
}

/** FNV-1a, 52 bits: stable across devices and sessions, no library needed. Not for security. */
export function hash(text: string): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (const ch of new TextEncoder().encode(text)) {
    h ^= BigInt(ch);
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return (h & 0xfffffffffffffn).toString(36);
}

export interface SourceLine {
  accountId: string;
  date: string;
  amount: number;
  description: string;
}

/**
 * Fingerprints for the lines of one imported file. Identical lines in the same file (two coffees, same day,
 * same price) get different fingerprints because each repeat is numbered, so both are kept.
 */
export function fingerprints(lines: SourceLine[]): string[] {
  const seen = new Map<string, number>();
  return lines.map((l) => {
    const key = [l.accountId, l.date, l.amount, l.description.trim().replace(/\s+/g, ' ')].join('|');
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    return hash(`${key}|${n}`);
  });
}

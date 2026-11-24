// Adds a file's lines to an account, skipping lines an earlier import already added.
import { fingerprints, newId } from '../model/ids';
import { monthOf, type AppData, type Id, type ImportRecord, type Month, type Transaction } from '../model/types';
import type { ImportLine } from './parse';

export interface ImportInput {
  accountId: Id;
  fileName: string;
  layoutId: Id | null;
  lines: ImportLine[];
  /** When the import happens, ISO timestamp. */
  at: string;
  /** Gives each new line a category and name (rules, then history). */
  categorize?: (line: { accountId: Id; description: string; amount: number }) => { categoryId: Id | null; payee: string | null };
}

export interface ImportOutcome {
  data: AppData;
  record: ImportRecord;
  /** Months that gained transactions, so only those are saved. */
  changedMonths: string[];
}

/** Returns new data (the input is left as it was) with the file's new lines added and the import recorded. */
export function addImport(data: AppData, input: ImportInput): ImportOutcome {
  const known = new Set<string>();
  for (const m of Object.values(data.months)) for (const t of m.transactions) if (t.fingerprint) known.add(t.fingerprint);

  const importId = newId();
  const prints = fingerprints(input.lines.map((l) => ({ accountId: input.accountId, date: l.date, amount: l.amount, description: l.description })));
  const months: Record<string, Month> = { ...data.months };
  const changed = new Set<string>();
  let added = 0;
  input.lines.forEach((line, i) => {
    const fingerprint = prints[i]!;
    if (known.has(fingerprint)) return;
    known.add(fingerprint);
    const key = monthOf(line.date);
    const month = changed.has(key) ? months[key]! : { month: key, transactions: [...(months[key]?.transactions ?? [])], transfers: [...(months[key]?.transfers ?? [])] };
    const guess = input.categorize?.({ accountId: input.accountId, description: line.description, amount: line.amount });
    const tx: Transaction = {
      id: newId(), accountId: input.accountId, date: line.date, amount: line.amount, currency: line.currency,
      description: line.description, payee: guess?.payee ?? null, categoryId: guess?.categoryId ?? null, note: null, importId, fingerprint,
    };
    month.transactions.push(tx);
    months[key] = month;
    changed.add(key);
    added++;
  });
  for (const key of changed) months[key]!.transactions.sort((a, b) => a.date.localeCompare(b.date));

  const record: ImportRecord = {
    id: importId, at: input.at, fileName: input.fileName, accountId: input.accountId, layoutId: input.layoutId,
    rowsAdded: added, duplicatesSkipped: input.lines.length - added,
  };
  return {
    data: { ...data, months, imports: { ...data.imports, records: [...data.imports.records, record] } },
    record,
    changedMonths: [...changed].sort(),
  };
}

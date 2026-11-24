// Turns a picked file into rows, whatever its type: CSV (any common encoding), .xlsx or .xls.
import { parseCsv, type Row } from './rows';
import { readXlsx } from './xlsx';
import { readXls } from './xls';
import { FileFormatError } from './zip';

export type FileKind = 'csv' | 'xlsx' | 'xls';

/** Decides by the file's first bytes, so a mislabelled file is still read correctly. */
export function kindOf(bytes: Uint8Array): FileKind {
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'xlsx';
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) return 'xls';
  return 'csv';
}

/** Text from a CSV: UTF-8 when valid, otherwise the Hebrew Windows encoding many Israeli banks use. */
export function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    // Not valid UTF-8: older Hebrew exports use windows-1255.
    return new TextDecoder('windows-1255').decode(bytes);
  }
}

export async function readRows(bytes: Uint8Array): Promise<{ kind: FileKind; rows: Row[] }> {
  const kind = kindOf(bytes);
  if (kind === 'xlsx') return { kind, rows: await readXlsx(bytes) };
  if (kind === 'xls') return { kind, rows: readXls(bytes) };
  const text = decodeText(bytes);
  if (/[\u0000-\u0008\u000e-\u001f]/.test(text.slice(0, 2000))) throw new FileFormatError('this looks like a file type MySheet can’t read');
  return { kind, rows: parseCsv(text) };
}

export { FileFormatError };

// A file's table as plain rows, whatever the file type was. CSV is read here; spreadsheet readers come with the import screen.

/** One cell: text, a number (spreadsheets give dates as day numbers), or empty. */
export type Cell = string | number | null;
export type Row = Cell[];

/** Reads CSV text: quoted fields, doubled quotes, commas or line breaks inside quotes, a leading BOM. */
export function parseCsv(text: string): Row[] {
  const rows: Row[] = [];
  let row: Cell[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"' && field.trim() === '') { quoted = true; field = ''; }
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.map((r) => r.map((c) => (typeof c === 'string' && c.trim() === '' ? null : c)));
}

/** A cell as trimmed text ('' when empty). */
export function cellText(c: Cell | undefined): string {
  return c === null || c === undefined ? '' : String(c).trim();
}

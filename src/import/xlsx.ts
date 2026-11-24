// Reads the first sheet of an Excel .xlsx file into rows. Dates come out as day numbers, which the import understands.
import type { Cell, Row } from './rows';
import { FileFormatError, unzip } from './zip';

const decoder = new TextDecoder();

function unescapeXml(t: string): string {
  return t.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    const k = e.toLowerCase();
    if (k === 'amp') return '&';
    if (k === 'lt') return '<';
    if (k === 'gt') return '>';
    if (k === 'quot') return '"';
    if (k === 'apos') return "'";
    return String.fromCodePoint(k.startsWith('#x') ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
  });
}

/** Text of all <t> runs inside a fragment, leaving out phonetic hints. */
function textOf(xml: string): string {
  return [...xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>|<t\b[^>]*\/>/g)].map((m) => unescapeXml(m[1] ?? '')).join('');
}

/** 'C12' → column index 2. */
function columnIndex(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, '').toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

const attr = (attrs: string, name: string) => new RegExp(`\\b${name}="([^"]*)"`).exec(attrs)?.[1];

export async function readXlsx(bytes: Uint8Array): Promise<Row[]> {
  const files = await unzip(bytes, (n) => n.startsWith('xl/') && (n.endsWith('.xml') || n.endsWith('.rels')));
  // Some writers prefix every tag (<x:row>); dropping tag prefixes lets one set of patterns read both.
  const read = (n: string) => { const f = files.get(n); return f ? decoder.decode(f).replace(/<(\/?)[A-Za-z_][\w.-]*:/g, '<$1') : null; };
  const workbook = read('xl/workbook.xml');
  if (!workbook) throw new FileFormatError('no workbook in the file');
  const firstSheet = /<sheet\b([^>]*)\/?>/.exec(workbook)?.[1] ?? '';
  const relId = attr(firstSheet, 'r:id');
  const rels = read('xl/_rels/workbook.xml.rels') ?? '';
  let target = 'worksheets/sheet1.xml';
  for (const m of rels.matchAll(/<Relationship\b([^>]*)\/?>/g)) if (attr(m[1]!, 'Id') === relId) target = attr(m[1]!, 'Target') ?? target;
  const path = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
  const sheet = read(path);
  if (!sheet) throw new FileFormatError('the first sheet is missing');
  const shared = [...(read('xl/sharedStrings.xml') ?? '').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g)].map((m) => textOf(m[1] ?? ''));

  const rows: Row[] = [];
  for (const rm of sheet.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const r = Number(attr(rm[1]!, 'r') ?? rows.length + 1) - 1;
    const row: Cell[] = [];
    let nextCol = 0;
    for (const cm of (rm[2] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const a = cm[1]!;
      const ref = attr(a, 'r');
      const col = ref ? columnIndex(ref) : nextCol;
      nextCol = col + 1;
      const type = attr(a, 't');
      const inner = cm[2] ?? '';
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      let value: Cell = null;
      if (type === 's') value = v === undefined ? null : shared[Number(v)] ?? null;
      else if (type === 'inlineStr') value = textOf(/<is>([\s\S]*?)<\/is>/.exec(inner)?.[1] ?? '');
      else if (type === 'str') value = v === undefined ? null : unescapeXml(v);
      else if (type === 'b') value = v === '1' ? 'TRUE' : 'FALSE';
      else if (type === 'e') value = null;
      else if (v !== undefined && v !== '') value = Number(v);
      row[col] = typeof value === 'string' && value.trim() === '' ? null : value;
    }
    rows[r] = Array.from(row, (c) => c ?? null);
  }
  return Array.from(rows, (r) => r ?? []);
}

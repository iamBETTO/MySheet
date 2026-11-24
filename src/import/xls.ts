// Reads the first sheet of an old-style Excel .xls file (Excel 97–2003, "BIFF8") into rows. Many banks still export it.
// Two layers: the container (a small file system inside the file) and the workbook records. No library (rule 11).
import type { Cell, Row } from './rows';
import { FileFormatError } from './zip';

const END = 0xfffffffe;
const FREE = 0xffffffff;

class Bytes {
  constructor(readonly b: Uint8Array) {}
  u8(o: number) { return this.b[o]!; }
  u16(o: number) { return this.b[o]! | (this.b[o + 1]! << 8); }
  u32(o: number) { return (this.b[o]! | (this.b[o + 1]! << 8) | (this.b[o + 2]! << 16) | (this.b[o + 3]! << 24)) >>> 0; }
  i32(o: number) { return this.u32(o) | 0; }
  f64(o: number) { return new DataView(this.b.buffer, this.b.byteOffset + o, 8).getFloat64(0, true); }
}

/** Finds a stream ("Workbook") inside the compound file container. */
function readStream(file: Uint8Array, names: string[]): Uint8Array {
  const f = new Bytes(file);
  const sig = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  if (file.length < 512 || sig.some((v, i) => file[i] !== v)) throw new FileFormatError('not an Excel 97–2003 file');
  const sectorSize = 1 << f.u16(0x1e);
  const miniSize = 1 << f.u16(0x20);
  const firstDir = f.u32(0x30);
  const miniCutoff = f.u32(0x38);
  const firstMiniFat = f.u32(0x3c);
  let difatSector = f.u32(0x44);
  const sectorAt = (id: number) => 512 + id * sectorSize;

  const fatSectors: number[] = [];
  for (let i = 0; i < 109; i++) { const s = f.u32(0x4c + i * 4); if (s !== FREE && s !== END) fatSectors.push(s); }
  for (let guard = 0; difatSector !== END && difatSector !== FREE && guard < 10_000; guard++) {
    const off = sectorAt(difatSector);
    const per = sectorSize / 4 - 1;
    for (let i = 0; i < per; i++) { const s = f.u32(off + i * 4); if (s !== FREE && s !== END) fatSectors.push(s); }
    difatSector = f.u32(off + per * 4);
  }
  const fat: number[] = [];
  for (const s of fatSectors) for (let i = 0; i < sectorSize / 4; i++) fat.push(f.u32(sectorAt(s) + i * 4));

  const chain = (start: number, next: number[]): number[] => {
    const out: number[] = [];
    for (let s = start; s !== END && s !== FREE && s < next.length && out.length <= next.length; s = next[s]!) out.push(s);
    return out;
  };
  const readChain = (start: number, size?: number) => {
    const ids = chain(start, fat);
    const out = new Uint8Array(ids.length * sectorSize);
    ids.forEach((id, i) => out.set(file.subarray(sectorAt(id), sectorAt(id) + sectorSize), i * sectorSize));
    return size === undefined ? out : out.subarray(0, size);
  };

  const dir = new Bytes(readChain(firstDir));
  const entries: { name: string; type: number; start: number; size: number }[] = [];
  for (let o = 0; o + 128 <= dir.b.length; o += 128) {
    const len = dir.u16(o + 0x40);
    const name = String.fromCharCode(...Array.from({ length: Math.max(0, len / 2 - 1) }, (_, i) => dir.u16(o + i * 2)));
    entries.push({ name, type: dir.u8(o + 0x42), start: dir.u32(o + 0x74), size: dir.u32(o + 0x78) });
  }
  const root = entries.find((e) => e.type === 5);
  const entry = entries.find((e) => e.type === 2 && names.includes(e.name));
  if (!entry) throw new FileFormatError('no workbook inside the file');
  if (entry.size >= miniCutoff || !root) return readChain(entry.start, entry.size);

  // Small streams live in the "mini stream", in 64-byte pieces with their own allocation table.
  const miniStream = readChain(root.start, root.size);
  const miniFatBytes = new Bytes(readChain(firstMiniFat));
  const miniFat = Array.from({ length: miniFatBytes.b.length / 4 }, (_, i) => miniFatBytes.u32(i * 4));
  const ids = chain(entry.start, miniFat);
  const out = new Uint8Array(ids.length * miniSize);
  ids.forEach((id, i) => out.set(miniStream.subarray(id * miniSize, (id + 1) * miniSize), i * miniSize));
  return out.subarray(0, entry.size);
}

/** Decodes a BIFF "RK" number: an integer or a shortened double, maybe divided by 100. */
function rk(v: number): number {
  let n: number;
  if (v & 2) n = v >> 2;
  else {
    const buf = new DataView(new ArrayBuffer(8));
    buf.setUint32(4, v & 0xfffffffc, true);
    n = buf.getFloat64(0, true);
  }
  return v & 1 ? n / 100 : n;
}

/**
 * Reads the shared strings, which may run across several records. At each record boundary inside a string's characters,
 * a new flag byte says whether the rest is 1 or 2 bytes per character.
 */
function readSst(parts: Uint8Array[]): string[] {
  let part = 0, pos = 8;
  const total = new Bytes(parts[0]!).u32(4);
  const strings: string[] = [];
  const cur = () => new Bytes(parts[part]!);
  const ensure = () => { while (part < parts.length && pos >= parts[part]!.length) { part++; pos = 0; } };
  const take = (n: number) => { // reads n raw bytes, crossing record boundaries
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) { ensure(); out[i] = parts[part]![pos++]!; }
    return out;
  };
  for (let s = 0; s < total; s++) {
    ensure();
    if (part >= parts.length) break;
    const head = new Bytes(take(3));
    const cch = head.u16(0);
    let flags = head.u8(2);
    const runs = flags & 8 ? new Bytes(take(2)).u16(0) : 0;
    const ext = flags & 4 ? new Bytes(take(4)).u32(0) : 0;
    let text = '';
    let left = cch;
    while (left > 0) {
      if (part < parts.length && pos >= parts[part]!.length) { part++; pos = 0; flags = cur().u8(0); pos = 1; }
      const wide = flags & 1;
      const room = Math.floor((parts[part]!.length - pos) / (wide ? 2 : 1));
      const n = Math.min(left, room);
      const b = cur();
      for (let i = 0; i < n; i++) text += String.fromCharCode(wide ? b.u16(pos + i * 2) : b.u8(pos + i));
      pos += n * (wide ? 2 : 1);
      left -= n;
      if (n === 0 && part >= parts.length - 1) break;
    }
    take(runs * 4 + ext);
    strings.push(text);
  }
  return strings;
}

function unicodeString(b: Bytes, o: number): string {
  const cch = b.u16(o);
  const wide = b.u8(o + 2) & 1;
  let t = '';
  for (let i = 0; i < cch; i++) t += String.fromCharCode(wide ? b.u16(o + 3 + i * 2) : b.u8(o + 3 + i));
  return t;
}

export function readXls(file: Uint8Array): Row[] {
  const wb = new Bytes(readStream(file, ['Workbook', 'Book']));
  const rows: Cell[][] = [];
  const put = (r: number, c: number, v: Cell) => { (rows[r] ??= [])[c] = typeof v === 'string' && v.trim() === '' ? null : v; };
  let sst: string[] = [];
  let sstParts: Uint8Array[] | null = null;
  let inSheet = false, sheetsSeen = 0;
  let pendingString: [number, number] | null = null;
  for (let p = 0; p + 4 <= wb.b.length;) {
    const type = wb.u16(p), len = wb.u16(p + 2), o = p + 4;
    const data = wb.b.subarray(o, o + len);
    p = o + len;
    if (sstParts && type !== 0x003c) { sst = readSst(sstParts); sstParts = null; }
    switch (type) {
      case 0x0809: { // BOF
        const kind = wb.u16(o + 2);
        if (kind === 0x0010) { sheetsSeen++; inSheet = sheetsSeen === 1; }
        break;
      }
      case 0x000a: if (inSheet) return finish(rows); break; // EOF of the first sheet
      case 0x00fc: sstParts = [data]; break;
      case 0x003c: if (sstParts) sstParts.push(data); break;
      case 0x00fd: if (inSheet) put(wb.u16(o), wb.u16(o + 2), sst[wb.u32(o + 6)] ?? null); break;
      case 0x0203: if (inSheet) put(wb.u16(o), wb.u16(o + 2), wb.f64(o + 6)); break;
      case 0x027e: if (inSheet) put(wb.u16(o), wb.u16(o + 2), rk(wb.u32(o + 6))); break;
      case 0x00bd: if (inSheet) { // MULRK
        const r = wb.u16(o), first = wb.u16(o + 2);
        const n = (len - 6) / 6;
        for (let i = 0; i < n; i++) put(r, first + i, rk(wb.u32(o + 4 + i * 6 + 2)));
      }
        break;
      case 0x0204: if (inSheet) put(wb.u16(o), wb.u16(o + 2), unicodeString(wb, o + 6)); break; // LABEL
      case 0x0006: if (inSheet) { // FORMULA: a number, or a string in the next STRING record
        const r = wb.u16(o), c = wb.u16(o + 2);
        if (wb.u16(o + 12) === 0xffff) {
          const kind = wb.u8(o + 6);
          if (kind === 0) pendingString = [r, c];
          else if (kind === 1) put(r, c, wb.u8(o + 8) ? 'TRUE' : 'FALSE');
        } else put(r, c, wb.f64(o + 6));
      }
        break;
      case 0x0207: if (inSheet && pendingString) { put(pendingString[0], pendingString[1], unicodeString(wb, o)); pendingString = null; } break;
      default: break;
    }
  }
  return finish(rows);
}

function finish(rows: Cell[][]): Row[] {
  return Array.from(rows, (r) => (r ? Array.from(r, (c) => c ?? null) : []));
}

// When saved data doesn't pass validation, keep everything that does (the owner, 6 Nov 2026: one broken entry used to hide
// all his data). Each problem validate.ts reports names where it is; the smallest record around it (a transaction, a
// value, a list item, a month) is taken out and returned, so it can be kept safely and shown to the person.
import { emptyData } from './types';
import { validateAppData } from './validate';
import { languageOf } from '../i18n/languages';
import { text, type Key } from '../i18n/text';

export interface SetAside {
  /** Where it was, as validate.ts names it, e.g. "holdings[0].valuations[0]". */
  where: string;
  /** What it was, in plain words, e.g. 'A value of "Crypto"'. */
  label: string;
  /** Why it couldn't be used, as validate.ts says it. */
  why: string;
  /** The record exactly as it was saved, so it can be repaired later. */
  record: unknown;
}

type Raw = Record<string, unknown>;
const isObj = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const LISTS = ['accounts', 'categories', 'rules', 'holdings', 'notes'] as const;

/** One problem → the path to remove: [container, key] pairs from the root, plus what to call it. */
function target(problem: string): string | null {
  const where = problem.split(': ')[0] ?? '';
  const patterns = [
    /^months\.\d{4}-\d{2}\.(transactions|transfers)\[\d+\]/,
    /^months\.[^.\[]+/,
    /^holdings\[\d+\]\.valuations\[\d+\]/,
    /^settings\.layouts\.[^.]+/,
    /^settings\.(budgetMonthStartDay|startWithAmountsHidden|layouts)/,
    /^(accounts|categories|rules|holdings|notes)\[\d+\]/,
    /^budgets\.(limits|overrides)\[\d+\]/,
    /^imports\.(records|layouts)\[\d+\]/,
    /^(settings|budgets|imports|months|accounts|categories|rules|holdings|notes)/,
  ];
  for (const p of patterns) { const m = where.match(p); if (m) return m[0]; }
  return null;
}

/** Splits "holdings[0].valuations[1]" into ['holdings', 0, 'valuations', 1]; "months.2026-10" into ['months', '2026-10']. */
function steps(path: string): (string | number)[] {
  const out: (string | number)[] = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  for (let m = re.exec(path); m; m = re.exec(path)) out.push(m[2] !== undefined ? Number(m[2]) : m[1]!);
  // A month key contains no dots, so "months.2026-10.transactions" splits as wanted.
  return out;
}

/** What a set-aside record was, in plain words, in the language of the data's own settings. */
function describe(path: string, record: unknown, data: Raw): string {
  const settings = isObj(data.settings) ? data.settings : {};
  const lang = languageOf(typeof settings.locale === 'string' ? settings.locale : 'en');
  const r = isObj(record) ? record : {};
  const name = (v: unknown) => (typeof v === 'string' && v ? text(lang, 'notice.quoted', { name: v.slice(0, 40) }) : text(lang, 'notice.noName'));
  if (/^months\.[^.]+\.transactions/.test(path)) return text(lang, 'notice.aTransaction', { date: typeof r.date === 'string' && r.date ? r.date : text(lang, 'notice.unknownDay'), name: name(r.description) });
  if (/^months\.[^.]+\.transfers/.test(path)) return text(lang, 'notice.aLink');
  if (/^months\./.test(path)) return text(lang, 'notice.theMonth', { month: path.slice(7) });
  if (/valuations/.test(path)) {
    const h = (data.holdings as unknown[])[steps(path)[1] as number];
    return text(lang, 'notice.aValueOf', { name: name(isObj(h) ? h.name : '') });
  }
  if (/^settings\.layouts/.test(path)) return text(lang, 'notice.aLayout');
  const kinds: Record<string, Key> = { accounts: 'notice.theAccount', categories: 'notice.theType', rules: 'notice.theRule', holdings: 'notice.theHolding', notes: 'notice.theNote', 'budgets.limits': 'notice.aLimit', 'budgets.overrides': 'notice.aMonthLimit', 'imports.records': 'notice.anImport', 'imports.layouts': 'notice.aFileLayout' };
  const key = Object.keys(kinds).find((k) => path.startsWith(`${k}[`));
  if (key) return text(lang, kinds[key]!, { name: name(r.name ?? r.text ?? r.fileName ?? '') }).trim();
  return text(lang, 'notice.yourSection', { section: path.split('.')[0]! });
}

/** Takes the record at `path` out of `data` (in place) and returns it; a whole section is reset to its default. */
function takeOut(data: Raw, path: string): unknown {
  const s = steps(path);
  const fresh = emptyData() as unknown as Raw;
  if (s.length === 1) {
    const key = s[0] as string;
    const old = data[key];
    data[key] = structuredClone(fresh[key]);
    return old;
  }
  let parent: unknown = data;
  for (const k of s.slice(0, -1)) parent = (parent as Record<string | number, unknown>)?.[k as string];
  const last = s.at(-1)!;
  if (Array.isArray(parent) && typeof last === 'number') return parent.splice(last, 1)[0];
  if (isObj(parent) && typeof last === 'string') {
    // A bad settings field goes back to its default; anything else under an object is removed.
    if (s[0] === 'settings' && s.length === 2) { const old = parent[last]; parent[last] = structuredClone((fresh.settings as Raw)[last]); return old; }
    const old = parent[last];
    delete parent[last];
    return old;
  }
  return undefined;
}

/**
 * Returns the data without the records that fail validation, and those records. `data` is not changed.
 * Returns null when the problems can't be narrowed down to records (the caller then reports the data as unreadable).
 */
export function salvage(raw: unknown): { data: unknown; setAside: SetAside[] } | null {
  if (!isObj(raw)) return null;
  const data = structuredClone(raw);
  for (const n of LISTS) if (data[n] === undefined) data[n] = [];
  const setAside: SetAside[] = [];
  for (let round = 0; round < 50; round++) {
    const problems = validateAppData(data);
    if (!problems.length) return { data, setAside };
    // Data from a newer version of MySheet is never cut down to fit; the caller says it can't be read here.
    if (problems.some((p) => p.startsWith('settings.schemaVersion'))) return null;
    // Take out the deepest, highest-index records first, so earlier positions in the same list stay correct.
    const found = new Map<string, string>();
    for (const p of problems) { const t = target(p); if (t && !found.has(t)) found.set(t, p.slice(p.indexOf(': ') + 2)); }
    if (!found.size) return null;
    const order = [...found.keys()].sort((a, b) => b.localeCompare(a, 'en', { numeric: true }));
    for (const path of order) {
      const label = describe(path, readAt(data, path), data);
      const record = takeOut(data, path);
      setAside.push({ where: path, label, why: found.get(path)!, record });
    }
  }
  return null;
}

function readAt(data: Raw, path: string): unknown {
  let v: unknown = data;
  for (const k of steps(path)) v = (v as Record<string | number, unknown>)?.[k as string];
  return v;
}

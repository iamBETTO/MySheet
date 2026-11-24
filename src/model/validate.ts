// Checks that saved or restored data has the shape of the model (types.ts). Data from a file or the store is
// untrusted (CLAUDE.md rule 18), so nothing is used until it passes. Each problem is reported as a readable path.
import { PAGE_IDS, SCHEMA_VERSION, type AppData } from './types';

type Problems = string[];
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isDate = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isMonth = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}$/.test(v);
const isMinor = (v: unknown) => typeof v === 'number' && Number.isInteger(v);
const isStr = (v: unknown) => typeof v === 'string';
const strOrNull = (v: unknown) => v === null || typeof v === 'string';
const oneOf = (v: unknown, options: readonly string[]) => typeof v === 'string' && options.includes(v);

function need(p: Problems, ok: boolean, where: string, what: string) {
  if (!ok && p.length < 50) p.push(`${where}: ${what}`);
}

function list(p: Problems, v: unknown, where: string, each: (item: Record<string, unknown>, at: string) => void) {
  if (!Array.isArray(v)) return need(p, false, where, 'should be a list');
  v.forEach((item, i) => (isObj(item) ? each(item, `${where}[${i}]`) : need(p, false, `${where}[${i}]`, 'should be a record')));
}

/** Returns the problems found; an empty list means the data is safe to use. */
export function validateAppData(d: unknown): Problems {
  const p: Problems = [];
  if (!isObj(d)) return ['data: should be a record'];
  const s = d.settings;
  if (!isObj(s)) need(p, false, 'settings', 'missing');
  else {
    need(p, s.schemaVersion === SCHEMA_VERSION, 'settings.schemaVersion', `should be ${SCHEMA_VERSION}`);
    need(p, isStr(s.currency) && isStr(s.locale), 'settings', 'needs a currency and a locale');
    need(p, Number.isInteger(s.budgetMonthStartDay) && (s.budgetMonthStartDay as number) >= 1 && (s.budgetMonthStartDay as number) <= 28, 'settings.budgetMonthStartDay', 'should be 1–28');
    need(p, typeof s.startWithAmountsHidden === 'boolean', 'settings.startWithAmountsHidden', 'should be true or false');
    if (!isObj(s.layouts)) need(p, false, 'settings.layouts', 'should be a record');
    else for (const [page, l] of Object.entries(s.layouts)) {
      const at = `settings.layouts.${page}`;
      need(p, oneOf(page, PAGE_IDS), at, 'unknown page');
      if (!isObj(l)) { need(p, false, at, 'should be a record'); continue; }
      list(p, l.cards, `${at}.cards`, (c, cat) => need(p, isStr(c.id) && oneOf(c.width, ['half', 'full']) && typeof c.hidden === 'boolean', cat, 'needs id, width (half or full) and hidden'));
    }
  }
  list(p, d.accounts, 'accounts', (a, at) => {
    need(p, isStr(a.id) && isStr(a.name) && isStr(a.currency), at, 'needs id, name and currency');
    need(p, oneOf(a.kind, ['bank', 'card', 'cash', 'savings', 'loan', 'wallet']), `${at}.kind`, 'unknown account kind');
    need(p, isMinor(a.openingBalance) && (a.openingDate === null || isDate(a.openingDate)) && typeof a.closed === 'boolean', at, 'bad opening balance, date or closed flag');
  });
  list(p, d.categories, 'categories', (c, at) => {
    need(p, isStr(c.id) && isStr(c.name), at, 'needs id and name');
    need(p, oneOf(c.kind, ['spending', 'income', 'transfer']), `${at}.kind`, 'unknown category kind');
    need(p, strOrNull(c.parentId) && strOrNull(c.color) && typeof c.fixedCost === 'boolean' && typeof c.archived === 'boolean', at, 'bad parent, color or flags');
    need(p, c.paysAccountId === undefined || strOrNull(c.paysAccountId), `${at}.paysAccountId`, 'must be an account id or empty');
  });
  list(p, d.rules, 'rules', (r, at) => {
    need(p, isStr(r.id) && Number.isFinite(r.priority) && isObj(r.match) && isObj(r.set), at, 'needs id, priority, match and set');
  });
  const b = d.budgets;
  if (!isObj(b)) need(p, false, 'budgets', 'missing');
  else {
    list(p, b.limits, 'budgets.limits', (l, at) => need(p, strOrNull(l.categoryId) && isMinor(l.monthly), at, 'needs a category (or none) and a whole-agorot amount'));
    list(p, b.overrides, 'budgets.overrides', (o, at) => need(p, isMonth(o.month) && strOrNull(o.categoryId) && isMinor(o.monthly), at, 'needs a month, a category (or none) and an amount'));
  }
  list(p, d.holdings, 'holdings', (h, at) => {
    need(p, isStr(h.id) && isStr(h.name) && oneOf(h.kind, ['asset', 'property', 'debt']) && typeof h.inNetWorth === 'boolean', at, 'needs id, name, kind and net-worth flag');
    list(p, h.valuations, `${at}.valuations`, (v, vat) => need(p, isDate(v.date) && isMinor(v.value), vat, 'needs a date and a whole-agorot value'));
  });
  list(p, d.notes, 'notes', (n, at) => need(p, isStr(n.id) && isDate(n.start) && isDate(n.end) && isStr(n.text), at, 'needs id, start, end and text'));
  const im = d.imports;
  if (!isObj(im)) need(p, false, 'imports', 'missing');
  else {
    list(p, im.records, 'imports.records', (r, at) => need(p, isStr(r.id) && isStr(r.fileName) && isStr(r.accountId), at, 'needs id, file name and account'));
    list(p, im.layouts, 'imports.layouts', (l, at) => {
      need(p, isStr(l.id) && isStr(l.name) && isObj(l.columns), at, 'needs id, name and columns');
      need(p, l.amountSign === undefined || oneOf(l.amountSign, ['signed', 'outPositive']), `${at}.amountSign`, 'should be signed or outPositive');
    });
  }
  if (!isObj(d.months)) need(p, false, 'months', 'missing');
  else for (const [key, m] of Object.entries(d.months)) {
    const at = `months.${key}`;
    if (!isMonth(key) || !isObj(m) || m.month !== key) { need(p, false, at, 'month key and contents disagree'); continue; }
    list(p, m.transactions, `${at}.transactions`, (t, tat) => {
      need(p, isStr(t.id) && isStr(t.accountId) && isStr(t.description) && isStr(t.currency), tat, 'needs id, account, description and currency');
      need(p, isDate(t.date) && (t.date as string).startsWith(key), `${tat}.date`, 'should be a day in this month');
      need(p, isMinor(t.amount), `${tat}.amount`, 'should be whole agorot');
    });
    list(p, m.transfers, `${at}.transfers`, (l, lat) => need(p, isStr(l.id) && isStr(l.fromTransactionId) && isStr(l.toTransactionId), lat, 'needs both transactions'));
  }
  return p;
}

/** Narrows after validation; throws with the first problems if the data is not valid. */
export function asAppData(d: unknown): AppData {
  const problems = validateAppData(d);
  if (problems.length) throw new Error(`The data isn't in MySheet's format: ${problems.slice(0, 3).join('; ')}`);
  return d as AppData;
}

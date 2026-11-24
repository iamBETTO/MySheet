// Builds src/model/demo.json: v1's made-up demo person (compare/v1/data, round numbers, no real data) as v2 data, so
// v1 and v2 can be compared on the same numbers and v2 can offer "Explore with made-up data".
// Run: node scripts/build-demo.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('../compare/v1/data/', import.meta.url);
const csv = (name) => {
  const [head, ...lines] = readFileSync(new URL(`demo_${name}.csv`, dir), 'utf8').trim().split('\n');
  const cells = (line) => { const out = []; let cur = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };
  const cols = cells(head);
  return lines.map((l) => Object.fromEntries(cells(l).map((v, i) => [cols[i], v])));
};
const minor = (v) => Math.round(Number(v) * 100);
const slug = (s) => 'c-' + s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const tx = csv('tx');
const KIND = { out: 'spending', in: 'income', transfer: 'transfer' };
const FIXED = new Set(['Rent', 'Bills']);
const categories = new Map();
for (const r of tx) if (!categories.has(r.category)) categories.set(r.category, { id: slug(r.category), name: r.category, kind: KIND[r.direction], parentId: null, color: null, fixedCost: FIXED.has(r.category), archived: false });
categories.set('Card payments', { id: 'c-card-payments', name: 'Card payments', kind: 'transfer', parentId: null, color: null, fixedCost: false, archived: false, paysAccountId: 'acc-card' });
categories.set('Card (no details)', { id: 'c-card-no-details', name: 'Card (no details)', kind: 'spending', parentId: null, color: null, fixedCost: false, archived: false, paysAccountId: 'acc-card' });

const months = {};
const add = (t) => { const k = t.date.slice(0, 7); (months[k] ??= { month: k, transactions: [], transfers: [] }).transactions.push(t); };
const line = (id, accountId, r, amount, categoryId, description = r.desc) =>
  ({ id, accountId, date: r.date, amount, currency: 'ILS', description, payee: null, categoryId, note: null, importId: null, fingerprint: null });
for (const r of tx) {
  const card = r.paid_with === 'Card';
  add(line(r.id, card ? 'acc-card' : 'acc-bank', r, minor(r.amount), slug(r.category)));
  // The card is paid from the bank the same day, like a debit card: the same money, kept apart as own money moving.
  if (card) add(line('x' + r.id, 'acc-bank', r, minor(r.amount), 'c-card-payments', 'CARD CHARGE'));
}
for (const m of Object.values(months)) m.transactions.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

const monthly = csv('monthly');
// The balance before the first line: the first month's end balance minus every line that month (moves included).
const opening = minor(monthly[0].end_balance) - tx.filter((r) => r.month === monthly[0].month).reduce((n, r) => n + minor(r.amount), 0);
const limits = csv('limits').map((r) => ({ categoryId: r.category === 'All spending' ? null : slug(r.category), monthly: minor(r.monthly_limit), month: r.month || null }));
const KINDS = { asset: 'asset', property: 'property', debt: 'debt' };

const data = {
  settings: { schemaVersion: 2, currency: 'ILS', locale: 'en-IL', budgetMonthStartDay: 1, startWithAmountsHidden: false, layouts: {} },
  accounts: [
    { id: 'acc-bank', name: 'Bank account', kind: 'bank', currency: 'ILS', openingBalance: opening, openingDate: tx.map((r) => r.date).sort()[0], closed: false },
    { id: 'acc-card', name: 'Card', kind: 'card', currency: 'ILS', openingBalance: 0, openingDate: null, closed: false },
  ],
  categories: [...categories.values()],
  rules: [],
  budgets: {
    limits: limits.filter((l) => !l.month).map(({ categoryId, monthly }) => ({ categoryId, monthly })),
    overrides: limits.filter((l) => l.month).map(({ categoryId, monthly, month }) => ({ categoryId, monthly, month })),
  },
  holdings: csv('holdings').map((h) => ({ id: h.id, name: h.name, kind: KINDS[h.block], currency: 'ILS', inNetWorth: true, valuations: [{ date: h.as_of, value: minor(h.value), units: null, unitPrice: null }] })),
  notes: csv('notes').map((n) => ({ id: n.id, start: n.date, end: n.end_date || n.date, text: n.text, color: n.color || null })),
  imports: { records: [], layouts: [] },
  months: Object.fromEntries(Object.entries(months).sort(([a], [b]) => a.localeCompare(b))),
};
writeFileSync(new URL('../src/model/demo.json', import.meta.url), JSON.stringify(data));
console.log(`demo.json: ${tx.length} lines, ${Object.keys(months).length} months, opening ${opening / 100}`);

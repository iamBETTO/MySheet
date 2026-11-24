// Gives newly imported lines a category and name: first by the person's rules, then by how they last
// categorised the same place (texts that differ only in numbers count as the same place).
import type { AppData, Id, Rule } from '../model/types';
import { similarKey } from '../logic/names';

export interface Guess { categoryId: Id | null; payee: string | null; source: 'rule' | 'history' | null }

export function ruleMatches(r: Rule, line: { accountId: Id; description: string; amount: number }): boolean {
  const m = r.match;
  const text = line.description.toLowerCase();
  if (m.descriptionEquals !== undefined && similarKey(m.descriptionEquals) !== similarKey(line.description)) return false;
  if (m.descriptionContains !== undefined && !text.includes(m.descriptionContains.toLowerCase())) return false;
  if (m.descriptionStartsWith !== undefined && !text.startsWith(m.descriptionStartsWith.toLowerCase())) return false;
  if (m.accountId !== undefined && m.accountId !== line.accountId) return false;
  if (m.amountMin !== undefined && line.amount < m.amountMin) return false;
  if (m.amountMax !== undefined && line.amount > m.amountMax) return false;
  return m.descriptionEquals !== undefined || m.descriptionContains !== undefined || m.descriptionStartsWith !== undefined || m.accountId !== undefined;
}

export function makeCategorizer(data: AppData): (line: { accountId: Id; description: string; amount: number }) => Guess {
  const usable = new Set(data.categories.filter((c) => !c.archived).map((c) => c.id));
  const rules = [...data.rules].sort((a, b) => a.priority - b.priority);
  // The latest categorised transaction for each place, per account and for any account.
  const latest = new Map<string, { date: string; categoryId: Id; payee: string | null }>();
  for (const m of Object.values(data.months)) for (const t of m.transactions) {
    if (!t.categoryId || !usable.has(t.categoryId)) continue;
    const sign = t.amount < 0 ? '-' : '+';
    for (const key of [`${t.accountId}|${sign}|${similarKey(t.description)}`, `*|${sign}|${similarKey(t.description)}`]) {
      const cur = latest.get(key);
      if (!cur || t.date > cur.date) latest.set(key, { date: t.date, categoryId: t.categoryId, payee: t.payee });
    }
  }
  return (line) => {
    const rule = rules.find((r) => ruleMatches(r, line) && (r.set.categoryId === null || usable.has(r.set.categoryId)));
    if (rule) return { categoryId: rule.set.categoryId, payee: rule.set.payee, source: 'rule' };
    const sign = line.amount < 0 ? '-' : '+';
    const key = similarKey(line.description);
    const past = latest.get(`${line.accountId}|${sign}|${key}`) ?? latest.get(`*|${sign}|${key}`);
    if (past) return { categoryId: past.categoryId, payee: past.payee, source: 'history' };
    return { categoryId: null, payee: null, source: null };
  };
}

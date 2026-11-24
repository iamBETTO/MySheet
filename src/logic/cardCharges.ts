// A card's charges on the bank are the same money as the card's purchases. Where the card's own file covers a charge,
// the charge is a move between your own accounts (and left out of lists, as v1 does); where it doesn't (before the first
// card file, or after the newest), the charge is the only record of that spending: "Card (no details)".
// The bank-side types say which card they pay with Category.paysAccountId. Plain functions (CLAUDE.md rule 8).
import type { AppData, Id, IsoDate, Transaction } from '../model/types';
import type { DocKey } from '../storage/repository';
import type { CategoryIndex } from './categories';
import type { Edit } from './edits';

export interface CardChargeTypes {
  cardId: Id;
  /** The own-money-moving type for charges the card file covers. */
  covered: Id | null;
  /** The spending type for charges with no card details. */
  uncovered: Id | null;
}

export function cardChargeTypes(data: AppData): CardChargeTypes[] {
  const byCard = new Map<Id, CardChargeTypes>();
  for (const c of data.categories) {
    if (!c.paysAccountId || c.archived) continue;
    const e = byCard.get(c.paysAccountId) ?? { cardId: c.paysAccountId, covered: null, uncovered: null };
    if (c.kind === 'transfer' && !e.covered) e.covered = c.id;
    if (c.kind === 'spending' && !e.uncovered) e.uncovered = c.id;
    byCard.set(c.paysAccountId, e);
  }
  return [...byCard.values()];
}

/** The first and last day the card's own transactions cover, or null when it has none. */
export function cardCoverage(data: AppData, cardId: Id): { first: IsoDate; last: IsoDate } | null {
  let first: IsoDate | null = null, last: IsoDate | null = null;
  for (const m of Object.values(data.months)) for (const t of m.transactions) {
    if (t.accountId !== cardId) continue;
    if (!first || t.date < first) first = t.date;
    if (!last || t.date > last) last = t.date;
  }
  return first && last ? { first, last } : null;
}

/** Puts each card charge in the covered or the no-details type, by whether the card's file covers its day. */
export function reconcileCardCharges(data: AppData): Edit & { changed: number } {
  const months = { ...data.months };
  const docs = new Set<DocKey>();
  let changed = 0;
  for (const types of cardChargeTypes(data)) {
    if (!types.covered || !types.uncovered) continue;
    const span = cardCoverage(data, types.cardId);
    const mine = new Set([types.covered, types.uncovered]);
    for (const [key, month] of Object.entries(months)) {
      let touched = false;
      const transactions = month.transactions.map((t) => {
        if (!t.categoryId || !mine.has(t.categoryId) || t.accountId === types.cardId) return t;
        const want = span && t.date >= span.first && t.date <= span.last ? types.covered! : types.uncovered!;
        if (want === t.categoryId) return t;
        touched = true; changed++;
        return { ...t, categoryId: want };
      });
      if (touched) { months[key] = { ...month, transactions }; docs.add(`month:${key}`); }
    }
  }
  return { data: changed ? { ...data, months } : data, docs: [...docs], changed };
}

/** A covered card charge: own money moving that lists leave out, because the card's purchases already show it. */
export function isCoveredCardCharge(t: Transaction, cats: CategoryIndex): boolean {
  const c = t.categoryId ? cats.byId.get(t.categoryId) : undefined;
  return !!c?.paysAccountId && c.kind === 'transfer' && t.accountId !== c.paysAccountId;
}

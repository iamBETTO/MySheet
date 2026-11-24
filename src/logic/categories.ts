// Category lookups shared by the money maths and the screens.
import { text, type Key } from '../i18n/text';
import type { Language } from '../i18n/languages';
import type { AppData, Category, CategoryKind, Id, Transaction } from '../model/types';

export interface CategoryIndex {
  byId: Map<Id, Category>;
  /** A sub-category's parent id, or its own id for a top category. */
  topOf(id: Id | null): Id | null;
  name(id: Id | null): string;
  /** Spending, income or a move between own accounts. Without a category, the sign decides. */
  kindOf(t: Transaction): CategoryKind;
  /** Ids of a category and its sub-categories. */
  family(id: Id): Set<Id>;
}

/** `lang`: the language of the name shown for lines without a category. */
export function indexCategories(data: AppData, lang: Language = 'en'): CategoryIndex {
  const none = text(lang, 'parts.noCategory');
  const byId = new Map(data.categories.map((c) => [c.id, c]));
  const topOf = (id: Id | null) => {
    if (id === null) return null;
    const c = byId.get(id);
    return c?.parentId && byId.has(c.parentId) ? c.parentId : id;
  };
  return {
    byId,
    topOf,
    name: (id) => (id === null ? none : byId.get(id)?.name ?? none),
    kindOf: (t) => {
      const c = t.categoryId ? byId.get(t.categoryId) : undefined;
      return c ? c.kind : t.amount < 0 ? 'spending' : 'income';
    },
    family: (id) => new Set([id, ...data.categories.filter((c) => c.parentId === id).map((c) => c.id)]),
  };
}

/** Categories in the order lists show them: by kind, then parents each followed by their sub-categories. */
export function orderedCategories(data: AppData, opts: { includeArchived?: boolean } = {}): Category[] {
  const shown = data.categories.filter((c) => opts.includeArchived || !c.archived);
  const kinds: CategoryKind[] = ['spending', 'income', 'transfer'];
  const byName = (a: Category, b: Category) => a.name.localeCompare(b.name);
  const out: Category[] = [];
  for (const k of kinds) {
    const tops = shown.filter((c) => c.kind === k && (!c.parentId || !shown.some((p) => p.id === c.parentId))).sort(byName);
    for (const t of tops) out.push(t, ...shown.filter((c) => c.parentId === t.id).sort(byName));
  }
  return out;
}

/** What each kind is called on screen (a text key, plans/translation.md). */
export const KIND_LABEL: Record<CategoryKind, Key> = { spending: 'parts.kind.spending', income: 'parts.kind.income', transfer: 'parts.kind.transfer' };

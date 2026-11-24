// MySheet's data model, version 2 (version 1 approved by the owner, 12 Oct 2026, doc "MySheet v2 Data Model"; version 2
// adds page layouts, approved 6 Nov 2026). Older data is upgraded by src/model/migrate.ts.
// Money is whole agorot (Minor): -1250 is ₪12.50 spent. Dates are plain days, 'YYYY-MM-DD'.
// Changing any shape here needs a new SCHEMA_VERSION, a migration and the owner's OK (CLAUDE.md rule 17).

export const SCHEMA_VERSION = 2;

export type Id = string;
/** A calendar day, 'YYYY-MM-DD'. */
export type IsoDate = string;
/** A month, 'YYYY-MM'. */
export type MonthKey = string;
/** Money in the currency's smallest unit (agorot for ₪), always a whole number. */
export type Minor = number;
/** ISO 4217 code, e.g. 'ILS'. */
export type Currency = string;

export interface Settings {
  schemaVersion: number;
  currency: Currency;
  /** Language and region for dates and numbers, e.g. 'en-IL'. */
  locale: string;
  /** Day of the month a budget month starts (1–28). */
  budgetMonthStartDay: number;
  startWithAmountsHidden: boolean;
  /** How the person arranged each page; a page that isn't here uses its default layout (version 2). */
  layouts: Partial<Record<PageId, PageLayout>>;
}

/** Pages whose cards can be arranged. */
export type PageId = 'home' | 'spending' | 'budget';
export const PAGE_IDS: readonly PageId[] = ['home', 'spending', 'budget'];
export type CardWidth = 'half' | 'full';
/** One card's place on a page: order is the list order; half sits beside another half on wide screens. */
export interface CardPlace {
  id: string;
  width: CardWidth;
  hidden: boolean;
}
export interface PageLayout {
  cards: CardPlace[];
}

export type AccountKind = 'bank' | 'card' | 'cash' | 'savings' | 'loan' | 'wallet';

export interface Account {
  id: Id;
  name: string;
  kind: AccountKind;
  currency: Currency;
  openingBalance: Minor;
  openingDate: IsoDate | null;
  closed: boolean;
}

/** 'transfer' = money moving between your own accounts: never spending or income. */
export type CategoryKind = 'spending' | 'income' | 'transfer';

export interface Category {
  id: Id;
  name: string;
  kind: CategoryKind;
  /** Optional parent for sub-categories (Eating out → Wolt). */
  parentId: Id | null;
  color: string | null;
  fixedCost: boolean;
  archived: boolean;
  /**
   * Set on the bank-side types of a card's charges ("Card payments", "Card (no details)"): the card account they pay.
   * Optional and added after v1 of the model (12 Oct 2026); older data without it stays valid.
   */
  paysAccountId?: Id | null;
}

export interface Transaction {
  id: Id;
  accountId: Id;
  date: IsoDate;
  /** Negative = money out, positive = money in. */
  amount: Minor;
  currency: Currency;
  /** The description exactly as the bank or card wrote it. */
  description: string;
  payee: string | null;
  categoryId: Id | null;
  note: string | null;
  importId: Id | null;
  /** Identifies the source line, so a re-imported file skips lines it already added. */
  fingerprint: string | null;
}

/** Joins the two sides of a move between your own accounts (bank → card, bank → savings). */
export interface TransferLink {
  id: Id;
  fromTransactionId: Id;
  toTransactionId: Id;
}

/** One saved document per month holds that month's transactions and transfer links. */
export interface Month {
  month: MonthKey;
  transactions: Transaction[];
  transfers: TransferLink[];
}

export interface RuleMatch {
  descriptionContains?: string;
  descriptionEquals?: string;
  descriptionStartsWith?: string;
  accountId?: Id;
  amountMin?: Minor;
  amountMax?: Minor;
}

export interface Rule {
  id: Id;
  /** Lower runs first; the first matching rule wins. */
  priority: number;
  match: RuleMatch;
  set: { categoryId: Id | null; payee: string | null };
}

export interface BudgetLimit {
  /** null = all spending together. */
  categoryId: Id | null;
  monthly: Minor;
}

export interface BudgetOverride extends BudgetLimit {
  month: MonthKey;
}

export interface Budgets {
  limits: BudgetLimit[];
  overrides: BudgetOverride[];
}

export type HoldingKind = 'asset' | 'property' | 'debt';

export interface Valuation {
  date: IsoDate;
  value: Minor;
  units: number | null;
  unitPrice: Minor | null;
}

export interface Holding {
  id: Id;
  name: string;
  kind: HoldingKind;
  currency: Currency;
  inNetWorth: boolean;
  valuations: Valuation[];
}

export interface CalendarNote {
  id: Id;
  start: IsoDate;
  end: IsoDate;
  text: string;
  color: string | null;
}

/** How one bank's export file maps to transactions, remembered after the first import. */
export interface ColumnLayout {
  id: Id;
  name: string;
  headerRow: number;
  dateFormat: string;
  columns: { date: string; description: string; amount?: string; debit?: string; credit?: string };
  /** Added 12 Oct 2026, optional so older data stays valid: 'outPositive' when the file lists money out as positive. */
  amountSign?: 'signed' | 'outPositive';
}

export interface ImportRecord {
  id: Id;
  /** When the import happened, ISO timestamp. */
  at: string;
  fileName: string;
  accountId: Id;
  layoutId: Id | null;
  rowsAdded: number;
  duplicatesSkipped: number;
}

export interface Imports {
  records: ImportRecord[];
  layouts: ColumnLayout[];
}

/** Everything one person has saved in MySheet. */
export interface AppData {
  settings: Settings;
  accounts: Account[];
  categories: Category[];
  rules: Rule[];
  budgets: Budgets;
  holdings: Holding[];
  notes: CalendarNote[];
  imports: Imports;
  months: Record<MonthKey, Month>;
}

export function emptyData(): AppData {
  return {
    settings: { schemaVersion: SCHEMA_VERSION, currency: 'ILS', locale: 'en-IL', budgetMonthStartDay: 1, startWithAmountsHidden: false, layouts: {} },
    accounts: [],
    categories: [],
    rules: [],
    budgets: { limits: [], overrides: [] },
    holdings: [],
    notes: [],
    imports: { records: [], layouts: [] },
    months: {},
  };
}

export function monthOf(date: IsoDate): MonthKey {
  return date.slice(0, 7);
}

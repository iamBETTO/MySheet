// What the person is looking at (v1's view state): the place, the period and comparison, hidden amounts, folded
// sections, Activity's filters, where Back returns to, and each place's scroll position.
// The place, period and eye are kept per device in browser storage, as a convenience only (CLAUDE.md stack: storage).
import { signal, effect } from '@preact/signals';
import { asPeriod, type Period } from '../logic/periods';
import type { CategoryKind, Id } from '../model/types';

export type Place = 'home' | 'spending' | 'budget' | 'calendar' | 'activity' | 'settings';
export const PLACES: readonly Exclude<Place, 'settings'>[] = ['home', 'spending', 'budget', 'calendar', 'activity'];

export interface ActivityFilter {
  text: string;
  accountId: Id | null;
  categoryId: Id | 'none' | null;
  kind: CategoryKind | null;
  /** One place, picked from Top places; `placeName` is how it's shown in the filter chip. */
  place: string | null;
  placeName: string | null;
  /** A month, day or range picked from another screen; null = the chosen period. `label` names it on its chip. */
  start: string | null;
  end: string | null;
  label: string | null;
}

export const NO_FILTER: ActivityFilter = { text: '', accountId: null, categoryId: null, kind: null, place: null, placeName: null, start: null, end: null, label: null };

const KEY = 'mysheet.view.v1';
const saved = readSaved();

export const place = signal<Place>(saved.place ?? 'home');
export const period = signal<Period>(saved.period ?? { kind: 'recent', months: 12 });
/** v1's "Compare with": another period shown beside the chosen one, or null. */
export const compareWith = signal<Period | null>(null);
/** True hides every amount on screen (the privacy eye). */
export const amountsHidden = signal<boolean>(saved.hidden ?? false);
export const filter = signal<ActivityFilter>(NO_FILTER);
/** Cards folded with their chevron (by card id); they stay folded while moving between places. */
export const folded = signal<ReadonlySet<string>>(new Set());
/** Calendar's shown month and picked day (null = the newest), kept while moving between places, as in v1. */
export const calendarMonth = signal<string | null>(null);
export const calendarDay = signal<string | null>(null);
/** Where Activity's Back button returns, and to which scroll position. */
export const backTo = signal<{ place: Place; y: number } | null>(null);
/** Each place's scroll position, so coming back returns to the same spot (v1). Read by the frame after a change. */
export const scrollMemory = new Map<Place, number>();
/** The scroll position the frame should restore after the next place change, or null for the remembered one. */
export let pendingScroll: number | null = null;

effect(() => {
  const body = JSON.stringify({ place: place.value === 'settings' ? 'home' : place.value, period: period.value, hidden: amountsHidden.value });
  try { localStorage.setItem(KEY, body); } catch { /* Browser storage can be off (private window); the view simply isn't remembered. */ }
});

function readSaved(): { place?: Place; period?: Period; hidden?: boolean } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const o = JSON.parse(raw) as Record<string, unknown>;
    const p = typeof o.place === 'string' && (PLACES as readonly string[]).includes(o.place) ? (o.place as Place) : undefined;
    return { place: p, period: asPeriod(o.period) ?? undefined, hidden: typeof o.hidden === 'boolean' ? o.hidden : undefined };
  } catch {
    // Browser storage can be off (private window, blocked site data) or hold something unreadable: start fresh.
    return {};
  }
}

const scrollY = () => (typeof window === 'undefined' ? 0 : window.scrollY);

/** Action: go to a place from the tab bar. Remembers where this place was scrolled to. */
export function go(to: Place): void {
  scrollMemory.set(place.value, scrollY());
  backTo.value = null;
  pendingScroll = null;
  place.value = to;
}

/** Called by the frame once it has used pendingScroll. */
export function takePendingScroll(): number | null {
  const y = pendingScroll;
  pendingScroll = null;
  return y;
}

/** Action: open Activity showing only what matches, with a Back button to where the tap came from (v1). */
export function showTransactions(f: Partial<ActivityFilter>): void {
  const from = place.value;
  filter.value = { ...NO_FILTER, ...f };
  if (from !== 'activity') {
    const y = scrollY();
    scrollMemory.set(from, y);
    backTo.value = { place: from, y };
    pendingScroll = 0;
    place.value = 'activity';
  }
}

/** Action: Activity's Back button. */
export function goBack(): void {
  const b = backTo.value;
  if (!b) return;
  backTo.value = null;
  pendingScroll = b.y;
  place.value = b.place;
}

export function setPeriod(p: Period): void {
  period.value = p;
}

export function setCompare(p: Period | null): void {
  compareWith.value = p;
}

export function toggleAmounts(): void {
  amountsHidden.value = !amountsHidden.value;
}

export function toggleFold(id: string): void {
  const next = new Set(folded.value);
  if (next.has(id)) next.delete(id); else next.add(id);
  folded.value = next;
}

export function unfoldAll(): void {
  folded.value = new Set();
}

export function setFilter(f: Partial<ActivityFilter>): void {
  filter.value = { ...filter.value, ...f };
}

/** Action: before switching to or from the demo person, drop what points into the other data (v1's Demo button). */
export function resetForDemo(): void {
  filter.value = NO_FILTER;
  calendarMonth.value = null;
  calendarDay.value = null;
  backTo.value = null;
  importOpen.value = false;
}

/** Whether the Import sheet is open (it can be opened from several screens). */
export const importOpen = signal(false);
export function openImport(): void { importOpen.value = true; }
export function closeImport(): void { importOpen.value = false; }

const VISIT_KEY = 'mysheet.lastVisit.v1';
/** The day of the previous visit on this device (before this one), or null on a first visit. */
export const previousVisit = signal<string | null>(readVisit());
export const welcomeDismissed = signal(false);

function readVisit(): string | null {
  let prev: string | null = null;
  try {
    prev = localStorage.getItem(VISIT_KEY);
    localStorage.setItem(VISIT_KEY, new Date().toISOString().slice(0, 10));
  } catch {
    // Browser storage off: no welcome-back summary on this device, nothing else changes.
  }
  return prev && /^\d{4}-\d{2}-\d{2}$/.test(prev) ? prev : null;
}

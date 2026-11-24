// The person's saved data, and the actions that change it (CLAUDE.md rule 9).
import { computed, signal } from '@preact/signals';
import type { AppData } from '../model/types';
import demoPerson from '../model/demo.json';
import { validateAppData } from '../model/validate';
import type { Store } from '../storage/store';
import { loadKeeping, replaceAll, saveDocs, type DocKey } from '../storage/repository';
import type { SetAside } from '../model/salvage';
import { backupFileName, toBackupFile } from '../logic/backup';
import { offerFile, type SaveOutcome } from '../storage/downloads';
import { reportError } from './errors';
import { t } from '../i18n';

export type DataState = { state: 'idle' } | { state: 'loading' } | { state: 'ready'; data: AppData } | { state: 'error'; message: string };

export const appData = signal<DataState>({ state: 'idle' });
/** Saved records that couldn't be read when the data loaded, so they were set aside (shown on Home). */
export const setAside = signal<{ items: SetAside[]; copied: boolean } | null>(null);
/** Action: hide the set-aside notice for this visit. */
export function dismissSetAside(): void { setAside.value = null; }
/** The data as it was before the last restore, so the restore can be undone (until the page reloads). */
export const beforeRestore = signal<AppData | null>(null);

/** A short message at the bottom of the screen, with Undo when the change can be undone. */
export interface Toast { id: number; text: string; canUndo: boolean; tone: 'info' | 'problem' }
export const toast = signal<Toast | null>(null);

interface Step { label: string; before: AppData; docs: DocKey[] }
/** Changes made this session, newest last, so each can be undone (CLAUDE.md rule 9). */
export const history = signal<Step[]>([]);
let activeStore: Store | null = null;
let toastSeq = 0;
let saving: Promise<unknown> = Promise.resolve();

export function showToast(text: string, canUndo = false, tone: Toast['tone'] = 'info'): void {
  toast.value = { id: ++toastSeq, text, canUndo, tone };
}

export function dismissToast(): void {
  toast.value = null;
}

/**
 * v1's Demo button: a made-up person shown instead of the person's own data. Changes made in demo stay in memory
 * only and are gone when demo is switched off; the person's saved data and their Undo list are left as they were.
 */
export const demoOn = signal(false);
const demoData = signal<AppData | null>(null);
let ownHistory: Step[] = [];

/** What the screens show: the demo person while demo is on, otherwise the person's own data. */
export const shownData = computed<DataState>(() =>
  demoOn.value && demoData.value ? { state: 'ready', data: demoData.value } : appData.value);

/** Action: switch between the person's own data and the demo person (a fresh copy each time). */
export function toggleDemo(): void {
  const on = !demoOn.value;
  if (on) {
    ownHistory = history.value;
    history.value = [];
    demoData.value = structuredClone(demoPerson) as AppData;
  } else {
    history.value = ownHistory;
    ownHistory = [];
    demoData.value = null;
  }
  demoOn.value = on;
  dismissToast();
}

/** The data as it is now; throws if nothing is loaded (screens only offer changes once data is ready). */
export function current(): AppData {
  const s = shownData.value;
  if (s.state !== 'ready') throw new Error('No data loaded');
  return s.data;
}

function show(data: AppData): void {
  if (demoOn.value) demoData.value = data;
  else appData.value = { state: 'ready', data };
}

/**
 * Action: applies a change at once on screen, saves the documents it touched, and offers Undo.
 * Saves run one after another, so a quick second change never overtakes the first.
 */
export function commit(next: AppData, docs: DocKey[], label: string): void {
  // Safety net: data that wouldn't load again is never saved (an empty date once hid all of the owner's data, 6 Nov 2026).
  const problems = validateAppData(next);
  if (problems.length) {
    reportError('save', new Error(`Refused an invalid change (${label}): ${problems.slice(0, 3).join('; ')}`));
    showToast(t('common.refused'), false, 'problem');
    return;
  }
  const before = current();
  const step: Step = { label, before, docs };
  show(next);
  history.value = [...history.value.slice(-49), step];
  showToast(label, true);
  if (demoOn.value) return;
  persist(next, docs, () => {
    // Put the screen back only if nothing else changed since; otherwise the later change stays on screen.
    if (isShowing(next)) appData.value = { state: 'ready', data: before };
    history.value = history.value.filter((s) => s !== step);
  });
}

/** Action: undoes the latest change. */
export function undo(): void {
  const step = history.value.at(-1);
  if (!step) return;
  history.value = history.value.slice(0, -1);
  const now = current();
  show(step.before);
  showToast(t('common.undone', { change: lowerFirst(step.label) }));
  if (demoOn.value) return;
  persist(step.before, step.docs, () => {
    if (isShowing(step.before)) appData.value = { state: 'ready', data: now };
    history.value = [...history.value, step];
  });
}

function isShowing(d: AppData): boolean {
  return appData.value.state === 'ready' && appData.value.data === d;
}

function persist(data: AppData, docs: DocKey[], onFail: () => void): void {
  const store = activeStore;
  if (!store) return;
  saving = saving.then(() => saveDocs(store, data, docs)).catch((e: unknown) => {
    reportError('save', e);
    onFail();
    showToast(t('common.saveFailed'), false, 'problem');
  });
}

/** Resolves when every change so far has been saved (used before a restore, and by tests). */
export function settled(): Promise<unknown> {
  return saving;
}

function lowerFirst(t: string): string {
  return t.charAt(0).toLowerCase() + t.slice(1);
}

export async function loadData(store: Store): Promise<void> {
  activeStore = store;
  appData.value = { state: 'loading' };
  try {
    const loaded = await loadKeeping(store);
    setAside.value = loaded.setAside.length ? { items: loaded.setAside, copied: loaded.copied } : null;
    if (loaded.setAside.length) reportError('load data', new Error(`Set aside ${loaded.setAside.length}: ${loaded.setAside.map((x) => `${x.where} (${x.why})`).join('; ')}`));
    appData.value = { state: 'ready', data: loaded.data };
  } catch (e) {
    reportError('load data', e);
    appData.value = { state: 'error', message: t('common.unreadable') };
  }
}

/** Offers the whole data as a backup file. */
export async function downloadBackup(data: AppData, now = new Date()): Promise<SaveOutcome> {
  try {
    return await offerFile(backupFileName(now), toBackupFile(data, now));
  } catch (e) {
    reportError('download backup', e);
    return 'failed';
  }
}

/** Replaces all saved data with a backup's, keeping the current data so it can be undone. */
export async function restoreBackup(store: Store, incoming: AppData): Promise<boolean> {
  const current = appData.value.state === 'ready' ? appData.value.data : null;
  try {
    await replaceAll(store, incoming);
    beforeRestore.value = current;
    appData.value = { state: 'ready', data: incoming };
    return true;
  } catch (e) {
    reportError('restore backup', e);
    await loadData(store);
    return false;
  }
}

export async function undoRestore(store: Store): Promise<boolean> {
  const previous = beforeRestore.value;
  if (!previous) return false;
  try {
    await replaceAll(store, previous);
    appData.value = { state: 'ready', data: previous };
    beforeRestore.value = null;
    return true;
  } catch (e) {
    reportError('undo restore', e);
    return false;
  }
}

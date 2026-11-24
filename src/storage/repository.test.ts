import { describe, expect, it } from 'vitest';
import { memoryStore } from './memoryStore';
import { LIST_DOCS, loadAll, loadKeeping, replaceAll, saveMonth } from './repository';
import { emptyData } from '../model/types';
import { sampleData } from '../model/sample';

describe('repository', () => {
  it('loads empty defaults from an empty store', async () => {
    expect(await loadAll(memoryStore())).toEqual(emptyData());
  });

  it('saves everything and loads it back unchanged', async () => {
    const store = memoryStore();
    await replaceAll(store, sampleData());
    expect(await loadAll(store)).toEqual(sampleData());
  });

  it('upgrades settings saved before page layouts (format 1) and writes them back', async () => {
    const store = memoryStore();
    await replaceAll(store, sampleData());
    const { layouts: _, ...old } = sampleData().settings;
    await store.doc('settings').set({ ...old, schemaVersion: 1 });
    expect(await loadAll(store)).toEqual(sampleData());
    expect(store.dump().settings).toEqual(sampleData().settings);
  });

  it('sets aside a broken record instead of refusing everything, and keeps a copy of it', async () => {
    const store = memoryStore();
    await replaceAll(store, sampleData());
    const holdings = store.dump().holdings as { items: { valuations: { date: string }[] }[] };
    holdings.items[0]!.valuations[0]!.date = '';
    await store.doc('holdings').set(holdings);
    await expect(loadAll(store)).rejects.toThrow('needs a date');
    const loaded = await loadKeeping(store);
    expect(loaded.setAside.map((s) => s.label)).toEqual(['A value of "Savings plan"']);
    expect(loaded.copied).toBe(true);
    expect(loaded.data.months).toEqual(sampleData().months);
    expect((store.dump().setaside as { items: unknown[] }).items).toHaveLength(1);
    await loadKeeping(store);
    expect((store.dump().setaside as { items: unknown[] }).items).toHaveLength(1);
  });

  it('keeps one document per month and an index of months', async () => {
    const store = memoryStore();
    await replaceAll(store, sampleData());
    const docs = store.dump();
    expect(Object.keys(docs).filter((k) => k.startsWith('ledger/months/')).sort()).toEqual(['ledger/months/2026-09', 'ledger/months/2026-10']);
    expect(docs.ledger).toEqual({ months: ['2026-09', '2026-10'] });
    for (const n of LIST_DOCS) expect(Array.isArray(docs[n]?.items)).toBe(true);
  });

  it('deletes months a restore no longer has', async () => {
    const store = memoryStore();
    await replaceAll(store, sampleData());
    const smaller = sampleData();
    delete smaller.months['2026-09'];
    await replaceAll(store, smaller);
    expect(Object.keys(store.dump()).some((k) => k.endsWith('2026-09'))).toBe(false);
    expect(Object.keys((await loadAll(store)).months)).toEqual(['2026-10']);
  });

  it('adds a new month to the index when it is saved', async () => {
    const store = memoryStore();
    const data = sampleData();
    await replaceAll(store, data);
    data.months['2026-11'] = { month: '2026-11', transactions: [], transfers: [] };
    await saveMonth(store, data.months['2026-11'], data);
    expect(Object.keys((await loadAll(store)).months)).toEqual(['2026-09', '2026-10', '2026-11']);
  });

  it('refuses to load data that has been damaged', async () => {
    const store = memoryStore({ accounts: { items: [{ id: 'a', name: 'Bank', kind: 'piggy bank', currency: 'ILS', openingBalance: 0, openingDate: null, closed: false }] } });
    await expect(loadAll(store)).rejects.toThrow('unknown account kind');
  });
});

describe('saving only what changed', () => {
  it('saves a changed month and a list, and deletes an emptied month', async () => {
    const { saveDocs } = await import('./repository');
    const store = memoryStore();
    await replaceAll(store, sampleData());
    const next = sampleData();
    next.accounts[0]!.name = 'Renamed';
    delete next.months['2026-09'];
    await saveDocs(store, next, ['accounts', 'month:2026-09']);
    const back = await loadAll(store);
    expect(back.accounts[0]!.name).toBe('Renamed');
    expect(Object.keys(back.months)).toEqual(['2026-10']);
  });
});

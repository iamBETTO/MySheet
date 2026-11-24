# MySheet

A character sheet for your real life, starting with Treasury (money). v2: an app built with TypeScript, Preact and Vite,
published as a Claude artifact, with each person's data private and synced between their devices.

Start with `CLAUDE.md` (how to work on this code) and `UX_RULES.md` (how screens should behave). The build plan and
what's done is in `plans/v2-build.md`.

```
npm install
npm run check
```

## Where things are

| Folder | What's in it |
|---|---|
| `src/model/` | The saved data's shape (`types.ts`), checks on load (`validate.ts`), ids and import fingerprints, made-up sample data |
| `src/logic/` | Money maths as plain functions: periods, totals, worth, budget and bills, search, names, and every change (`edits.ts`) |
| `src/import/` | Reading files (CSV, .xlsx, .xls), ready-made bank layouts, turning rows into lines, skipping repeats, rules and past choices, Bit details |
| `src/storage/` | The private synced store, saving only what changed, backup files, downloads |
| `src/state/` | Signals: the data with Undo (`data.ts`), what's on screen (`view.ts`), the error log |
| `src/ui/` | The frame (`App.tsx`), shared pieces (sheets, money, charts, Undo message) and one file per screen in `screens/` |
| `src/styles/` | Design tokens, then the frame and shared pieces, then summaries and charts |
| `tests/e2e/` | Screen tests on phone and desktop, with axe checks; `helpers.ts` pretends to be the Claude viewer |

# Plan: build MySheet v2 to replace v1 (the owner, 12 Oct 2026: "You are the captain. Build me v2. Do not get rid of v1.")

v1 stays published and untouched until the owner says otherwise. Each stage: unit tests + screen tests (phone and desktop,
axe, 320px) pass → publish to the MySheet v2 artifact → commit → history backup → roadmap entry updated.

## Stage 1 — Shell and Activity
- [x] `state/data.ts`: one `commit(next, docs, label)` action that saves only changed documents and keeps an undo history; `undo()`.
- [x] `state/view.ts`: place (Home, Spending, Budget, Calendar, Activity), period, privacy eye, filters. Per-device conveniences in browser storage.
- [x] `logic/periods.ts`: periods worked out from today and the data (this month, last month, last 3/12 months, a year, all).
- [x] Shell: title, period button (sheet), eye, settings; bottom bar on phones, side rail from 840px; skip link; Escape closes sheets.
- [x] Activity: search, account and category filters, day-grouped list, totals for what's shown, "show more".
- [x] Edit sheet for a transaction: category, payee, note; Undo message after every change.
- [x] Settings page: accounts, categories (add, rename, kind, parent, archive), backup and restore.

## Stage 2 — Home and Spending
- [x] `logic/totals.ts`: in, out, left over, transfers apart; by category (sub-categories roll up); by month; by day; top places; account balances.
- [x] Home: net worth, this month (spent of limit, safe to spend), period summary, in and out by month (bars), bank balance (line).
- [x] Spending: where it went, where it came from, own money moving, top places; tap a row → Activity filtered.

## Stage 3 — Budget
- [x] `logic/budget.ts`: limits and overrides per month, pace (where even spending would put you today), regular bills, safe to spend.
- [x] Budget: this month so far, bills and safe to spend, limits month by month; edit limits in place.

## Stage 4 — Calendar
- [x] Month grid with spending per day (theme-neutral shading + numbers), notes on days and ranges; tap a day → its transactions.

## Stage 5 — Import in the app
- [x] Spreadsheet readers: .xlsx (zip + XML, no library) and .xls (old Excel format) → rows.
- [x] Import screen: pick file → recognised layout or match columns once (saved) → choose account → preview with row problems → import → Undo.
- [x] Rules: "always put this place in this category"; applied on import; editable list.

## Stage 6 — Finish
- [x] Bit files: add who and what to matching bank/card lines.
- [x] Holdings (what you have) and net worth editing.
- [x] Welcome-back summary; settings for comfort and privacy.
- [x] Full sweep of every screen (both themes), right-to-left check, keyboard pass, full-size data (`tests/e2e/sweep.spec.ts`). 200% text is covered by the 320px reflow checks.

## Stage 7 — v1 parity
- [x] Activity: select lines, see their total, move them to a category together (one Undo).
- [x] Home and Spending: compare a period with the one before (only when the data reaches back).

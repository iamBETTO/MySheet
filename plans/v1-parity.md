# Plan: v2 takes v1's design (the owner, 12 Oct 2026: "first take stuff from v1 to v2 … you're good to go 1 through 4")

v1 is the spec (CLAUDE.md 23–24, V1_REFERENCE.md, doc "MySheet v1 — Design Reference"). v1 stays published and untouched.
Open questions for the owner (built with my suggestion until he answers): desktop keeps v1's top bar; demo account inside
Settings; v1's period list only.

## 1. Reference
- [x] Doc "MySheet v1 — Design Reference" (every screen, look, decisions, where v2 abilities go).
- [x] V1_REFERENCE.md + CLAUDE.md rules 23–24.

## 2. Tooling (step 4 guardrail, built first so every screen is checked)
- [x] `compare/v1/`: v1's page on a stand-in dashboard runtime with v1's demo person (`node compare/build-v1.mjs`).
- [x] `scripts/build-demo.mjs`: the same demo person as v2 data (`src/model/demo.json`).
- [x] `npm run compare`: v1 and v2 side by side per place, phone and desktop, plus a text report (headings, key numbers).

## 3. Numbers like v1
- [x] Category.paysAccountId (optional, additive): a card's charges on the bank. Covered by the card file → own money
      moving and left out of Activity; not covered → "Card (no details)" spending. Reconciled after every import.
- [x] Demo numbers in v2 equal v1's (net worth, period card, categories, bills, limits, calendar).

## 4. Screens in v1's design
- [x] Styles: v1's tokens, glass, cards, rows, bars, tables, pills (src/styles).
- [x] Frame: header (title / period pill / eye / gear), tab bar with the lens spring (bottom on phones per d36, in the
      header from 700px), as-of line, Show hidden sections, slim header, skip link, scroll memory, folds.
- [x] Period panel: v1's choices, Compare with, Done, stays open.
- [x] Home, Spending, Budget, Calendar, Activity exactly as the reference.
- [x] Privacy blur like v1.

## 5. v2 abilities placed in v1's design (doc table)
- [x] Settings page (gear), Undo message, Activity select bar with Change type (saves) and Edit, Import pill,
      limits editing, notes editing, holdings Add, rules offer, welcome back. (Demo in Settings waits for the owner's answer.)

## 6. Finish
- [x] Screen tests rewritten for the new screens; sweep; compare report clean or listed for the owner.
- [x] Publish, roadmap, backup.

## Differences left for the owner (from `npm run compare`, 12 Oct 2026)
- Phone: the tab bar sits at the bottom (d36; v1's own note says it was on top only because the dashboard frame couldn't pin it), so "Data as of" moves under the title.
- Header: a gear (Settings) where v1 has its Demo button.
- Budget: the "Card purchases not yet charged…" sentence shows whenever there's a card account (v1 hid it in demo mode).
- Calendar: the month name is a heading (for screen readers); it looks the same.
- Holdings have no note field yet; desktop has no list-and-detail split (neither did v1).

## the owner's answers (6 Nov 2026)
- Phone tab bar stays at the bottom.
- Keep both buttons: v1's Demo button is back beside the gear (demo person in memory only; nothing saved; import, backup
  and restore hidden in demo). On phones the four round buttons push the period to its own row under the title (option A).
- The "Card purchases not yet charged…" sentence keeps showing whenever there's a card account.

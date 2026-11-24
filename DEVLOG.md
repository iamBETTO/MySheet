# MySheet — Dev log

The technical side of the roadmap. The roadmap (Project Roadmaps → MySheet) says in plain words what the owner can do or
see; this file keeps how it was built, what was tested and what to watch out for (CLAUDE.md rule 25). Newest first.
Each entry names the roadmap card it belongs to.

## 24 Nov 2026 — Made ready to go public (`ms-v2-25`)
- The owner chose to publish the website from this repository instead of a separate one, so it becomes public. Every
  personal detail was removed first (names, amounts, facts about real data, links to private pages); examples in
  texts and tests are made up. The old "Roadmap text before 13 Oct 2026" archive was dropped.
- History restarted from this clean copy, so no earlier version is public. The full old history is kept privately
  (project files, `mysheet-private-backup/`, and the bundle copy in the Claude store).
- `scripts/site.mjs` now prepares the `gh-pages` branch; the site is live at https://iambetto.github.io/MySheet/.
- Seen once in the full run: `website.spec.ts` "changes are saved on the device and survive a reload" failed
  (setting not checked after reload), then passed 40 of 40 on repeat. Likely a timing race; watch it.
- Roadmap: decisions ms-d64 (website from this public repository, nothing personal in it), ms-d65 (work goes
  straight to main), ms-d66 (placeholder icon stays for now). Offline App stays In progress: phone check and the
  Claude page are left (plan step 5).

## 10 Nov 2026 — Offline App, steps 1–3 (`ms-v2-25`, decision ms-d63)
- `plans/offline-app.md`. Moved from Someday into v0.3 so testers need no Claude account; Google Drive backup dropped.
- `src/storage/deviceStore.ts`: IndexedDB database `mysheet`, object store `docs`, key = document name (the same names
  the Claude store uses under data/users/<id>/, so a backup moves between them unchanged). Each request is its own
  transaction, resolved on `oncomplete`. `connect()` uses it when `runtime()` is null and asks
  `navigator.storage.persist()`; with no IndexedDB the screen says the browser won't let MySheet save (`frame.noStorage`).
  `savesOnDevice()` tells the screens which place they're in.
- `downloads.ts`: outside Claude, a backup is an ordinary download (detached link + object URL).
- `src/state/backups.ts`: `lastBackup` moved here from BackupCard (same browser-storage key), `saveBackup`,
  `snoozeBackupReminder` (7 days), `backupDue` (none yet or >30 days). `BackupReminder` on Home, website only, once
  there are transactions: "Back up your data" with "Download a backup" and "Not now".
- `public/`: `manifest.webmanifest`, icons (a plain placeholder: three rising bars, for the owner to approve), `sw.js`
  (network first, saved copy when offline; MySheet's own files only). Registered in `main.tsx` only outside Claude and
  only in the top window. `index.html` links them; `artifact.mjs` drops them from the Claude page.
- `scripts/site.mjs` (`npm run site`): `dist/` without `artifact.html`, plus `.nojekyll`, into `site/` (ignored) for the
  public repository iamBETTO/mysheet-app.
- Known: the offline cache keeps old hashed asset files after updates (a few hundred KB per release); prune later.
- Checks: `tests/e2e/website.spec.ts` (saved across reloads, reminder and download, offline after one visit, manifest,
  no offline copy inside Claude); `shell.spec.ts`'s "open it in Claude" test became "a browser with no storage";
  `src/state/backups.test.ts`. 126 unit + 162 screen; compare unchanged.

## 10 Nov 2026 — Empty Screens, minimal revision (`ms-v03-empty`)
- The owner: the empty screens were walls of text and the welcome box looked pasted in. Now no explaining sentences:
  Home's empty cards reuse the real labels (`home.spentOf` with "—", `home.safeToSpend`, `home.moneyIn/Out`,
  `home.leftOver`) with "—" values and an empty `rm-pace-track`; charts are frames only (their aria label is the card
  title); Spending's cards and Budget's pace and limits cards say `parts.nothingYet`; Budget's bills card shows Safe to
  spend and Regular bills with "—"; Calendar drops its summary line; Activity says "Nothing yet".
- Welcome box: title and two buttons (`rm-welcome`, room above and between the buttons); "Explore the demo account"
  is now "Try the demo". Removed `home.welcomeNote` and every `*.notYet.*` text (rule 13).
- `empty.spec.ts` now also checks: no paragraph in the welcome box, no notes on Home, labels present, net worth "—",
  any note on the other screens under 80 characters.
- Tester form switched from the 10-question SUS to the 2-question UMUX-Lite, as UX_RULES rule 14 says.

## 9 Nov 2026 — Empty Screens (`ms-v03-empty`, decision ms-d62)
- `plans/empty-screens.md`. "No data yet" = `hasTransactions(data)` false (`src/logic/overview.ts`); an account or a
  holding alone doesn't count. Before: Home was a lone welcome box (shown only with no accounts, so an account with no
  transactions got every card with zeros), Budget showed "Safe to spend ₪0", Spending said "Nothing in this period".
- Home: the welcome box (now `Welcome`) above the hero and the arranged cards; `emptyCards` gives each card its title
  and a "shows here after your first import" line. Net worth shows "—" until there is an account or a holding; its
  change line is hidden. What you have keeps v1's "Nothing added yet ₪0" rows (a true zero); the bank row shows "—".
- `LineChart` with no series draws only its frame (grid and month axis, no money labels, no tap target), used by
  Home's two charts with the last 12 months.
- Spending and Budget: same cards in the person's arrangement, one line each; Budget keeps "Add a limit". Spending's
  comparison sentence is hidden. Calendar: the summary line says spending will show on each day. Activity: no
  "0 transactions" count and no row hint.
- 12 new texts, each with a Hebrew draft (the i18n check requires one).
- Checks: `tests/e2e/empty.spec.ts` (failed before the change): every screen's cards present, the "after your first
  import" lines, no made-up zeros, chart frames, axe; an account with no transactions is still "no data" while net worth
  shows its starting balance. `src/logic/empty.test.ts`. Full suite 124 unit + 154 screen; compare unchanged.

## 9 Nov 2026 — Groundwork for other languages released; Hebrew on hold (`ms-v2-13`, decision ms-d61)
- The owner: reviewing the Hebrew takes time, so steps 5–7 of `plans/translation.md` wait for the "Hebrew Language" card
  (Someday). Released as v0.3's "Ready for Other Languages": every text in `src/i18n`, amounts, dates and periods by
  language, right-to-left layout. English unchanged; `npm run compare` unchanged (10 known lines).
- The Hebrew drafts stay in the code with their checks. No Settings choice yet, so only data whose saved language is
  Hebrew would show them.

## 7 Nov 2026 — Translation, step 5: Hebrew drafts (`ms-v2-13`)
- All 527 texts drafted in Hebrew in `src/i18n/he/<part>.ts`, spread into `he.ts` like `en.ts`. Conventions: the
  same words for men and women ("אפשר ל…", "יש ל…", past tense where spelling is the same for both), buttons as nouns,
  slots kept, `two` only where Hebrew has its own word (יומיים, חודשיים). Word list at the top of the review tab.
- For the owner: tab "Hebrew wording" in the Vision and Research doc, English | Hebrew, one table per part in the same
  order as the files (invisible direction marks left out there). His corrections get copied back by order.
- `i18n.test.ts`: every English key has Hebrew, with the same set of slots (a plural's forms counted together, so
  "יום אחד" may leave out {n}). Replaces the English-fallback check, which had no Hebrew-less key left to test.
- Bug found in the screenshots: right to left, a value put in a slot (an English category in a Hebrew list) wasn't
  isolated, so "Eating out" was split across the sentence. `t`, `rich` and `list` now wrap each value in U+2068…U+2069
  when the page is right to left (as Fluent does); `text` (used by the money maths) is unchanged. Check in
  `rtl.spec.ts`, failing before the fix.
- Removed three texts nothing showed any more: `period.before`, `period.aboutSame`, `common.back`.
- `scripts/shot.mjs` finds the tab bar without its English name, so Hebrew screenshots work.
- Screens checked in Hebrew at 360px (Galaxy S24): every place, Settings, the period panel; everything fits.

## 7 Nov 2026 — Removed unused comparison helpers
- `src/logic/compare.ts` (`previousRange`, `changeText`) and its tests removed with the owner's OK. Only their tests used
  them since 12 Oct 2026, when Home and Spending moved to v1's "Compare with" and amount changes. Git keeps them.

## 7 Nov 2026 — Translation, step 4: right to left (`ms-v2-13`)
- Hebrew screenshots of every screen at 360px (Galaxy S24) and 1280px: layout, tab bar, two columns, docked sheet,
  sheets, period panel, Activity's table and progress bars already mirrored correctly (styles were mostly start/end;
  "‹" and "›" mirror by themselves in right-to-left text).
- Charts: `svg.chart { direction: ltr }`, and each label is wrapped in a Unicode right-to-left isolate (U+2067…U+2069)
  when the page is right to left (`chartText` in `parts/charts.tsx`). Without it the amount labels, which carry
  direction marks, anchored on the wrong side and ran into the plot.
- Calendar's short Hebrew amounts: no space before the sign, same direction marks as `formatShekels`, so "₪3.9k" fits
  and the sign sits left of the number like everywhere else.
- "→" (recent imports, rules) is now `common.arrowTo`, so Hebrew can use "←".
- Bug, English too (since v0.2's Arrange): `useDragOrder` measured the row as the tile's parent, Arrange's wrapper,
  which is `display: contents` (width 0), so every card counted as full width and a card dropped beside another never
  moved; only up/down worked. Now it measures the nearest ancestor with a width. Side by side, "before" is to the right
  in right-to-left.
- Checks (each fails without its fix, checked by building without it): `tests/e2e/rtl.spec.ts` (direction, tab bar
  order, Hebrew amounts and dates, chart labels clear of the plot, calendar amounts fit on a Galaxy S24 with the demo
  person, right-to-left drag) and a side-by-side drag test in `arrange.spec.ts`. 127 unit + 146 screen checks pass;
  `npm run compare` unchanged.

## 6 Nov 2026 — Translation, step 3 (`ms-v2-13`, decision ms-d60)
- `src/i18n/text.ts`: the plain part (`text(lang, key)`), usable from `src/logic` and `src/model`; `src/i18n/index.ts`
  adds the current language (`t`, `rich`, `list`).
- Language as a last argument, English by default, so every English output and test is unchanged: `formatDay`,
  `formatTimestamp`, `formatWeekday`, `v1Date` (+ `DateStyle`, `weekdayHeads`), `monthName`, `resolvePeriod`,
  `indexCategories` (no-category name), `monthNow` / `limitCheck` ("All spending"), `formatShekels` (Hebrew: sign
  after the number, RLM/LRM marks, no-break space; the owner chose this, ms-d60), `hiddenAmount`, `parseBackupFile`,
  `readLines` (row problems). Other languages use Intl with `timeZone: 'UTC'` from the date's digits.
- `src/ui/format.ts` binds these to the current language; screens import them from there. Counts use `formatNumber`.
  Set-aside labels (`model/salvage.ts`) use the language of the data's own `settings.locale`.
- `deltaText` now uses `formatShekels(…, { signed })`; same English output.
- Not used by the app, only by tests: `previousRange` and `changeText` in `src/logic/compare.ts` (listed for the owner).
- Seen in a Hebrew screenshot: the calendar's short amounts ("3.9k ₪") cut off at 360px; for step 4.
- Checks: new `src/logic/language.test.ts`; 127 unit + 139 screen checks pass; `npm run compare` unchanged.

## 6 Nov 2026 — Translation, steps 1–2 (`ms-v2-13`, decision ms-d58, `plans/translation.md`)
- `src/i18n/`: `t(key, values)`, `rich(key, parts)` for sentences with elements in their slots, `list()` for "A, B
  and C" (Intl.ListFormat, en-GB so English keeps v1's no-comma form), plural forms via Intl.PluralRules (Hebrew:
  one/two/other, checked). Language = the person's own saved `settings.locale` (`src/state/language.ts`), also in
  demo; `<html lang dir>` follows it. No change to saved data.
- About 500 English texts moved into `src/i18n/en/<part>.ts` (frame, parts, notice, home, spending, budget, calendar,
  activity, sheets, settings, backup, importing, arrange, common). Local variables named `t` were renamed (`tx`,
  `msg`, `other`, `sq`) so they don't hide the translate function. Kind names (`KIND_LABEL`, `ACCOUNT_KINDS`,
  `HOLDING_KINDS`, `PILL`, note colours) now hold keys. BackupCard keeps a `restored` flag instead of matching its
  own English message. ImportSheet reuses `ACCOUNT_KINDS`.
- Left for step 3: text made in `src/logic` and `src/model` (period labels, `NO_CATEGORY`, "All spending", parse and
  backup problems, set-aside labels) and number/date formats.
- Checks: 123 unit + 139 screen checks pass with no test changed; `npm run compare` unchanged.

## 6 Nov 2026 — Arrange Spending and Budget (`ms-v3-01`, decision ms-d57)
- `PageId` gains `spending` and `budget` (`PAGE_IDS` in `src/model/types.ts`, used by validation); their defaults in
  `DEFAULT_LAYOUTS` follow v1's order. Saved data keeps its shape: `settings.layouts` only accepts two more page names,
  every saved file stays valid, so no version step (format version stays 2).
- New `src/ui/ArrangedCards.tsx`: a page's tiles from its layout plus "Arrange <page>" / "n cards hidden", or Arrange
  mode. Home moved onto it (no visible change); Spending and Budget use it. Fixed on top, outside arranging: Spending's
  comparison sentence, Budget's month-start setting. The cards lost their own `half` class (the tile carries width).
- Spending's pair is two half cards (the owner's choice); v1's `.rm-grid` is gone with it. Known difference from v1
  (rule 24): from about 700px to 1100px v1 shows the pair side by side; tiles pair only from 1100px. The owner: OK.
- Checks: defaults and per-page layouts (unit); arranging Spending and Budget, saved separately with Undo, a seeded
  layout loading, the pair side by side at 1280px (screen). `npm run compare`: no new differences. 119 unit + 139
  screen checks pass.

## 6 Nov 2026 — v0.2 finished (`ms-v2-10` Released)
- Activity hint gains "Select one to edit." (the owner: as short as possible). The owner's strict minimalism rule and its
  reason added to the top of `UX_RULES.md`. In and out's spoken summary no longer mentions the Bank balance button.
- The owner's phone test results are in `plans/phone-hebrew-a11y.md`. 117 unit + 134 screen checks pass.

## 6 Nov 2026 — the owner's phone test: period panel and dragging (`ms-v2-10`)
- Period panel closed when scrolling: it closed on any `pointerdown` outside it, and every touch scroll starts with one.
  Now `click` outside (a real tap), Escape or Done. Check: touch swipe keeps it open, a tap closes it.
- Dragging felt "clunky and inconsistent". New `src/ui/useDragOrder.ts`: the held tile follows the finger (transform
  from its untransformed layout box), the order changes only when the held tile's middle passes another tile's middle
  in reading order (full-width tiles by height alone), the others slide (FLIP, 200 ms; none with Reduce Motion), and
  a frame loop scrolls near the edges (above the phone tab bar). Found while testing: reordering moves the held tile's
  element and Chrome fires `lostpointercapture`, after which the handle hears no more moves; the finger is now
  followed with window listeners (made once, kept in a ref, removed on release and on unmount). Latest order and
  callbacks live in a ref for those listeners. Check: a 24-step finger drag keeps the card within 2.5px of the
  finger and its place never goes backwards.

## 6 Nov 2026 — Calendar numbers at large text (`ms-v2-10`, the owner's phone test)
- The owner, with a large font on his Android phone: "The calendar doesn't show the numbers anymore." This confirms Chrome
  on Android zooms the page with the OS font size (so the page gets narrower). Below 340px day amounts had been hidden.
- He chose short numbers in the grid: below 340px `.amt-tiny` ("350", "4k", "12k", no ₪; exact in the day card);
  below 260px the page gutter is 8px, the calendar card 6px, day boxes 1px, and weekdays one letter (S M T W T F S).
  Checks at 280px and 240px in `tests/e2e/android.spec.ts`.

## 6 Nov 2026 — Set aside what can't be read (`ms-upkeep`)
- `src/model/salvage.ts`: maps each `validateAppData` problem path to the smallest record around it (transaction,
  transfer, valuation, list item, budget limit, import record, page layout, month; a bad setting goes back to its
  default; a broken section resets) and takes it out, deepest and highest index first; repeats until valid (max 50
  rounds). Never cuts down data from a newer format (`settings.schemaVersion` problem → null).
- `repository.loadKeeping` (the app's load) uses it; `loadAll` stays strict. Copies of set-aside records go to the
  store document `setaside` (`{ items: [{ where, label, why, record, found }] }`, once each); the originals stay in
  their documents until that part is next saved. Not in backup files yet.
- `state/data.ts`: `setAside` signal + `dismissSetAside`; the error log gets one line listing what was set aside.
  `src/ui/SetAsideNotice.tsx` on Home (also on the empty welcome), calm wording with a next step; hidden in demo.
- Checks: `src/model/salvage.test.ts` (5), repository test, e2e in `extras.spec.ts`. 117 unit + 127 screen pass.

## 6 Nov 2026 — Bug: one empty date hid all of a person's data (`ms-upkeep`)
- Found on Android: a holding added while the date box was empty made `HoldingSheet` save `{ date: "" }`, and on
  the next load `asAppData` threw, so the app showed none of the data.
- Fixes: `HoldingSheet` refuses a value without a valid date ("Pick the date of this value."); `commit()` now runs
  `validateAppData` on the new data and refuses (error log + problem toast, nothing changed) anything that wouldn't
  load again — a safety net for every screen. Checks: `src/state/data.test.ts`, e2e in `extras.spec.ts`.
- The owner OK'd the follow-up the same day: see "Set aside what can't be read" above.

## 6 Nov 2026 — Phone, Hebrew and accessibility testing, my part (`ms-v2-10`)
- The owner uses Android. New `tests/e2e/android.spec.ts` (Galaxy S24 profile, run in the phone project only) and
  `tests/e2e/hebrew.spec.ts` (fixture `tests/fixtures/demo-hebrew.json` from `scripts/build-hebrew-demo.mjs`).
  `scripts/shot.mjs` gained `DEVICE=` and `DATA=`. Notes and open questions: `plans/phone-hebrew-a11y.md`.
- 360px fixes: `.rm td.desc { max-width: 0; width: 100% }` below 560px (was 7.5rem; the table overflowed by 25px);
  calendar day boxes get 2px side padding and -0.02em letters below 400px so "₪350" / "₪3.9k" fit at 12px.
- Hebrew: the name's own `<bdi dir=auto>` is now the element that cuts with "…" (td.desc, bars, Settings rows,
  import cells, notes), with `text-align: -webkit-match-parent; match-parent` so the column keeps one alignment.
- Large text: sources disagree on whether Chrome Android zooms pages with the OS font size (blink-dev PSA, M113: yes;
  Tumath, Jan 2026: no). Below 340px: title 20px and no min width, 4px button gaps, bottom bar inset 6px, table cells
  3px, Description heading may cut, Budget limit rows stack (bar, then amount), calendar day amounts hidden (colour +
  day card carry it), `Money trimWhole` drops ".00" on whole amounts in Activity (full amount kept for screen readers).
- Screen readers: fold buttons use `aria-labelledby="<id>-fold <id>-h"` ("Hide Bank balance"); chevrons use
  `content: "›" / ""` so they have no spoken text.
- Touch drag check: CDP `Input.dispatchTouchEvent`; Chrome drops a tap that comes right after a touch gesture, so the
  check repeats the Done tap until it lands (a person is never that fast).
- 109 unit + 123 screen checks pass; compare shows only approved differences. Published as version 16.

## 6 Nov 2026 — Arrange Your Pages: Home (`ms-v2-24`, decision ms-d51)
- Data format 2 (`SCHEMA_VERSION`, the owner's OK under rule 17): `settings.layouts: { home?: { cards: CardPlace[] } }`,
  `CardPlace = { id, width: 'half'|'full', hidden }`. `src/model/migrate.ts` upgrades version 1 settings (adds
  `layouts: {}`): `loadAll` upgrades and writes the settings back once valid; `parseBackupFile` upgrades older backups
  and refuses only newer ones. Demo person rebuilt at version 2 (`scripts/build-demo.mjs`).
- Logic `src/logic/layout.ts`: `DEFAULT_LAYOUTS.home` (v1 order; glance, kpis, flow, balance half; have full),
  `resolveLayout` (saved + default: unknown ids dropped, duplicates skipped, new default cards inserted after the card
  they follow), `moveCard`, `stepCard` (among shown cards), `setCardWidth`, `setCardHidden`, `isDefault`,
  `setPageLayout` (the default is saved as no entry, so later default changes reach it).
- Screen: Home builds `cardsById` and renders `layout` in `.tile half|full` wrappers; "Arrange Home" + "n cards hidden"
  under the cards. `src/ui/Arrange.tsx`: draft in component state; Done → one `commit` ("Home arranged", Undo);
  Cancel; Reset to original. `.arrange` is `display: contents` so tiles are grid items of `.rm-page`.
  Handle: pointer events with capture + `touch-action: none`, `elementFromPoint` → `[data-tile]`, edge auto-scroll;
  ArrowUp/ArrowDown on the handle; `aria-describedby` hint; `role=status` messages ("X: position n of m.").
- Tests: `src/model/migrate.test.ts`, `src/logic/layout.test.ts`, repository upgrade + backup upgrade tests,
  `tests/e2e/arrange.spec.ts` (buttons, hide/show, reset, Undo, saved doc, loading a saved layout, Cancel, keys,
  drag, width on computer, phones same order without the width button). 109 unit + 116 screen checks pass.

## 6 Nov 2026 — Computer layout: two columns, details beside the list (`ms-v2-16`)
- The owner chose (from mockups) two columns on wide screens and Activity's details beside the list.
- From 1100px (`src/styles/v2.css`, `src/ui/useWide.ts` with the same breakpoint): `.rm` max-width 880 → 1240px;
  `.rm-page` is a 2-column grid; every child spans both columns unless it has class `half`. Rows stretch, so a pair
  lines up. Half cards now: Home glance, kpis, flow, balance; Spending moves, places; Budget pace, bills; Calendar
  month, day. Below 1100px nothing changes (v1's column). Step 2 (arranging pages) will replace the fixed `half`
  classes with the saved layout.
- Docked sheet (`Sheet docked`): opened with `show()` (not modal), focus to its first field, Escape handled by
  `onKeyDown` (a non-modal dialog gets no cancel event), no outside-click close. CSS: the page grid becomes
  `1fr 420px` when it holds `.sheet.docked`; the sheet is sticky at 190px (under the sticky header). Activity passes
  `docked={useWide()}` and keys the sheet by transaction; closing returns focus to `#tx-list`.
- `scripts/shot.mjs`: `FULL=1` (full page), `CSS=…` (inject styles for mockups), `CLICK=a||b` (clicks before the shot);
  an absolute output path is used as is.
- Tests: new `tests/e2e/layout.spec.ts` (side by side at 1280, single column at 1024, docked panel keeps the list
  usable, Escape and focus, phone keeps the modal sheet). 98 unit + 105 screen checks pass.

## 6 Nov 2026 — Demo button back, period on its own row on phones (`ms-v2-22`)
- The owner's answers to the parity questions: tab bar at the bottom on phones; keep BOTH the Demo button and the gear;
  keep the card sentence on Budget. Recorded in `plans/v1-parity.md`.
- Demo mode (`src/state/data.ts`): `demoOn`, `shownData` (computed: demo person or own data), `toggleDemo()`. A fresh
  `structuredClone` of `src/model/demo.json` each time; `commit`/`undo` change it in memory and never call `persist`.
  Your own Undo list is put aside and restored on the way back. `resetForDemo()` in `view.ts` clears filters, calendar
  month/day, Back and the Import sheet. `<Screen key>` remounts screens so selections never carry across.
- In demo: Import buttons, the Import sheet and the Backup card are not shown (a restore would overwrite your real data).
  Settings shows a "Demo account" card with "Back to my account"; the banner has the same button.
- First run with no accounts: Home offers "Explore the demo account" next to Import (alpha checklist item 2).
- Page size: the demo person adds ~750 KB (3,690 lines, already compact JSON); `dist/artifact.html` is ~1 MB.
- Header on phones (< 700px): four 44px round buttons left the period ~30px wide ("L." at 320px), caught by the 320px
  reflow check. The owner picked option A: `.rm-actions { display: contents }`, a `::after` row break, period `order: 3`.
- Workspace note: the pinned Playwright (1.56.1) expects browser build 1194; this workspace had 1243, so the session
  linked 1194's paths to the installed build (no project change).
- Tests: new `tests/e2e/demo.spec.ts` (switching, nothing saved, Settings in demo, first run, period never cut short).
  98 unit + 101 screen checks pass; compare: only the approved differences.

## 13 Oct 2026 — Roadmap cards in RSI's voice (`ms-upkeep`)
- The owner pointed to the Star Citizen (RSI) roadmap's release view as the model. All 74 cards renamed to short Title
  Case names with one sentence each, starting with the action ("Adding…", "Showing…"), like RSI's cards. Rule 25 updated.

## 13 Oct 2026 — Roadmap in plain language (`ms-upkeep`)
- Every roadmap card, decision and log line rewritten in everyday words; jargon titles renamed (e.g. "Data model" →
  "How your data is organised", "App shell" → "The five pages and Settings", "Design tokens and themes" → "Light and
  dark mode").
- New rule 25 in CLAUDE.md.

## 12 Oct 2026 — v2 takes v1's design (`ms-v2-22`, decision `ms-d47`)
- Reference: Claude Docs doc "MySheet v1 — Design Reference", `V1_REFERENCE.md`, CLAUDE.md rules 23–24,
  plan `plans/v1-parity.md` (all ticked; differences left for the owner listed there).
- Compare tool: `npm run compare` = `compare/build-v1.mjs` (v1's page on a stand-in dashboard runtime with v1's demo
  person) + `scripts/compare.mjs` (serves on 127.0.0.1:4190, clock fixed at 2026-10-08, 5 places × phone 390 / desktop
  1280, screenshots and `compare/out/report.md` listing text only in v1 or only in v2).
- Demo person as v2 data: `scripts/build-demo.mjs` → `src/model/demo.json` (bank opening balance = first month's end
  balance minus all first-month lines; every card line also gets a bank "CARD CHARGE").
- Numbers like v1 (`src/logic/budget.ts`, `overview.ts`, `worth.ts`, `periods.ts`): "today" = the newest transaction
  day; bills = 4 of last 6 months, spread < 45%, ≤ 45 days since the last; safe to spend = bank − bills due by the end
  of the budget month; net worth = bank + holdings' latest value − debts; change = bank vs the end of last month.
  `budget.test.ts` asserts v1's demo golden values.
- Card charges (`src/logic/cardCharges.ts`): optional `Category.paysAccountId` marks the bank-side types.
  `reconcileCardCharges` runs after every import: a bank charge on a day the card file covers → the transfer type
  (left out of lists); outside it → "Card (no details)" spending.
- Screens: `src/styles/tokens.css` + `v1.css` (v1's CSS, renamed variables, no `!important`) + `v2.css`; the header
  glass is on `::before` because `backdrop-filter` traps the fixed phone tab bar. Tab "lens" spring via WAAPI
  (sampled cubic-bezier(.34,1.4,.64,1), 0.45 s, pressed flat at the ends). Chart month ticks use d3 `scaleUtc().ticks()`
  like v1.
- Tests: e2e specs rewritten for v1's markup (rows = `region 'Transactions, scrollable' tbody tr`; periods via
  `choosePeriod`). axe and layout checks wait for running animations first (sheet fade-in and the lens overshoot made
  them flaky). 98 unit + 94 screen checks pass.
- Published as MySheet v2 version 12; code history backed up as 4 parts in `data/users/me/devbackup/parts`.

## 12 Oct 2026 — v2 foundation (`ms-v2-ground`, `ms-v2-01` … `ms-v2-20`)
- Stack (decision `ms-d44`): TypeScript strict, Vite, Preact + Signals, d3 modules, Vitest, Playwright, axe-core.
  Built page inlined by `scripts/artifact.mjs` into `dist/artifact.html`, published as the Claude artifact "MySheet v2"
  (capabilities db, user, downloads).
- Storage (decisions `ms-d45`, `ms-d46`): the artifact's private per-person store under `data/users/<id>/`, reached
  only through `src/storage/`.

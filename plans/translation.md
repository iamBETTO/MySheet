# Plan: Translation and Right-to-Left Support (`ms-v2-13`, decision ms-d58)

The owner, 6 Nov 2026 (Vision and Research doc, tab "v0.3 plan"): English and Hebrew first, because together they cover
right-to-left and left-to-right; more languages later. Research is in that tab; no new libraries (rule 11): the
browser's `Intl` already formats Hebrew amounts ("1,234.50 ₪", sign after), dates ("6 בנוב׳"), plurals (one, two,
other) and knows the week starts on Sunday.

## Shape
- Language = the saved `settings.locale` ('en-IL' today; 'he-IL' for Hebrew). No change to saved data. New data takes
  the phone's language the first time. The demo person follows the person's own language.
- `src/i18n/`: `en.ts` holds every English text under a stable key; `he.ts` the Hebrew ones (missing keys fall back
  to English while it's being written); `index.ts` gives `t(key, values)` for text and `rich(key, parts)` for text
  with bold words or amounts inside. Whole sentences with named slots, never pieces glued together; counts choose
  their plural form with `Intl.PluralRules`.
- Formatting (amounts, dates, period names) stays in plain functions in `src/logic/` that take the language as an
  argument, English by default (rule 8); `src/ui/format.ts` gives the screens the same functions in the current
  language. In Hebrew amounts read "1,234.50 ₪" (the owner, decision ms-d60); the currency never follows the language.
- Right-to-left: `<html lang dir>` follows the language. Layout, arrows, the bottom bar's order, progress bars and
  calendar days flip; numbers, charts, clocks and check marks don't (Material Design, Wikimedia).
- Untouched: names the person typed (categories, accounts, places, notes) are their data and never translated.

## Steps (screens look exactly the same in English until step 6)
- [x] 1. Foundation: `src/i18n`, the current language, `<html lang dir>`. Unit tests for slots, plurals in both
       languages and the English fallback.
- [x] 2. Move every text into `en.ts`, screen by screen: frame and parts, Home, Spending, Budget, Calendar, Activity,
       Settings and its sheets, Import, Arrange, messages and Undo labels. The existing screen tests prove nothing
       changed. (Done 6 Nov 2026: about 500 texts in `src/i18n/en/`, one file per part; `npm run compare` unchanged.)
- [x] 3. Amounts, dates, period names and counts follow the language (English output unchanged, checked). Also the
       few texts made outside the screens: period names ("Last 12 months", "The period before"), "No category",
       "All spending", file-reading problems, backup problems and the names of set-aside entries.
- [x] 4. Right-to-left pass: left/right styles become start/end; what flips and what stays, as above. Screenshots.
       Found in step 3: the calendar's short Hebrew amounts ("3.9k ₪") are cut off in a day box at 360px. (Done 7 Nov
       2026: most styles were already start/end; charts stay left to right with each Hebrew label isolated; "→" is a
       text; the calendar's short Hebrew amounts drop the space; dragging side by side follows the reading direction.)
- [ ] 5. Hebrew texts: Claude drafts `he.ts`; the owner checks them (a list to read through). (Drafted 7 Nov 2026: every
       text, in `src/i18n/he/`; the owner's list is the "Hebrew wording" tab of the Vision and Research doc.)
- [ ] 6. A language choice in Settings (English / עברית).
- [ ] 7. Checks in both languages: every screen at phone and computer size, accessibility, reflow at 320px; compare.
       Publish; roadmap card and DEVLOG.

**On hold since 9 Nov 2026 (the owner, decision ms-d61):** steps 5–7 wait for someday (roadmap card "Hebrew Language").
v0.3 ships steps 1–4, the groundwork. The Hebrew drafts stay in `src/i18n/he/` with their checks, unseen: nothing
offers Hebrew until step 6. To pick it up: read the owner's changes in the review tab (it was at revision 3 when
drafted), copy them into `he/`, then steps 6 and 7.

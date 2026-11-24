# Phone, Hebrew and Accessibility Testing (`ms-v2-10`, 6 Nov 2026)

The owner uses Android. My part was done on an emulated Galaxy S24 (360px, touch); his part is the checklist below.

## Done
- [x] Android phone: every place, taps, period panel, transaction sheet, Arrange Home dragged with a finger.
      Fixed: calendar amounts cut to "₪3…" (360px); Activity's table 25px wider than its card (Amount out of view).
- [x] Hebrew next to English (fixture `tests/fixtures/demo-hebrew.json`): order of mixed names ("LIME קורקינט",
      "סלקום 052"), Hebrew search, amounts never flipped. Fixed: long Hebrew names were cut at their beginning;
      Hebrew and English names now line up in the same column.
- [x] Large text: Chrome on Android may zoom the whole page with the phone's font size (sources disagree, so the owner's
      phone decides). Checked at 280px (about 130% on a 360px phone). Fixed: gear wrapping, calendar amounts (later shown short, "350" / "4k", after the owner's phone test), Budget
      rows widening the page, Activity amounts (whole amounts drop ".00" below 340px; screen readers hear the full one).
      At 180px (200%) the bottom bar's labels still crowd: accepted, since WCAG asks for 320px.
- [x] Screen readers (accessibility tree of every place): fold buttons now say which card ("Hide Bank balance");
      the › arrows are no longer read aloud.
- [x] Usability review against Nielsen's 10 heuristics (phone screenshots of every place, Settings, sheets).
      Fixed: Settings' grey lines cut off their dates (they now wrap).

## For the owner to decide (changes to v0.1's wording or behaviour, rule 23)
1. ~~Edit hint~~ — The owner: as short as possible; added "Select one to edit." (done).
2. ~~In and out's screen-reader summary points to "Show the numbers under Bank balance"~~ — The owner: delete it (done).

## the owner's part (about 15 minutes on his Android phone)
See the checklist sent in chat (6 Nov 2026); his findings get a check first, then a fix (rule 21).

## the owner's phone test (6 Nov 2026) — done
Five pages fine; period panel closed on scroll (fixed); transaction edit fine; calendar fine at normal size, numbers
missing at large text (fixed: short numbers); Hebrew search fine; dragging clunky (rebuilt, "decent enough");
TalkBack skipped for now. Card done: v0.2 finished.

# Plan: Arrange Your Pages (`ms-v2-24`, decision ms-d51)

The owner, 6 Nov 2026: "make the home page a dashboard where you can move them around freely in grids". His answers:
snap to a grid (order + half/full width), phones follow the same order, hide cards and bring them back, reset to
default, other pages later; the layout is saved with his data (data format change approved, rule 17).

## Shape
- Saved: `settings.layouts: { [page]: { cards: { id, width: 'half' | 'full', hidden }[] } }`. A page that isn't in
  `layouts` uses its default. Unknown ids are dropped and new cards are added where the default has them, so adding a
  card in a later update never breaks a saved layout.
- Format version 1 → 2: the migration adds `layouts: {}`. Runs on load (and writes the upgraded settings back) and on
  restoring an older backup. The demo person is rebuilt at version 2.
- Screen: Home's cards render from the layout, each in a tile (`half` = one of two columns from 1100px; phones are
  one column in the same order). The net-worth line and welcome-back stay on top (not arrangeable).
- Arrange mode (v1 has no pattern, so the plainest one): "Arrange Home" button under the cards → each card becomes a
  title tile with a drag handle and buttons: Earlier, Later, Half/Full width, Hide. Hidden cards are listed with Show.
  Done saves (one change, with Undo), Cancel drops it, Reset puts the default back (still needs Done).
  Drag works with mouse and touch on the handle; the handle also moves with the arrow keys; a live message says
  where the card went (keyboard and screen readers, UX rule 3).

## Steps
- [x] 1. Model: `PageLayout` types, SCHEMA_VERSION 2, validation, migration (load + backup), demo person at v2. Unit tests.
- [x] 2. Logic `src/logic/layout.ts`: Home's default, resolve saved + default, move, width, hide, reset. Unit tests.
- [x] 3. Edit `setPageLayout` (settings doc) with Undo.
- [x] 4. Home renders from the layout in tiles; the fixed `half` classes go.
- [x] 5. Arrange mode: tiles, buttons, drag, arrow keys, live message, hidden list, Done / Cancel / Reset.
- [x] 6. Screen tests: arrange with buttons and with drag, hide/show, reset, undo, saved and reloaded, phone order,
       accessibility; full suite + compare; publish.
- [x] 7. Spending and Budget: see `plans/arrange-spending-budget.md` (6 Nov 2026).

## Notes after building (6 Nov 2026)
- The width button shows only where cards can sit side by side (from 1100px); on phones the note says so instead.
- Arrange mode moves focus to its heading when it opens; reordering puts focus back on the handle or button used,
  straight after the move (useLayoutEffect), so quick arrow presses all reach the same card.
- Dragging: while the pointer is over another tile, the dragged card takes that tile's place; the page scrolls near
  the top and bottom edges. A full-width card jumps to its own row while dragging, which can feel jumpy; halves are smooth.
- For the owner to decide later: In and out's screen-reader summary points to "Show the numbers under Bank balance",
  which is off if Bank balance is hidden.

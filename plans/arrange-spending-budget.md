# Plan: Arrange Spending and Budget (`ms-v3-01`, decision ms-d57)

The owner, 6 Nov 2026 (v0.3 plan, Vision and Research doc, tab "v0.3 plan"): reuse Home's Arrange on Spending and Budget;
Spending's "Where it went" and "Where it came from" become two half-width cards that start side by side.

## Shape
- `PageId` gains `spending` and `budget`; their defaults (v1's order):
  Spending: went (half), from (half), moves (half), places (half). Budget: pace (half), bills (half), limits (full).
- Saved data keeps the same shape: `settings.layouts` simply allows the two new page names. No version step is needed:
  every saved file stays valid, and a page that isn't saved uses its default.
- What stays fixed on top, outside the arranging: Spending's comparison sentence; Budget's "Your month starts on day".
- One shared part renders a page's cards from its layout, with "Arrange <page>" and "n cards hidden" under them, or
  Arrange mode. Home moves onto it too, so the three pages behave the same and the code is written once.
- Known difference from v1: between about 700px and 1100px wide (tablets), v1 shows Spending's pair side by side;
  half cards sit side by side only from 1100px, so there they stack. The owner: OK (6 Nov 2026).

## Steps
- [x] 1. Model and logic: page names, defaults, validation. Unit tests.
- [x] 2. Shared part for arranged cards; Home moved onto it (no visible change).
- [x] 3. Spending and Budget render from their layouts, with Arrange buttons.
- [x] 4. Screen tests: arrange each page, saved and reloaded, defaults unchanged, accessibility; full suite + compare.
- [x] 5. Publish (app version 23); roadmap card and DEVLOG.

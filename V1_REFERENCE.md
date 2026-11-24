# v1 is the design reference

v2 must look, feel and behave like MySheet v1 (CLAUDE.md rules 23–24). Where to find v1:

- (The written doc "MySheet v1 — Design Reference" and the "MySheet v2 Data Model" doc were deleted by the owner on 6 Nov
  2026, once v2 matched v1. v1 itself, this file and the code — `src/model/types.ts` for the data — are the reference.)
- **v1 itself:** the Claude Dashboard artifact "MySheet v1"; its page is the
  database document `files/index.html` (read it with ArtifactData). Its styles (the `.rm-*` classes) are the source for v2's
  `src/styles/`.
- **Seeing v1 next to v2:** `npm run compare` renders v1 (from `compare/v1/`: the v1 page on a stand-in for the dashboard
  runtime, fed by fixed sample data) and v2 at phone and desktop size and writes pairs to `compare/out/`.

## What must stay as v1 has it
- The frame: title (Treasury on Home), period pill, eye, a third round button; glass tab bar with the spring "lens"
  (0.45 s, cubic-bezier(.34, 1.4, .64, 1), pressed flat at the ends); "Data as of …" line; slim header on phones; scroll memory.
- On phones v2's tab bar sits at the bottom (decision d36); everything else about it is v1's.
- Every card, its order, its words, its taps (see v1 itself). Liquid glass on controls only, solid cards for content.
- Numbers: money in and out exclude own-money moves; card purchases replace the bank's card charges; a bank card charge
  with no card file covering it counts as spending under "Card (no details)".

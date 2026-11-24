# Plan: Empty Screens (`ms-v03-empty`)

The owner, 9 Nov 2026: before the first import MySheet must look like itself, not like a different app. Today Home is a
lone welcome box, Budget shows made-up results ("Safe to spend ₪0, about ₪0 a day"), and Spending and Calendar say
"Nothing in this period" as if the period were empty. Research: an empty screen should say why it is empty, show what
will appear there, and give one clear way to start (Nielsen Norman Group, "Designing Empty States in Complex
Applications"). v1 never had an empty state, so this is new design, approved by the owner in chat (9 Nov 2026).

## Shape
- "No data yet" = no transactions at all (`hasTransactions` in `src/logic/overview.ts`). Accounts or holdings alone
  don't count: they don't make the totals and charts meaningful.
- Every screen keeps its usual cards, in the person's arrangement, with their titles. A card with nothing to show
  yet says in one line what will appear there "after your first import".
- No made-up zeros: a number that can't be worked out yet shows "—". Net worth is real as soon as there is an
  account or something you own.
- One way to start: Home's welcome box ("Import a file", "Explore the demo account") sits above the five cards.
  Other screens keep only their own usual controls (Add a limit, Add a note, Activity's Import a file).
- Charts show their empty frame (grid and months, no lines), the same height as later.
- New texts get Hebrew drafts too (the check requires it), unseen until the Hebrew card.

**Revised 10 Nov 2026 (the owner: "walls of text", minimal rule):** no explaining sentences. Each card keeps its real
labels with "—" where a number will be (This month: "— spent of —", Safe to spend; the period card: Money in, Money
out, Left over); list cards say "Nothing yet"; charts show only their frame; the welcome box is a title and two
buttons ("Import a file", "Try the demo"); net worth is "—" alone; Calendar has no summary line.

## Steps
- [x] 1. `hasTransactions`, with unit tests. Screen tests for the empty state first (they fail before the change).
- [x] 2. Home: welcome box, net worth, the five cards' empty versions, the chart frames.
- [x] 3. Spending, Budget, Calendar, Activity.
- [x] 5. Revision: labels and "—" instead of sentences (10 Nov 2026).
- [x] 4. Full suite, accessibility, reflow at 320px, compare; screenshots to the owner; publish; roadmap; DEVLOG.

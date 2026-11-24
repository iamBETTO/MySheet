# MySheet — Rules for working on this code

_Read this first, every session. Read it with `DEVLOG.md` (the technical history), `V1_REFERENCE.md` (v1's design: the spec for every screen), `UX_RULES.md` (design rules) and the Decisions on the MySheet tab of Project Roadmaps. Each rule is one line on purpose. Locked 12 Oct 2026 (decisions d44–d46)._

## Tech stack (locked)
- **Language:** TypeScript, strict mode. Types guard the shape of saved data.
- **Build:** Vite, then `scripts/artifact.mjs` inlines the build into `dist/artifact.html`, which is published as the Claude artifact "MySheet v2". Later the same build moves to GitHub Pages as an installable offline app.
- **Screens:** Preact, a tiny React-like library, with function components only. Never edit the page with raw DOM calls outside a component.
- **State:** Preact Signals in `src/state/`, changed only through the named actions there.
- **Storage:** the artifact's private per-person store (`db` capability, path `data/users/<id>/`), synced between the user's devices, reached only through `src/storage/`. Browser storage only for per-device conveniences.
- **Charts:** d3 modules (scales, shapes, formats), drawn inside components. Added when the first chart arrives.
- **Tests:** Vitest for money maths and data (`src/**/*.test.ts`), Playwright for screens (`tests/e2e/`), axe-core for accessibility.
- **Commands:** `npm run test` (unit), `npm run build` (typecheck, build, artifact page), `npm run e2e` (screens), `npm run check` (all three).
- **History:** Git, pushed to the private GitHub repository `iamBETTO/mysheet` (since 6 Nov 2026) after every finished step. As a second copy, `git bundle create --all` is still saved base64-encoded in the MySheet v2 artifact's private store (`data/users/me/devbackup/parts/<n>`, up to 200 KB of text each) at the end of a session. To restore: attach the GitHub repository and clone it (or, without GitHub, read the parts, join, decode, then `git clone` the bundle).
- **npm:** `.npmrc` sets `legacy-peer-deps` because of an npm bug with vitest's optional peers; versions are pinned exactly.
- All code uses this stack's normal patterns. Don't mix in another framework, language or style.

## How we work
1. **Plan before code.** Every roadmap entry starts with a short plan. A bigger feature also gets `plans/<feature>.md` with a checkbox for each step, ticked as it's done. The roadmap (Project Roadmaps → MySheet) is the source of truth.
2. **Understand before editing.** Before changing a file, state what it does, what depends on it, and what it assumes. Keep every function and data format other code relies on unless the change is planned.
3. **Audit before restructuring.** Never "clean up" by rewriting working code. First write a ranked report of the problems; restructure only the items the owner agreed to.
4. **Limits of autonomous work.** Without asking, fix only isolated bugs: wrong logic or syntax inside one function or component. Any change to architecture, file structure, data flow or a saved data format needs the owner's approval first, unless it's in a plan he already approved.
5. **Two-pass review before Done.** Pass 1 checks bugs, security and edge cases; pass 2 checks readability, dead code, naming and speed. Fix the isolated bugs (rule 4) and list everything else on the entry for the owner to decide.
6. **Small, reviewable commits.** One change per commit, with a message that says why. Never edit generated files by hand.

## Structure
7. **One job per file.** Data model, import, money maths, state, storage, screens and styles live in separate folders; a file that grows past about 300 lines gets split.
8. **Logic is separate from the screen.** Money maths (totals, budgets, safe to spend, pace) are plain functions in `src/logic/`: data in, numbers out, no page access. Screens only display results and call actions.
9. **One state store.** Preact Signals in `src/state/`, changed only through named actions, and every action can be undone.
10. **One set of design tokens.** Colors, spacing, type, radius and motion are defined once in `src/styles/tokens.css`; components use tokens only, each component is styled in one place, and there is no `!important`.
11. **No new dependencies without permission.** Never install a library, package or framework beyond the stack above without the owner's OK; write the small function instead. Pin exact versions.
12. **No silent failures.** Every caught error is shown to the user in plain words or written to the app's error log. An empty `catch` is allowed only with a comment saying why the error is harmless.
13. **No dead code.** Remove unused functions, styles, options and files in the same change that makes them unused. Git is the history, not copies.
14. **Clear names.** Whole words (`safeToSpend`, not `sv`), named after the thing the user sees.

## Data
15. **The app knows no person.** No names, categories, banks or amounts of any real person in the code; rules, categories and people are user data, editable in the app.
16. **No fixed dates.** Every period is worked out from today and from the data.
17. **Stable data formats.** Never change how saved data is shaped without a version number, a migration that upgrades old data, and the owner's OK. Export and restore always work.
18. **Untrusted text stays text.** Anything from a file or the user is shown as plain text, never as markup.

## Testing
19. **Nothing is Done until tested.** Every entry adds or updates checks. The full suite passes before publishing: unit tests, screen tests, a sweep of every screen, and accessibility checks (axe, tap sizes, reflow at 320px).
20. **Tests use fixed sample data.** Real data gets quick "does it load" checks only.
21. **Every bug gets a check first.** Write a check that fails before the fix and passes after it.

## UX
22. **Follow the UX rules.** Every screen follows `UX_RULES.md` and the UX standard (decision d39). Minimal means fewer things, never hidden or faint controls.
23. **v1 is the design reference.** v2 looks, feels and behaves like v1 (`V1_REFERENCE.md` and the v1 app itself); any change to v1's look or behaviour needs the owner's OK first (12 Oct 2026). New abilities use v1's existing patterns.
24. **Check against v1.** `npm run compare` puts v1 and v2 side by side at phone and desktop size; differences are fixed or listed for the owner before publishing.

## Roadmap
25. **Roadmap in plain words, RSI style.** Like the Star Citizen (RSI) roadmap: a short Title Case name and one plain sentence starting with what's being done ("Adding…", "Showing…", "Letting you…"); decisions and log lines in everyday words too; no file, tool or code names, no test counts, no decision codes. Technical detail goes in `DEVLOG.md`, newest first, naming the card (13 Oct 2026).

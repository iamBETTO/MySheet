# MySheet UX Rules

_From the UX research reference of 11 Oct 2026 (decision d41). Use with Nielsen's 10 heuristics, Apple HIG,
WCAG 2.2 AA (+ Israeli IS 5568), Laws of UX and no deceptive patterns (decision d39)._

## The core idea
The owner's rule (6 Nov 2026), and it is strict: **MySheet must be as minimal as possible.** It will end up managing much
of a person's life, and nobody wants to manage an app that manages their life; that defeats its purpose. Every word,
button and step must earn its place; when in doubt, leave it out or make it shorter ("Select one to edit", not a sentence).

Minimal means **fewer things**, never **hidden or faint** things. Cut content and decoration; keep labels,
navigation and clear signs that something can be tapped. (NN/g: hidden navigation cut discoverability by more
than 20%; weak signifiers cost 22% more time.)

## Rules
1. **Navigation:** 5 labelled places at most in the bottom bar. New life areas = opt-in modules behind one hub (d42).
   From 840px wide: the same places as a labelled side rail (right side in Hebrew). Never hide main places in a menu.
2. **Glass:** only on controls and navigation, never on content cards. Text on glass must pass WCAG 2 contrast
   (4.5:1 text, 3:1 icons/edges) over the worst background. Solid when Reduce Transparency / More Contrast is on.
3. **Touch:** targets 44×44 (24×24 is only the legal floor); whole rows tappable; every gesture or drag has a button too.
4. **Undo, don't ask:** every change can be undone (message + history). Confirm only for wiping data, with
   buttons named by the result.
5. **Money messages:** calm and non-judging, always with a next step. No shame, no alarm states, no streaks.
   "Safe to spend" always explains its sum. After a break, a welcome-back summary.
6. **Charts:** position/length first (bars, lines), no pies or donuts; label values directly; never color alone.
7. **Numbers:** tabular figures, right-aligned, time frame next to every number, rounded on overviews, exact on detail.
8. **Privacy eye:** hides every amount: charts, axes, calendar, labels, notifications; screen readers say "amount hidden".
9. **Hebrew/English:** money and user text isolated (bdi / dir=auto); start/end not left/right; digits never mirrored;
   Intl.NumberFormat (he-IL puts ₪ after the number); week starts Sunday; dates DD/MM in Hebrew.
10. **Keyboard and focus:** visible focus, never hidden under sticky bars (WCAG 2.4.11); Escape closes sheets;
    skip link; single-key shortcuts only if they can be turned off (WCAG 2.1.4).
11. **Motion:** 150–300 ms, only to explain a change; none with Reduce Motion; no idle animation.
12. **Speed:** edits feel instant (<0.1 s); show progress after 1 s; progress + cancel after 10 s.
13. **Data:** stays on the device, survives the browser (storage.persist, install), one-tap export/restore.
14. **Testing every release:** test bench (axe, sizes, reflow 320px) + heuristic review + 5-person test in small
    rounds + UMUX-Lite + VoiceOver/TalkBack/keyboard + 200% text in both languages.

## Weak or misused "laws" (don't cite as rules)
"7±2" (use Cowan's ~4 for memory across screens), Hick's law as "fewer options always", the 400 ms Doherty
threshold, Zeigarnik, the Z-pattern. Vendor numbers (Material 3 Expressive, Deque's 57%) are claims, not studies.

## Key sources
NN/g (heuristics, hamburger menus, flat UI, Liquid Glass critique, confirmation dialogs, response times) ·
Apple HIG Materials · Material 3 (navigation rail, bidirectionality) · WCAG 2.2 · W3C COGA · Parhi et al. 2006 ·
Hoober 2013 · Cleveland & McGill 1984 · Few · Tufte · Sicherman et al. 2016 (ostrich effect) · Epstein et al. 2015/2016 ·
Li, Dey & Forlizzi 2010 · Gray et al. 2018 · Mathur et al. 2019 · Sailer & Homner 2020 · Stanford credibility guidelines.

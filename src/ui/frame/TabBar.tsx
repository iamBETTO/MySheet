// v1's tab bar: five labelled places on glass, with the raised "lens" behind the current one. Changing place slides the
// lens with v1's spring (0.45 s, cubic-bezier(.34, 1.4, .64, 1)): it overshoots, then settles, but never leaves the bar;
// at either end it presses flat against the edge instead (the owner, 11 Oct 2026). No motion with Reduce Motion.
// On phones the bar sits at the bottom of the screen (decision d36); from 700px it sits in the header, as in v1.
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import { go, place, PLACES, type Place } from '../../state/view';
import { t, type Key } from '../../i18n';

const TITLES: Record<Exclude<Place, 'settings'>, Key> = { home: 'frame.tab.home', spending: 'frame.tab.spending', budget: 'frame.tab.budget', calendar: 'frame.tab.calendar', activity: 'frame.tab.activity' };

/** v1's icons, drawn as in v1. */
const ICONS: Record<Exclude<Place, 'settings'>, preact.JSX.Element> = {
  home: <><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></>,
  spending: <path d="M4 20V11M10 20V5M16 20v-7M21 20H3" />,
  budget: <><path d="M4 17a8 8 0 1 1 16 0" /><path d="M12 17l4-5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  activity: <path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />,
};

/** The point on a cubic-bezier curve for progress x (0–1): the spring, sampled. */
function bezier(x1: number, y1: number, x2: number, y2: number): (x: number) => number {
  return (x) => {
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 32; i++) {
      const cx = 3 * x1 * t * (1 - t) ** 2 + 3 * x2 * t * t * (1 - t) + t ** 3;
      if (cx < x) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return 3 * y1 * t * (1 - t) ** 2 + 3 * y2 * t * t * (1 - t) + t ** 3;
  };
}
const spring = bezier(0.34, 1.4, 0.64, 1);

export function TabBar() {
  const here = place.value;
  const nav = useRef<HTMLElement>(null);
  const lens = useRef<HTMLSpanElement>(null);
  const lensX = useRef<number | null>(null);
  const anim = useRef<Animation | null>(null);

  const placeLens = (animate: boolean) => {
    const bar = nav.current, el = lens.current;
    if (!bar || !el) return;
    const buttons = [...bar.querySelectorAll<HTMLButtonElement>('button[data-place]')];
    const cur = buttons.find((b) => b.getAttribute('aria-current') === 'page');
    if (!cur) { el.style.width = '0px'; return; }
    const last = buttons.at(-1)!;
    const min = buttons[0]!.offsetLeft, max = last.offsetLeft + last.offsetWidth, w = cur.offsetWidth, to = cur.offsetLeft;
    let from = lensX.current;
    if (anim.current && anim.current.playState === 'running') {
      try { from = new DOMMatrixReadOnly(getComputedStyle(el).transform).m41; } catch { /* Keep the last resting place as the start. */ }
      anim.current.cancel();
    }
    lensX.current = to;
    el.style.width = `${w}px`;
    el.style.transform = `translateX(${to}px)`;
    if (!animate || from === null || Math.abs(from - to) < 1 || !el.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const frames: Keyframe[] = [];
    for (let i = 0; i <= 45; i++) {
      let x = from + (to - from) * spring(i / 45), fw = w;
      if (x < min) { fw = Math.max(w * 0.8, w - (min - x) * 0.6); x = min; }
      else if (x + w > max) { fw = Math.max(w * 0.8, w - (x + w - max) * 0.6); x = max - fw; }
      frames.push({ transform: `translateX(${x}px)`, width: `${fw}px` });
    }
    anim.current = el.animate(frames, { duration: 450, easing: 'linear' });
  };

  useLayoutEffect(() => placeLens(true), [here]);
  useEffect(() => {
    const ro = new ResizeObserver(() => placeLens(false));
    if (nav.current) ro.observe(nav.current);
    return () => ro.disconnect();
  }, []);

  return (
    <nav ref={nav} class="rm-nav" aria-label={t('frame.sections')}>
      <span ref={lens} class="rm-nav-lens" aria-hidden="true" />
      {PLACES.map((p) => (
        <button key={p} type="button" data-place={p} aria-current={here === p ? 'page' : undefined} onClick={() => go(p)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICONS[p]}</svg>
          {t(TITLES[p])}
        </button>
      ))}
    </nav>
  );
}

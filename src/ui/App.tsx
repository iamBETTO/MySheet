// The frame, as v1 (V1_REFERENCE.md, The frame): title (Treasury on Home), period pill, eye, v1's Demo button and
// Settings beside it (the owner, 6 Nov 2026: keep both; on phones the period moves to its own row), the tab bar with its lens, the "Data as of" line, v1's demo
// banner and Show hidden sections.
// On phones the header slims while scrolling down and the tab bar sits at the bottom (d36). Each place keeps its scroll.
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { connection } from '../state/app';
import { direction, language } from '../state/language';
import { demoOn, shownData, toggleDemo } from '../state/data';
import { amountsHidden, closeImport, compareWith, folded, go, importOpen, period, place, resetForDemo, takePendingScroll, scrollMemory, toggleAmounts, unfoldAll, type Place } from '../state/view';
import { isoDay } from '../logic/periods';
import { asOfDay } from '../logic/budget';
import type { AppData, IsoDate } from '../model/types';
import { TabBar } from './frame/TabBar';
import { PeriodPanel } from './frame/PeriodPanel';
import { Toast } from './Toast';
import { ImportSheet } from './ImportSheet';
import { Activity } from './screens/Activity';
import { Settings } from './screens/Settings';
import { Home } from './screens/Home';
import { Spending } from './screens/Spending';
import { Budget } from './screens/Budget';
import { Calendar } from './screens/Calendar';
import { t, type Key } from '../i18n';
import { resolvePeriod, v1Date } from './format';

const TITLES: Record<Place, Key> = { home: 'frame.title.home', spending: 'frame.title.spending', budget: 'frame.title.budget', calendar: 'frame.title.calendar', activity: 'frame.title.activity', settings: 'frame.title.settings' };
/** Places whose numbers follow the chosen period (v1: all but Calendar). */
const USES_PERIOD: readonly Place[] = ['home', 'spending', 'budget', 'activity'];

const EYE_OPEN = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>;
const EYE_SHUT = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6 0 10 7 10 7a17.6 17.6 0 0 1-3.2 3.9M6.6 6.6C3.9 8.3 2 12 2 12s4 7 10 7a9.7 9.7 0 0 0 5.4-1.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>;
const GEAR = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
const PERSON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>;
const CHEVRON = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>;

export function App() {
  const d = shownData.value;
  const c = connection.value;
  const here = place.value;
  const demo = demoOn.value;
  const ready = d.state === 'ready' && (demo || c.state === 'ready');
  const data = d.state === 'ready' ? d.data : null;
  const asOf = data ? asOfDay(data, isoDay(new Date())) : isoDay(new Date());
  const [sheetOpen, setSheetOpen] = useState(false);
  const head = useRef<HTMLElement>(null);
  const shownPlace = useRef<Place | null>(null);

  // The page's language and direction follow the saved language (plans/translation.md); Hebrew reads right to left.
  const lang = language.value, dir = direction.value;
  useEffect(() => { document.title = t('frame.docTitle', { place: t(TITLES[here]) }); }, [here, lang]);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = dir; }, [lang, dir]);
  // A person who chose "start with amounts hidden" gets the eye closed on every visit.
  useEffect(() => { if (data?.settings.startWithAmountsHidden) amountsHidden.value = true; }, [d.state]);
  // Coming back to a place returns to where it was scrolled (v1); Back returns to the exact spot.
  useLayoutEffect(() => {
    if (shownPlace.current !== null && shownPlace.current !== here) {
      const y = takePendingScroll() ?? scrollMemory.get(here) ?? 0;
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
    shownPlace.current = here;
    if (!USES_PERIOD.includes(here)) setSheetOpen(false);
  }, [here]);
  useSlimHeader(head, sheetOpen);

  const p = data ? resolvePeriod(period.value, asOf, data) : null;
  const q = data && compareWith.value ? resolvePeriod(compareWith.value, asOf, data) : null;
  const anyFolded = [...folded.value].some((id) => id.startsWith(`${here}-`));

  return (
    <div class={`rm${amountsHidden.value ? ' priv' : ''}${demo ? ' demo' : ''}`} id="rm">
      <a class="rm-skip" href="#main">{t('frame.skip')}</a>
      <header class="rm-head" id="top" ref={head}>
        <div class="rm-titlebar">
          <div class="rm-titleside"><h1 id="title">{t(TITLES[here])}</h1></div>
          <div class="rm-actions">
            {ready && p && USES_PERIOD.includes(here) && (
              <button type="button" class={`rm-pill-btn${q ? ' cmp-on' : ''}`} id="period-btn" aria-expanded={sheetOpen} aria-controls="period-sheet" onClick={() => setSheetOpen(!sheetOpen)}>
                <span id="period-name">{q ? t('frame.periodVs', { period: p.label, other: q.label }) : p.label}</span>{CHEVRON}
              </button>
            )}
            <button type="button" class="rm-icon" aria-pressed={amountsHidden.value} aria-label={t(amountsHidden.value ? 'frame.showAmounts' : 'frame.hideAmounts')} onClick={toggleAmounts}>
              {amountsHidden.value ? EYE_SHUT : EYE_OPEN}<span>{t(amountsHidden.value ? 'frame.showAmounts' : 'frame.hideAmounts')}</span>
            </button>
            <button type="button" class="rm-icon" id="demo-btn" aria-pressed={demo} aria-label={t(demo ? 'frame.demoOff' : 'frame.demoOnLabel')} onClick={() => { resetForDemo(); toggleDemo(); }}>
              {PERSON}<span>{t(demo ? 'frame.demoIsOn' : 'frame.demo')}</span>
            </button>
            <button type="button" class="rm-icon" aria-label={t('frame.settings')} aria-current={here === 'settings' ? 'page' : undefined} onClick={() => go(here === 'settings' ? 'home' : 'settings')}>
              {GEAR}<span>{t('frame.settings')}</span>
            </button>
          </div>
        </div>
        {sheetOpen && data && <PeriodPanel data={data} today={asOf} onClose={() => { setSheetOpen(false); document.getElementById('period-btn')?.focus(); }} />}
        <TabBar />
        {data && <AsOf data={data} asOf={asOf} />}
        {demo && (
          <p class="rm-demo-banner">{t('frame.demoBanner')}{' '}
            <button type="button" class="link-btn link-inline" onClick={() => { resetForDemo(); toggleDemo(); }}>{t('frame.backToMine')}</button></p>
        )}
        {anyFolded && <button type="button" class="rm-showall" onClick={unfoldAll}>{t('frame.showHidden')}</button>}
      </header>

      <main class="rm-main" id="main" tabIndex={-1} aria-labelledby="title">
        {ready && data ? <Screen key={demo ? 'demo' : 'own'} here={here} data={data} asOf={asOf} /> : <NotReady />}
      </main>

      <Toast />
      {importOpen.value && !demo && ready && data && <ImportSheet data={data} onClose={closeImport} />}
    </div>
  );
}

function Screen({ here, data, asOf }: { here: Place; data: AppData; asOf: IsoDate }) {
  switch (here) {
    case 'home': return <div class="rm-page"><Home data={data} asOf={asOf} /></div>;
    case 'spending': return <div class="rm-page"><Spending data={data} asOf={asOf} /></div>;
    case 'budget': return <div class="rm-page"><Budget data={data} asOf={asOf} /></div>;
    case 'calendar': return <div class="rm-page"><Calendar data={data} asOf={asOf} /></div>;
    case 'activity': return <div class="rm-page"><Activity data={data} asOf={asOf} /></div>;
    case 'settings': return <div class="rm-page"><Settings data={data} /></div>;
  }
}

/** "Data as of Oct 8, 2026 · card details to Sep 16": the newest line, and a card whose file stops earlier. */
function AsOf({ data, asOf }: { data: AppData; asOf: IsoDate }) {
  if (!Object.keys(data.months).length) return null;
  const cards = data.accounts.filter((a) => a.kind === 'card');
  const lastOf = (id: string) => {
    let last = '';
    for (const m of Object.values(data.months)) for (const t of m.transactions) if (t.accountId === id && t.date > last) last = t.date;
    return last;
  };
  const behind = cards.map((a) => ({ a, last: lastOf(a.id) })).filter((x) => x.last && x.last < asOf);
  return (
    <p class="rm-asof" aria-live="polite">
      {[t('frame.dataAsOf', { date: v1Date(asOf, 'dayYear') }),
        ...behind.map((x) => cards.length > 1 ? t('frame.namedDetailsTo', { name: x.a.name, date: v1Date(x.last, 'day') }) : t('frame.cardDetailsTo', { date: v1Date(x.last, 'day') }))].join(' · ')}
    </p>
  );
}

/** v1's slim header on phones: scrolling down past it tucks the title row away; scrolling up brings it back. */
function useSlimHeader(head: preact.RefObject<HTMLElement>, sheetOpen: boolean) {
  useEffect(() => {
    let lastY = window.scrollY, tick = false;
    const check = () => {
      tick = false;
      const el = head.current;
      if (!el) return;
      const narrow = matchMedia('(max-width: 699px)').matches, y = window.scrollY, h = el.offsetHeight;
      el.style.setProperty('--slim', `${h}px`);
      const want = narrow && !sheetOpen && y > h + 40 && y > lastY + 2 ? true : y < lastY - 2 || y < h || sheetOpen || !narrow ? false : el.classList.contains('slim');
      el.classList.toggle('slim', want);
      lastY = y;
    };
    const onScroll = () => { if (!tick) { tick = true; requestAnimationFrame(check); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [sheetOpen]);
}

function NotReady() {
  const c = connection.value;
  const d = shownData.value;
  const text =
    c.state === 'connecting' || d.state === 'loading' || (c.state === 'ready' && d.state === 'idle') ? t('frame.loading')
    : c.state === 'error' ? c.message
    : d.state === 'error' ? d.message
    : c.state === 'unavailable' && c.reason === 'signed-out' ? t('frame.signIn')
    : c.state === 'unavailable' && c.reason === 'no-runtime' ? t('frame.noStorage')
    : t('frame.unreachable');
  const bad = c.state === 'error' || d.state === 'error';
  return (
    <section class="rm-card">
      <p class={bad ? 'rm-fail' : 'rm-wait'} role="status">{text}</p>
    </section>
  );
}

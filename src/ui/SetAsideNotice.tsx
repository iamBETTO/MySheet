// Shown on Home when some saved records couldn't be read and were set aside, so the rest of the data still shows
// (6 Nov 2026). Calm, with a next step (UX rule 5).
import { demoOn, dismissSetAside, setAside } from '../state/data';
import { t } from '../i18n';

export function SetAsideNotice() {
  const s = setAside.value;
  if (!s || demoOn.value) return null;
  const n = s.items.length;
  return (
    <section class="rm-card set-aside" aria-labelledby="set-aside-h">
      <div class="rm-ch"><h2 id="set-aside-h">{t('notice.unreadable', { n })}</h2></div>
      <p class="rm-note">
        {t('notice.setAside', { n })}{' '}
        {t(s.copied ? 'notice.copyKept' : 'notice.downloadFirst')}
      </p>
      <ul class="plain set-aside-list">{s.items.slice(0, 8).map((x) => <li key={x.where}><bdi dir="auto">{x.label}</bdi></li>)}</ul>
      {n > 8 && <p class="rm-note">{t('notice.more', { n: n - 8 })}</p>}
      <button type="button" class="rm-linkbtn" onClick={dismissSetAside}>{t('notice.hide')}</button>
    </section>
  );
}

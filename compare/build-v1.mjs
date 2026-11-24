// Builds compare/v1/index.html: the real v1 page (compare/v1/page.html, the published v1 dashboard) running on a
// stand-in for the Claude Dashboard runtime, fed by v1's own made-up demo person (compare/v1/data). Reference only:
// nothing here ships in v2. Run: node compare/build-v1.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const here = new URL('./', import.meta.url);
let page = readFileSync(new URL('v1/page.html', here), 'utf8');
// Each page <script> runs in its own scope on the real dashboard; do the same here.
page = page.replace(/<script>([\s\S]*?)<\/script>/g, (_, body) => '<script>(function(){' + body + '\n})();</script>');
const ids = ['monthly', 'tx', 'summary', 'categories', 'places', 'cat_monthly', 'limits', 'holdings', 'notes'];
const FILES = Object.fromEntries(ids.flatMap((id) => [[id, `data/demo_${id}.csv`], [`demo_${id}`, `data/demo_${id}.csv`]]));
const PARAMS = { period: 'last12', compare: null, category: null, month: null, hide: false, demo: true, view: 'home', monthStart: 1, txStart: null, calMonth: null, calDay: null };
const mock = String.raw`
(function(){
  const FILES = __FILES__; const DEFAULTS = __PARAMS__;
  const store = {}, calcs = {}, subs = [];
  let params = JSON.parse(JSON.stringify(DEFAULTS));
  window.__errors = [];
  const notify = () => subs.forEach(fn => { try { fn(); } catch (e) { window.__errors.push('onData: ' + (e && e.stack || e)); } });
  function load(id) {
    if (store[id]) return;
    store[id] = { status: 'loading', data: [] };
    fetch(FILES[id]).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(t => { const rows = d3.csvParse(t); store[id] = { status: 'ok', data: rows, columns: rows.columns }; setTimeout(notify, 0); })
      .catch(e => { store[id] = { status: 'error', data: [], message: String(e) }; window.__errors.push('load ' + id + ': ' + e); notify(); });
  }
  window.dash = {
    data(id) {
      if (calcs[id]) {
        const c = calcs[id]; const ins = c.inputs.map(i => window.dash.data(i));
        if (ins.some(x => x.status === 'error')) return { status: 'error', data: [] };
        if (ins.some(x => x.status !== 'ok')) return { status: 'loading', data: [] };
        if (!c.cache) { try { c.cache = { status: 'ok', data: c.fn(...ins.map(x => x.data)) }; } catch (e) { window.__errors.push('calc ' + id + ': ' + e); c.cache = { status: 'error', data: [] }; } }
        return c.cache;
      }
      if (!FILES[id]) { window.__errors.push('unknown dataset ' + id); return { status: 'missing', data: [] }; }
      load(id); return store[id];
    },
    calc(id, o) {
      let fn; try { fn = new Function('return (' + o.fn.toString() + ')')(); } catch (e) { window.__errors.push('calc ' + id + ' source: ' + e); fn = o.fn; }
      calcs[id] = Object.assign({}, o, { fn, cache: null });
    },
    loader() {},
    onData(fn) { subs.push(fn); try { fn(); } catch (e) { window.__errors.push('onData: ' + (e && e.stack || e)); } },
    params() { return params; },
    setParams(p) { params = Object.assign({}, params, p); setTimeout(notify, 0); },
    resetParams() { params = JSON.parse(JSON.stringify(DEFAULTS)); setTimeout(notify, 0); },
    colors: ['#2f6fde', '#d9534f', '#2a9d8f', '#e9a23b', '#7b61ff', '#c2185b', '#5c6bc0', '#8d6e63'],
    refresh() {}, setLink(n) { window.__link = n; },
  };
  window.addEventListener('error', e => window.__errors.push('window: ' + e.message));
  // Mark checker: a mark naming one cell must show that cell's value.
  window.__checkMarks = function () {
    const bad = []; const num = s => Number(String(s).replace(/[₪,\s+]/g, '').replace('−', '-'));
    document.querySelectorAll('[data-source][data-field]').forEach(el => {
      if (el.closest('[hidden]') || el.tagName === 'TH') return;
      const where = el.dataset.where; if (!where) return;
      const d = window.dash.data(el.dataset.source); if (d.status !== 'ok') return;
      const conds = where.split('&').map(kv => kv.split('=').map(decodeURIComponent));
      const row = d.data.find(r => conds.every(([k, v]) => String(r[k]) === v));
      if (!row) { bad.push({ el: el.className, src: el.dataset.source, where, reason: 'no row' }); return; }
      const want = row[el.dataset.field], shown = el.textContent.trim();
      if (shown === '—' || shown === '') return;
      if (!isNaN(num(want)) && want !== '' && !isNaN(num(shown))) {
        if (Math.abs(num(want) - num(shown)) > 1 && Math.abs(Math.abs(num(want)) - num(shown)) > 1) bad.push({ el: el.className, src: el.dataset.source, where, want, shown });
      }
    });
    return bad;
  };
})();
`.replace('__FILES__', JSON.stringify(FILES)).replace('__PARAMS__', JSON.stringify(PARAMS));
const tokens = `
:root { --cds-gap-xs:4px; --cds-gap-sm:8px; --cds-gap-md:12px; --cds-gap-lg:20px; --cds-gap-xl:28px;
 --cds-pad-xs:4px; --cds-pad-sm:8px; --cds-pad-md:12px; --cds-pad-lg:16px; --cds-radius:8px;
 --cds-font-size-caption:12px; --cds-font-size-body:14px; --cds-font-size-heading:16px; --cds-font-size-title:26px;
 --cds-font-weight-medium:600; --cds-chart-grid:#e8e9ee; --cds-chart-axis:#9aa0ab; --cds-chart-muted:#b8bcc6;
 --cds-chart-reference:#6b7280; --cds-chart-status-critical:#d93025; --cds-surface-popover:#fff; --cds-border:#ddd;
 --cds-shadow-popover:0 2px 8px rgba(0,0,0,.15); --cds-text-secondary:#666; --cds-dur-slow:.3s; --cds-ease-out:ease-out;
 --color-fg:#1b1f27; --color-fg-muted:#5d6573; --color-bg:#f7f7f9; --color-panel:#fff; --color-border-line:#dde0e6;
 --color-ok:#1e7d4a; --color-warn:#b26a00; --color-bad:#c62828;
 --font-anthropic-sans: system-ui, sans-serif; --font-anthropic-serif: Georgia, serif; }
body { margin:0; background:var(--color-bg); color:var(--color-fg); font-family:var(--font-anthropic-sans); }
#dash-root { padding: 16px; }
.dash-skeleton { color: transparent; background: #eee; border-radius: 4px; }

.rm-demo-banner { display: none !important; }`;
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>MySheet v1 (reference)</title><style>${tokens}</style>
<script src="../../node_modules/d3/dist/d3.min.js"></script>
<script>${mock}</script></head><body><div id="dash-root">
${page}
</div></body></html>`;
writeFileSync(new URL('v1/index.html', here), html);
console.log('compare/v1/index.html written');

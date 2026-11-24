// Puts v1 and v2 side by side (CLAUDE.md rule 24): the same made-up person, the same day, phone and desktop size,
// every place. Writes compare/out/<size>-<place>.png (v1 left, v2 right) and compare/out/report.md (headings and
// key lines that differ). Needs `npm run build` first. Run: npm run compare
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'compare/out');
const DAY = new Date('2026-10-08T12:00:00');
const PLACES = ['home', 'spending', 'budget', 'calendar', 'activity'];
const NAMES = { home: 'Home', spending: 'Spending', budget: 'Budget', calendar: 'Calendar', activity: 'Activity' };
const SIZES = [['phone', 390, 844], ['desktop', 1280, 900]];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.csv': 'text/csv', '.json': 'application/json', '.png': 'image/png' };

const server = createServer(async (req, res) => {
  try {
    const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const body = await readFile(join(ROOT, path));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end(); }
}).listen(4190, '127.0.0.1');

const demo = JSON.parse(await readFile(join(ROOT, 'src/model/demo.json'), 'utf8'));
const docs = { settings: demo.settings, budgets: demo.budgets, imports: demo.imports, ledger: { months: Object.keys(demo.months).sort() } };
for (const n of ['accounts', 'categories', 'rules', 'holdings', 'notes']) docs[n] = { items: demo[n] };
for (const [k, m] of Object.entries(demo.months)) docs[`ledger/months/${k}`] = m;
const seed = Object.fromEntries(Object.entries(docs).map(([k, v]) => [`data/users/demo/${k}`, v]));

/** The text a person reads on a place: headings and the first line of each card, for the report. */
const READ = `(() => [...document.querySelectorAll('h1, h2, h3, .rm-hero .big, .hero-value, .rm-row, .kv, .rm-note, .rm-lim-sum, .rm-take')]
  .filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\\s+/g, ' ').trim()).filter(Boolean).slice(0, 80))()`;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const report = ['# v1 and v2 side by side', '', `Demo person, ${DAY.toDateString()}. Images: compare/out/<size>-<place>.png (v1 left, v2 right).`, ''];
try {
  for (const [size, width, height] of SIZES) {
    const v1 = await browser.newPage({ viewport: { width, height } });
    const v2 = await browser.newPage({ viewport: { width, height } });
    for (const p of [v1, v2]) await p.clock.setFixedTime(DAY);
    await v2.addInitScript((seed) => {
      const docs = new Map(Object.entries(seed));
      const ref = (path) => ({ id: path.split('/').pop(), path,
        get: async () => ({ id: path, exists: docs.has(path), data: () => structuredClone(docs.get(path)), metadata: { fromCache: false, hasPendingWrites: false } }),
        set: async (d) => { docs.set(path, d); }, update: async () => {}, delete: async () => { docs.delete(path); }, onSnapshot: () => () => {} });
      window.claude = { use: async (n) => (n === 'db' ? { doc: ref, collection: () => ({}) } : n === 'user' ? { id: async () => 'demo' } : null) };
    }, seed);
    await v1.goto('http://127.0.0.1:4190/compare/v1/index.html');
    await v2.goto('http://127.0.0.1:4190/dist/index.html');
    await v1.waitForTimeout(1500);
    await v2.getByRole('navigation', { name: 'MySheet sections' }).waitFor();
    for (const place of PLACES) {
      await v1.evaluate((v) => document.querySelector(`.rm-nav button[data-view=${v}]`).click(), place);
      await v2.getByRole('navigation', { name: 'MySheet sections' }).getByRole('button', { name: NAMES[place] }).click();
      await v1.waitForTimeout(400); await v2.waitForTimeout(400);
      const [a, b] = [await v1.screenshot({ fullPage: true }), await v2.screenshot({ fullPage: true })];
      const pair = await browser.newPage({ viewport: { width: width * 2 + 24, height: 400 } });
      await pair.setContent(`<body style="margin:0;display:flex;gap:24px;background:#888;align-items:flex-start">
        <img style="width:${width}px" src="data:image/png;base64,${a.toString('base64')}"><img style="width:${width}px" src="data:image/png;base64,${b.toString('base64')}"></body>`);
      await pair.screenshot({ path: join(OUT, `${size}-${place}.png`), fullPage: true });
      await pair.close();
      const [t1, t2] = [await v1.evaluate(READ), await v2.evaluate(READ)];
      const only1 = t1.filter((x) => !t2.includes(x)), only2 = t2.filter((x) => !t1.includes(x));
      report.push(`## ${size} · ${NAMES[place]}`, '', `Only in v1 (${only1.length}):`, ...only1.map((x) => `- ${x}`), '', `Only in v2 (${only2.length}):`, ...only2.map((x) => `- ${x}`), '');
    }
    const errs = await v1.evaluate(() => window.__errors ?? []);
    if (errs.length) report.push(`v1 page errors at ${size}: ${errs.join('; ')}`, '');
  }
} finally {
  await browser.close();
  server.close();
}
await writeFile(join(OUT, 'report.md'), report.join('\n'));
console.log(`compare: ${SIZES.length * PLACES.length} pairs and report.md in compare/out`);

// Screenshots of v2 with the demo person, for a quick look while building: node scripts/shot.mjs <place> [width] [scrollY] [out]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium, devices } from '@playwright/test';
const ROOT = new URL('..', import.meta.url).pathname;
const [placeName = 'Home', width = '390', scroll = '0', out = 'compare/out/shot.png', dark = ''] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer(async (req, res) => {
  try { const p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)); res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' }).end(await readFile(join(ROOT, p))); }
  catch { res.writeHead(404).end(); }
}).listen(4191, '127.0.0.1');
// DATA=tests/fixtures/demo-hebrew.json shows another data set instead of the demo person.
const demo = JSON.parse(await readFile(join(ROOT, process.env.DATA ?? 'src/model/demo.json'), 'utf8'));
const docs = { settings: demo.settings, budgets: demo.budgets, imports: demo.imports, ledger: { months: Object.keys(demo.months).sort() } };
for (const n of ['accounts', 'categories', 'rules', 'holdings', 'notes']) docs[n] = { items: demo[n] };
for (const [k, m] of Object.entries(demo.months)) docs[`ledger/months/${k}`] = m;
const seed = Object.fromEntries(Object.entries(docs).map(([k, v]) => [`data/users/demo/${k}`, v]));
const b = await chromium.launch();
// DEVICE='Galaxy S24' emulates that phone (touch, mobile viewport); the width argument is then ignored.
const device = process.env.DEVICE ? devices[process.env.DEVICE] : null;
if (process.env.DEVICE && !device) throw new Error(`Unknown device ${process.env.DEVICE}`);
const pg = await b.newPage(device ? { ...device, colorScheme: dark ? 'dark' : 'light' } : { viewport: { width: Number(width), height: 844 }, colorScheme: dark ? 'dark' : 'light' });
await pg.clock.setFixedTime(new Date('2026-10-08T12:00:00'));
await pg.addInitScript((seed) => {
  const docs = new Map(Object.entries(seed));
  const ref = (path) => ({ id: path.split('/').pop(), path, get: async () => ({ id: path, exists: docs.has(path), data: () => structuredClone(docs.get(path)), metadata: {} }), set: async (d) => { docs.set(path, d); }, update: async () => {}, delete: async () => { docs.delete(path); }, onSnapshot: () => () => {} });
  window.claude = { use: async (n) => (n === 'db' ? { doc: ref, collection: () => ({}) } : n === 'user' ? { id: async () => 'demo' } : null) };
}, seed);
const errors = []; pg.on('pageerror', (e) => errors.push(String(e))); pg.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await pg.goto('http://127.0.0.1:4191/dist/index.html');
await pg.getByRole('navigation').first().getByRole('button', { name: placeName }).click();
await pg.waitForTimeout(500);
if (process.env.CSS) await pg.addStyleTag({ content: process.env.CSS });
for (const sel of (process.env.CLICK ?? "").split("||").filter(Boolean)) { await pg.locator(sel).first().click(); await pg.waitForTimeout(500); }
await pg.evaluate((y) => window.scrollTo(0, y), Number(scroll));
await pg.waitForTimeout(400);
await pg.screenshot({ path: out.startsWith("/") ? out : join(ROOT, out), fullPage: process.env.FULL === "1" });
console.log(errors.length ? errors.join('\n') : 'no errors');
await b.close(); server.close();

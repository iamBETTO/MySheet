// v1's charts, drawn the same way (V1_REFERENCE.md): the month-by-month line chart of the whole history with the chosen
// period as a grey band (and a comparison as a dashed band), a tooltip and tap-to-open; the small monthly bar chart under
// a limit; the legend. Scales from d3 (locked stack). Amounts follow the privacy eye.
import { useEffect, useRef, useState } from 'preact/hooks';
import { scaleBand, scaleLinear, scaleUtc } from 'd3-scale';
import { line as d3line } from 'd3-shape';
import type { IsoDate, MonthKey } from '../../model/types';
import { moneyText } from '../Money';
import { t } from '../../i18n';
import { v1Date } from '../format';
import { direction } from '../../state/language';

/** A chart label. Charts run left to right in every language (plans/translation.md, step 4); in a right-to-left
 *  language each label is kept as its own right-to-left piece (Unicode isolate), so its words read the right way and
 *  it still lines up on the side the chart puts it. */
const chartText = (s: string) => (direction.value === 'rtl' ? `\u2067${s}\u2069` : s);

/** Width of an element, kept up to date (measured a frame later, so a redraw never re-triggers the observer). */
export function useWidth<T extends HTMLElement>(): [preact.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const ro = new ResizeObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setW(Math.floor(el.clientWidth))); });
    ro.observe(el);
    setW(Math.floor(el.clientWidth));
    return () => { cancelAnimationFrame(frame); ro.disconnect(); };
  }, []);
  return [ref, w];
}

let measureCtx: CanvasRenderingContext2D | null = null;
/** Pixel width of an 11px label, for the left margin (v1 measured its tick labels the same way). */
function labelWidth(text: string): number {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * 6.5;
  measureCtx.font = '11px system-ui, sans-serif';
  return measureCtx.measureText(text).width;
}

export interface Series { key: string; name: string; color: string }
export interface Band { start: IsoDate; end: IsoDate }
export type MonthRow = { month: MonthKey } & Record<string, number | string>;

const monthIndex = (m: MonthKey) => Number(m.slice(0, 4)) * 12 + Number(m.slice(5, 7)) - 1;

/**
 * v1's line chart: one line per series over every month, with the period band(s), a tooltip and tap to open a month.
 * With no series it draws only its frame (grid and months), for a card with no data yet (plans/empty-screens.md).
 */
export function LineChart({ rows, series, height, bandA, bandB, onPick, label }: {
  rows: MonthRow[]; series: Series[]; height: number; bandA: Band | null; bandB: Band | null; onPick?: (month: MonthKey) => void; label: string;
}) {
  const [ref, measured] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const W = Math.max(280, measured), H = height;
  if (!rows.length) return <div class="rm-chart" ref={ref} style={{ minHeight: `${height}px` }} role="img" aria-label={label} />;
  const values = rows.flatMap((r) => series.map((s) => Number(r[s.key])));
  const y = scaleLinear().domain([Math.min(0, ...values), Math.max(1, ...values)]).range([H - 24, 8]).nice(4);
  const ticks = y.ticks(4);
  const blank = !series.length;
  const ml = blank ? 24 : Math.ceil(labelWidth(moneyText(Math.max(...ticks) * 100))) + 10, mr = blank ? 24 : 10;
  const first = monthIndex(rows[0]!.month), lastI = monthIndex(rows.at(-1)!.month);
  const x = (m: MonthKey) => ml + ((monthIndex(m) - first) / Math.max(1, lastI - first)) * (W - ml - mr);
  const band = (b: Band | null, dashed: boolean) => {
    if (!b) return null;
    const x0 = Math.max(ml, x(b.start.slice(0, 7)) - 5), x1 = Math.min(W - mr, x(b.end.slice(0, 7)) + 5);
    if (x1 <= x0) return null;
    return dashed
      ? <rect x={x0} y={8} width={x1 - x0} height={H - 32} rx={4} fill="none" stroke="var(--chart-axis)" stroke-dasharray="4 3" />
      : <rect x={x0} y={8} width={x1 - x0} height={H - 32} rx={4} fill="var(--chart-grid)" />;
  };
  // Month labels on the axis: d3's time ticks, about 4 on phones and 8 on wide screens (v1's d3 axis).
  const toDate = (m: MonthKey) => new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1));
  const tickMonths = new Set(scaleUtc().domain([toDate(rows[0]!.month), toDate(rows.at(-1)!.month)]).ticks(W < 500 ? 4 : 8)
    .map((d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`));
  const axis = rows.filter((r) => tickMonths.has(r.month));
  const pick = (clientX: number, el: SVGElement) => {
    const box = el.getBoundingClientRect(), px = ((clientX - box.left) / box.width) * W;
    let best = 0, gap = Infinity;
    rows.forEach((r, i) => { const d = Math.abs(x(r.month) - px); if (d < gap) { gap = d; best = i; } });
    return best;
  };
  const h = hover === null ? null : rows[hover]!;
  const scale = measured ? measured / W : 1;
  return (
    <div class="rm-chart" ref={ref} style={{ minHeight: `${height}px` }}>
      <svg class="chart" width="100%" viewBox={`0 0 ${W} ${H}`} height={H} role="img" aria-label={label}>
        {band(bandA, false)}{band(bandB, true)}
        {ticks.map((t) => <line key={`g${t}`} x1={ml} x2={W - mr} y1={y(t)} y2={y(t)} stroke="var(--chart-grid)" />)}
        {!blank && ticks.map((t) => <text key={`t${t}`} x={ml - 6} y={y(t)} dy="0.32em" text-anchor="end" font-size="11" fill="var(--color-fg-muted)">{chartText(moneyText(t * 100))}</text>)}
        <line x1={ml} x2={W - mr} y1={H - 24} y2={H - 24} stroke="var(--chart-axis)" />
        {axis.map((r) => (
          <g key={`a${r.month}`} transform={`translate(${x(r.month)},${H - 24})`}>
            <line y2={6} stroke="var(--chart-axis)" />
            <text y={9} dy="0.71em" text-anchor="middle" font-size="11" fill="var(--color-fg-muted)">{chartText(v1Date(r.month, 'monthAxis'))}</text>
          </g>
        ))}
        {series.map((s) => (
          <path key={s.key} fill="none" stroke={s.color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d={d3line<MonthRow>().x((r) => x(r.month)).y((r) => y(Number(r[s.key])))(rows) ?? ''} />
        ))}
        {h && <line x1={x(h.month)} x2={x(h.month)} y1={8} y2={H - 24} stroke="var(--chart-axis)" />}
        {h && series.map((s) => <circle key={`d${s.key}`} cx={x(h.month)} cy={y(Number(h[s.key]))} r={4} fill={s.color} />)}
        {!blank && <rect x={ml} y={0} width={W - ml - mr} height={H} fill="transparent" style={{ cursor: onPick ? 'pointer' : undefined }}
          onPointerMove={(e) => setHover(pick(e.clientX, e.currentTarget))} onPointerLeave={() => setHover(null)}
          onClick={(e) => { if (onPick) onPick(rows[pick(e.clientX, e.currentTarget)]!.month); }} />}
      </svg>
      {h && (
        <div class="rm-tip" style={{ left: `${Math.max(0, x(h.month) * scale + 12 + 160 > measured ? x(h.month) * scale - 172 : x(h.month) * scale + 12)}px`, top: '8px' }}>
          <div class="d">{v1Date(h.month, 'monthLong')}</div>
          {series.map((s) => <div key={s.key} class="r">{series.length > 1 && <i style={{ background: s.color }} />}<span>{s.name}: {moneyText(Number(h[s.key]) * 100)}</span></div>)}
          {onPick && <div class="h">{t('parts.tapForTransactions')}</div>}
        </div>
      )}
    </div>
  );
}

/** v1's legend line: coloured marks with names. kind "line" draws a short line, "band" a dashed box. */
export function Legend({ items }: { items: { name: string; color?: string; kind?: 'line' | 'band' }[] }) {
  if (!items.length) return null;
  return (
    <div class="rm-legend">
      {items.map((i) => <span key={i.name}><i class={i.kind ?? ''} style={i.color ? { background: i.color } : undefined} />{i.name}</span>)}
    </div>
  );
}

/** v1's small bar chart under a limit: a bar per month (red when over), the dashed limit line and its label. */
export function MiniBars({ rows, label, monthName, onPick }: {
  rows: { month: MonthKey; spent: number; limit: number | null }[]; label: string; monthName: (m: MonthKey) => string; onPick: (m: MonthKey) => void;
}) {
  const [ref, measured] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  if (!rows.length) return null;
  const W = Math.max(200, measured), H = 96, mt = 14, mb = 16;
  const x = scaleBand<string>().domain(rows.map((r) => r.month)).range([0, W]).paddingInner(0.25).paddingOuter(0.05);
  const lims = rows.map((r) => r.limit), lmax = Math.max(0, ...lims.filter((v): v is number => v !== null));
  const top = Math.max(...rows.map((r) => r.spent), lmax ? lmax * 1.15 : 0, 1);
  const y = scaleLinear().domain([0, top]).range([H - mb, mt]);
  const lim = lims.at(-1) ?? (lmax || null);
  const gap = (x.step() * x.paddingInner()) / 2;
  const pts: [number, number][] = [];
  rows.forEach((r, i) => {
    if (r.limit === null) return;
    const x0 = i === 0 ? 0 : x(r.month)! - gap, x1 = i === rows.length - 1 ? W : x(r.month)! + x.bandwidth() + gap;
    pts.push([x0, y(r.limit)], [x1, y(r.limit)]);
  });
  const h = hover === null ? null : rows[hover]!;
  const sc = measured ? measured / W : 1;
  return (
    <div class="rm-mini" ref={ref} role="img" aria-label={label}>
      <svg class="chart" width="100%" viewBox={`0 0 ${W} ${H}`} height={H}>
        <line x1={0} x2={W} y1={H - mb} y2={H - mb} stroke="var(--chart-axis)" />
        {rows.map((r) => (
          <rect key={r.month} x={x(r.month)} width={x.bandwidth()} y={y(r.spent)} height={Math.max(0, H - mb - y(r.spent))} rx={Math.min(3, x.bandwidth() / 2)}
            fill={r.limit !== null && r.spent > r.limit ? 'var(--chart-critical)' : r.limit === null ? 'var(--chart-muted)' : 'var(--chart-out)'} />
        ))}
        {lim !== null && pts.length > 0 && <path d={d3line()(pts) ?? ''} fill="none" stroke="var(--chart-reference)" stroke-dasharray="4 3" />}
        {lim !== null && <text x={W} y={y(lim) - 3} text-anchor="end" font-size="10" fill="var(--color-fg-muted)">{chartText(t('parts.limitOf', { amount: moneyText(lim) }))}</text>}
        <text x={0} y={H - 3} font-size="10" fill="var(--color-fg-muted)">{chartText(v1Date(rows[0]!.month, 'monthAxis'))}</text>
        {rows.length > 1 && <text x={W} y={H - 3} text-anchor="end" font-size="10" fill="var(--color-fg-muted)">{chartText(v1Date(rows.at(-1)!.month, 'monthAxis'))}</text>}
        {rows.map((r, i) => (
          <rect key={`h${r.month}`} x={x(r.month)! - gap} width={x.step()} y={0} height={H} fill="transparent" style={{ cursor: 'pointer' }}
            onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onClick={() => onPick(r.month)} />
        ))}
      </svg>
      {h && (
        <div class="rm-tip" style={{ left: `${Math.max(0, Math.min(measured - 140, (x(h.month)! + x.bandwidth() / 2) * sc - 70))}px`, top: '-30px' }}>
          <div class="d">{monthName(h.month)}</div>
          <div>{moneyText(h.spent)}{h.limit !== null && h.spent > h.limit ? ` · ${t('parts.overBy', { amount: moneyText(h.spent - h.limit) })}` : ''}</div>
          {h.limit !== null && lims.some((v) => v !== h.limit) && <div>{t('parts.limitOf', { amount: moneyText(h.limit) })}</div>}
        </div>
      )}
    </div>
  );
}

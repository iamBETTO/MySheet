// Dragging a tile into a new place (Arrange, plans/arrange-pages.md). Rebuilt after the owner's phone test (6 Nov 2026:
// "clunky and inconsistent"): the held tile follows the finger, the order changes only when the held tile's middle
// passes another tile's middle, the other tiles slide into their new places, and the page scrolls near its edges.
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { RefObject } from 'preact';

interface Options {
  root: RefObject<HTMLElement>;
  /** The tiles in their current order (ids); a change of order re-measures and slides the others. */
  order: readonly string[];
  /** Asks for the held tile to go to `index` among the other tiles (0 = before all of them). */
  onMove: (id: string, index: number) => void;
  onEnd: (id: string) => void;
}

interface Hold { id: string; pointerId: number; offsetX: number; offsetY: number; x: number; y: number }
type Box = { left: number; top: number; width: number; height: number };

const tileOf = (root: HTMLElement | null, id: string) => root?.querySelector<HTMLElement>(`[data-tile="${CSS.escape(id)}"]`) ?? null;
const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
/** A box in page coordinates (stays right while the page scrolls). */
const pageBox = (el: HTMLElement): Box => { const r = el.getBoundingClientRect(); return { left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height }; };

export function useDragOrder({ root, order: orderNow, onMove, onEnd }: Options) {
  const [dragging, setDragging] = useState<string | null>(null);
  // The finger is followed by listeners on the window and a scrolling loop, which outlive a render: they read the
  // latest order and callbacks from here.
  const latest = useRef({ order: orderNow, onMove, onEnd });
  latest.current = { order: orderNow, onMove, onEnd };
  const hold = useRef<Hold | null>(null);
  /** Where each other tile sits in the layout (not where an animation shows it), in page coordinates. */
  const boxes = useRef(new Map<string, Box>());
  const before = useRef(new Map<string, Box>());
  const frame = useRef(0);

  /** Puts the held tile under the finger: measured without its own offset, then moved by the difference. */
  const place = () => {
    const h = hold.current;
    const el = tileOf(root.current, h?.id ?? '');
    if (!h || !el) return;
    el.style.transform = '';
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${h.x - h.offsetX - r.left}px, ${h.y - h.offsetY - r.top}px)`;
  };

  const measure = () => {
    boxes.current.clear();
    for (const id of latest.current.order) {
      const el = tileOf(root.current, id);
      if (el && id !== hold.current?.id) boxes.current.set(id, pageBox(el));
    }
  };

  /** How many other tiles come before the held tile's middle, in reading order. */
  const targetIndex = () => {
    const h = hold.current!;
    const el = tileOf(root.current, h.id)!;
    const mx = h.x - h.offsetX + el.offsetWidth / 2 + scrollX, my = h.y - h.offsetY + el.offsetHeight / 2 + scrollY;
    // The row's width: Arrange's wrapper only groups the tiles (display: contents, no width of its own), so measure the
    // nearest element that has one; otherwise every card looked full width and side-by-side drops never registered.
    let row = el.parentElement;
    while (row && row.clientWidth === 0) row = row.parentElement;
    const parentWidth = row?.clientWidth ?? el.offsetWidth;
    // Side by side, "before" is to the left in left-to-right languages and to the right in right-to-left ones.
    const rtl = getComputedStyle(el).direction === 'rtl';
    let n = 0;
    for (const id of latest.current.order) {
      if (id === h.id) continue;
      const b = boxes.current.get(id);
      if (!b) continue;
      const fullRow = b.width > parentWidth * 0.6;
      const isBefore = fullRow ? my > b.top + b.height / 2 : my > b.top + b.height || (my >= b.top && (rtl ? mx < b.left + b.width / 2 : mx > b.left + b.width / 2));
      if (isBefore) n++;
    }
    return n;
  };

  const update = () => {
    const h = hold.current;
    if (!h) return;
    place();
    const { order } = latest.current;
    const others = order.filter((id) => id !== h.id);
    const now = order.indexOf(h.id);
    const want = targetIndex();
    if (want !== now) {
      before.current = new Map();
      for (const other of others) {
        const r = tileOf(root.current, other)?.getBoundingClientRect();
        if (r) before.current.set(other, { left: r.left, top: r.top, width: r.width, height: r.height });
      }
      latest.current.onMove(h.id, want);
    }
  };

  // After the order changes: re-measure, slide the other tiles from where they were, and keep the held one under the finger.
  useLayoutEffect(() => {
    if (!hold.current) return;
    measure();
    for (const [id, old] of before.current) {
      const el = tileOf(root.current, id);
      if (!el || calm()) continue;
      const r = el.getBoundingClientRect();
      const dx = old.left - r.left, dy = old.top - r.top;
      if (dx || dy) el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    before.current.clear();
    place();
  }, [orderNow.join('|')]);

  // Near the top or bottom of the screen the page scrolls, faster the closer the finger is to the edge.
  const autoScroll = () => {
    const h = hold.current;
    if (!h) return;
    const bottomEdge = innerHeight - (innerWidth < 700 ? 150 : 60);
    const speed = h.y < 110 ? -Math.min(18, (110 - h.y) / 5) : h.y > bottomEdge ? Math.min(18, (h.y - bottomEdge) / 5) : 0;
    if (speed) { scrollBy(0, speed); update(); }
    frame.current = requestAnimationFrame(autoScroll);
  };

  // While a tile is held, the finger is followed on the whole window: reordering moves the held tile's element, and a
  // browser then drops pointer capture on it (found in testing, 6 Nov 2026), so its own handlers would stop hearing moves.
  // Made once, so the same functions are added and removed (everything they use lives in refs).
  const listeners = useRef<{ follow: (e: PointerEvent) => void; release: (e: PointerEvent) => void } | null>(null);
  listeners.current ??= {
    follow: (e) => {
      const h = hold.current;
      if (!h || e.pointerId !== h.pointerId) return;
      h.x = e.clientX;
      h.y = e.clientY;
      update();
    },
    release: (e) => {
      const h = hold.current;
      if (h && e.pointerId === h.pointerId) finish(h.id);
    },
  };
  const { follow, release } = listeners.current;

  const finish = (id: string) => {
    const h = hold.current;
    if (!h || h.id !== id) return;
    hold.current = null;
    cancelAnimationFrame(frame.current);
    removeEventListener('pointermove', follow);
    removeEventListener('pointerup', release);
    removeEventListener('pointercancel', release);
    const el = tileOf(root.current, id);
    if (el) {
      const from = el.style.transform;
      el.style.transform = '';
      if (from && !calm()) el.animate([{ transform: from }, { transform: 'none' }], { duration: 160, easing: 'ease-out' });
    }
    setDragging(null);
    latest.current.onEnd(id);
  };

  // A tile unmounted mid-drag (leaving the page) must not leave listeners behind.
  useLayoutEffect(() => () => {
    cancelAnimationFrame(frame.current);
    removeEventListener('pointermove', follow);
    removeEventListener('pointerup', release);
    removeEventListener('pointercancel', release);
  }, []);

  /** The pointer handler for a tile's handle: pressing it picks the tile up. */
  const handle = (id: string) => ({
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0 || hold.current) return;
      e.preventDefault();
      const el = tileOf(root.current, id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      hold.current = { id, pointerId: e.pointerId, offsetX: e.clientX - r.left, offsetY: e.clientY - r.top, x: e.clientX, y: e.clientY };
      setDragging(id);
      measure();
      addEventListener('pointermove', follow);
      addEventListener('pointerup', release);
      addEventListener('pointercancel', release);
      frame.current = requestAnimationFrame(autoScroll);
    },
  });

  return { dragging, handle };
}

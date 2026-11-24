// Date display. Plain functions only (CLAUDE.md rule 8): each takes the language it writes in (English unless told
// otherwise). English keeps v1's own styles; other languages use the browser's (Intl), read from the date's digits in
// UTC so a day never shifts with time zones.
import type { Language } from '../i18n/languages';

const formats = new Map<string, Intl.DateTimeFormat>();
/** A date ('YYYY-MM-DD' or 'YYYY-MM') written with Intl in `lang`. */
function intlDate(date: string, lang: Language, options: Intl.DateTimeFormatOptions): string {
  const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7)), d = Number(date.slice(8, 10)) || 1;
  const key = `${lang}|${JSON.stringify(options)}`;
  if (!formats.has(key)) formats.set(key, new Intl.DateTimeFormat(`${lang}-IL`, { timeZone: 'UTC', ...options }));
  return formats.get(key)!.format(new Date(Date.UTC(y, m - 1, d)));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2026-10-12' → '12 Oct 2026'. Reads the digits directly, so the day never shifts with time zones. */
export function formatDay(date: string, lang: Language = 'en'): string {
  if (lang !== 'en') return intlDate(date, lang, { day: 'numeric', month: 'short', year: 'numeric' });
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS.at((m ?? 1) - 1) ?? ''} ${y}`;
}

/** An ISO timestamp ('2026-10-12T09:00:00Z') shown as its day, in the person's own time zone. */
export function formatTimestamp(iso: string, lang: Language = 'en'): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return formatDay(`${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`, lang);
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** '2026-10-12' → 'Mon 12 Oct 2026'. The weekday is worked out in UTC from the digits, so it never shifts. */
export function formatWeekday(date: string, lang: Language = 'en'): string {
  if (lang !== 'en') return intlDate(date, lang, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const [y, m, d] = date.slice(0, 10).split('-').map(Number) as [number, number, number];
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${formatDay(date)}`;
}

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * v1's date styles (V1_REFERENCE.md), from a 'YYYY-MM-DD' or 'YYYY-MM' string, never shifted by time zones:
 * day "Oct 8" · dayYear "Oct 8, 2026" · dayShort "Sep 30 '26" · month "Oct 2026" · monthLong "October 2026" ·
 * monthOnly "September" · monthAxis "Jan '23" · weekday "Thursday, October 8, 2026".
 */
export type DateStyle = 'day' | 'dayYear' | 'dayShort' | 'month' | 'monthLong' | 'monthOnly' | 'monthAxis' | 'weekday';

/** The same styles in other languages: the browser's way of writing each. */
const INTL_STYLES: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  day: { day: 'numeric', month: 'short' },
  dayYear: { day: 'numeric', month: 'short', year: 'numeric' },
  dayShort: { day: 'numeric', month: 'numeric', year: '2-digit' },
  month: { month: 'short', year: 'numeric' },
  monthLong: { month: 'long', year: 'numeric' },
  monthOnly: { month: 'long' },
  monthAxis: { month: 'short', year: '2-digit' },
  weekday: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
};

export function v1Date(date: string, style: DateStyle, lang: Language = 'en'): string {
  if (lang !== 'en') return intlDate(date, lang, INTL_STYLES[style]);
  const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7)), d = Number(date.slice(8, 10)) || 1;
  const short = MONTHS[m - 1] ?? '', long = MONTHS_LONG[m - 1] ?? '';
  switch (style) {
    case 'day': return `${short} ${d}`;
    case 'dayYear': return `${short} ${d}, ${y}`;
    case 'dayShort': return `${short} ${d} '${String(y).slice(2)}`;
    case 'month': return `${short} ${y}`;
    case 'monthLong': return `${long} ${y}`;
    case 'monthOnly': return long;
    case 'monthAxis': return `${short} '${String(y).slice(2)}`;
    case 'weekday': return `${WEEKDAYS_LONG[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]}, ${long} ${d}, ${y}`;
  }
}

/** The week's days from Sunday, as the calendar's column heads: full ("Sun") and one letter ("S"). */
export function weekdayHeads(lang: Language = 'en'): { long: string[]; short: string[] } {
  if (lang === 'en') return { long: [...WEEKDAYS], short: WEEKDAYS.map((d) => d.charAt(0)) };
  // 1 Nov 2026 is a Sunday. Hebrew calendars head their columns with the day's letter (א׳ … ש׳), so both use it.
  const days = Array.from({ length: 7 }, (_, i) => intlDate(`2026-11-0${i + 1}`, lang, { weekday: 'narrow' }));
  return { long: days, short: days };
}

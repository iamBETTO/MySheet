// Whether the screen is wide enough for the computer layout (two columns, details beside the list). Matches the
// 1100px breakpoint in src/styles/v2.css.
import { useEffect, useState } from 'preact/hooks';

const QUERY = '(min-width: 1100px)';

export function useWide(): boolean {
  const [wide, setWide] = useState(() => typeof matchMedia === 'function' && matchMedia(QUERY).matches);
  useEffect(() => {
    const m = matchMedia(QUERY);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

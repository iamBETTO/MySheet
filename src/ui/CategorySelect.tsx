// One way to pick a category everywhere: grouped by kind, sub-categories shown under their parent.
import type { AppData, CategoryKind, Id } from '../model/types';
import { KIND_LABEL, orderedCategories } from '../logic/categories';
import { t } from '../i18n';

interface Props {
  data: AppData;
  value: Id | 'none' | null;
  onChange: (v: Id | 'none' | null) => void;
  id?: string;
  /** Adds "All categories" (value null) first: for filters. */
  allOption?: boolean;
  /** Text for the no-category option. */
  noneLabel?: string;
  class?: string;
  ariaLabel?: string;
  /** Only these kinds (default: all). */
  kinds?: readonly CategoryKind[];
  /** A first, unpickable line shown while nothing is chosen (value null), e.g. "Move to…". */
  placeholder?: string;
}

export function CategorySelect({ data, value, onChange, id, allOption, noneLabel, class: cls, ariaLabel, kinds: only, placeholder }: Props) {
  const cats = orderedCategories(data, { includeArchived: false });
  const kinds = (['spending', 'income', 'transfer'] as const).filter((k) => (!only || only.includes(k)) && cats.some((c) => c.kind === k));
  const names = new Map(data.categories.map((c) => [c.id, c.name]));
  const current = value === null ? (allOption || placeholder ? '' : 'none') : value;
  return (
    <select id={id} class={cls ?? 'field'} value={current} aria-label={ariaLabel} onChange={(e) => {
      const v = (e.currentTarget as HTMLSelectElement).value;
      onChange(v === '' ? null : v === 'none' ? (allOption ? 'none' : null) : v);
    }}>
      {allOption && <option value="">{t('parts.allCategories')}</option>}
      {placeholder && <option value="" disabled>{placeholder}</option>}
      <option value="none">{noneLabel ?? t('parts.noCategory')}</option>
      {kinds.map((k) => (
        <optgroup key={k} label={t(KIND_LABEL[k])}>
          {cats.filter((c) => c.kind === k).map((c) => (
            <option key={c.id} value={c.id}>{c.parentId && names.has(c.parentId) ? `${names.get(c.parentId)} › ${c.name}` : c.name}</option>
          ))}
        </optgroup>
      ))}
      {/* An archived category still in use stays visible so the choice isn't silently lost. */}
      {typeof value === 'string' && value !== 'none' && !cats.some((c) => c.id === value) && names.has(value) && <option value={value}>{t('parts.archived', { name: names.get(value) ?? '' })}</option>}
    </select>
  );
}

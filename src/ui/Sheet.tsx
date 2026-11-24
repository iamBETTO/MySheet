// A sheet for focused tasks (editing, choosing). Built on the native dialog: focus stays inside, Escape closes.
// Docked (computers): the same sheet sits beside the page instead of over it, so the list stays usable.
import { useEffect, useRef } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { Icon } from './Icons';
import { t } from '../i18n';

interface Props {
  title: string;
  onClose: () => void;
  children: ComponentChildren;
  /** Buttons at the bottom, always visible. */
  footer?: ComponentChildren;
  /** Shown beside the page (not over it); the page stays usable. */
  docked?: boolean;
}

/** Mount it to open it; unmount (or call onClose) to close it. */
export function Sheet({ title, onClose, children, footer, docked = false }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) {
      if (docked) { d.show(); d.querySelector<HTMLElement>('select, input, textarea, button:not(.icon-btn)')?.focus(); }
      else d.showModal();
    }
    return () => { if (d?.open) d.close(); };
  }, [docked]);
  return (
    <dialog
      ref={ref}
      class={docked ? 'sheet docked' : 'sheet'}
      aria-labelledby="sheet-title"
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      // A docked sheet isn't modal, so the browser doesn't turn Escape into cancel: do it here.
      onKeyDown={(e) => { if (docked && e.key === 'Escape') { e.preventDefault(); onClose(); } }}
      onClick={(e) => { if (!docked && e.target === e.currentTarget) onClose(); }}
    >
      <div class="sheet-body">
        <header class="sheet-head">
          <h2 id="sheet-title">{title}</h2>
          <button type="button" class="icon-btn" onClick={onClose} aria-label={t('common.close')}><Icon name="close" /></button>
        </header>
        <div class="sheet-content">{children}</div>
        {footer && <footer class="sheet-foot">{footer}</footer>}
      </div>
    </dialog>
  );
}

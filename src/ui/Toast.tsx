// The message after a change, with Undo (UX rule 4). Stays 8 seconds, longer while hovered or focused.
import { useEffect, useState } from 'preact/hooks';
import { dismissToast, history, toast, undo } from '../state/data';
import { t } from '../i18n';

export function Toast() {
  const msg = toast.value;
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!msg || paused) return;
    const timer = setTimeout(dismissToast, msg.tone === 'problem' ? 12000 : 8000);
    return () => clearTimeout(timer);
  }, [msg?.id, paused]);
  return (
    <div class="toast-zone" role="status" aria-live="polite">
      {msg && (
        <div class={`toast${msg.tone === 'problem' ? ' toast-problem' : ''}`} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusIn={() => setPaused(true)} onFocusOut={() => setPaused(false)}>
          <span>{msg.text}</span>
          {msg.canUndo && history.value.length > 0 && <button type="button" class="toast-btn" onClick={undo}>{t('common.undo')}</button>}
          <button type="button" class="toast-btn toast-close" onClick={dismissToast} aria-label={t('common.dismiss')}>✕</button>
        </div>
      )}
    </div>
  );
}

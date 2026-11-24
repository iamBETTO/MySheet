import { render } from 'preact';
import './styles/tokens.css';
import './styles/v1.css';
import './styles/v2.css';
import { App } from './ui/App';
import { startConnection } from './state/app';
import { reportError } from './state/errors';
import { savesOnDevice } from './storage/store';

window.addEventListener('error', (e) => {
  // Browsers report this when a layout change settles over two frames; nothing is lost, so it isn't a problem to log.
  if (String(e.message).includes('ResizeObserver loop')) return;
  reportError('page', e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => reportError('promise', e.reason));

// On MySheet's own website (not inside Claude, where the page sits in a frame), keep a copy for use without internet.
if (savesOnDevice() && window.top === window && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((e) => reportError('offline copy', e));
}

const root = document.getElementById('app');
if (root) render(<App />, root);
void startConnection();

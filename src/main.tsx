import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { DEBUG_LAYOUT } from './lib/debug';
import './index.css';

if (DEBUG_LAYOUT) document.documentElement.classList.add('debug-layout');

registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Hand over from the static splash: hold it for at least 3s after page load,
// then cross-fade the app in and the splash out. A slow bundle simply delays
// the mount, which stretches the splash instead of cutting it short.
const SPLASH_MIN_MS = 3000;

const splash = document.getElementById('splash');
const rootEl = document.getElementById('root');
const startedAt = (window as Window & { __splashStart?: number }).__splashStart ?? Date.now();
const wait = Math.max(0, SPLASH_MIN_MS - (Date.now() - startedAt));

window.setTimeout(() => {
  if (rootEl) rootEl.style.opacity = '1';
  if (splash) {
    splash.classList.add('hide');
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
    // Fallback in case transitionend never fires.
    window.setTimeout(() => splash.remove(), 700);
  }
}, wait);

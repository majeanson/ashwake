import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { App } from './App';
import { recordFailure, showFailure } from './shell/failure';
import { readLocale } from './shell/storage';
import { isLocale } from '@content/locale';

/**
 * Boot, and the two listeners that catch what boot cannot (Stage 4,
 * 2026-08-29).
 *
 * The failure panel is plain DOM and lives outside React on purpose — it
 * exists for the moments React is what broke. These listeners are the only
 * things that call it, and they are installed BEFORE the root renders so a
 * throw during the first render is caught by the panel rather than by a blank
 * page.
 *
 * The panel speaks the device's language. Sampled here rather than inside the
 * panel because `main` is where the shell is allowed to read storage and the
 * navigator, and because a panel that has to work out what language it is in
 * is a panel doing something other than its job.
 */
const kept = readLocale();
const s = stringsFor(kept !== null && isLocale(kept) ? kept : pickLocale(navigator.languages));

window.addEventListener('error', (event) => {
  showFailure(s, event.error ?? event.message);
});
window.addEventListener('unhandledrejection', (event) => {
  // A rejected promise is far more often something that RECOVERED — a fetch
  // that failed and fell back, a share sheet the player closed — so it is
  // kept for SETTINGS without raising the alarm over a running game.
  recordFailure(event.reason);
});

const root = document.getElementById('root');
if (root === null) throw new Error('index.html declares #root');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

import { useLayoutEffect } from 'react';
import { themeCssVars, type Theme } from '@theme/index';

/**
 * The direction, applied (Stage 3, 2026-08-29).
 *
 * `theme/apply.ts` was deliberately left behind in Ashwake 1: `themeCssVars`
 * is pure and string-only so it can be tested without a browser and so the
 * style gallery renders from exactly what the game applies. Applying is the
 * app's job, and this is the whole of it.
 *
 * **Nothing visual is hand-typed into a stylesheet.** Every colour a component
 * uses comes through a variable this sets, which is what lets a figure draw in
 * the board's own colours and what makes a direction swap a re-render rather
 * than a reload. A hard-coded `#c8b18a` in a component is a direction that
 * cannot be changed.
 */
export function useThemeVars(theme: Theme): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const vars = themeCssVars(theme);
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);

    // The browser chrome answers to the direction too — a pale board under a
    // black status bar is a phone that looks broken rather than themed.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta !== null) meta.setAttribute('content', vars['--bg'] ?? '#000000');

    // A direction may name a webfont; nothing else may fetch one, because
    // "nothing leaves your phone" is a sentence SETTINGS prints.
    if (theme.type.webfontHref === null) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = theme.type.webfontHref;
    document.head.appendChild(link);
    return () => link.remove();
  }, [theme]);
}

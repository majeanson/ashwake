import { NAME } from '@meta/identity';
import { crashEnvelope, type CrashReport } from '@meta/report';
import type { Strings } from '@text/Strings';
import { bootStrings } from './locale';
import { writeLastError } from './storage';

/**
 * The failure panel: plain DOM, no React, no three (Stage 4, 2026-08-29).
 *
 * It is written this way on purpose, and the purpose is the whole design: it
 * exists for exactly the moments React and WebGL are what broke. A panel built
 * out of the thing that failed is a panel that cannot appear.
 *
 * Every decision here is Ashwake 1's, paid for on Marc's own phone
 * (2026-08-19: *"lots of please reload errors... my end game screen got
 * cancelled"*):
 *
 * - **An OVERLAY, never a body replacement.** The old panel replaced the whole
 *   document, so one transient throw destroyed a perfectly good end screen.
 * - **CONTINUE beside RELOAD.** A transient error is survivable, and the
 *   autosave means RELOAD loses nothing either way — so the player picks.
 * - **It counts repeats** rather than stacking panels.
 * - **It shows the actual error**, because a phone has no console and the
 *   person holding it is the only one who can tell you what happened.
 * - **It remembers the last error** for SETTINGS.
 * - **Theme vars with their old literals as fallbacks.** This can fire before
 *   the theme has written a single custom property, so every `var()` degrades
 *   to exactly the look it always had.
 *
 * The privacy contract: **a report leaves the device only when a human taps
 * SEND REPORT.** Nothing here runs at boot, on error, or on a timer. The tap
 * is the consent, and `s.ui.privacy` says so in words on the settings screen.
 */

/** One line a human can send: name, message, and the top of the stack. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const stack = (error.stack ?? '')
      .split('\n')
      .slice(0, 4)
      .map((line) => line.trim())
      .join('\n');
    return `${error.name}: ${error.message}\n${stack}`.slice(0, 700);
  }
  try {
    return String(error).slice(0, 300);
  } catch {
    return 'unknown error';
  }
}

/**
 * A CHUNK THE SERVED DOCUMENT NAMES AND THE BUILD DOES NOT (`PASS.md` P8.1).
 *
 * `Board` is `lazy()`, so an `index.html` that survived a deploy asks for
 * hashed names the new build no longer serves and the import rejects. What
 * makes it its own class is that **React caches a `lazy` rejection**: the
 * second mount re-throws the stored error without making a request, so the
 * boundary's way back in cannot work — it clears the flag, the tree mounts,
 * and the same rejection arrives having touched no network.
 * `ui/staleChunk.test.tsx` counts the loader calls and proves it.
 *
 * `Boundary`'s own docblock states the rule this breaks: *"a button that says
 * CONTINUE has to continue into something."* So the panel stops offering one
 * here. It is not a fix for the loop — RELOAD is, and `NEXT.md` §1 carries the
 * decision about the slow-line case where even that can fail — but a button
 * that provably cannot work is worse than its absence, because pressing it
 * moves the repeat counter and teaches the player that the game is broken
 * rather than that the page is stale.
 *
 * Matched on the message, which is the only thing a module-load failure gives
 * you: browsers word it differently (Chromium *"Failed to fetch dynamically
 * imported module"*, WebKit *"Importing a module script failed"*, Firefox
 * *"error loading dynamically imported module"*) and none of them uses a
 * distinct error type. Broad on purpose: a false positive costs one hidden
 * button on a failure that was going to need a reload anyway.
 */
export function isStaleChunk(error: unknown): boolean {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return /dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
    message,
  );
}

/**
 * POST one report, and never throw.
 *
 * Lifted out of `meta/report.ts`, which asked for it in a comment: the
 * envelope is arithmetic and belongs in the core; `fetch` is an edge and
 * belongs here. Resolves false rather than throwing on every failure — the
 * caller is a button on a screen that exists because something already broke,
 * and a send that cannot land must turn into "try again or copy", never into a
 * second error.
 */
export async function sendCrashReport(report: CrashReport): Promise<boolean> {
  const { url, body } = crashEnvelope(report, newEventId(), new Date().toISOString());
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-sentry-envelope' },
      body,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** 32 hex chars, the id format Sentry wants. The fallback is for the odd
 *  embedded webview, where a weaker random id still beats a lost report. */
function newEventId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, '');
  } catch {
    let id = '';
    while (id.length < 32) id += Math.floor(Math.random() * 16).toString(16);
    return id;
  }
}

let seen = 0;

/** Where this run was being played, for the report's tag. */
function modeOf(): string {
  const params = new URLSearchParams(location.search);
  if (params.get('daily') !== null) return 'daily';
  return params.get('seed') !== null ? 'shared seed' : 'own world';
}

function remember(detail: string): void {
  if (detail === '') return;
  writeLastError({
    text: detail,
    sha: __BUILD_SHA__.slice(0, 7),
    at: new Date().toISOString(),
    count: seen,
  });
}

/**
 * Keep an error for SETTINGS without raising the panel over it.
 *
 * For the failures that RECOVER: something that throws and is caught leaves a
 * report worth reading and no alarm worth raising. Everything else goes
 * through `showFailure`.
 */
export function recordFailure(error: unknown): void {
  seen++;
  remember(describeError(error));
}

/**
 * No WebGL at all — the one boot failure that is the browser's, not ours.
 *
 * Only ever consulted when the board NEVER came up: probing for a context
 * while three holds a live one can push a phone at its context limit to drop
 * the oldest, which is the board itself. The probe releases what it took.
 */
function webglMissing(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') ?? probe.getContext('webgl');
    if (gl === null) return true;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return false;
  } catch {
    return true;
  }
}

let boardAlive = false;

/** The board calls this the moment it has drawn. After that, a failure is
 *  never "this browser has no WebGL" and the probe must not run at all. */
export function markBoardAlive(): void {
  boardAlive = true;
}

/**
 * THE MESSAGE A LOST BOARD CARRIES (`PASS.md` P8.3, 2026-09-10).
 *
 * `board/gl.ts` asks for a lost WebGL context back and gives the browser a few
 * seconds to return it. When it does not, the board is a blank canvas for the
 * life of the page while the shell goes on answering taps — the run is intact,
 * the HUD is live, and the one thing that cannot be true again is the picture.
 *
 * A sentinel rather than a fourth argument to `showFailure`: the panel already
 * classifies by asking questions ABOUT the failure it was handed, and this is
 * one more question with the same shape. `showBoardLost` is the only thing
 * that raises it, so the string never has to be guessed at from a browser's
 * own wording — unlike `isStaleChunk`, where the message is all there is.
 */
const BOARD_LOST = 'ashwake:board-lost';

/** What KIND of trouble the panel is about, decided once. */
type Trouble = 'no-webgl' | 'board-lost' | 'stale-chunk' | 'broke';

/**
 * The four, in the order they must be asked.
 *
 * `no-webgl` first because it is a fact about the DEVICE and outranks whatever
 * the error says: a browser that cannot draw at all is not going to be helped
 * by a sentence about a chunk. `board-lost` before `stale-chunk` because it is
 * ours and exact, where the chunk test is a broad match on a message.
 */
function troubleOf(error: unknown): Trouble {
  if (!boardAlive && webglMissing()) return 'no-webgl';
  if (error instanceof Error && error.message === BOARD_LOST) return 'board-lost';
  if (isStaleChunk(error)) return 'stale-chunk';
  return 'broke';
}

/**
 * The board had a context and lost it for good — raise the panel about that.
 *
 * Takes no strings and reads `bootStrings()` itself, because the board has
 * none: `Board.tsx` is handed a view, a theme and a palette, and threading a
 * catalogue through it for one sentence would put the locale in the renderer's
 * props for the life of the file. `Boundary` resolves the same way for the
 * same reason.
 */
export function showBoardLost(): void {
  showFailure(bootStrings(), new Error(BOARD_LOST));
}

const BUTTON =
  'min-height:44px;padding:0 24px;font:inherit;color:inherit;' +
  'background:var(--panel, #262b36);border:1px solid var(--panel-edge, #3a4150);border-radius:6px;';

export function showFailure(s: Strings, error?: unknown, onContinue?: () => void): void {
  seen++;
  const detail = error === undefined ? '' : describeError(error);
  remember(detail);

  // Already up: count the repeat and refresh the text rather than stacking a
  // second panel over the first.
  const existing = document.getElementById('boot-failure');
  if (existing !== null) {
    const count = existing.querySelector('#boot-failure-count');
    if (count !== null) count.textContent = s.ui.crash.seen(seen);
    if (detail !== '') {
      const shown = existing.querySelector('#boot-failure-detail');
      if (shown !== null) shown.textContent = detail;
    }
    return;
  }

  const panel = document.createElement('div');
  panel.id = 'boot-failure';
  panel.setAttribute('role', 'alert');
  panel.style.cssText =
    'position:fixed;inset:0;z-index:99;display:flex;flex-direction:column;gap:12px;' +
    'align-items:center;justify-content:center;' +
    // The fallback is the DEFAULT direction's ground, like `index.html`'s
    // pre-JS paint and the manifest — this said torchlit's, which is the
    // colour every literal in this project said before 2026-09-02.
    'background:color-mix(in srgb, var(--bg, #14100c) 94%, transparent);' +
    'color:var(--ink, #e6e9f0);' +
    'font-family:var(--font-body, system-ui, sans-serif);padding:24px;text-align:center;';

  /*
   * WHICH TROUBLE THIS IS, asked once and answered for both the sentence and
   * the buttons (P8.3, 2026-09-10 — it was two ad-hoc flags before, and a
   * third would have made three).
   *
   * The honest split the first one was written for still holds: a browser with
   * no WebGL cannot draw the board, will not be fixed by CONTINUE, and loops
   * on RELOAD. Telling that visitor "your run is saved" is a lie wearing a
   * stack trace.
   */
  const trouble = troubleOf(error);

  const words = document.createElement('p');
  words.textContent =
    trouble === 'no-webgl'
      ? s.ui.crash.noWebgl
      : trouble === 'board-lost'
        ? s.ui.crash.boardLost
        : s.ui.crash.broke;

  const count = document.createElement('p');
  count.id = 'boot-failure-count';
  count.textContent = s.ui.crash.seen(seen);
  // Faint ink at full opacity, not a veil — the panel doctrine, here too.
  count.style.cssText = 'color:var(--ink-faint, #767d8d);font-size:0.75rem;margin:0;';

  const shown = document.createElement('p');
  shown.id = 'boot-failure-detail';
  shown.textContent = detail;
  shown.style.cssText =
    'font-family:ui-monospace,Menlo,Consolas,monospace;font-size:0.6875rem;' +
    'color:var(--ink-dim, #8a91a0);' +
    'max-width:100%;overflow-wrap:anywhere;white-space:pre-wrap;text-align:left;' +
    'user-select:text;-webkit-user-select:text;margin:0;';

  // CONTINUE removes the panel and, where a caller gave one, puts back what
  // the panel was covering. A render error unmounts the whole React tree
  // before this is ever reached, so without the second half the button would
  // reveal a blank page while saying the run is still there — see `Boundary`.
  const go = button(s.ui.crash.continue, () => {
    panel.remove();
    onContinue?.();
  });
  go.dataset['crash'] = 'continue';
  const reload = button(s.ui.crash.reload, () => location.reload());
  reload.dataset['crash'] = 'reload';

  const mode = modeOf();

  const send = button(s.ui.crash.send, () => {
    send.disabled = true;
    send.textContent = s.ui.crash.sending;
    void sendCrashReport({
      build: __BUILD_SHA__.slice(0, 7),
      mode,
      count: seen,
      userAgent: navigator.userAgent,
      detail: shown.textContent ?? '',
    }).then((ok) => {
      if (ok) {
        send.textContent = s.ui.crash.sent;
      } else {
        send.disabled = false;
        send.textContent = s.ui.crash.sendFailed;
      }
    });
  });
  send.dataset['crash'] = 'send';

  const copy = button(s.ui.crash.copy, () => {
    // Enough context to act on: a stack trace alone cannot say which build,
    // which browser or which mode it came from, and the person pasting it is a
    // stranger who will not know to add any of that. Nothing here identifies
    // the player — a UA string is what the report is ABOUT.
    const text =
      `${NAME} ${__BUILD_SHA__.slice(0, 7)} · ${mode} · ${s.ui.crash.seen(seen)}\n` +
      `${navigator.userAgent}\n\n${shown.textContent ?? ''}`;
    // `navigator.clipboard` is undefined outside a secure context and the
    // property ACCESS throws — into the very error listener whose panel this
    // button sits on, overwriting the report it was copying. The try wraps the
    // reach, not just the promise.
    try {
      if (navigator.clipboard === undefined) throw new Error('no clipboard');
      void navigator.clipboard.writeText(text).then(
        () => {
          copy.textContent = s.ui.copied;
        },
        () => {
          copy.textContent = s.ui.crash.selectAbove;
        },
      );
    } catch {
      copy.textContent = s.ui.crash.selectAbove;
    }
  });
  copy.dataset['crash'] = 'copy';

  const row = document.createElement('div');
  row.style.cssText = 'display:flex;gap:12px;flex-wrap:wrap;justify-content:center;';
  /*
   * WHO GETS A WAY BACK IN, which is the same rule three times: a button that
   * says CONTINUE has to continue into something.
   *
   *   no-webgl    Nothing underneath to continue into, and nothing useful to
   *               report — the message already says all there is to say.
   *   stale-chunk A game underneath and a report worth sending; CONTINUE
   *               provably re-enters the same cached rejection (P8.1).
   *   board-lost  A live shell and a saved run underneath, so the report is
   *               worth having — but the canvas will not draw again on this
   *               page, and CONTINUE would hand back a black rectangle with a
   *               working HUD on top of it (P8.3).
   */
  if (trouble === 'no-webgl') row.append(reload);
  else if (trouble === 'stale-chunk' || trouble === 'board-lost') row.append(reload, send, copy);
  else row.append(go, reload, send, copy);

  panel.replaceChildren(words, count, shown, row);
  document.body.appendChild(panel);
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.textContent = label;
  el.style.cssText = BUTTON;
  el.addEventListener('click', onClick);
  return el;
}

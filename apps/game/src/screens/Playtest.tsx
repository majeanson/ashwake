import { useEffect, useState } from 'react';
import { Panel } from '../ui/Panel';
import {
  elapsed,
  KIND_LABEL,
  KINDS,
  MARK_LABEL,
  MARKS,
  sheetText,
  type NoteKind,
  type Sheet,
} from '../shell/playtest';

/**
 * THE STRANGER CONSOLE (Stage 6, 2026-09-08) — behind `?playtest=1`.
 *
 * `PLAYTEST.md` Session C is v2.0's gate, it has never been run on either
 * body, and its instrument until now was a paper form. A stranger is a
 * one-shot resource; the thing that records them has to exist before they sit
 * down. This is that thing, and `shell/playtest.ts` is its model and the whole
 * argument for its shape.
 *
 * **The four facts are already answered when this opens.** Marc does not tap
 * them — `App` marks them off the `act` seam as they happen, with the elapsed
 * time the paper form leaves as `after how long? ____`. What is left for a
 * human is the only part a human can do: writing down what the stranger SAID
 * and where they stopped.
 *
 * ## The design constraint is that Marc is not looking at this screen
 *
 * He is watching a person's hands. So:
 *
 *   - **Three buttons, one row, always in the same place.** Pick the list,
 *     type the line, ENTER. No modes, no scrolling to find the control.
 *   - **The input keeps focus after a note lands**, because the second thing
 *     somebody says arrives while you are still writing the first.
 *   - **Nothing is destructive without being obvious.** ✕ on a note is the
 *     only removal and it takes one tap, because a typo at this table costs
 *     more attention to fix carefully than to fix twice.
 *   - **COPY SHEET is always live**, on a half-finished sheet, said in the
 *     button's own note. Nothing here is persisted (see the model), so
 *     "copy early, copy often" is the mitigation and it has to be visible.
 *
 * In one language, like the debug line, and for the same reason: no player
 * ever reaches it. `DECISIONS.md` D4 governs the sentences a PLAYER reads.
 */

export type PlaytestProps = {
  readonly sheet: Sheet;
  readonly today: string;
  readonly onNote: (kind: NoteKind, text: string) => void;
  readonly onUnnote: (at: number) => void;
  readonly onBack: () => void;
};

const SHORT: Readonly<Record<NoteKind, string>> = {
  asked: 'ASKED',
  hesitated: 'HESITATED',
  surprised: 'SURPRISED',
};

/**
 * The running clock, ticking once a second while the console is open.
 *
 * A state rather than `Date.now()` in the render body, which is what it was
 * and which the compiler correctly refuses: a render that reads the clock
 * produces a different answer every time React happens to re-run it, so the
 * number would jump on an unrelated keystroke and sit still the rest of the
 * time. A tick is the honest version — it says a second has passed because a
 * second has passed.
 *
 * Only while the panel is open, and only once the run has begun: this is the
 * one screen in the app that deliberately re-renders on a timer, and it can
 * afford to because it is never on top of a board somebody is playing.
 */
function useTick(from: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (from === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [from]);
  return now;
}

export function Playtest({ sheet, today, onNote, onUnnote, onBack }: PlaytestProps) {
  const [kind, setKind] = useState<NoteKind>('asked');
  const [text, setText] = useState('');
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const now = useTick(sheet.startedAt);

  const add = (): void => {
    if (text.trim() === '') return;
    onNote(kind, text);
    setText('');
    setCopied('idle');
  };

  const copy = (): void => {
    // No share sheet and no fallback ladder, unlike `shell/share.ts`: this is
    // one person on their own phone putting text somewhere they can paste it,
    // and a share sheet would put a modal between them and the stranger.
    void navigator.clipboard
      .writeText(sheetText(sheet, today))
      .then(() => setCopied('copied'))
      .catch(() => setCopied('failed'));
  };

  return (
    <Panel
      id="playtest"
      title="SESSION C — THE STRANGER"
      back="Close the console"
      closeAll="Close everything"
      onBack={onBack}
    >
      <section>
        <p className="note">
          {sheet.startedAt === null
            ? 'The clock starts when they begin a run.'
            : `Watching · ${elapsed(now - sheet.startedAt)} in`}
        </p>
        <ul className="playtest-facts">
          {MARKS.map((which, i) => {
            const at = sheet.marks[which];
            return (
              <li key={which} data-fact={which} data-met={at !== undefined}>
                <span className="fact-label">
                  {i + 1}. {MARK_LABEL[which]}
                  {which === 'again' && ' ← THE GATE'}
                </span>
                <b>{at === undefined ? '—' : elapsed(at)}</b>
              </li>
            );
          })}
        </ul>
        <p className="note">
          These four record themselves. Nothing here needs a verdict at the time — a confusing
          moment is a FINDING, not a failure.
        </p>
      </section>

      <section>
        <div className="panel-menu" role="group" aria-label="Which list">
          {KINDS.map((each) => (
            <button
              key={each}
              type="button"
              data-kind={each}
              aria-pressed={kind === each}
              onClick={() => setKind(each)}
            >
              {SHORT[each]}
            </button>
          ))}
        </div>
        <label className="playtest-entry">
          <span className="fact-label">{KIND_LABEL[kind]}</span>
          <textarea
            data-playtest="entry"
            rows={2}
            value={text}
            placeholder="Their words, verbatim"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              // ENTER lands the line; SHIFT+ENTER is a newline, for the rare
              // quote that needs one. The input keeps focus either way.
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                add();
              }
            }}
          />
        </label>
        <button type="button" data-playtest="add" onClick={add} disabled={text.trim() === ''}>
          ADD TO {SHORT[kind]}
        </button>
      </section>

      <section>
        <h2 className="fact-label">WRITTEN DOWN · {sheet.notes.length}</h2>
        {sheet.notes.length === 0 ? (
          <p className="note">Nothing yet. Every question they ask out loud is a bug.</p>
        ) : (
          <ul className="playtest-notes">
            {sheet.notes.map((each, at) => (
              <li key={`${each.atMs}-${at}`} data-note={each.kind}>
                <span className="fact-label">
                  [{elapsed(each.atMs)}] {SHORT[each.kind]}
                </span>
                <span>{each.text}</span>
                <button
                  type="button"
                  data-playtest="drop"
                  aria-label={`Remove: ${each.text}`}
                  onClick={() => onUnnote(at)}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <button type="button" data-playtest="copy" onClick={copy}>
          {copied === 'copied'
            ? 'COPIED'
            : copied === 'failed'
              ? 'COPY FAILED — TRY AGAIN'
              : 'COPY SHEET'}
        </button>
        <p className="note">
          Nothing here is saved to this device. Copy whenever — a half-finished sheet copies fine,
          and the clipboard is the only place this survives.
        </p>
        <pre className="playtest-preview" aria-label="The sheet as it will be copied">
          {sheetText(sheet, today)}
        </pre>
      </section>
    </Panel>
  );
}

/**
 * THE STRANGER'S SHEET (Stage 6, 2026-09-08).
 *
 * `PLAYTEST.md` Session C is v2.0's gate and it has never been run on either
 * body. Its instrument is a paper form — four facts and three lists — and the
 * file says the one thing that matters about filling it in: *"Written before
 * the run rather than during it, because the one thing that cannot be
 * recovered is what a person did in their first minute."*
 *
 * A stranger is a one-shot resource. So the console that records them has to
 * exist BEFORE they sit down, not after, and this is it.
 *
 * ## The four facts record THEMSELVES
 *
 * This is the whole reason it is code rather than a form. Three of the four —
 * placed, popped, finished — are things the game already knows the moment they
 * happen, and the fourth, *started another*, is the gate. Asking Marc to
 * notice and tap while also watching a stranger's hands is asking him to do
 * the one job badly at the moment it counts. `App` marks them off the same
 * `act` seam the receipts, the voice and the buzz ride, so the sheet is a
 * TRANSCRIPT rather than a memory.
 *
 * And each one carries the elapsed time, which is the question the paper form
 * leaves blank as *"after how long? ____"* — a number nobody has ever been
 * able to fill in honestly from memory.
 *
 * ## What it will not do
 *
 * **It does not judge.** No verdicts, no scoring, no "PASSED". `PLAYTEST.md`:
 * *a confusing moment is a FINDING, not a failure*. The sheet is facts and
 * quotes, and the reading of them happens afterwards in `LOG.md`.
 *
 * **It does not persist.** Nothing here is written to storage, and that is a
 * decision rather than an omission: a scratchpad in a player's device is a key
 * that backup, restore, the shed ladder and `clearEverything` would each need
 * an opinion about, for data that belongs in Marc's clipboard. What replaces
 * persistence is that COPY SHEET works at every moment of the run, on a
 * half-finished sheet, and the console says so.
 *
 * **It is in one language**, like `debugLine` and for the same reason: it is
 * an observer's instrument and the observer is Marc. `DECISIONS.md` D4 governs
 * *"every sentence a player reads"*, and no player ever reads this — it is
 * behind `?playtest=1`, which is the `?ff=` idiom for a surface with no row on
 * anybody's screen.
 */

/** The four facts, in the order `PLAYTEST.md` numbers them. */
export const MARKS = ['placed', 'popped', 'finished', 'again'] as const;
export type Mark = (typeof MARKS)[number];

/** The sheet's own words for each, matching the paper form line for line. */
export const MARK_LABEL: Readonly<Record<Mark, string>> = {
  placed: 'PLACED A TILE UNAIDED',
  popped: 'POPPED A POCKET UNAIDED',
  finished: 'FINISHED THE RUN',
  again: 'STARTED ANOTHER',
};

/** The three lists under the facts. Each note is one line, verbatim. */
export const KINDS = ['asked', 'hesitated', 'surprised'] as const;
export type NoteKind = (typeof KINDS)[number];

export const KIND_LABEL: Readonly<Record<NoteKind, string>> = {
  asked: 'EVERY QUESTION THEY ASKED OUT LOUD  (each one is a bug, verbatim)',
  hesitated: 'EVERY PLACE THEY HESITATED, AND FOR HOW LONG',
  surprised: 'WHAT THEY DID THAT THE GAME DID NOT EXPECT',
};

export type Note = {
  readonly kind: NoteKind;
  readonly text: string;
  /** Milliseconds since the run began — the same clock the marks use. */
  readonly atMs: number;
};

export type Sheet = {
  /**
   * When the watched run began, as `Date.now()`, or null before it has.
   *
   * Null is a real state and not a placeholder: the console is opened BEFORE
   * the stranger touches anything, which is the whole point, so every elapsed
   * time is measured from a start that has not happened yet.
   */
  readonly startedAt: number | null;
  /** Milliseconds after `startedAt` at which each fact first became true. */
  readonly marks: Readonly<Partial<Record<Mark, number>>>;
  readonly notes: readonly Note[];
  /** Filled at open: the two header lines the paper form asks for. */
  readonly device: string;
  readonly skin: string;
};

export const emptySheet = (device: string, skin: string): Sheet => ({
  startedAt: null,
  marks: {},
  notes: [],
  device,
  skin,
});

/** The clock starts when the stranger's run does, not when the console opened. */
export const startClock = (sheet: Sheet, now: number): Sheet =>
  sheet.startedAt === null ? { ...sheet, startedAt: now } : sheet;

/**
 * Record a fact, the FIRST time it is true and never after.
 *
 * Once-only is the whole meaning of the question: "placed a tile unaided" asks
 * when they first managed it, and a second placement is not news. It also
 * makes the caller free — `App` can mark on every dispatch without needing to
 * know whether this one is the first.
 *
 * A mark before the clock starts is dropped rather than recorded at zero. The
 * only way to reach one is to be watching a run that began before the console
 * opened, and a sheet whose facts are timed against nothing is worse than a
 * sheet that says the fact is missing.
 */
export function mark(sheet: Sheet, which: Mark, now: number): Sheet {
  if (sheet.startedAt === null) return sheet;
  if (sheet.marks[which] !== undefined) return sheet;
  return { ...sheet, marks: { ...sheet.marks, [which]: now - sheet.startedAt } };
}

/**
 * THE GATE: a run begun AFTER one was finished.
 *
 * `PLAYTEST.md` — *"did they place without help? pop? finish? **start
 * another?** The last one is the gate."* — and the rule lives here rather than
 * at the call site because it is the one fact on this sheet that is a
 * RELATIONSHIP between two moments rather than a moment. Every door into a run
 * comes through `enterRun`, including the very first one, so a caller that
 * simply marked on arrival would report the gate passed before the stranger
 * had placed a tile.
 *
 * Deliberately not "finished AND started another WORLD" or any narrower thing:
 * D1 ruling 3 asks whether they chose to go again, and a daily, a new run and
 * a different world are all going again.
 */
export const startedAnother = (sheet: Sheet, now: number): Sheet =>
  sheet.marks.finished === undefined ? sheet : mark(sheet, 'again', now);

/** Add one observed line. Blank text is refused, so a stray tap adds nothing. */
export function note(sheet: Sheet, kind: NoteKind, text: string, now: number): Sheet {
  const said = text.trim();
  if (said === '') return sheet;
  const atMs = sheet.startedAt === null ? 0 : now - sheet.startedAt;
  return { ...sheet, notes: [...sheet.notes, { kind, text: said, atMs }] };
}

/** Take one back — the mis-tap and the typo, which are guaranteed at a table
 *  where somebody is also watching a person. */
export const unnote = (sheet: Sheet, at: number): Sheet => ({
  ...sheet,
  notes: sheet.notes.filter((_, i) => i !== at),
});

/** `m:ss` from the run's start. Minutes rather than a wall clock, because
 *  every question this sheet asks is about the FIRST MINUTE. */
export function elapsed(ms: number): string {
  const whole = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/**
 * The sheet, as the text COPY SHEET puts on the clipboard.
 *
 * Deliberately the SAME SHAPE as the block in `PLAYTEST.md` — the person
 * reading this in a week is reading it beside that file, and a console that
 * invented its own layout would make them translate. The blanks are filled
 * where the game knew the answer and left as the form's own `____` where it
 * did not, so what is missing is visibly missing.
 */
export function sheetText(sheet: Sheet, today: string): string {
  const answer = (which: Mark): string => {
    const at = sheet.marks[which];
    return at === undefined ? 'no ' : `yes  at ${elapsed(at)}`;
  };
  const lines: string[] = [
    'ASHWAKE 2 — SESSION C, THE STRANGER TEST',
    '',
    `DATE / DEVICE            ${today} · ${sheet.device}`,
    `SKIN IT OPENED IN        ${sheet.skin}`,
    '',
  ];
  MARKS.forEach((which, i) => {
    const gate = which === 'again' ? '   ← THE GATE' : '';
    lines.push(`${i + 1}. ${MARK_LABEL[which].padEnd(30)} ${answer(which)}${gate}`);
  });

  for (const kind of KINDS) {
    const mine = sheet.notes.filter((n) => n.kind === kind);
    lines.push('', KIND_LABEL[kind]);
    // A dash on its own is the paper form's empty row, and it is worth
    // keeping: "nothing was written here" and "this list was never reached"
    // look the same in a week unless the blank is printed.
    if (mine.length === 0) lines.push('  -');
    for (const each of mine) lines.push(`  - [${elapsed(each.atMs)}] ${each.text}`);
  }

  lines.push(
    '',
    sheet.marks.again === undefined
      ? 'THEY DID NOT START ANOTHER — the reason they stopped is the most valuable'
      : 'THEY STARTED ANOTHER — D1 ruling 3 is answered.',
    sheet.marks.again === undefined
      ? 'sentence this project has collected. It names the next milestone.'
      : '',
  );
  return lines.filter((line, i) => !(line === '' && lines[i - 1] === '')).join('\n');
}

/**
 * A short, honest name for the phone this is being watched on.
 *
 * The paper form asks for *"iOS or Android, and roughly which"*, and roughly
 * is the operative word — this is a label on a note, not telemetry. Read from
 * the user agent because that is the only thing a browser will say, and kept
 * to the two facts the form asks for so the sheet does not carry a
 * fingerprint-length string into `LOG.md`.
 */
export function deviceName(ua: string): string {
  const os = /iPhone|iPad|iPod/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : 'unknown';
  const browser = /CriOS|Chrome/.test(ua)
    ? 'Chrome'
    : /FxiOS|Firefox/.test(ua)
      ? 'Firefox'
      : /Safari/.test(ua)
        ? 'Safari'
        : 'unknown browser';
  const version = /(?:Android|CPU(?: iPhone)? OS) ([\d_.]+)/.exec(ua)?.[1]?.replace(/_/g, '.');
  return version === undefined ? `${os} · ${browser}` : `${os} ${version} · ${browser}`;
}

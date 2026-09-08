import { describe, expect, it } from 'vitest';
import {
  deviceName,
  elapsed,
  emptySheet,
  mark,
  note,
  sheetText,
  startClock,
  startedAnother,
  unnote,
  type Sheet,
} from './playtest';

/**
 * The stranger's sheet.
 *
 * Tested harder than its size suggests it deserves, for one reason: it runs
 * exactly once, beside a person who will not come back, and a bug in it costs
 * the datapoint this whole body has been built toward. `PLAYTEST.md` calls a
 * stranger a one-shot resource; a recorder for a one-shot resource does not
 * get to be debugged in the field.
 */

const T0 = 1_757_000_000_000;
const open = (): Sheet => emptySheet('Android 14 · Chrome', 'settlement');
const running = (): Sheet => startClock(open(), T0);

describe('the clock', () => {
  it('does not start until the run does', () => {
    // The console is opened BEFORE the stranger touches anything, which is the
    // whole point of it existing early.
    expect(open().startedAt).toBeNull();
  });

  it('starts once, and a second run does not reset the sheet', () => {
    const first = startClock(open(), T0);
    const again = startClock(first, T0 + 90_000);
    expect(again.startedAt, 'the clock restarted and lost the first minute').toBe(T0);
  });

  it('counts in minutes and seconds, which is the scale every question is at', () => {
    expect(elapsed(0)).toBe('0:00');
    expect(elapsed(9_400)).toBe('0:09');
    expect(elapsed(75_000)).toBe('1:15');
    expect(elapsed(-5)).toBe('0:00');
  });
});

describe('the four facts', () => {
  it('records the FIRST time each is true and never again', () => {
    let sheet = running();
    sheet = mark(sheet, 'placed', T0 + 12_000);
    sheet = mark(sheet, 'placed', T0 + 30_000);
    expect(sheet.marks.placed, 'a later placement overwrote the first').toBe(12_000);
  });

  it('drops a mark that arrives before the clock started', () => {
    // The only way here is watching a run that began before the console
    // opened. A fact timed against nothing is worse than a missing one.
    const sheet = mark(open(), 'placed', T0);
    expect(sheet.marks.placed).toBeUndefined();
  });

  it('leaves untouched facts absent rather than false', () => {
    const sheet = mark(running(), 'placed', T0 + 1000);
    expect(sheet.marks.popped).toBeUndefined();
    expect(Object.keys(sheet.marks)).toEqual(['placed']);
  });
});

describe('the three lists', () => {
  it('keeps a quote verbatim, with the moment it was said', () => {
    const sheet = note(running(), 'asked', '  what do the numbers mean?  ', T0 + 45_000);
    expect(sheet.notes).toEqual([
      { kind: 'asked', text: 'what do the numbers mean?', atMs: 45_000 },
    ]);
  });

  it('refuses a blank, so a stray tap adds nothing', () => {
    expect(note(running(), 'asked', '   ', T0 + 1000).notes).toEqual([]);
  });

  it('takes one back, for the mis-tap that is guaranteed at a table', () => {
    let sheet = running();
    sheet = note(sheet, 'asked', 'first', T0 + 1000);
    sheet = note(sheet, 'asked', 'oops', T0 + 2000);
    sheet = note(sheet, 'hesitated', 'third', T0 + 3000);
    expect(unnote(sheet, 1).notes.map((n) => n.text)).toEqual(['first', 'third']);
  });

  it('times a note taken before the run began at zero rather than dropping it', () => {
    // Unlike a mark: a thing somebody SAID while looking at the front door is
    // still a finding, and the front door is part of the first minute.
    expect(note(open(), 'asked', 'is this a game?', T0).notes[0]?.atMs).toBe(0);
  });
});

describe('the sheet, as it reaches the clipboard', () => {
  it('answers the questions the game knew, and leaves the rest visibly no', () => {
    let sheet = running();
    sheet = mark(sheet, 'placed', T0 + 22_000);
    sheet = mark(sheet, 'popped', T0 + 61_000);
    const text = sheetText(sheet, '2026-09-08');

    expect(text).toContain('PLACED A TILE UNAIDED');
    expect(text).toContain('yes  at 0:22');
    expect(text).toContain('yes  at 1:01');
    expect(text).toMatch(/FINISHED THE RUN\s+no/);
    expect(text).toContain('2026-09-08 · Android 14 · Chrome');
    expect(text).toContain('settlement');
  });

  it('names the gate, and says what a no means', () => {
    const no = sheetText(running(), '2026-09-08');
    expect(no).toContain('← THE GATE');
    expect(no).toContain('THEY DID NOT START ANOTHER');

    const yes = sheetText(mark(running(), 'again', T0 + 240_000), '2026-09-08');
    expect(yes).toContain('THEY STARTED ANOTHER');
    expect(yes, 'a passing sheet still carried the failure sentence').not.toContain(
      'THEY DID NOT START ANOTHER',
    );
  });

  it('prints an empty list as the form’s own blank row', () => {
    // "nothing was written here" and "this list was never reached" look the
    // same in a week unless the blank is printed.
    const text = sheetText(running(), '2026-09-08');
    for (const heading of ['ASKED OUT LOUD', 'HESITATED', 'DID NOT EXPECT']) {
      expect(text).toContain(heading);
    }
    expect(text.split('\n').filter((l) => l === '  -')).toHaveLength(3);
  });

  it('groups the notes under their own headings, in the order they were said', () => {
    let sheet = running();
    sheet = note(sheet, 'hesitated', 'stared at the hand', T0 + 5_000);
    sheet = note(sheet, 'asked', 'which one do I tap?', T0 + 8_000);
    sheet = note(sheet, 'asked', 'did I win?', T0 + 120_000);
    const lines = sheetText(sheet, '2026-09-08').split('\n');

    const askedAt = lines.findIndex((l) => l.includes('ASKED OUT LOUD'));
    expect(lines[askedAt + 1]).toBe('  - [0:08] which one do I tap?');
    expect(lines[askedAt + 2]).toBe('  - [2:00] did I win?');
    const hesitatedAt = lines.findIndex((l) => l.includes('HESITATED'));
    expect(lines[hesitatedAt + 1]).toBe('  - [0:05] stared at the hand');
  });
});

describe('the device label', () => {
  it('says the two things the paper form asks for, and no more', () => {
    expect(
      deviceName(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('iOS 18.2 · Safari');
    expect(
      deviceName(
        'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe('Android 14 · Chrome');
  });

  it('says unknown rather than guessing', () => {
    expect(deviceName('some crawler/1.0')).toBe('unknown · unknown browser');
  });
});

describe('the gate', () => {
  it('does not count the FIRST run, which comes through the same door', () => {
    // Every way into a run calls `enterRun`, including the one that starts the
    // stranger's first. Marking on arrival would report the gate passed before
    // they had placed a tile.
    const sheet = startedAnother(running(), T0 + 1000);
    expect(sheet.marks.again).toBeUndefined();
  });

  it('counts a run begun after one was finished', () => {
    let sheet = running();
    sheet = mark(sheet, 'finished', T0 + 180_000);
    sheet = startedAnother(sheet, T0 + 200_000);
    expect(sheet.marks.again).toBe(200_000);
  });

  it('keeps the first going-again, not the third', () => {
    let sheet = mark(running(), 'finished', T0 + 100_000);
    sheet = startedAnother(sheet, T0 + 120_000);
    sheet = startedAnother(sheet, T0 + 400_000);
    expect(sheet.marks.again).toBe(120_000);
  });
});

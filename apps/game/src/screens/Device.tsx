import { useMemo, useState } from 'react';
import { buildBackup, decodeBackup, describeBackup, encodeBackup } from '@meta/backup';
import type { Strings } from '@text/Strings';
import { Confirming } from '../ui/Confirming';
import { Panel, PanelMenu } from '../ui/Panel';
import { handOff } from '../shell/share';
import { isEphemeral, readAll, writeAll } from '../shell/storage';

/**
 * THIS DEVICE — a room, not a footer (2026-08-31).
 *
 * Marc: *"make sure in the more menu, the whole Cet appareil subsection is
 * transformed into a new menu (similar to My worlds)."* It was a `<section>`
 * under MORE's menu: a heading, three buttons, a paste box and two notes, all
 * standing open under the list of places to go. So MORE was a short menu with a
 * long screen hanging off the bottom of it, and the three things on this device
 * that can destroy something were the part of MORE you had to scroll past.
 *
 * It is a door in that list now, exactly like MY WORLDS: one row, one panel,
 * one thing in front of you at a time. That is also the shape the split always
 * argued for — Ashwake 1 separated these from the places to GO so that a player
 * looking for the manual is never one mis-tap from erasing three worlds, and a
 * room enforces what a heading only asked for.
 *
 * On a device that cannot keep anything — a private window, storage blocked —
 * the whole room is the sentence saying so. Offering BACK UP on a device with
 * nothing to back up is a promise that breaks on the tap.
 *
 * **A device is never overwritten by a file nobody has looked at.** The paste
 * is parsed as it is typed, so the arm can name what is about to land — "3
 * worlds · 412 relics" — rather than asking a question about a blob, and a file
 * that is not a backup says so at the moment it is pasted rather than by doing
 * nothing at the moment it is confirmed. `meta/backup.ts`'s own header calls a
 * backup that silently restores nothing worse than no backup at all; this
 * screen is where that is either true or a lie.
 */

type DeviceProps = {
  readonly s: Strings;
  readonly onBack: () => void;
  /** Everything gone. The caller reloads, because a shell that survives its
   *  own erasure is a shell holding state that no longer exists. */
  readonly onReset: () => void;
  readonly onRestored: () => void;
};

export function Device({ s, onBack, onReset, onRestored }: DeviceProps) {
  const [pasted, setPasted] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const parsed = useMemo(() => decodeBackup(pasted.trim() === '' ? null : pasted), [pasted]);

  /**
   * One live region, present from the first render and filled later.
   *
   * A `role="status"` inserted into the tree at the moment it gains text is a
   * region assistive tech never announces — Ashwake 1 shipped three of those
   * before it learned. So the paragraph always exists, and this is what it says.
   */
  const said =
    note ??
    (pasted.trim() === ''
      ? ''
      : parsed === null
        ? s.backup.refused
        : parsed.legacy
          ? `${describeBackup(parsed, s)} · ${s.backup.fromV1}`
          : describeBackup(parsed, s));

  const backUp = async (): Promise<void> => {
    const now = new Date();
    const text = encodeBackup(
      buildBackup(readAll(), { sha: __BUILD_SHA__, at: now.toISOString() }),
    );
    const how = await handOff(`ashwake-backup-${now.toISOString().slice(0, 10)}.json`, text);
    setNote(how === 'failed' ? s.backup.failed : s.backup.saved(how));
  };

  return (
    <Panel
      id="device"
      title={s.ui.thisDevice}
      back={s.ui.back}
      closeAll={s.ui.closeAll}
      onBack={onBack}
    >
      {isEphemeral() ? (
        <p className="note">{s.ui.noStorage}</p>
      ) : (
        <>
          <PanelMenu>
            <button
              type="button"
              data-device="backup"
              onClick={() => {
                void backUp();
              }}
            >
              {s.ui.backUp}
            </button>
            <Confirming
              label={s.ui.restore}
              // The consequence, and what it is about to be replaced BY.
              armed={
                parsed === null
                  ? s.ui.restoreArmed
                  : `${s.ui.restoreArmed} ${describeBackup(parsed, s)}`
              }
              onConfirm={() => {
                // Nothing to restore is not a silent no-op: the region says why.
                if (parsed === null) {
                  setNote(s.backup.refused);
                  return;
                }
                // Replace, never merge (Ashwake 1's ruling): a merged backup is
                // two histories interleaved, and nobody can say what that device
                // now is.
                writeAll(parsed);
                onRestored();
              }}
            />
            <Confirming label={s.ui.resetAll} armed={s.ui.resetAllArmed} onConfirm={onReset} />
          </PanelMenu>
          <label className="paste">
            <span className="fact-label">{s.ui.restore}</span>
            <textarea
              rows={3}
              value={pasted}
              placeholder={s.backup.paste}
              spellCheck={false}
              onChange={(event) => {
                setPasted(event.target.value);
                setNote(null);
              }}
            />
          </label>
          <p className="note" role="status">
            {said}
          </p>
        </>
      )}
      <p className="note">{s.ui.privacy}</p>
    </Panel>
  );
}

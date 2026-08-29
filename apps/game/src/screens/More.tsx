import { useMemo, useState } from 'react';
import { buildBackup, decodeBackup, describeBackup, encodeBackup } from '@meta/backup';
import type { Strings } from '@text/Strings';
import { Confirming } from '../ui/Confirming';
import { Panel, PanelMenu } from '../ui/Panel';
import { handOff } from '../shell/share';
import { isEphemeral, readAll, writeAll } from '../shell/storage';

/**
 * MORE — everything that is not the run (Stage 4, 2026-08-29).
 *
 * Two menus, and the split is the point. The first is places to GO; the second
 * is THIS DEVICE, which is where the four things that can destroy something
 * live, together, behind their own heading. Ashwake 1 separated them for that
 * reason: a player looking for the manual should never be one mis-tap from
 * erasing three worlds.
 *
 * On a device that cannot keep anything — a private window, storage blocked —
 * the whole second menu is replaced by the sentence saying so. Offering BACK UP
 * on a device with nothing to back up is a promise that breaks on the tap.
 */

export type MoreProps = {
  readonly s: Strings;
  readonly virgin: boolean;
  readonly onBack: () => void;
  readonly onHowToPlay: () => void;
  readonly onFame: () => void;
  readonly onSettings: () => void;
  readonly onShop: () => void;
  readonly onWorlds: () => void;
  readonly onDaily: () => void;
  /** Everything gone. The caller reloads, because a shell that survives its
   *  own erasure is a shell holding state that no longer exists. */
  readonly onReset: () => void;
  readonly onRestored: () => void;
};

export function More({
  s,
  virgin,
  onBack,
  onHowToPlay,
  onFame,
  onSettings,
  onShop,
  onWorlds,
  onDaily,
  onReset,
  onRestored,
}: MoreProps) {
  return (
    <Panel id="more" title={s.ui.more} back={s.ui.back} closeAll={s.ui.closeAll} onBack={onBack}>
      <PanelMenu>
        <button type="button" data-go="manual" onClick={onHowToPlay}>
          {s.ui.howToPlay}
        </button>
        <button type="button" data-go="daily" onClick={onDaily}>
          {s.ui.daily}
        </button>
        <button type="button" data-go="worlds" onClick={onWorlds}>
          {s.ui.worlds}
        </button>
        {!virgin && (
          <button type="button" data-go="shop" onClick={onShop}>
            {s.ui.shop}
          </button>
        )}
        {!virgin && (
          <button type="button" data-go="fame" onClick={onFame}>
            {s.ui.tabs.after}
          </button>
        )}
        <button type="button" data-go="settings" onClick={onSettings}>
          {s.ui.settings}
        </button>
      </PanelMenu>

      <section>
        <h2 className="fact-label">{s.ui.thisDevice}</h2>
        {isEphemeral() ? (
          <p className="note">{s.ui.noStorage}</p>
        ) : (
          <TheDevice s={s} onReset={onReset} onRestored={onRestored} />
        )}
        <p className="note">{s.ui.privacy}</p>
      </section>
    </Panel>
  );
}

/**
 * BACK UP · RESTORE · RESET ALL — the three things that can destroy something.
 *
 * Its own component because it is the only part of MORE that holds state, and
 * because the rule it enforces is worth stating once: **a device is never
 * overwritten by a file nobody has looked at.** The paste is parsed as it is
 * typed, so the arm can name what is about to land — "3 worlds · 412 relics" —
 * rather than asking a question about a blob, and a file that is not a backup
 * says so at the moment it is pasted rather than by doing nothing at the moment
 * it is confirmed. `meta/backup.ts`'s own header calls a backup that silently
 * restores nothing worse than no backup at all; this screen is where that is
 * either true or a lie.
 */
function TheDevice({
  s,
  onReset,
  onRestored,
}: {
  readonly s: Strings;
  readonly onReset: () => void;
  readonly onRestored: () => void;
}) {
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
              : `${s.ui.restoreArmed} — ${describeBackup(parsed, s)}`
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
  );
}

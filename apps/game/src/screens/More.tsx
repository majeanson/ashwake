import { buildBackup, decodeBackup, describeBackup, encodeBackup } from '@meta/backup';
import type { Strings } from '@text/Strings';
import { Confirming } from '../ui/Confirming';
import { Panel, PanelMenu } from '../ui/Panel';
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
          <PanelMenu>
            <button
              type="button"
              onClick={() => {
                // The clipboard is the share sheet's simplest form and the one
                // that works everywhere. A backup nobody can paste back is not
                // a backup.
                void navigator.clipboard?.writeText(
                  encodeBackup(
                    buildBackup(readAll(), {
                      sha: __BUILD_SHA__,
                      at: new Date().toISOString(),
                    }),
                  ),
                );
              }}
            >
              {s.ui.backUp}
            </button>
            <Confirming
              label={s.ui.restore}
              armed={s.ui.restoreArmed}
              onConfirm={() => {
                const raw = prompt(s.ui.restore);
                const backup = decodeBackup(raw);
                if (backup === null) return;
                // Replace, never merge (Ashwake 1's ruling): a merged backup is
                // two histories interleaved, and nobody can say what that
                // device now is.
                writeAll(backup.keys);
                onRestored();
              }}
            />
            <Confirming label={s.ui.resetAll} armed={s.ui.resetAllArmed} onConfirm={onReset} />
          </PanelMenu>
        )}
        <p className="note">{s.ui.privacy}</p>
      </section>
    </Panel>
  );
}

/** What a pasted backup says about itself, for the arming label. */
export const describe = describeBackup;

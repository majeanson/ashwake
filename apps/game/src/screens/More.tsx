import type { Strings } from '@text/Strings';
import { Confirming } from '../ui/Confirming';
import { Fold } from '../ui/Fold';
import { Icon } from '../ui/Icon';
import { Panel, PanelMenu } from '../ui/Panel';

/**
 * MENU — the one door to everything that is not the run (Stage 4, 2026-08-29;
 * made the ONLY one, 2026-09-03).
 *
 * Titled MORE and reached from a `more.show()` call whose name outlived it:
 * this used to be one of at least three overlapping lists a player could
 * land on looking for the same handful of things — the front door had its
 * own direct HOW TO PLAY / SETTINGS buttons, the board's floating MENU
 * button opened a SEPARATE drawer with its own row set (`Menu.tsx`'s
 * `QuickMenu`, now retired), and the manual's own default tab was a third,
 * smaller copy of this same list. Every one of those is gone; this is the
 * one panel the front door's MENU button, the board's MENU button and the
 * end screen's MENU button all open, by the same name, with the same rows.
 *
 * SOUND and THE STORY moved in from the retired `QuickMenu` and the retired
 * front door respectively — quick, non-destructive, first. RESTART moved in
 * from the manual's own retired MENU tab — it had no other door in the game.
 * The rooms you go to come next; THIS DEVICE comes last, on its own, because
 * it is where the things that can destroy something live. Ashwake 1
 * separated them for that reason: a player looking for the manual should
 * never be one mis-tap from erasing three worlds.
 *
 * **And THIS DEVICE is a room, not a section** (2026-08-31, Marc: *"make sure
 * in the more menu, the whole Cet appareil subsection is transformed into a
 * new menu (similar to My worlds)"*). It is `screens/Device` behind one row,
 * the same shape MY WORLDS has always had.
 */

export type MoreProps = {
  readonly s: Strings;
  readonly virgin: boolean;
  readonly sound: boolean;
  readonly onSound: () => void;
  readonly onBack: () => void;
  readonly onHowToPlay: () => void;
  readonly onFame: () => void;
  readonly onSettings: () => void;
  readonly onShop: () => void;
  readonly onWorlds: () => void;
  readonly onDaily: () => void;
  readonly onDevice: () => void;
  readonly onRestart: () => void;
};

export function More({
  s,
  virgin,
  sound,
  onSound,
  onBack,
  onHowToPlay,
  onFame,
  onSettings,
  onShop,
  onWorlds,
  onDaily,
  onDevice,
  onRestart,
}: MoreProps) {
  return (
    <Panel id="more" title={s.ui.menu} back={s.ui.back} closeAll={s.ui.closeAll} onBack={onBack}>
      <PanelMenu>
        <button
          type="button"
          data-go="sound"
          aria-pressed={sound}
          aria-label={sound ? s.ui.soundOn : s.ui.soundOff}
          onClick={onSound}
        >
          <Icon name={sound ? 'soundOn' : 'soundOff'} />
          <span>{s.ui.sound}</span>
        </button>
        <Fold summary={s.ui.theStory}>
          <div className="story-lines">
            {s.story.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </Fold>
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
            {s.ui.fame.title}
          </button>
        )}
        <button type="button" data-go="settings" onClick={onSettings}>
          {s.ui.settings}
        </button>
        {/* Moved in from the manual's own retired MENU tab — it had no other
            door. Its own confirmation, since it throws a live run away. */}
        <Confirming label={s.ui.restart} armed={s.ui.restartArmed} onConfirm={onRestart} />
        {/* Last, and after every place to GO: the room where a tap can cost
            something. A door rather than a heading, so what it holds is a
            deliberate visit rather than the bottom of this screen. */}
        <button type="button" data-go="device" onClick={onDevice}>
          {s.ui.thisDevice}
        </button>
      </PanelMenu>
    </Panel>
  );
}

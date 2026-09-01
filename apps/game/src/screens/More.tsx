import type { Strings } from '@text/Strings';
import { Panel, PanelMenu } from '../ui/Panel';

/**
 * MORE — everything that is not the run (Stage 4, 2026-08-29).
 *
 * One menu of doors, and the split inside it is the point. The rooms you go to
 * come first; THIS DEVICE comes last, on its own, because it is where the
 * things that can destroy something live. Ashwake 1 separated them for that
 * reason: a player looking for the manual should never be one mis-tap from
 * erasing three worlds.
 *
 * **And THIS DEVICE is a room now** (2026-08-31, Marc: *"make sure in the more
 * menu, the whole Cet appareil subsection is transformed into a new menu
 * (similar to My worlds)"*). It was a section standing open under this list —
 * a heading, three buttons, a paste box and two notes — so MORE was a short
 * menu with a long screen hanging off the bottom of it, and every trip here
 * scrolled past the destructive half to reach nothing. It is `screens/Device`
 * behind one row, the same shape MY WORLDS has always had.
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
  readonly onDevice: () => void;
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
  onDevice,
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

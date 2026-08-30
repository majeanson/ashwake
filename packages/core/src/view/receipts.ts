import type { Colour } from '@content/tuning';
import { cachePaysAt, distanceMultiplierAt, homeOf } from '@engine/rules';
import type { HexKey } from '@engine/hex';
import type { GameState, LandmarkReward } from '@engine/state';
import type { PerkId } from '@meta/progress';
import { UNLOCKS, unlockLabel } from '@meta/world';
import { LANDMARK_ICON, type IconName } from '@theme/icons';
import { namesOf, type Theme } from '@theme/tokens';
import type { Strings } from '@text/Strings';
import { perkRows } from './tips';
import type { TipRow } from './view';

/**
 * What the game says when a claim lands.
 *
 * Reaching a shrine, a cache, a territory or a find is the reward loop of the
 * whole game, and until 2026-08-29 this body claimed them all **in silence** —
 * the tiles arrived, the ground turned native, the perk was granted, and the
 * screen said nothing. Ashwake 1 answered every one of them; its answers lived
 * in `game.ts` as hard-coded English, which is why they did not come across
 * with the rules.
 *
 * Pure, like everything else in `view/`: it takes two states and returns
 * sentences. It grants nothing, plays nothing and remembers nothing — the
 * shell dispatches, this reads the difference, and the catalogue supplies
 * every word (D4).
 *
 * **The mark travels BESIDE the words, not inside them.** A receipt leads
 * with the mark it happened to, because the thing that pays and the words
 * about it have to be the same object in the player's head — "that star gave
 * me this" rather than "some text appeared".
 *
 * It used to be prefixed INTO the string (`${text}`) and split back
 * out by `SaidCard`, which worked only for as long as a mark was a character.
 * Since 2026-08-30 it is an icon name on the receipt itself (`@theme/icons`),
 * so nothing composes a sentence it will have to take apart again — and the
 * heading is whatever the catalogue wrote, whole. `LANDMARK_ICON` is the one
 * authority on those marks and nothing else may invent one.
 */

/**
 * How a claim ranks against the others it may have landed with.
 *
 * Rarest leads. A placement that reaches a find and a cache at once is a FIND
 * moment: the find takes the heading and its rows, and the cache gets its line
 * of prose underneath rather than a second set of rows under someone else's
 * subject.
 */
const RANK: Readonly<Record<LandmarkReward, number>> = {
  find: 0,
  shrine: 1,
  territory: 2,
  site: 3,
  cache: 4,
};

/**
 * Which claims interrupt.
 *
 * A claim IS its own first-contact lesson — the receipt already says what that
 * kind of landmark is — so the rare ones are held cards and the common ones
 * are toasts. A cache is tiles and a number; a find changes what you carry.
 */
const HOLDS_THE_SCREEN: Readonly<Record<LandmarkReward, boolean>> = {
  find: true,
  shrine: true,
  territory: true,
  site: false,
  cache: false,
};

export type Receipt = {
  readonly reward: LandmarkReward;
  /** The mark this claim happened to, drawn beside its words. */
  readonly icon: IconName;
  readonly text: string;
  /** The leading claim's marked list, when it has one. Only a find has one. */
  readonly rows?: readonly TipRow[];
  /**
   * An offer the receipt makes, which the shell must carry out. Only the
   * crossing has one — and it is a two-tap arm, because it forgets a world.
   */
  readonly offers?: 'crossing';
};

export type ReceiptContext = {
  readonly theme: Theme;
  readonly strings: Strings;
  /**
   * A shared seed or a daily: there is no ledger to narrate, so a shrine says
   * what shrines ARE and never what the home world would have unlocked.
   */
  readonly detour: boolean;
  /**
   * The perk a find granted at that hex, or null for "you carry everything
   * already" — which is also what a detour answers. The shell does the
   * granting; this only reports it.
   *
   * A `PerkId` rather than a name: the id is what the catalogue is keyed on,
   * so the NAME and the three rows both come from one lookup here instead of
   * a name being passed in and the rows being guessed back from it.
   */
  readonly perkAt?: (hex: HexKey) => PerkId | null;
  /** Whether it is already worn, so the receipt tells the truth about where
   *  it changes. */
  readonly worn?: (perk: PerkId) => boolean;
  /**
   * What crossing would carry, when a fully-awake world's shrine can offer it.
   *
   * A function rather than a number, so the offer is priced at the moment the
   * shrine is reached. Absent means there is nowhere onward — the world says
   * it is awake and stops, which is what this body did before the crossing
   * existed.
   */
  readonly crossingCarries?: () => { readonly dowry: number; readonly carried: number };
};

/**
 * Every landmark claimed between two states, rarest first.
 *
 * Empty far more often than not — most placements claim nothing, and a
 * function that returns a list is the honest shape for a placement that
 * reaches two things at once.
 */
export function claimsBetween(
  before: GameState,
  after: GameState,
  ctx: ReceiptContext,
): readonly Receipt[] {
  const found: Receipt[] = [];
  // Counted from BEFORE, so the first new shrine names the unlock it is
  // actually turning on. A running counter in the shell would be a second
  // place for this number to live and a first place for it to drift.
  let shrinesSoFar = countShrines(before);

  for (const [hex, cell] of Object.entries(after.cells)) {
    if (cell.kind !== 'landmark' || !cell.claimed) continue;
    const was = before.cells[hex];
    if (was?.kind === 'landmark' && was.claimed) continue;

    // Which shrine of this world THIS one is, captured before the counter
    // moves — it decides both the unlock named and whether there is any
    // unlock left to name.
    const nth = shrinesSoFar;
    const text = receiptFor(hex, cell.reward, cell.colour, after, ctx, nth);
    if (cell.reward === 'shrine') shrinesSoFar++;

    // The perk's own three lines — YOU GAIN / YOU LOSE / PLAY IT — from the
    // one builder THE SHOP's shelf also folds open. A perk is explained once,
    // in one voice, wherever you meet it.
    const perk = cell.reward === 'find' ? (ctx.perkAt?.(hex) ?? null) : null;
    const rows = perk === null ? undefined : perkRows(perk, ctx.strings);
    // The crossing is offered by a shrine past the end of the ledger, on
    // your own world, when the shell has one to offer. The same three
    // conditions `receiptFor` used to write the sentence — read here rather
    // than returned from there, so the words and the offer cannot disagree
    // about whether there is a door.
    const offersCrossing =
      cell.reward === 'shrine' &&
      !ctx.detour &&
      UNLOCKS[nth] === undefined &&
      ctx.crossingCarries !== undefined;

    found.push({
      reward: cell.reward,
      icon: LANDMARK_ICON[cell.reward],
      text,
      ...(rows === undefined ? {} : { rows }),
      ...(offersCrossing ? { offers: 'crossing' as const } : {}),
    });
  }

  return found.sort((a, b) => RANK[a.reward] - RANK[b.reward]);
}

/**
 * The receipts as one thing to show: the rarest leads, the rest follow after a
 * blank line, and the LEAD decides whether the screen is held.
 *
 * One card with one subject — see `RANK`.
 */
export function saidOf(receipts: readonly Receipt[]): {
  readonly text: string;
  readonly icon: IconName;
  readonly card: boolean;
  readonly rows?: readonly TipRow[];
  readonly offers?: 'crossing';
} | null {
  const lead = receipts[0];
  if (lead === undefined) return null;
  // An OFFER is taken from whichever receipt makes one, never only from the
  // lead: a placement that reaches a find and the last shrine at once still
  // has to offer the crossing, and the find is what takes the heading.
  const offer = receipts.find((r) => r.offers !== undefined)?.offers;
  return {
    text: receipts.map((r) => r.text).join('\n\n'),
    // The LEAD's mark: rarest first, so a placement that reaches a find and a
    // cache at once is a find moment and wears the find's.
    icon: lead.icon,
    card: HOLDS_THE_SCREEN[lead.reward],
    ...(lead.rows === undefined ? {} : { rows: lead.rows }),
    ...(offer === undefined ? {} : { offers: offer }),
  };
}

const countShrines = (state: GameState): number =>
  Object.values(state.cells).filter(
    (c) => c.kind === 'landmark' && c.claimed && c.reward === 'shrine',
  ).length;

function receiptFor(
  hex: HexKey,
  reward: LandmarkReward,
  colour: Colour | undefined,
  after: GameState,
  ctx: ReceiptContext,
  shrinesSoFar: number,
): string {
  const { strings: s, theme } = ctx;
  const t = after.tuning;
  const c = s.claim;

  switch (reward) {
    case 'cache':
      // Priced from HOME, like the payment. The engine pays
      // `cachePaysAt(hex, t, homeOf(state))`; Ashwake 1's UI once dropped that
      // argument and priced from the world origin, so a camp run announced
      // several times what it actually banked.
      return c.cache(cachePaysAt(hex, t, homeOf(after)));

    case 'site':
      // The number at the moment of touch (Marc, Day 2: "make sure we see the
      // + points banked the moment we touch") — the same arithmetic the engine
      // just paid.
      return c.site(
        t.sitePays * distanceMultiplierAt(hex, t, homeOf(after)),
        t.questNeed,
        t.questRadius,
        t.questBonus,
      );

    case 'territory': {
      const owns = colour === undefined ? s.view.hex.someColour : namesOf(theme, s.locale)[colour];
      return c.territory(t.territoryRadius, owns);
    }

    case 'shrine': {
      if (ctx.detour) return c.shrineDetour;
      const next = UNLOCKS[shrinesSoFar];
      if (next !== undefined) return c.shrine(unlockLabel(next.id, s));
      // Past the end of the ledger there is nothing left to switch ON, so the
      // shrine becomes the way ONWARD instead — which is the whole reason a
      // fully-awake world is not a dead end.
      const onward = ctx.crossingCarries?.();
      return onward === undefined ? c.shrineAwake : c.shrineCrossing(onward.dowry, onward.carried);
    }

    case 'find': {
      const perk = ctx.perkAt?.(hex) ?? null;
      if (perk === null) return c.findNothing;
      return c.found(s.perk[perk].name, ctx.worn?.(perk) ?? false);
    }
  }
}

/**
 * What the purse just did, or null when it did nothing.
 *
 * Priced by DIFFERENCE rather than from the tuning's list price, because the
 * two can disagree: a tithe takes the whole purse, whatever that is, and a
 * spend the engine refused costs nothing. What the player is told is what
 * actually left their hands.
 */
export function spendReceipt(
  before: GameState,
  after: GameState,
  on: 'reroll' | 'steer' | 'forge' | 'tithe',
  colour: Colour | undefined,
  ctx: Pick<ReceiptContext, 'theme' | 'strings'>,
): string | null {
  const paid = before.luck - after.luck;
  if (paid <= 0) return null;
  const { strings: s } = ctx;

  switch (on) {
    case 'reroll':
      return s.spent.reroll(paid);
    case 'steer':
      return s.spent.steer(
        colour === undefined ? s.view.hex.someColour : namesOf(ctx.theme, s.locale)[colour],
        after.tuning.colourBiasDraws,
        paid,
      );
    case 'forge':
      return s.spent.forge(paid);
    case 'tithe':
      return s.spent.tithe(paid, after.relics - before.relics);
  }
}

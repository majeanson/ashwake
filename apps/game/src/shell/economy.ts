import { TUNING, type Tuning } from '@content/tuning';
import { applyProgress, withWorldPerks, type Progress } from '@meta/progress';
import { applyUnlocks, unlockedBy, type WorldMemory } from '@meta/world';

/**
 * The economy a run is played under — the shop, the perks and the shrines,
 * folded into one `Tuning`.
 *
 * **This did not exist, and every one of those three was inert** (2026-08-30).
 * Marc, on a phone: *"i gain perks with shrines but in the end screen i still
 * see 0/5, i never get relics as well. in the old game I still had some."*
 * The seed fix answered the banking half — nothing was reaching the bank
 * because every run failed `settle`'s seed guard. This is the other half: even
 * once relics arrived, they bought upgrades that changed nothing.
 *
 * `createSession` takes a `tuning` and was never given one, so every run in
 * this body played the bare `TUNING`. `applyProgress` — the core function
 * whose own docblock calls itself "the ONLY place progress touches balance" —
 * had zero callers outside its own file. So did `withWorldPerks`. And
 * `unlockedBy` was read three times, all of them to PRINT a label: the WOKE
 * toast, the atlas, the end screen's list of what a run unlocked. A shrine
 * announced DRAFT and the hand stayed four wide.
 *
 * Fifth of its shape in this body, after the colour lens, the stash, the
 * board's tap-to-describe and unselecting a card — `CLAUDE.md`'s standing
 * warning, and the largest one yet, because it is the whole roguelite.
 *
 * The three layers, in Ashwake 1's order (`../tiles/src/shell/session.ts`):
 * the plain economy, then what this world's shrines woke, then what the shop
 * bought and which perk is worn. Order matters — `applyProgress` adds to the
 * dials `applyUnlocks` has already doubled, which is what makes a shrine and
 * an upgrade compound rather than one overwriting the other.
 */

/** Which kind of run this is, because only one of the three earns anything. */
export type RunKind =
  /** This device's own world, on its own seed: everything applies. */
  | { readonly kind: 'home'; readonly world: WorldMemory; readonly progress: Progress }
  /** Today's shared board. No ledger, so no unlocks and no relics — and its
   *  shrines are rewritten into caches and sites, since a door that opens
   *  nothing is worse than no door. */
  | { readonly kind: 'daily' }
  /** Somebody else's seed. A replay scored under this device's upgrades would
   *  not be a replay of anything, so it plays a daily's economy: no relics, no
   *  ledger, and the offer to keep the board at the end (2026-09-09). */
  | { readonly kind: 'detour' };

/**
 * A run that cannot bank pays no relics either.
 *
 * Ashwake 1's `noRelics`, verbatim. Without it a daily or a shared link would
 * mint relics on a screen that then throws them away, which reads as the game
 * losing them rather than never having offered them.
 */
const NO_RELICS = { burnRelics: 0, claimRelics: 0, luckToRelics: 0, titheRate: 0 } as const;

/**
 * What a daily has no use for (2026-09-01).
 *
 * Marc: *"when in daily, all sacrifice or long term run shrines should be
 * disabled so we only have points and caches or similar (since relics and
 * shrines are useless in dailies)."*
 *
 * Today's board is played once, by everybody, and banked as a score on a
 * ladder. Nothing it leaves behind survives it, so a landmark that pays into a
 * LEDGER rather than into the run is a door that opens nothing:
 *
 * - **Shrines** already came out, on the same reasoning and Marc's own Day 2
 *   ruling: `shrinesReborn` rewrites each one into a cache or a site,
 *   deterministically, so the reveal, the beacons, the fog and the tap answers
 *   all agree without a second rule anywhere.
 * - **Finds** were the half that never came out. A find grants a PERK, perks
 *   live on the world (2026-08-26), and a daily has no world, so `App`'s grant
 *   is guarded by `daily === null` and a daily's finds were landmarks that
 *   shimmered, cost a placement to reach, and paid **nothing at all**. Zeroed
 *   here rather than guarded at the grant, so the whole game agrees there is
 *   nothing out there: no shimmer, no reveal, no glyph, no tap answer.
 *
 * **SACRIFICE needs nothing here and is checked anyway.** The burn falls back
 * to `burnLuck` when `burnRelics` is zero, the shipped tuning's `burnLuck` is
 * zero too, so `harvestBurn` is 0 and `ActionBar` never draws the button. That
 * is three files of chain to hold one of Marc's sentences up, which is exactly
 * the kind of agreement that breaks silently — `economy.test.ts` pins it.
 *
 * TERRITORY stays, and now it PAYS (2026-09-09, Marc: *"otherwise territories
 * in daily are underpowered ... maybe they could give tiles in daily too? (not
 * in world?)"*). The reasoning above put it on the right side of the line for
 * the wrong reason: the ground it claims is native the moment it is claimed, so
 * it does pay inside the run — but the other two thirds of what a territory is
 * worth, `territoryTiles` into every later run's purse and +10 relics on the
 * crossing, are both dead here. `territoryPays` is the substitute, set to a
 * cache's own `cachePays` and graded by distance, and it is the one landmark
 * dial that is HIGHER outside a world than in one.
 *
 * **And what a territory claims can now outlive the board after all**, if the
 * player takes the ending's offer to continue it as a world — see
 * `shell/adopt.ts`. That is the other half of Marc's ask and the reason the
 * claim receipt says "continue this board in a world to keep it" rather than
 * the world's own "it stays yours between runs".
 */
const NO_LEDGER = {
  shrinesReborn: true,
  findEvery: 0,
  findChance: 0,
  findSense: 0,
  // The substitute for everything a territory pays into a ledger. A cache's
  // own base, graded by distance in `territoryPaysAt` — see `territoryPays`.
  territoryPays: TUNING.cachePays,
} as const;

/*
 * A SHARED BOARD IS A DAILY YOU WERE HANDED (2026-09-09).
 *
 * Marc: *"For a shared world, it should be able to be played like a daily for a
 * first run, then the same question goes: do we continue in a world? if yes, we
 * keep the same."*
 *
 * A detour used to get `NO_RELICS` and nothing else, on the argument that
 * somebody else's world should be *"played as it stands"*. That argument is
 * about the GEOGRAPHY, and it survives: the ground, the walls, the caches, the
 * sites and the territories are all still exactly the board the sharer walked,
 * because `NO_LEDGER` touches none of them. What it takes away is the two
 * landmark kinds that pay into a ledger a detour does not have — a shrine that
 * unlocks nothing and a find whose perk `App` refuses to grant — which on a
 * shared link were landmarks that cost a placement to reach and paid literally
 * nothing. Exactly the daily's own bug, one step over, and it was in
 * `NEXT.md` §1 for one day.
 *
 * Only shrines move geography at all, and only by wearing a cache's or a
 * site's face instead (`engine/world.ts`'s `reborn`) — so continuing the
 * board as a world does not rearrange it, it WAKES it: the doors appear where
 * the caches were.
 */
export function economyFor(run: RunKind, base: Tuning = TUNING): Tuning {
  if (run.kind === 'daily' || run.kind === 'detour') {
    return { ...base, ...NO_RELICS, ...NO_LEDGER };
  }

  const woken = applyUnlocks(base, unlockedBy(run.world));
  // The world's own perk shelf, composited over the device's purse — a perk
  // found in THIS world is worn here and nowhere else.
  return applyProgress(woken, withWorldPerks(run.progress, run.world.perks, run.world.worn));
}

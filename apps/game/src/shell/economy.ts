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
   *  not be a replay of anything. */
  | { readonly kind: 'detour' };

/**
 * A run that cannot bank pays no relics either.
 *
 * Ashwake 1's `noRelics`, verbatim. Without it a daily or a shared link would
 * mint relics on a screen that then throws them away, which reads as the game
 * losing them rather than never having offered them.
 */
const NO_RELICS = { burnRelics: 0, claimRelics: 0, luckToRelics: 0, titheRate: 0 } as const;

export function economyFor(run: RunKind, base: Tuning = TUNING): Tuning {
  if (run.kind === 'daily') return { ...base, ...NO_RELICS, shrinesReborn: true };
  if (run.kind === 'detour') return { ...base, ...NO_RELICS };

  const woken = applyUnlocks(base, unlockedBy(run.world));
  // The world's own perk shelf, composited over the device's purse — a perk
  // found in THIS world is worn here and nowhere else.
  return applyProgress(woken, withWorldPerks(run.progress, run.world.perks, run.world.worn));
}

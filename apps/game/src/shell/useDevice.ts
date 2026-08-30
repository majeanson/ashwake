import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isLocale, pickLocale, type Locale } from '@content/locale';
import type { FeatureId, FeatureSet } from '@meta/features';
import { meet, TEACH_IDS, withWorldPerks, type Progress } from '@meta/progress';
import { inheritShopLevels } from '@meta/shopLevels';
import { AUTO_THEME_ID } from '@theme/index';
import type { ThemeId } from '@theme/tokens';
import { isDaily, keeperFor, type Keeper, type Place } from './keeper';
import {
  activeSlot,
  readFeatures,
  readLocale,
  readProgress,
  readTheme,
  setActiveSlot,
  writeFeatures,
  writeLocale,
  readShopLevels,
  readWorld,
  writeProgress,
  writeShopLevels,
  writeTheme,
  type Slot,
} from './storage';

/**
 * What this device remembers (Stage 4, 2026-08-29).
 *
 * The settings a player chose, the lessons they have met, and which of the
 * three worlds is open — everything that is true of the DEVICE rather than of
 * a run. It is one hook because these all share a rule: **read once at boot,
 * write on every change**, and never re-read, because the only writer is this
 * tab and a re-read is how a stale value overwrites a fresh one.
 *
 * The keeper is here too, and its lifetime is the point. Switching slots drops
 * the old keeper before the new one exists, so there is no moment when two
 * keepers could both write to the same world. That is what
 * `keeper.test.ts` calls the crossing in miniature.
 */

export type Device = {
  readonly locale: Locale;
  readonly setLocale: (locale: Locale) => void;
  readonly theme: ThemeId;
  readonly setTheme: (id: ThemeId) => void;
  readonly features: FeatureSet;
  readonly setFeature: (id: FeatureId, on: boolean) => void;
  readonly progress: Progress;
  readonly setProgress: (next: (was: Progress) => Progress) => void;
  readonly slot: Slot;
  readonly setSlot: (slot: Slot) => void;
  /** The date of the daily being played, or null in a world. */
  readonly daily: string | null;
  /** A date steps into that daily; `null` steps back out to `slot`. */
  readonly setDaily: (date: string | null) => void;
  /** Writes on the current session's behalf, and refuses once it is over. */
  readonly keeper: Keeper;
};

export function useDevice(opts: {
  /** `?taught=1`: a device that has met every lesson. It fills the teaching
   *  ledger and touches nothing else — see the composite below. */
  readonly taught?: boolean | undefined;
  readonly theme?: ThemeId | undefined;
  /**
   * A shared `?daily=` link opens THAT date rather than the world this device
   * last left (`meta/route.ts`).
   *
   * It has to arrive here rather than be stepped into afterwards, because the
   * keeper is made from the opening place: entering the daily a moment later
   * would mean one render during which a daily's board existed while the
   * keeper still pointed at a world, and the keeper is the only thing that
   * writes. The place a session opens in is the place it was always in.
   */
  readonly daily?: string | undefined;
}): Device {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const kept = readLocale();
    // A device that has been asked answers for itself; one that has not lets
    // the phone answer, with French as the fallback for a device that speaks
    // neither (D4). `pickLocale` is the core's and is pure, which is why the
    // shell samples and never decides.
    if (kept !== null && isLocale(kept)) return kept;
    return pickLocale(navigator.languages);
  });

  const [theme, setThemeState] = useState<ThemeId>(
    () => opts.theme ?? readTheme() ?? AUTO_THEME_ID,
  );
  const [features, setFeatures] = useState<FeatureSet>(readFeatures);
  /**
   * The device's ledger, wearing THIS world's shop levels AND its perk shelf.
   *
   * Relics and the teaching ledger are device facts — they follow the player.
   * Upgrade LEVELS are a property of the world they were bought in, so a fresh
   * world starts bare rather than inheriting a build three other worlds paid
   * for, and the crossing can honestly say that what you bought stays behind.
   * `inheritShopLevels` owns the one subtle case: a world that has never
   * written a shop key predates the split and takes the device's legacy levels
   * once, so no existing device loses its build.
   *
   * **PERKS are the same kind of fact and were not being read** (2026-08-30).
   * They moved onto the world on 2026-08-26 and `encodeProgress` has stripped
   * them from the device blob ever since, deliberately — so `decodeProgress`
   * hands back an empty shelf by contract, and nothing in this body ever put
   * the world's own back on. A perk found survived until the tab was reloaded
   * and then was simply gone, and `economyFor` — which reads
   * `world.perks`/`world.worn` — never saw one at all, so the dials a perk
   * sets were never set. `withWorldPerks` is the core's own composite and is
   * exactly this read; it had one caller, inside the economy, working from a
   * field nothing wrote.
   */
  const [progress, setProgressState] = useState<Progress>(() => {
    const base = inheritShopLevels(readProgress(), readShopLevels(activeSlot()));
    /*
     * `?taught=1` fills the TEACHING LEDGER, and nothing else (2026-08-30).
     *
     * It used to hand `useDevice` a whole replacement `Progress` built on
     * `EMPTY_PROGRESS`, which was harmless while the only other history was
     * `?end=1` and fatal the moment a DEVICE history existed: `?runs=300`
     * seeds a world with a purse, a build and a shelf, and the taught
     * override then threw all three away on the way in. The audit's
     * three-hundred-run shop photographed `0` relics — which is precisely the
     * picture this whole axis was built to make impossible, produced by the
     * axis itself.
     *
     * A flag rather than an object, so the override can only ever say the one
     * thing it means.
     */
    const met =
      opts.taught === true ? TEACH_IDS.reduce<Progress>((p, id) => meet(p, id), base) : base;
    const world = readWorld(activeSlot());
    // And the world's own shelf on top, for the override paths as well.
    return world === null ? met : withWorldPerks(met, world.perks, world.worn);
  });
  const [slot, setSlotState] = useState<Slot>(activeSlot);
  /**
   * Where the player is: one of the three worlds, or a dated daily.
   *
   * `slot` stays the world they will come BACK to — leaving the daily must not
   * make them pick a world again — so the two are separate facts rather than
   * one. Only `place` decides where a run is written.
   */
  const [place, setPlaceState] = useState<Place>(() =>
    opts.daily === undefined ? activeSlot() : { daily: opts.daily },
  );

  // One keeper per PLACE — not per slot, which was the same thing right up
  // until a link could open the daily directly.
  const keeper = useRef<Keeper>(keeperFor(place));
  useEffect(() => {
    const held = keeper.current;
    return () => held.drop();
  }, []);

  /** Hand the keeper on. Flush, then drop, then make the new one — in that
   *  order, because a pending write from the place being left must land in the
   *  place it belongs to and never in the one being entered. */
  const move = useCallback((next: Place) => {
    keeper.current.flush();
    keeper.current.drop();
    keeper.current = keeperFor(next);
    setPlaceState(next);
    // A world's shop is the world's, and so is its perk shelf. Stepping into
    // one puts on its build and its perks; stepping into the daily — which has
    // neither of its own — keeps whatever the player was carrying.
    if (!isDaily(next)) {
      setProgressState((was) => {
        const build = inheritShopLevels(was, readShopLevels(next));
        const world = readWorld(next);
        return world === null
          ? withWorldPerks(build, [], null)
          : withWorldPerks(build, world.perks, world.worn);
      });
    }
  }, []);

  const setSlot = useCallback(
    (next: Slot) => {
      move(next);
      setActiveSlot(next);
      setSlotState(next);
    },
    [move],
  );

  /** Step into today's daily, or back out to the world the player came from. */
  const setDaily = useCallback(
    (date: string | null) => {
      move(date === null ? slot : { daily: date });
    },
    [move, slot],
  );

  // A phone can be closed between two taps and never come back, so whatever is
  // pending is written the moment the page is hidden. `visibilitychange` fires
  // where `beforeunload` does not on iOS, which is the platform that matters.
  useEffect(() => {
    const flush = (): void => keeper.current.flush();
    const onHide = (): void => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    writeLocale(next);
    setLocaleState(next);
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    writeTheme(next);
    setThemeState(next);
  }, []);

  const setFeature = useCallback((id: FeatureId, on: boolean) => {
    setFeatures((was) => {
      const next = { ...was, [id]: on };
      writeFeatures(next);
      return next;
    });
  }, []);

  const setProgress = useCallback(
    (next: (was: Progress) => Progress) => {
      setProgressState((was) => {
        const after = next(was);
        // Idempotent by construction in the core, so an unchanged ledger is not
        // a write — a teaching card dismissed twice should not cost a save.
        if (after === was) return was;
        writeProgress(after);
        // The BUILD is written where it belongs — beside the world it was
        // bought in — whenever it moves. `writeProgress` still carries a copy
        // in the device blob, which is what a world older than the split
        // inherits from; this is the copy that outlives it.
        //
        // Keyed on `slot` rather than `place`: a daily has no shop of its
        // own, and a purchase made on the way through one belongs to the
        // world the player will come back to.
        if (after.bought !== was.bought) writeShopLevels(slot, after.bought);
        return after;
      });
    },
    [slot],
  );

  return useMemo(
    () => ({
      locale,
      setLocale,
      theme,
      setTheme,
      features,
      setFeature,
      progress,
      setProgress,
      slot,
      setSlot,
      daily: isDaily(place) ? place.daily : null,
      setDaily,
      keeper: keeper.current,
    }),
    [
      locale,
      setLocale,
      theme,
      setTheme,
      features,
      setFeature,
      progress,
      setProgress,
      slot,
      setSlot,
      place,
      setDaily,
    ],
  );
}

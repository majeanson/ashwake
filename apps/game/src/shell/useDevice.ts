import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isLocale, pickLocale, type Locale } from '@content/locale';
import { parseOverrides, withOverrides, type FeatureId, type FeatureSet } from '@meta/features';
import { meet, TEACH_IDS, withWorldPerks, type Progress } from '@meta/progress';
import { inheritShopLevels } from '@meta/shopLevels';
import { AUTO_THEME_ID } from '@theme/index';
import type { ThemeId } from '@theme/tokens';
import { clampRenderScale, DEFAULT_RENDER_SCALE } from '../board/quality';
import { isDaily, keeperFor, type Keeper, type Place } from './keeper';
import {
  activeSlot,
  readFeatures,
  readLocale,
  readProgress,
  readRenderScale,
  readTheme,
  setActiveSlot,
  writeFeatures,
  writeLocale,
  readShopLevels,
  readWorld,
  writeProgress,
  writeRenderScale,
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
  /** The SHARPNESS slider's own number, `board/quality.ts`'s scale. */
  readonly renderScale: number;
  readonly setRenderScale: (scale: number) => void;
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

  const [renderScale, setRenderScaleState] = useState<number>(() => {
    const kept = readRenderScale();
    return kept === null ? DEFAULT_RENDER_SCALE : clampRenderScale(kept);
  });
  /**
   * The device's flags, with `?ff=` applied (2026-09-02).
   *
   * `parseOverrides` and `withOverrides` have been in the core, tested, since
   * the rules were lifted, and **nothing in this body called either** — so the
   * one door to a `player: false` flag did not exist, and `debug.overlay`
   * shipped `wired: true` with no way to turn it on and nothing reading it.
   * `features.ts`'s own header says a registry of aspirational flags is a
   * to-do list that lies; this is the half of the fix that gives the flag a
   * door, and `view#debugLine` is the half that gives it a reader.
   *
   * PERSISTED, exactly as Ashwake 1 did it: testing happens on the deployed
   * site from a phone, and a flag that has to be re-typed into the address bar
   * after every navigation is a flag nobody uses. `?ff=-debug.overlay` is how
   * it comes back off, which is why the parser has always taken a minus.
   */
  const [features, setFeatures] = useState<FeatureSet>(() => {
    const asked = parseOverrides(location.search);
    const stored = readFeatures();
    if (Object.keys(asked).length === 0) return stored;
    const next = withOverrides(stored, asked);
    writeFeatures(next);
    return next;
  });
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
  /*
   * THE PLACE AND ITS KEEPER ARE ONE FACT (2026-09-02).
   *
   * One keeper per PLACE — not per slot, which was the same thing right up
   * until a link could open the daily directly. They have always changed
   * together, in `move`, in one order that matters; they were two pieces of
   * state, a `useState` and a `useRef`, and the ref was then read during
   * render to build the returned object. Two things that must move together
   * and cannot be seen to are two things that come apart — which is the
   * argument `shell/finds.ts` makes in its own opening lines, and `App` makes
   * about `note.more`.
   *
   * It was CORRECT: `place` is in the memo's dependencies and changes at
   * exactly the moment the keeper does. It was correct invisibly, which is the
   * kind of correct that stops being true when somebody adds a dependency —
   * and a ref read during render is the one thing the React Compiler cannot
   * reason about at all.
   */
  const [held, setHeld] = useState<{ readonly place: Place; readonly keeper: Keeper }>(() => {
    const at = opts.daily === undefined ? activeSlot() : { daily: opts.daily };
    return { place: at, keeper: keeperFor(at) };
  });

  /*
   * The same object, mirrored, for the two things state cannot do: be read at
   * unmount, and be read by a handler that must not go through a state
   * updater. It is written from an EFFECT, so nothing here reads or writes a
   * ref while rendering.
   */
  const latest = useRef(held);
  useEffect(() => {
    latest.current = held;
  }, [held]);

  /*
   * DROP WHICHEVER ONE IS HELD NOW (2026-09-02).
   *
   * This captured the keeper at mount and dropped THAT on unmount — the keeper
   * the page opened with. `move()` replaces it (a link into the daily, a world
   * switch, a crossing), and after any of those the first keeper is dropped a
   * second time while the one actually holding the run is never dropped at
   * all: its interval and its listeners outlive the page.
   */
  useEffect(
    () => () => {
      latest.current.keeper.drop();
    },
    [],
  );

  /** Hand the keeper on. Flush, then drop, then make the new one — in that
   *  order, because a pending write from the place being left must land in the
   *  place it belongs to and never in the one being entered. */
  const move = useCallback((next: Place) => {
    // Not inside the updater: React runs those twice under StrictMode, and a
    // doubled flush-then-drop is a keeper dropped while another is writing.
    latest.current.keeper.flush();
    latest.current.keeper.drop();
    const made = { place: next, keeper: keeperFor(next) };
    latest.current = made;
    setHeld(made);
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
  /**
   * Step into today's daily, or back out to the world the player came from.
   *
   * `activeSlot()` and not the `slot` state (2026-09-05, Marc: *"by switching
   * worlds i lost all"*). This is called on EVERY run that begins, not only
   * when a daily is left — `shell/beginning.ts` ends with `w.setDaily(door.daily)`
   * — so a world switch runs it with `null` a beat after `setSlot`. React state
   * has not committed by then, so `slot` still read the world being LEFT, and
   * `move()` dutifully threw away the keeper it had just built for the world
   * being ENTERED and built another one pointing at the old slot. The run that
   * followed was world 2's and the keeper wrote where it was told: slot 1.
   * Three hundred runs of ground replaced by an empty world, in one menu tap.
   *
   * The trace, kept because the shape is the lesson — KEEPER born #2 place=2,
   * KEEPER #2 DROP, KEEPER born #3 place=1, then #3 writing seed 1060841 into
   * slot 1.
   *
   * `setSlot` writes the active slot to storage synchronously, before any of
   * this, so the persisted answer is the CURRENT one where the closure's is a
   * render behind. It is also the same answer every other boot path already
   * trusts, which is what makes it the honest source rather than a second one.
   */
  const setDaily = useCallback(
    (date: string | null) => {
      move(date === null ? activeSlot() : { daily: date });
    },
    [move],
  );

  // A phone can be closed between two taps and never come back, so whatever is
  // pending is written the moment the page is hidden. `visibilitychange` fires
  // where `beforeunload` does not on iOS, which is the platform that matters.
  useEffect(() => {
    const flush = (): void => latest.current.keeper.flush();
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

  const setRenderScale = useCallback((next: number) => {
    const clamped = clampRenderScale(next);
    writeRenderScale(clamped);
    setRenderScaleState(clamped);
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
      renderScale,
      setRenderScale,
      features,
      setFeature,
      progress,
      setProgress,
      slot,
      setSlot,
      daily: isDaily(held.place) ? held.place.daily : null,
      setDaily,
      keeper: held.keeper,
    }),
    [
      locale,
      setLocale,
      theme,
      setTheme,
      renderScale,
      setRenderScale,
      features,
      setFeature,
      progress,
      setProgress,
      slot,
      setSlot,
      held,
      setDaily,
    ],
  );
}

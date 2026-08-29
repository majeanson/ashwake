import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isLocale, pickLocale, type Locale } from '@content/locale';
import type { FeatureId, FeatureSet } from '@meta/features';
import type { Progress } from '@meta/progress';
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
  writeProgress,
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
  /** `?taught=1` and friends override what the device remembers, for shots. */
  readonly progress?: Progress | undefined;
  readonly theme?: ThemeId | undefined;
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
  const [progress, setProgressState] = useState<Progress>(() => opts.progress ?? readProgress());
  const [slot, setSlotState] = useState<Slot>(activeSlot);
  /**
   * Where the player is: one of the three worlds, or a dated daily.
   *
   * `slot` stays the world they will come BACK to — leaving the daily must not
   * make them pick a world again — so the two are separate facts rather than
   * one. Only `place` decides where a run is written.
   */
  const [place, setPlaceState] = useState<Place>(slot);

  // One keeper per place, and the old one is dropped before the new one runs.
  const keeper = useRef<Keeper>(keeperFor(slot));
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

  const setProgress = useCallback((next: (was: Progress) => Progress) => {
    setProgressState((was) => {
      const after = next(was);
      // Idempotent by construction in the core, so an unchanged ledger is not
      // a write — a teaching card dismissed twice should not cost a save.
      if (after !== was) writeProgress(after);
      return after;
    });
  }, []);

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

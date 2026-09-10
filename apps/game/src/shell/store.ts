import { useSyncExternalStore } from 'react';
import { TUNING, type Colour, type Tuning } from '@content/tuning';
import { newRun, reduce } from '@engine/reduce';
import { harvestValue } from '@engine/rules';
import type { Action, GameState } from '@engine/state';
import { distance, parse, type HexKey } from '@engine/hex';
import type { BoardView, CellView } from '@render/Renderer';
import type { Strings } from '@text/Strings';
import { CONCEPT_ICON, type IconName } from '@theme/icons';
import type { Theme } from '@theme/tokens';
import {
  harvestNote,
  renderContext,
  toBoardView,
  toHudView,
  type HudView,
  type TipRow,
} from '@view/view';
import { claimsBetween, saidOf, spendReceipt } from '@view/receipts';
import { unlockedBy, type WorldMemory } from '@meta/world';
import type { RunMemory } from './storage';
import type { PerkId } from '@meta/progress';

/**
 * One run, held outside React (Stage 2, 2026-08-28).
 *
 * The engine is a pure reducer and the props layer is pure selectors, so the
 * store is nothing but "the current state, and who wants to know when it
 * changes". React reads it through `useSyncExternalStore`; the board reads
 * the same snapshot; nothing re-derives a view twice per frame because the
 * snapshot is built once per dispatch and handed to everyone.
 *
 * What is NOT here yet: persistence, the keeper's alive/dropped guards, world
 * memory, the daily, the crossing — all Stage 4. This is the smallest thing
 * that lets a tap on a hex reach `reduce` and come back as a drawn tile.
 */

export type Snapshot = {
  readonly state: GameState;
  /** The pocket being priced, or null for the default. */
  readonly harvestAt: HexKey | null;
  readonly board: BoardView;
  readonly hud: HudView;
  /**
   * The last pop, for the board's leap: which cells left, and a counter so a
   * second pop of the same cells still reads as a new event.
   */
  readonly popped: Popped | null;
  /**
   * What the game has to SAY about the action just dispatched, or null.
   *
   * The same shape as `popped` and for the same reason: an action's visible
   * consequence is a property of the transition, not of the state, so the
   * session computes it once at the moment it happens rather than letting a
   * component diff two renders and guess. A claim landed, a pocket popped —
   * both are things that just occurred and are gone by the next dispatch.
   */
  readonly said: Said | null;
};

/** Function-typed on purpose: `useSyncExternalStore` takes `get` and
 *  `subscribe` apart from the object, so none of these may depend on `this`. */
export type Popped = {
  /** The cells AS THEY WERE, read before the reducer turned them to stone —
   *  the leap is drawn from what was there, in its own colour. */
  readonly cells: readonly CellView[];
  /** The pocket the player actually tapped, so the cascade ripples outward
   *  from the point of contact rather than from object order. */
  readonly at: HexKey | null;
  /** A counter, so a second pop of the same cells still reads as a new event. */
  readonly id: number;
};

/**
 * How two things said about one moment are joined.
 *
 * A blank line between them: a pop receipt and the claim it reached are two
 * things about one moment, not one run-on sentence.
 *
 * Exported because `App` builds the first-pop card by hand — the lesson, the
 * receipt, and the sentence about what happens next — and was gluing them with
 * its own `\n\n` (2026-09-02). Two joiners for one idea is two places for the
 * spacing of every card in the game to be decided, and the second one is
 * always the one nobody finds.
 */
export const paragraphs = (...parts: readonly string[]): string =>
  parts.filter((p) => p !== '').join('\n\n');

/** Something the game says, and whether it holds the screen to say it. */
export type Said = {
  readonly text: string;
  /** A card interrupts and must be dismissed; a toast waits quietly. */
  readonly card: boolean;
  /** The leading claim's marked list, when it has one. */
  readonly rows?: readonly TipRow[] | undefined;
  /** An offer the shell must carry out. Only the crossing makes one. */
  readonly offers?: 'crossing' | undefined;
  /**
   * What that offer carries, priced at the moment it was made (2026-09-02).
   *
   * `shell/cross.ts` says the crossing's offer and its payment *"are the same
   * number by construction"*, and they were not: the sentence in the card came
   * from `crossingCarries` (the live world), the BUTTON'S LABEL recomputed it
   * from `ledgers` — a snapshot that only refreshes when a panel opens or a run
   * ends — and `takeCrossing` banked from `ledgers` again. A territory claimed
   * on the run that reaches the last shrine is in the live copy and in neither
   * of the others, so all three could differ, on the one card where finding out
   * afterwards is too late.
   *
   * It travels WITH the text rather than beside it in a second piece of state,
   * for the reason `App`'s `note.more` gives: two states that must be set and
   * cleared together are two states that come apart. It also keeps the label
   * out of render-time ref reads, which `react-hooks/refs` is right to refuse.
   */
  readonly carried?: number | undefined;
  /**
   * The mark this utterance leads with, where it has one.
   *
   * BESIDE the words rather than inside them. A claim's mark used to be
   * prefixed into its own first line and split back out by `SaidCard`, which
   * worked only while a mark was a character; since 2026-08-30 it is an icon
   * (`@theme/icons`) and a sentence cannot carry one. A POP has none: the
   * board is the thing that popped.
   */
  readonly icon?: IconName | undefined;
  /**
   * Shown as a card the player does not have to dismiss: it takes no focus,
   * any tap sends it away, and it goes on its own. Set by the SHELL, never by
   * the reducer — whether a thing has been seen before is a device fact, not
   * a rule (`App`'s harvest branch, and `ui/Card.tsx`).
   *
   * ## NOTHING SETS IT (found 2026-09-02, deliberately left — needs Marc)
   *
   * The harvest branch this docblock names is the branch that STOPPED setting
   * it, on 2026-08-30, when Marc asked for a routine pop to be a line over the
   * board instead of a card: *"i asked previously to not pop as a card
   * everytime, just show points in the bottom and we can tap for details or
   * tap out."* `App` now sends a routine pop to the toast and a first pop to a
   * full card, and **no caller anywhere writes `brief: true`.**
   *
   * So the whole brief path is unreachable from the running game:
   * `.card-scrim.brief` and `.card-scrim.brief .card` in `ui.css`, `BRIEF_MS`
   * and the pointerdown dismissal in `ui/Card.tsx`, the "takes no focus" rule,
   * and `SaidCard`'s `brief` prop. Every piece of it is correct; nothing can
   * reach it.
   *
   * This is the repo's signature miss in the one shape the sweeps kept walking
   * past — an OPTIONAL field, which is the same blind spot `receipts.ts`'s
   * `perkAt` hid in. `CLAUDE.md`'s own rule, added the day that was found:
   * sweep the optional inputs too, and ask who passes them.
   *
   * **Left in place rather than deleted, because the decision is Marc's and it
   * is a screen decision.** "Is there any receipt this game wants to show and
   * not make the player dismiss?" is a question about how the board should
   * feel, not one this file can derive — and the answer decides whether this
   * is dead weight to cut or a mode to wire back up. `NEXT.md` carries it.
   */
  readonly brief?: boolean | undefined;
  /** Distinct per utterance, so a component can tell "said again" from "still
   *  saying" — the identity trick `popped` uses for the same reason. */
  readonly id: number;
};

export type Session = {
  readonly theme: Theme;
  readonly strings: Strings;
  /**
   * Hand the session the look and the language it should speak in NOW.
   *
   * A no-op when neither moved, so the effect that calls it on every render
   * costs nothing; a rebuilt snapshot when either did, so the sentences the
   * HUD carries change with it. See the note beside `let theme` for the bug
   * this exists to close.
   */
  readonly resupply: (theme: Theme, strings: Strings) => void;
  /**
   * True when this run is on a seed that is not the device world's — a
   * `?seed=` link. Exposed rather than recomputed by every caller, so the
   * board's tap and the session's own receipts cannot disagree about whether
   * a player is standing in their own world.
   */
  /**
   * Whether the run IN PROGRESS is on a seed that is not this device's world.
   *
   * **It used to be fixed for the life of the page, and that was a bug**
   * (2026-09-09). `App` builds its session once, on purpose (`useOnce`), and
   * this was a plain boolean set from how the page was OPENED — so a `?seed=`
   * visitor who then kept the board as one of their worlds, or took the front
   * door's SETTLE, went on playing their own world with fourteen readers of
   * this flag all still saying "somebody else's". Among them: the perk grant
   * (a find paid nothing), the live world merge (claims provisional until the
   * run ended), the perk-shelf write (a perk lost on reload), the manual's
   * WHICH GAME ("nothing about buying applies here", on their own shop) and
   * the crossing offer.
   *
   * A getter now, and `restart` sets it — so it is a property of the RUN, the
   * way `daily` already is, and every door states it (`shell/beginning.ts`'s
   * `Door`). Only the boot session can be true: every door out of a shared
   * link goes to a world or the daily.
   */
  readonly detour: boolean;
  readonly get: () => Snapshot;
  readonly subscribe: (listener: () => void) => () => void;
  readonly dispatch: (action: Action) => void;
  /** Price a pocket: a tap on a ripe tile. Null clears it. */
  readonly target: (hex: HexKey | null) => void;
  /**
   * The colour lens: one colour held up, every other tile stepped back.
   *
   * The core has taken a `spotlight` since the rules were lifted — it is what
   * `dimmed` and `lensed` are computed from, on the board AND in remembered
   * ground — and the shell passed `null` for it, which made a whole feature
   * dead code that every test still covered. Held here beside `harvestAt` for
   * the same reason: it is a way of LOOKING at a run, not part of one, so it
   * never reaches the reducer and never reaches the disk.
   */
  readonly spotlight: (colour: Colour | null) => void;
  /** Start again on a seed. */
  /**
   * Step into a run: a fresh one at `seed`, or `from` picked up exactly as the
   * reducer left it.
   *
   * One door rather than two because the crossing is the same crossing — the
   * pop, the priced pocket and every listener must be told once, in one order,
   * whichever kind of run is being entered. Resuming re-uses the very object
   * that was saved rather than replaying it: a replayed run is a run that can
   * disagree with the one that was played.
   */
  readonly restart: (
    seed: number,
    from?: GameState | null,
    memory?: RunMemory,
    /** The economy this run is played under — the shop, the perks and the
     *  shrines, already folded together by `shell/economy.ts`. Absent keeps
     *  the session's own, which is what every test wants and no screen does. */
    tuning?: Tuning,
    /** BEGIN AT CAMP: wake at this hex instead of origin. Only a FRESH run
     *  may camp — a resumed one carries its own wake hex in its state. */
    wakeAt?: HexKey | null,
    /**
     * Whether THIS run is on a foreign seed — see `detour`.
     *
     * Defaults to FALSE rather than to the session's current value, and the
     * difference is the whole fix: "keep what it was" is what let a shared
     * link's flag survive into a world. A test that omits it gets a run on its
     * own board, which is what every test means.
     */
    detour?: boolean,
  ) => void;
};

/**
 * A fresh run on a seed, carrying whatever its world already holds.
 *
 * `newRun`'s riders have defaulted to empty since Stage 1 and nothing in this
 * body ever filled them, so a world's territories, its spent finds and its
 * reborn landmarks were written down every run and read back never. One
 * funnel rather than two call sites, because the initial state and `restart`
 * have to open a run the same way or a resumed session and a fresh one
 * disagree about what the world remembers.
 *
 * `wakeAt` — BEGIN AT CAMP, the fifth shrine's unlock — is the last of those
 * riders to be filled (2026-08-30). It was hard-wired `null` here because the
 * unlock gates a button the door did not have, so the last rung of the ladder
 * woke a door onto nothing; `screens/Worlds.tsx` has that button now and
 * `campFor` in this file decides when it may be offered. The engine has
 * carried the rest since the rules were lifted: `homeOf` anchors every
 * distance-based reward at the wake hex, so a camp run's reach is measured
 * from where it woke and not from origin.
 */
const open = (
  seed: number,
  tuning: Tuning,
  memory?: RunMemory,
  wakeAt: HexKey | null = null,
): GameState =>
  newRun(seed, tuning, memory?.claimed ?? [], memory?.finds ?? [], wakeAt, memory?.rearmed ?? {});

/**
 * Where a camp run would wake, or null when this world may not camp.
 *
 * Ashwake 1's, verbatim in its conditions (`../tiles/src/shell/session.ts`):
 * the CAMP shrine woken, at least one territory held, and the FARTHEST of
 * those territories is the one you wake at — Marc's own anchor, *"every camp
 * restarts the climb"*. Deep ground you HOLD becomes ground you can start
 * from, which is the remembered world's missing verb.
 *
 * A detour and a daily are excluded by their callers rather than here: neither
 * has a world, so neither has a territory to wake at, and `unlockedBy` of a
 * world they do not have is not a question this function can be asked.
 */
export function campFor(world: WorldMemory | null): HexKey | null {
  if (world === null) return null;
  if (!unlockedBy(world).includes('camp')) return null;
  const held = [...world.territories];
  if (held.length === 0) return null;
  return held.sort((a, b) => distance(parse(b), ORIGIN) - distance(parse(a), ORIGIN))[0] ?? null;
}

const ORIGIN = { q: 0, r: 0 } as const;

/*
 * The economy is per RUN, not per session (2026-08-30).
 *
 * A session is built once and lives for the life of the page, so a `tuning`
 * fixed at construction could never see a relic spent in the shop between one
 * run and the next — which is the entire point of spending it. `restart`
 * takes the new one, and the session remembers it so a resumed snapshot and
 * the next `restart(seed)` agree.
 */

export function createSession(opts: {
  readonly seed: number;
  readonly theme: Theme;
  readonly strings: Strings;
  readonly tuning?: Tuning;
  /** A run read back off the device. Resuming is the same object the reducer
   *  left behind, so a resumed run is not a re-simulated one. */
  readonly resume?: GameState | null;
  /** What perk a find at that hex granted, for the receipt. The SHELL grants;
   *  the session only reports. */
  readonly perkAt?: (hex: HexKey) => PerkId | null;
  readonly wornPerk?: (perk: PerkId) => boolean;
  /** True when this run is on a seed that is not the device world's. */
  readonly detour?: boolean;
  /** What the world this seed belongs to already holds — territories, spent
   *  finds, reborn landmarks. Absent is a run that remembers nothing, which is
   *  what a daily, a shared seed and a first visit all are. */
  readonly memory?: RunMemory;
  /** What crossing would carry, priced at the moment a fully-awake world's
   *  shrine is reached. Absent means there is nowhere onward. */
  readonly crossingCarries?: () => { readonly dowry: number; readonly carried: number };
  /** Shrines this world has claimed across every run it has held, read fresh
   *  at the moment of a claim — see `ReceiptContext.shrinesClaimed`. Absent
   *  is a world-less run (a detour, a test), which has no ledger to name. */
  readonly shrinesClaimed?: () => number;
  /** BEGIN AT CAMP at boot — `?camp=1`. Ignored when a run is resumed, which
   *  carries its own wake hex. */
  readonly wakeAt?: HexKey | null;
}): Session {
  let tuning = opts.tuning ?? TUNING;
  /**
   * What this run's WORLD remembers — held across dispatches, because the
   * board is rebuilt on every one of them (2026-09-01).
   *
   * The fog is a fact about the world, fixed for the life of a run: ground
   * revealed while this run plays is on the board already, and `toBoardView`
   * skips a remembered key the board holds. So a snapshot taken when the run
   * opens is exactly right, and re-reading the disk per dispatch would be the
   * same answer at a cost.
   *
   * `build` passed a literal `[]` here for four stages — see `RunMemory`.
   */
  /**
   * THE LOOK AND THE LANGUAGE ARE RE-SUPPLIABLE, and until 2026-09-10 they
   * were not (Marc, playing: *"im stupposed to be in french but i got english
   * translations at some places"* — the woken shrine's unlock, a death
   * sentence, and a beacon's `still glows` line, all in English under a
   * COMPRIS button).
   *
   * Both arrived in `opts` and were read straight out of the closure, so the
   * catalogue a page BOOTED in was the catalogue every sentence the core
   * computes was written in, for the life of that page. And the page never
   * reloads: `CLAUDE.md` makes one page, many sessions a hard rule, so
   * choosing LANGUE in settings re-rendered every React string and could not
   * touch the epitaph, the signpost, a claim's receipt or a spend's.
   *
   * **The theme had it too, on the same line**, which is the half nobody
   * reported: switching direction mid-run left every receipt naming the
   * grounds of the direction you left — LICHEN where the board now says FARM.
   *
   * They are `let` rather than `opts.` reads now, and `resupply` is the door.
   * The snapshot is rebuilt on the way through, so the sentences the HUD
   * carries — the epitaph among them — change language on the spot. What does
   * NOT change is anything already SAID: a receipt in React state was a
   * sentence at the moment it was spoken, and re-translating the past would
   * be a game rewriting what it told you.
   */
  let theme = opts.theme;
  let strings = opts.strings;

  /*
   * ABOVE `snapshot`, and that is not cosmetic: `let snapshot = build()` runs
   * during `createSession`, and `build` reads both of these. Declared after it,
   * they are in the temporal dead zone and every session throws on creation —
   * which is what 24 store tests said the first time this moved.
   */
  let memory = opts.memory;
  let state = opts.resume ?? open(opts.seed, tuning, memory, opts.wakeAt ?? null);
  let harvestAt: HexKey | null = null;
  let spotlight: Colour | null = null;
  let popped: Snapshot['popped'] = null;
  let popCount = 0;
  let said: Said | null = null;
  let saidCount = 0;
  let snapshot: Snapshot = build();
  const listeners = new Set<() => void>();

  function build(): Snapshot {
    const ctx = renderContext(state, harvestAt);
    return {
      state,
      harvestAt,
      board: toBoardView(state, harvestAt, spotlight, memory?.revealed ?? [], theme.light, ctx),
      hud: toHudView(state, strings, harvestAt, spotlight, ctx),
      popped,
      said,
    };
  }

  /**
   * What the game says about one transition, in Ashwake 1's priority.
   *
   * A **pop receipt** first, because a harvest is the action the player asked
   * the most of — then the **claims** that placement or pop reached. Both, when
   * both happened: popping into a cache is one moment with two things to say
   * about it, and they belong in one utterance rather than in a race between
   * two toasts.
   *
   * Everything here is the core's arithmetic and the catalogue's words. The
   * receipts are a pure function of two states (`claimsBetween`), and the pop
   * is priced from the state BEFORE the reducer spent it.
   */
  function whatToSay(
    before: GameState,
    after: GameState,
    action: Action,
    cashed: ReturnType<typeof harvestValue> | null,
  ): Said | null {
    const lines: string[] = [];
    let card = false;
    let rows: readonly TipRow[] | undefined;
    let icon: IconName | undefined;

    if (action.type === 'HARVEST' && cashed !== null && cashed.count > 0) {
      lines.push(harvestNote(before, action.choice, cashed, strings));
      /*
       * A harvest leads with the mark its BUTTON wears (2026-08-30).
       *
       * Marc: *"make em icons, associate in how to play and cards too."* A pop
       * had no mark at all, on the reasoning that "the board is the thing that
       * popped" — which was true while POP was only a button. It is a concept
       * with a registry entry now: on the bar, at the head of its own manual
       * section, and here. Three places, one shape.
       *
       * A CLAIM still overrules it below. A placement that pops a pocket and
       * wakes a shrine at once is a shrine moment, and `saidOf` already ranks
       * that — this only fills the case that had nothing.
       */
      icon = action.choice === 'burn' ? CONCEPT_ICON.sacrifice : CONCEPT_ICON.pop;
    }

    if (action.type === 'SPEND') {
      const paid = spendReceipt(before, after, action.on, action.colour, {
        theme,
        strings,
      });
      if (paid !== null) lines.push(paid);
    }

    const claims = saidOf(
      claimsBetween(before, after, {
        theme,
        strings,
        // A DETOUR is a run on a seed that is not this world's — a `?seed=`
        // link, which is exactly what SHARE hands out. It has no ledger to
        // narrate, so a shrine says what shrines ARE rather than what the
        // home world would have unlocked, and `settle` refuses to fold it in
        // at all (the seed guard).
        detour,
        ...(opts.perkAt === undefined ? {} : { perkAt: opts.perkAt }),
        ...(opts.wornPerk === undefined ? {} : { worn: opts.wornPerk }),
        ...(opts.crossingCarries === undefined ? {} : { crossingCarries: opts.crossingCarries }),
        ...(opts.shrinesClaimed === undefined ? {} : { shrinesClaimed: opts.shrinesClaimed() }),
      }),
    );
    let offers: 'crossing' | undefined;
    if (claims !== null) {
      lines.push(claims.text);
      card = claims.card;
      rows = claims.rows;
      icon = claims.icon;
      offers = claims.offers;
      // An offer always holds the screen: it is a choice, and a choice that
      // scrolls past in a toast is a choice nobody made.
      if (offers !== undefined) card = true;
    }

    if (lines.length === 0) return null;
    return {
      // See `paragraphs` above for why the join is a named thing.
      text: paragraphs(...lines),
      card,
      ...(rows === undefined ? {} : { rows }),
      ...(offers === undefined ? {} : { offers }),
      // The same call the claim's own sentence was written from, so the button
      // under it cannot name a different number — see `Said.carried`.
      ...(offers === undefined || opts.crossingCarries === undefined
        ? {}
        : { carried: opts.crossingCarries().carried }),
      ...(icon === undefined ? {} : { icon }),
      id: ++saidCount,
    };
  }

  function commit(): void {
    snapshot = build();
    for (const listener of listeners) listener();
  }

  let detour = opts.detour === true;

  return {
    // Getters, so a caller that reads them after a `resupply` is told the
    // truth rather than what the page booted in.
    get theme() {
      return theme;
    },
    get strings() {
      return strings;
    },
    resupply(nextTheme: Theme, nextStrings: Strings) {
      if (nextTheme === theme && nextStrings === strings) return;
      theme = nextTheme;
      strings = nextStrings;
      commit();
    },
    get detour() {
      return detour;
    },
    get: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch(action) {
      const before = state;
      // What a pop is worth, read BEFORE the reducer spends it — the receipt
      // and the leap are both drawn from what was there.
      const cashed =
        action.type === 'HARVEST' ? harvestValue(state, action.at ?? harvestAt ?? undefined) : null;

      if (action.type === 'HARVEST') {
        // The cells that are about to leave, read BEFORE the reducer turns
        // them to stone — the leap is drawn from what was there.
        const value = cashed!;
        if (value.count > 0) {
          const going = new Set<HexKey>(value.keys);
          popped = {
            cells: snapshot.board.cells.filter((c) => going.has(c.key)),
            at: action.at ?? harvestAt ?? snapshot.board.targetHex,
            id: ++popCount,
          };
        }
      }
      const next = reduce(state, action);
      if (next === state) return;
      state = next;
      // A priced pocket that popped or ripened away is no longer a pocket.
      if (harvestAt !== null && state.cells[harvestAt]?.kind !== 'tile') harvestAt = null;
      said = whatToSay(before, next, action, cashed);
      commit();
    },
    target(hex) {
      if (hex === harvestAt) return;
      harvestAt = hex;
      commit();
    },
    spotlight(colour) {
      if (colour === spotlight) return;
      spotlight = colour;
      commit();
    },
    restart(seed, from, next, tune, wakeAt, onADetour) {
      if (tune !== undefined) tuning = tune;
      // Not `??=` and not left alone: a run that does not say it is a detour
      // is not one. See `Session.detour`.
      detour = onADetour === true;
      // The world the new run is played in, fog and all. A door that hands over
      // no memory is a run that remembers nothing, which is what a daily, a
      // crossing into a fresh world and a reset all are.
      memory = next;
      state = from ?? open(seed, tuning, memory, wakeAt ?? null);
      harvestAt = null;
      spotlight = null;
      popped = null;
      said = null;
      commit();
    },
  };
}

export function useSession(session: Session): Snapshot {
  return useSyncExternalStore(session.subscribe, session.get, session.get);
}

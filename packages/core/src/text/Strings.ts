import type { PointSource, Rarity } from '@content/tuning';
import type { Locale } from '@content/locale';

/**
 * Every sentence a player reads, as one typed object per language.
 *
 * The rule this file enforces (2026-08-28): **facts are computed in
 * `view/` and `meta/`; words are looked up here.** A catalogue function
 * takes numbers, names and booleans the caller has already worked out, and
 * returns a sentence — it never reads `GameState`, never checks a dial, and
 * never decides whether to speak. The conditions stay in one place (the
 * caller) so French and English cannot disagree about WHEN a sentence
 * applies, only about how it is worded.
 *
 * No library, no string keys: a missing French sentence is a type error in
 * `fr-CA.ts`, not an English fallback on a Québec phone. English (`en.ts`)
 * is the prose exactly as it was before this file existed, moved rather than
 * rewritten — the snapshots under `view/__snapshots__` are what say so.
 */

/** A lesson's name and its tappable spellings. Every lesson has these; the
 *  sentences are per-lesson below because each has its own variables. */
export type LessonHead = {
  readonly name: string;
  /** UPPERCASE, longest first — what `tips.ts` alternates over. */
  readonly terms: readonly string[];
};

/** The concepts the registry teaches — the keys of the catalogue's lesson
 *  section, which is also the type of `Lesson.id`. */
export type TaughtId = keyof LessonStrings;

export type LessonStrings = {
  readonly ripe: LessonHead & {
    readonly core: string;
    readonly stoneAsh: (red: string) => string;
    readonly stone: string;
    readonly cardLean: string;
    readonly cardPlain: string;
  };
  readonly pop: LessonHead & { readonly core: string };
  /**
   * The other thing a ripe pocket can be spent on (2026-08-30).
   *
   * It had no lesson at all, in either language: the button has been on the
   * board since Stage 3 and nothing anywhere said what pressing it does. Found
   * while giving POP and SACRIFICE their marks — Marc: *"make em icons,
   * associate in how to play and cards too"* — because a mark can only be
   * associated with words that exist. `CLAUDE.md`'s standing rule is to grep
   * for a consumer of every action a screen can produce; this is the same gap
   * seen from the other end, an action with no explanation.
   *
   * Not a `TeachId`: it teaches no MOMENT and spends no ledger entry. It joins
   * `pocket`, `worth` and the rest of `LessonId`'s extras — concepts the
   * manual explains and the drip never interrupts anybody with.
   */
  readonly sacrifice: LessonHead & {
    /** What the action IS, and it holds under every dial: a lesson may never
     *  go silent, which `lessons.test.ts` checks against BARE_TUNING. */
    readonly core: string;
    /** What it pays, which a dial CAN turn off. Split from `core` for exactly
     *  that reason — a world where burning pays nothing should not be told it
     *  pays relics, and should still be told what the button does. */
    readonly pays: string;
  };
  readonly pocket: LessonHead & { readonly core: string };
  readonly worth: LessonHead & { readonly core: string };
  readonly cache: LessonHead & {
    readonly coreRing: (pays: number, perRing: number) => string;
    readonly core: (pays: number) => string;
  };
  readonly site: LessonHead & { readonly core: (pays: number) => string };
  readonly shrine: LessonHead & { readonly core: string };
  readonly territory: LessonHead & {
    readonly core: (radius: number, tiles: number, cap: number) => string;
  };
  /** A hidden find, which is a DESTINATION like the four above it. It had no
   *  lesson of its own until 2026-08-30, and `LESSON_FOR_REWARD` pointed it at
   *  RELICS instead — so the legend printed a find's mark beside the word
   *  RELICS, and tapping a find on the board opened the card about the
   *  currency rather than about the thing you had just touched. */
  readonly find: LessonHead & { readonly core: string };
  readonly stone: LessonHead & { readonly coreAsh: (red: string) => string; readonly core: string };
  readonly rare: LessonHead & { readonly core: string };
  readonly rareUnique: LessonHead & { readonly core: string };
  readonly luck: LessonHead & { readonly core: string };
  readonly relic: LessonHead & { readonly core: string };
  readonly bounty: LessonHead & {
    readonly core: (need: number, radius: number, bonus: number) => string;
  };
  readonly stash: LessonHead & {
    readonly coreMany: (slots: number) => string;
    readonly coreOne: string;
    readonly more: string;
  };
  readonly sizeBonus: LessonHead & {
    readonly coreCapped: (cap: number) => string;
    readonly core: string;
  };
};

export type Strings = {
  readonly locale: Locale;

  /** The rules of the language itself, where a test needs them. */
  readonly typography: {
    /** What a whole sentence ends in. */
    readonly sentenceEnd: RegExp;
  };

  readonly lesson: LessonStrings;
  /** The clauses two or three doors share — see `view/lessons.ts`. */
  readonly luckCore: string;
  readonly rareStar: string;
  readonly rareCard: string;
  readonly lastGaspRule: string;

  readonly view: {
    /**
     * "NAME: PERSONALITY." — the head of a colour's lesson.
     *
     * The WORDS and their punctuation, never the rule: `view#groundHead` still
     * decides whether a direction that named its ground after its power gets a
     * word at all. It lives here for the same reason `powerHead`'s colon does
     * (D4): Québec French puts a narrow no-break space before a colon and
     * English does not, and that is a fact about a language.
     */
    readonly groundHead: (name: string, word: string) => string;
    readonly arc: { readonly late: string; readonly mid: string; readonly early: string };
    readonly guide: {
      readonly lowPopNow: string;
      readonly lowPopTiles: string;
      readonly lowRipen: string;
      readonly bountyReady: string;
      readonly tilesSpare: string;
      readonly pockets: (n: number) => string;
      readonly readySingle: (pockets: string) => string;
      readonly readyFork: (pockets: string) => string;
    };
    readonly destination: {
      readonly cache: (tiles: number) => string;
      readonly site: string;
      readonly shrine: string;
      readonly territory: string;
    };
    readonly hint: (destination: string, dist: number) => string;
    readonly glows: {
      readonly atEdge: (destination: string) => string;
      readonly past: (destination: string, beyond: number) => string;
    };
    readonly odds: (magic: number, unique: number) => string;
    readonly epitaph: {
      readonly broke: readonly ((placements: number, cost: number) => string)[];
      readonly walled: readonly ((placements: number) => string)[];
      readonly spent: (placements: number, unripe: number) => string;
    };
    readonly rarity: { readonly magic: string; readonly unique: string };
    readonly pocket: {
      readonly head: (count: number, worth: number) => string;
      readonly pays: (tiles: number, pts: number) => string;
      readonly score: (
        worth: number,
        pocket: number,
        multiplier: number,
        bounty: number | null,
      ) => string;
      readonly bar: (count: number, cap: number) => string;
      readonly treasure: (rarity: string) => string;
      readonly bounty: (bonus: number) => string;
      readonly rares: (n: number) => string;
    };
    readonly harvest: {
      readonly head: (count: number, worth: number) => string;
      /**
       * The first pop a device ever makes, which is a CARD rather than a
       * toast (Marc's call, 2026-08-29).
       *
       * It teaches the one rule that changes how the rest of the run is
       * played and that nothing else says out loud: a popped pocket turns to
       * STONE, which still surrounds but never matches — so the ground you
       * have already cashed grows poorer, and the world stays rich farther
       * out. A toast is too quiet for a rule that reshapes the board.
       */
      readonly firstPop: string;
      readonly firstPopWhen: string;
      readonly bountyCollected: (bonus: number) => string;
      readonly bountyMissed: (bonus: number, need: number, radius: number) => string;
      readonly tiles: (
        tiles: number,
        perTile: number,
        worthPerExtra: number,
        depthRings: number | null,
      ) => string;
      readonly scored: (pts: number) => string;
      readonly luck: (gained: number, oddsRose: boolean) => string;
      readonly treasure: (rarity: string) => string;
      readonly points: (
        pts: number,
        worth: number,
        counted: number,
        cap: number | null,
        multiplier: number,
        bounty: number | null,
      ) => string;
    };
    readonly purse: {
      readonly redraw: (cost: number) => string;
      readonly steer: (name: string, cost: number, draws: number) => string;
      readonly forge: (cost: number) => string;
      readonly sacrifice: (pct: number) => string;
      readonly lostPartly: (pct: number) => string;
      readonly lostAll: string;
      readonly lead: (lost: string) => string;
    };
    readonly stat: {
      readonly tiles: string;
      readonly points: string;
      readonly luck: (rate: number | null) => string;
      readonly reach: (step: number) => string;
      readonly costCurveGrace: (base: number, grace: number, every: number) => string;
      readonly costCurvePlain: (every: number) => string;
      readonly cost: (cost: number, curve: string) => string;
      readonly left: string;
    };
    /*
     * `colourWord` — the personality word `groundHead` paired with the
     * ground's name — was here and is gone (2026-08-29). The four power words are
     * per DIRECTION now, beside the ground names it already owned
     * (`Theme.powerNames`): one shared set could not be right for two fictions,
     * and two of its four entries — ASH, TIDE — were one direction's ground
     * names being spoken in every other direction's board.
     */
    readonly colour: {
      readonly green: (head: string, name: string, bonus: number) => string;
      readonly yellow: (head: string, bonus: number, all: boolean) => string;
      readonly red: (head: string, walls: boolean) => string;
      readonly blue: (head: string, every: number) => string;
    };
    /**
     * The one-clause version. `head` is the power word and its colon, or an
     * empty string where the direction's ground name already says it
     * (`view#powerHead`); `name` is that ground name, so a clause that points
     * at a ground says QUARRY rather than "red" — a word the game shows
     * nowhere else.
     */
    readonly power: {
      readonly green: (head: string, name: string, bonus: number) => string;
      readonly yellow: (head: string, bonus: number, all: boolean) => string;
      readonly red: (head: string, name: string, walls: boolean) => string;
      readonly blue: (head: string, every: number) => string;
    };
    readonly hex: {
      readonly cacheClaimed: string;
      readonly cache: (tiles: number) => string;
      readonly siteClaimed: string;
      readonly site: (pays: number, bonus: number) => string;
      readonly shrineDetourClaimed: string;
      readonly shrineDetour: string;
      readonly shrineClaimed: string;
      readonly shrineCrossing: (dowry: number) => string;
      readonly shrine: (next: string | null) => string;
      readonly findClaimed: string;
      readonly find: string;
      readonly territoryClaimed: (radius: number, owns: string) => string;
      readonly territory: (radius: number, owns: string) => string;
      /** What a territory with no colour yet is native to. */
      readonly someColour: string;
      readonly chainOut: (sentence: string) => string;
      readonly shimmers: string;
      readonly remembered: string;
      readonly dark: string;
      readonly wallBuildable: (mult: number) => string;
      readonly wall: string;
      readonly wallAsh: (standing: string, red: string) => string;
      readonly wallPlain: (standing: string) => string;
      readonly stone: (red: string) => string;
      readonly tile: (name: string, worth: number) => string;
      readonly open: string;
      readonly native: (name: string) => string;
    };
  };

  readonly perkRow: {
    readonly gain: (text: string) => string;
    readonly lose: (text: string) => string;
    readonly play: (text: string) => string;
  };
  readonly figure: {
    readonly ripen: string;
    readonly destinations: string;
    readonly place: string;
    readonly pop: string;
    readonly rare: string;
    readonly stash: string;
    readonly hold: string;
    readonly held: string;
  };

  readonly perk: Readonly<
    Record<
      'rootbound' | 'secondwind' | 'stonewalker' | 'wallbreaker' | 'openhand',
      {
        readonly name: string;
        readonly note: string;
        readonly gain: string;
        readonly lose: string;
        readonly play: string;
      }
    >
  >;
  readonly upgrade: Readonly<
    Record<
      'tiles' | 'odds' | 'world' | 'pace' | 'sense',
      { readonly name: string; readonly note: string }
    >
  >;
  /** The survey's announcement, wrapping a goal's own words. */
  /**
   * The two things a run says exactly ONCE, at their first occurrence.
   *
   * Not teaching — the teaching ledger is a device fact and these are true
   * again every run. NEW GROUND is the only moment the game marks a run as
   * having gone somewhere no run on this world ever has, and it is quiet
   * enough to miss without it.
   */
  readonly onceARun: {
    readonly newGround: string;
    readonly unique: string;
  };
  /**
   * A milestone the run was the one to finish, and what it PAID.
   *
   * The relics moved INTO the sentence on 2026-08-30, when the survey's payout
   * turned out to have no consumer anywhere in this body — `Goal.reward` was
   * written into `content/goals.ts`, detected, listed on the end screen and
   * never banked. A line saying a goal was met without saying what it was
   * worth is the version of that bug a player cannot tell from the real thing.
   */
  readonly goalMet: (goal: string, relics: number) => string;
  readonly goal: Readonly<
    Record<'reach20' | 'territories4' | 'known40' | 'shrinesAll' | 'perksAll', string>
  >;
  readonly unlock: Readonly<Record<'draft' | 'hold' | 'luck' | 'reach' | 'camp', string>>;
  readonly shed: Readonly<
    Record<'lastError' | 'otherReceipts' | 'timeline' | 'otherWorlds', string>
  >;
  readonly feature: Readonly<
    Record<'debug.overlay' | 'ui.sound', { readonly label: string; readonly note: string }>
  >;
  readonly tagline: string;

  /**
   * The hook: what this place is, why you go out, and why you come back
   * (Marc, 2026-08-29 — *"we need a little story, a small hook for this game
   * towards the settlement"*, and *"i want to go this way"*).
   *
   * Three sentences on the front door, under the tagline, and the ONLY story
   * the game tells. It is the game's, not a direction's, which is what lets
   * the four directions be one fiction rather than four: somebody stayed here
   * and the plain took it back (settlement), you go out into that plain with a
   * light (torchlit), and the survey is what you draw when you get home
   * (daylight).
   *
   * **It promises nothing the game cannot do**, which is the rule this repo
   * keeps having to re-learn: a field, a stall, a cut in the rock and a road
   * are the four grounds a player is about to be dealt, and "more than it had
   * yesterday" is the world's own memory of the ground you walked. No lore
   * about who left, no vocabulary a lesson would then have to teach.
   *
   * A tuple rather than a paragraph so the door can space them as three lines
   * and a missing one is a type error.
   */
  readonly story: readonly [string, string, string];

  readonly share: {
    readonly run: (name: string, pts: number, placements: number, arc: string) => string;
    readonly daily: (
      name: string,
      day: string,
      pts: number,
      reach: number,
      arc: string,
      tries: number,
    ) => string;
  };
  readonly daily: {
    readonly badge: (
      day: string,
      record: { readonly best: number; readonly tries: number } | null,
      /**
       * Consecutive days played, ending today or yesterday. Zero means no
       * streak worth naming — a rider rather than a field, because "0 days in
       * a row" is a discouragement and an absence is not.
       */
      streak: number,
    ) => string;
  };
  /**
   * What the game says when a claim LANDS — the reward loop's own voice.
   *
   * Distinct from `view.hex`, which is what a landmark says when you TAP it:
   * that one describes a thing standing there, this one reports something that
   * just happened to you. Ashwake 1 kept these in its UI as hard-coded
   * English, which is why they did not travel with the rules.
   *
   * The MARK is not here. `receipts.ts` carries `LANDMARK_ICON` beside the
   * words, which is
   * the one authority on those marks — a catalogue that wrote its own would be
   * a second place for them to drift.
   */
  readonly claim: {
    readonly cache: (tiles: number) => string;
    readonly site: (pts: number, need: number, radius: number, bonus: number) => string;
    readonly territory: (radius: number, owns: string) => string;
    readonly shrine: (unlock: string) => string;
    /** Past the end of the ledger, with nowhere onward to go. */
    readonly shrineAwake: string;
    /**
     * Past the end of the ledger, WITH the crossing on offer.
     *
     * The honest half is the second sentence and it was rewritten on Marc's
     * own evidence (2026-08-28): losing hard-found perks for 75 relics was
     * "not worth it", and the card had been saying the opposite. What stays
     * is the PLACE — the ground, the territories, the shrines woken here,
     * everything bought. The relics and the perks come with you.
     */
    readonly shrineCrossing: (dowry: number, carried: number) => string;
    /** The offer itself, and the arming word under it. */
    readonly crossLabel: (carried: number) => string;
    readonly crossArmed: string;
    readonly stay: string;
    /** A shared seed or a daily has no ledger to narrate. */
    readonly shrineDetour: string;
    readonly found: (perk: string, worn: boolean) => string;
    /** A find grants only what you do not already carry. */
    readonly findNothing: string;
  };

  /**
   * What the purse says when it has just been spent.
   *
   * Distinct from `view.purse`, which labels the BUTTONS: that one is an
   * offer, this one is a receipt. Ashwake 1's reason, verbatim: *"a reroll
   * that silently replaces three cards looks identical to a bug, so every
   * purchase pays out into the toast — the purse is a currency now, and a
   * currency you cannot see leaving is a currency you stop trusting."*
   */
  readonly spent: {
    readonly reroll: (paid: number) => string;
    readonly steer: (name: string, draws: number, paid: number) => string;
    readonly forge: (paid: number) => string;
    readonly tithe: (paid: number, relics: number) => string;
  };

  readonly backup: {
    readonly describe: (worlds: number, relics: number, date: string | null) => string;
    /**
     * Said when a pasted backup came out of Ashwake 1 (D3).
     *
     * Crossing bodies is a thing a player is TOLD is happening, not a thing
     * they work out afterwards from a world that came back under a new name.
     */
    readonly fromV1: string;
    /** Why a pasted thing was refused — the module's own rule is that a
     *  backup which silently does nothing is worse than no backup at all. */
    readonly refused: string;
    readonly paste: string;
    readonly saved: (how: 'shared' | 'downloaded' | 'copied') => string;
    readonly failed: string;
  };

  /**
   * The chrome's own words — declared now, consumed when the React chrome
   * exists (Stage 3). Every button face and tab name in one place, so the
   * screen cannot invent a word the manual does not use.
   */
  readonly ui: {
    readonly begin: string;
    readonly newRun: string;
    readonly mainMenu: string;
    readonly settings: string;
    readonly restart: string;
    readonly newWorld: string;
    readonly back: string;
    /** Leave every open panel at once — the escape hatch out of a deep stack. */
    readonly closeAll: string;
    readonly more: string;
    readonly daily: string;
    readonly shop: string;
    readonly hold: string;
    /**
     * The stash, in words.
     *
     * `holdEmpty` and `holdSwap` are what a screen reader hears; the two
     * notes are what a sighted player gets when they tap a slot with nothing
     * selected. Ashwake 1 answered the empty hand here after a fresh-eyes
     * pass found HOLD saying nothing at all — and answered it in English,
     * on a screen a French player is holding.
     */
    readonly holdEmpty: string;
    readonly holdSwap: (ground: string) => string;
    readonly holdNothing: string;
    readonly holdTrades: string;
    readonly pop: string;
    /**
     * The other two ways to cash a pocket.
     *
     * Four harvest choices exist in the rules; this body offered two. TAKE
     * spends a pocket for a rare tile, SACRIFICE burns it for relics or luck —
     * both were unreachable from the screen until 2026-08-29, with
     * `harvestTreasure` and `harvestBurn` computed in the view and read by
     * nobody.
     */
    readonly take: string;
    readonly sacrifice: string;
    /** What a burn pays, worded for whichever currency it pays in. */
    readonly relicsPaid: (n: number) => string;
    readonly luckPaid: (n: number) => string;
    readonly redraw: string;
    readonly forge: string;
    readonly sacrificeLuck: string;
    /** The same row once the purse holds enough to name what it would buy.
     *  A SENTENCE rather than a component gluing an arrow between two facts:
     *  "becomes" is a word, and which word it is belongs to a language (D4). */
    readonly sacrificeLuckFor: (relics: number) => string;
    readonly tabs: {
      readonly menu: string;
      readonly start: string;
      readonly play: string;
      readonly hand: string;
      readonly after: string;
    };
    readonly language: string;
    readonly languages: Readonly<Record<Locale, string>>;
    readonly appearance: string;
    /** The absence of a choice: let the device decide. Hard-coded English in
     *  the settings panel until 2026-08-29, on the screen whose whole job is
     *  the language row directly above it. */
    readonly auto: string;
    readonly sound: string;
    /** The SETTINGS switch, which says what a tap on it would DO. Two
     *  sentences rather than one and an "on/off": a toggle whose label is its
     *  STATE has to be read twice, once to learn the state and once to work
     *  out what pressing it does. It stood on the board until 2026-08-30 and
     *  is one control in one room now — see `Camera`. */
    readonly soundOn: string;
    readonly soundOff: string;
    /**
     * The board's one door out (2026-08-30).
     *
     * It replaced a ♪ and a `?` in the camera cluster, which were two buttons
     * for two rooms MORE already lists. The board is the thing this game is
     * trying to give the screen to; every control floating over it has to earn
     * the pixels, and one door that reaches everything beats two that reach a
     * room each.
     */
    readonly menu: string;
    /**
     * The board's LUCK button, said out loud.
     *
     * The button is a mark and a number, which reads as "12" to a screen
     * reader and says nothing about what it opens. It moved out of the action
     * bar and up beside the view button on 2026-08-30, so it is also no longer
     * next to anything that explains it.
     */
    readonly luckPurse: (luck: number) => string;
    readonly resetTeaching: string;
    /** The disclosure a manual section folds its finer print into. */
    readonly details: string;
    /** The door into the manual, from MORE and from the board's `?`. */
    readonly howToPlay: string;
    /**
     * The camera cluster's ONE view button (2026-08-29).
     *
     * Its label always names where it will GO, never where it is — a button
     * that says its destination never has to be read twice. One control that
     * cycles rather than four that crowd the board, which is Ashwake 1's
     * argument for the cluster restated: a phone already has a pinch.
     */
    /**
     * The manual's opening — what an expedition IS, before any rule.
     *
     * Not a lesson, and deliberately: a lesson teaches a TERM, carries a
     * figure and is remembered in the teaching ledger. This teaches none, and
     * exists because the manual opened on RIPE — a mechanic — and never once
     * said what the player was doing or that running out is how a run ends
     * rather than a mistake they made.
     */
    /** Said when a hidden find grants a perk — the shelf gaining one. */
    readonly perkFound: (name: string) => string;
    /** Said when a shrine woke a system for this world. */
    readonly woke: (what: string) => string;
    /**
     * The end screen's way back onto the board it just ended (2026-08-30).
     *
     * It captioned a PNG until then — a snapshot taken at the last dispatch and
     * shown as a picture. Marc: *"the ground you walked 'picture' is ugly, i
     * dont want a picture i want to actual screengame where we can move
     * around."* So it is a door now, and the same words open it.
     */
    readonly theMap: string;
    /** What is behind that door, said once under it. */
    readonly walkTheMap: string;
    /** And the way back out of it, to the numbers. */
    readonly backToEnding: string;
    readonly expedition: { readonly title: string; readonly lines: readonly string[] };
    readonly camera: {
      readonly fit: string;
      readonly here: string;
      readonly flat: string;
      readonly home: string;
    };
    /**
     * The board, said out loud (2026-08-29).
     *
     * Everything here exists because the board grew a KEYBOARD — a marker that
     * arrows walk and Enter acts on — and a control nobody can be told about
     * is a control nobody uses. `label` names the board for a screen reader,
     * `reach` is the sentence it reads on arriving there, and `keys` is the
     * same contract written out for the manual, on a desktop, where there is
     * room for it.
     *
     * Sentences rather than a table of glyphs and captions, deliberately: the
     * key names ARE words in each language (Entrée, Page précédente), and a
     * catalogue that handed the app a caption and let the app supply the key
     * would be the app deciding half of what a player reads.
     */
    readonly board: {
      readonly label: string;
      readonly reach: string;
      readonly keys: {
        readonly title: string;
        readonly move: string;
        readonly act: string;
        readonly pan: string;
        readonly zoom: string;
        readonly turn: string;
        readonly lean: string;
        readonly view: string;
        readonly cards: string;
        readonly hold: string;
        readonly mouse: string;
      };
    };
    /** The front door when a run is already in progress. */
    readonly resume: string;
    /** What a card is dismissed with, once it has been read. */
    readonly gotIt: string;
    /** The heading over everything that can destroy something. */
    readonly thisDevice: string;
    /** Said where nothing can be kept — a private window, storage blocked. */
    readonly noStorage: string;
    readonly backUp: string;
    readonly restore: string;
    readonly restoreArmed: string;
    readonly resetAll: string;
    readonly resetAllArmed: string;
    /** The three, as a heading. Distinct from `newWorld`, which is the
     *  destructive action inside that panel rather than the panel itself. */
    readonly worlds: string;
    /** One world of the three, by number. */
    readonly worldN: (n: number) => string;
    /**
     * The atlas: what a world has become, in the panel that holds it.
     *
     * Ashwake 1 kept these as a block in the manual's MENU tab, and its
     * reason travels: a RECORD is a different kind of fact from the six
     * numbers you are playing against right now, and a best sitting in a
     * header slot is one wearing the other's clothes.
     */
    readonly atlasRuns: string;
    readonly atlasBest: string;
    readonly atlasFarthest: string;
    readonly atlasKnown: string;
    readonly atlasTerritories: string;
    readonly atlasShrines: string;
    readonly atlasFinds: string;
    readonly atlasUnlocked: string;
    /** A slot nobody has played yet. */
    readonly emptyWorld: string;
    /**
     * BEGIN AT CAMP, and where the camp is — the fifth shrine's unlock
     * (2026-08-30).
     *
     * Deep ground you HOLD becomes ground you can START from, which is the
     * remembered world's one missing verb. It names the RING because that is
     * the whole of what a player is choosing: how far out the climb begins.
     * In the WORLDS panel rather than on the door, because it is a way INTO
     * this world and that panel is the list of those.
     */
    readonly camp: (ring: number) => string;
    /** A perk being worn, and the button that puts one on. */
    readonly worn: string;
    readonly wear: string;
    /** An upgrade at the top of its ladder — a rung you can see the end of. */
    readonly maxed: string;
    /**
     * The legend's own headings — every mark the board can show, and what it
     * means (Marc, 2026-08-29: "adding visuals and assets and symbols in the
     * how to play").
     *
     * The manual explained the rules and never showed the alphabet they are
     * written in: a player meets a glyph on a hex and the only way to learn it
     * was to tap that hex, which needs them to have walked there first.
     */
    readonly legendGrounds: string;
    readonly legendPlaces: string;
    readonly legendMarks: string;
    readonly legendRare: string;
    readonly legendWall: string;
    readonly legendRipe: string;
    readonly legendLegal: string;
    readonly privacy: string;
    /**
     * What a tap on the board says when it cannot place.
     *
     * Ashwake 1 wrote all three straight into its tap handler in English. A
     * tap that cannot build used to be a silent no-op — "the worst answer a
     * game can give a deliberate action" — and these are the answers.
     */
    readonly handEmpty: string;
    readonly lensOn: (ground: string) => string;
    readonly lensOff: string;
    /** A new build is already downloaded; the tap is the reload. */
    readonly newVersion: string;
    /** Hand this run to somebody. The game's only distribution mechanism. */
    readonly share: string;
    /** No share sheet here, so it went to the clipboard instead. */
    readonly copied: string;
    /**
     * The failure panel and SETTINGS ▸ LAST ERROR.
     *
     * Ashwake 1 wrote every one of these straight into `failure.ts` in
     * English, on the one screen a French player is most likely to be
     * frightened by. They are sentences a player reads, so they live here
     * (D4) — and the panel keeps a bare-English fallback of its own for the
     * case where the catalogue itself is what failed to load.
     */
    readonly crash: {
      readonly broke: string;
      readonly noWebgl: string;
      readonly seen: (n: number) => string;
      readonly continue: string;
      readonly reload: string;
      readonly send: string;
      readonly sending: string;
      readonly sent: string;
      readonly sendFailed: string;
      readonly copy: string;
      readonly selectAbove: string;
      readonly lastError: string;
      readonly noError: string;
    };
  };

  /**
   * Where a run's points came from, named (D4).
   *
   * Ashwake 1 wrote these seven words straight into its end screen in English,
   * which is exactly the mistake this block exists to make impossible: the
   * engine counts, the catalogue names, and a language missing one of these is
   * a type error rather than an English word on a French screen.
   */
  readonly payout: {
    readonly heading: string;
    readonly byColour: string;
    readonly byRarity: string;
    readonly bySource: string;
    readonly rarity: Readonly<Record<Rarity, string>>;
    readonly source: Readonly<Record<PointSource, string>>;
    /** Points paid for claiming sites outright, which no pop split contains. */
    readonly sites: string;
    /** The shape of the run's harvests, over the run. */
    readonly arc: string;
  };
};

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
type LessonHead = {
  readonly name: string;
  /** UPPERCASE, longest first — what `tips.ts` alternates over. */
  readonly terms: readonly string[];
};

/** The concepts the registry teaches — the keys of the catalogue's lesson
 *  section, which is also the type of `Lesson.id`. */
export type TaughtId = keyof LessonStrings;

type LessonStrings = {
  readonly ripe: LessonHead & {
    readonly core: string;
    readonly stoneAsh: (red: string) => string;
    readonly stone: string;
    readonly cardLean: string;
    readonly cardPlain: string;
  };
  readonly pop: LessonHead & {
    readonly core: string;
    /** The draw lean, where a manual reader can find it (2026-09-03). It was
     *  said only in `ripe.cardLean`, a first-contact sentence the manual never
     *  prints — so a rule that steers every draw after a pop was unfindable
     *  once the RIPE card was dismissed. Spoken only while pops pay luck and
     *  bias draws, the same condition `cardLean` keeps. */
    readonly lean: string;
    /** The timing choice — small-and-often against big-and-late — moved here
     *  from `view.harvest.firstPopWhen` (2026-09-04), which only the
     *  first-ever-pop toast ever read. A reader who dismissed that toast once
     *  had no way back to the one sentence that explains why waiting can be
     *  worth it, since the RÉCOLTER door never repeated it. */
    readonly when: string;
  };
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
  /**
   * The territory lesson, and the one sentence that has to know which KIND of
   * board it is being read on (2026-09-09).
   *
   * A territory pays four ways and three of them need a ledger: the field it
   * unfurls, `territoryTiles` into every later run's purse, +10 relics on the
   * crossing, and greeting a later run already yours. On a daily or a shared
   * board only the first is live — so `core` quoted the two dead numbers and
   * the word "for good", and never mentioned `territoryPays`, the one number
   * a territory there actually hands over. `pays` is the same sentence for
   * that board, and `lessons.ts` picks between them on the dial rather than on
   * a run kind, so it cannot disagree with what the engine paid.
   */
  readonly territory: LessonHead & {
    readonly core: (radius: number, tiles: number, cap: number) => string;
    readonly pays: (radius: number, tiles: number) => string;
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
  /**
   * THE FOUR SECTIONS THE MANUAL OWED (2026-09-03, Marc: all four).
   *
   * An audit of the manual against the engine found four rules it enforces
   * and no manual surface states — each had prose behind a tap somewhere
   * (`statNote`, `describeHexOf`), so the words existed and a reader who did
   * not know to tap could never meet them. `costRise`, `field` and `lens` are
   * teach ids, so their sections grow into the manual the moment their toast
   * speaks; `reach` is a word the manual prints for everyone.
   */
  readonly costRise: LessonHead & {
    /** What a placement costs, and it holds under every dial. */
    readonly core: string;
    /** The direction of the curve, which a dial CAN flatten. */
    readonly rises: string;
    /** The arithmetic, for the DETAILS fold. The wording is the stat note's
     *  own curve clause (one shared constant per language), with the full
     *  stop a standalone beat requires. */
    readonly curveGrace: (base: number, grace: number, every: number) => string;
    readonly curvePlain: (every: number) => string;
  };
  readonly reach: LessonHead & {
    readonly core: string;
    /** The multiplier rule, silent where `distanceStep` is zeroed. Shares its
     *  sentence with `view.stat.reach` (one constant per language). */
    readonly multiplier: (step: number) => string;
  };
  readonly field: LessonHead & { readonly core: string };
  readonly lens: LessonHead & {
    /** The world's memory, which nothing in the manual stated: walked ground
     *  persists under the fog and destinations glow through it. The section's
     *  second sentence is `lensHint`, shared with the drip's toast. */
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
  /** The lens's invitation (Marc's wording, 2026-09-03). Two doors read it —
   *  the drip's LENS toast and the manual's fog section — so the gesture is
   *  never described two ways. */
  readonly lensHint: string;

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
      /** Under the old tiles/points fork: a bounty-collecting pop is a
       *  DIFFERENT button from the ordinary one, so the guide has to name it. */
      readonly bountyReady: string;
      /** Under `singlePayout` (the shipped tuning): POP FOR POINTS never
       *  renders (`ActionBar.tsx`) — there is one POP button, and it always
       *  collects an armed bounty, so telling the player to pop it "as pts"
       *  points at a control that is not on the screen. */
      readonly bountyReadySingle: string;
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
      /**
       * `placedRate` and `rare` (Session 51) are the two flat terms added
       * beside the multiplied one — `worth × placedRate` for what was placed,
       * `rare.worth × rare.rate` as the jackpot on magic/unique tiles —
       * each `null` where its dial is off or its base is zero, so the old
       * three-term sentence is printed unchanged in every economy that has
       * neither. A bounty multiplies the whole sum, so a sentence with an
       * added term AND a bounty has to bracket the sum before the `×`.
       */
      readonly score: (
        worth: number,
        sizeBonus: number,
        multiplier: number,
        bounty: number | null,
        placedRate: number | null,
        rare: { readonly worth: number; readonly rate: number } | null,
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
      readonly bountyCollected: (bonus: number) => string;
      readonly bountyMissed: (bonus: number, need: number, radius: number) => string;
      readonly tiles: (
        tiles: number,
        perTile: number,
        worthPerExtra: number,
        depthRings: number | null,
      ) => string;
      /**
       * The score a pop banked, WITH its recipe (2026-09-02).
       *
       * It printed the bare number while the TILES line beside it spelled out
       * every term of its own arithmetic, so the smaller number was fully
       * explained and the one seventy times bigger was not. Marc's phone
       * caught it: a pocket paying `+113 tiles: 1 per tile, +1 more per 2
       * worth, +8 for the depth` and then, under nothing at all, `+8971 pts.`
       *
       * The BOUNTY belongs in HERE rather than only on its own line: the ×3 is
       * inside this number, and a separate sentence saying "collected" reads
       * as something that happened alongside the score rather than a term of
       * it. Its own line stays, because "collected" is still the news.
       *
       * `rate` is `pointsPerPop` as whole percent, and it is the term nothing
       * on screen has ever named: under the single payout a pocket's raw worth
       * is scaled before it is banked, which is why no product of the numbers
       * a player could see ever reached the total.
       */
      readonly scored: (
        pts: number,
        worth: number,
        count: number,
        sizeBonus: number,
        cap: number | null,
        multiplier: number,
        bounty: number | null,
        rate: number,
        placedRate: number | null,
        rare: { readonly worth: number; readonly rate: number } | null,
      ) => string;
      readonly luck: (gained: number, oddsRose: boolean) => string;
      readonly treasure: (rarity: string) => string;
      readonly points: (
        pts: number,
        worth: number,
        count: number,
        sizeBonus: number,
        cap: number | null,
        multiplier: number,
        bounty: number | null,
        placedRate: number | null,
        rare: { readonly worth: number; readonly rate: number } | null,
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
      /**
       * A shrine on a world whose ledger is finished, with no crossing on
       * offer (2026-09-01). Marc, of the board's tap answers: *"is it a good
       * shrine or one i dont need now?"* — this is the "one you do not need"
       * sentence, and without it `shrine(null)` promised "a system" that no
       * longer exists.
       */
      readonly shrineAwake: string;
      readonly shrine: (next: string | null) => string;
      readonly findClaimed: string;
      readonly find: string;
      readonly territoryClaimed: (radius: number, owns: string) => string;
      readonly territory: (radius: number, owns: string) => string;
      /**
       * A territory on a board with no ledger behind it: it pays TILES, and
       * the field it unfurls only outlives the run if the board is continued
       * as a world (2026-09-09). Chosen by `territoryPays` being raised,
       * which `shell/economy.ts` does for a daily and a shared board.
       */
      readonly territoryPays: (radius: number, owns: string, tiles: number) => string;
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
  };
  /*
   * `figure.hold` and `figure.held` were DELETED here on 2026-09-09.
   *
   * `figureCaption` is `s.figure[id]` and `FigureId` is the six figures the
   * manual draws — `hold` and `held` were never among them, so neither string
   * was reachable by any path. The dashed slot inside a figure is labelled
   * `s.ui.hold`, which is the control's own word and the one thing that should
   * label it.
   *
   * They are also how the naming collision hid: a catalogue that holds THREE
   * words for one mechanic (`stash`, `hold`, `held`) reads like three things.
   * `git log` is the archive.
   */

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
  /** One sentence per rung of `meta/shedLadder`, plus `lost` — the outcome
   *  where every rung was spent and the run went anyway. */
  readonly shed: Readonly<
    Record<'lastError' | 'otherReceipts' | 'timeline' | 'otherWorlds' | 'lost', string>
  >;
  readonly feature: Readonly<
    Record<
      'debug.overlay' | 'ui.sound' | 'ui.haptics' | 'board.awake',
      { readonly label: string; readonly note: string }
    >
  >;

  /**
   * The hook: what this place is, why you go out, and why you come back
   * (Marc, 2026-08-29 — *"we need a little story, a small hook for this game
   * towards the settlement"*, and *"i want to go this way"*).
   *
   * Four sentences, and the ONLY story the game tells. It is the game's, not
   * a direction's, which is what lets the four directions be one fiction
   * rather than four: somebody stayed here and the plain took it back
   * (settlement), you go out into that plain with a light (torchlit), and
   * the survey is what you draw when you get home (daylight).
   *
   * **RETOLD 2026-09-03** (Marc: the Inheritance direction, played subtle —
   * a loop only implied, never stated): it is no longer certain who stayed
   * here, and some nights it is not certain it wasn't you. The ambiguity
   * costs nothing new, because it describes a thing the game already does —
   * this world's own ground remembers what you walked here before, across
   * every run on it — and a player who never notices the hint loses nothing:
   * the four lines still read as plain atmosphere if nobody points at them.
   *
   * **It promises nothing the game cannot do**, which is the rule this repo
   * keeps having to re-learn: a field, a stall, a cut in the rock and a road
   * are the four grounds a player is about to be dealt, and "more than it had
   * yesterday" is the world's own memory of the ground you walked — as is
   * the one new clause, "more than you remember leaving it". No lore about
   * who left, no vocabulary a lesson would then have to teach.
   *
   * The former standalone tagline's mood folded into the opening line
   * 2026-09-03, its instructional half ("place, ripen, pop, and push on")
   * dropped rather than kept — those are verbs a teaching card already
   * covers, and the one rule this passage holds to is that it teaches none.
   *
   * A tuple rather than a paragraph so the door (or wherever it prints) can
   * space them as separate lines and a missing one is a type error.
   */
  readonly story: readonly [string, string, string, string];

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
    /**
     * THE THREE LINES ON THE SHARE CARD (2026-09-02).
     *
     * The card is a picture, and a picture is still something a player reads —
     * so its words come from here like every other sentence. Ashwake 1 drew
     * `${points} pts` and `REACH ${n}` straight into the canvas, which is
     * exactly the mistake D4 exists to make impossible: a French player's run,
     * shared into a French chat, labelled in English.
     *
     * `cardSeed` is the run's own seed, printed small: it is what makes the
     * card a door rather than a boast. Absent on a daily, which plays a date
     * nobody outside this device's book could use.
     */
    readonly cardScore: (points: number) => string;
    readonly cardReach: (reach: number) => string;
    readonly cardSeed: (seed: number) => string;
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
    /**
     * The same claim on a board that cannot keep it — a daily, or a shared
     * board's first run (2026-09-09).
     *
     * Two facts `claim.territory` cannot carry: the tiles it just paid, and
     * that the field is this run's unless the board is continued as a world.
     * The second one is the offer the ending is about to make, said at the
     * moment the player earns the reason to take it.
     */
    readonly territoryPays: (radius: number, owns: string, tiles: number) => string;
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
    /**
     * The MANUAL's tabs, and only the manual's.
     *
     * `after` used to be one of them and stopped being one on 2026-08-29, when
     * the three lessons it held moved beside the things they are about. It
     * survived because the HALL OF FAME borrowed it — for its own panel title,
     * for its tablist's name, and for the DIARY tab — and borrowed `hand` for
     * TOTALS on top of that. So the diary was labelled AFTER and the totals
     * were labelled HAND (2026-09-02).
     *
     * That is what a shared string bag does when two screens both need a word:
     * the second one takes whichever entry is closest, and the label stops
     * describing the thing under it. `fame` below is the hall of fame's own.
     */
    readonly tabs: {
      readonly start: string;
      readonly play: string;
      readonly hand: string;
    };
    /**
     * "There is more behind this tab", said out loud (2026-09-02).
     *
     * The manual grows with the world, and a tab holding sections back wears a
     * dot so the drip reads as a game arriving in order rather than as a
     * thinner one. The dot was a `::after` on `[data-grows]` — a pseudo-element,
     * which is to say a thing only an eye can see. A screen reader was told the
     * tab existed and never told it had more coming, which is exactly the
     * information the mark was added to carry.
     */
    readonly tabGrows: string;
    /** The hall of fame: what the room is called, and its two tabs. */
    readonly fame: {
      readonly title: string;
      readonly diary: string;
      readonly totals: string;
      /**
       * A diary row for a run on somebody else's board (2026-09-09).
       *
       * A shared run banked nothing at all, including the fact that it
       * happened; `settle`'s guard is right about every ledger and was
       * over-broad about the diary. The row has to say WHOSE board it was, and
       * the seed is a shared run's only identity — so the seed is in the
       * sentence rather than beside it, the way a daily's date is.
       */
      readonly shared: (seed: number) => string;
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
     * THE MENU'S OWN HEADINGS (2026-09-08, Marc: *"overall there is too much
     * buttons, need to layerize things properly"*).
     *
     * Ten rows in one column, in the order they were added over three weeks —
     * a pile rather than a screen. Three groups now, and they are the three
     * questions somebody opens this panel with: where do I go, what have I
     * done, and what is this phone set to. `device` is the same word
     * `thisDevice` uses, because it names the same idea one level down.
     */
    readonly menuGroups: {
      readonly play: string;
      readonly record: string;
      readonly device: string;
    };
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
    /** The front door's own disclosure: the three-sentence hook, folded so a
     *  stranger free to skip it is not made to scroll past it first. */
    readonly theStory: string;
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
    /**
     * THE VIEW BUTTON'S THREE STOPS (2026-09-08, Marc: *"Revise all 3 camera
     * modes so the third one is always 'my own custom view' ... Other two would
     * be 2d of 'our own custom view' and our default one"*).
     *
     * FIT and HERE are gone with the views they named: both were the button's
     * own opinions, and a cycle made only of those is one an arranged board
     * cannot be got back from. Each word is a DESTINATION, which is the rule
     * this button has followed since it was one button.
     */
    readonly camera: {
      /** Straight down and squared up, at the player's own pan and zoom. */
      readonly flat: string;
      /** The direction's own angle, board framed whole. */
      readonly home: string;
      /** The board as their own hands last left it. */
      readonly mine: string;
    };
    /**
     * The SHARPNESS dial (2026-09-04, Marc, on a phone: *"bad quality
     * pixels"*). `label` names it and `note` is the one sentence explaining
     * what the number trades against what.
     *
     * It lived on the board beside the camera button until 2026-09-08 — *"put
     * netteté button into settings"* — because it is a dial you set once for a
     * phone, not a thing you do while playing.
     */
    readonly sharpness: {
      readonly label: string;
      readonly note: string;
    };
    /**
     * ANTIALIASING, as a stored choice (TEMPORARY, 2026-09-11 — Marc: "make
     * the custom urls toggles in the settings we can remove later").
     *
     * `?aa=` was a measuring override (`PASS.md` P5.3) and the question it
     * measures — whether a ratio-2 phone should keep paying for MSAA — is a
     * look question on a device. This row is how it gets looked at without a
     * URL. `now` says what the canvas was actually built with, because the
     * flag is fixed at context creation and a switch that changes nothing
     * until the next launch must say so. AUTO / ON / OFF reuse `ui.auto` and
     * `ui.flag`.
     */
    readonly antialias: {
      readonly label: string;
      readonly note: string;
      readonly now: (on: boolean) => string;
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
    /**
     * What the world's territories are paying THIS run (2026-09-02).
     *
     * `startingPerk` says in its own docblock that it is exported so the UI can
     * explain why the purse is not the number on the shelf, because "a perk
     * nobody can see is indistinguishable from a bug" — and nothing in this
     * body ever said it. It is the one thing territories do between runs.
     */
    readonly fromTerritories: (tiles: number) => string;
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
    /**
     * THE OTHER THREE ARMED CONFIRMATIONS (2026-09-02).
     *
     * `restoreArmed`, `resetAllArmed` and `crossArmed` are spelled out in full
     * — they name the consequence, which is the whole point of an armed
     * control: the second tap has to say what it costs. Three more were built
     * in the components instead, as `` `${s.ui.restart}?` `` and friends: a
     * label with a question mark glued on, which asks "restart?" rather than
     * saying what restarting throws away.
     *
     * It also put punctuation in a screen. French happens to take no narrow
     * space before `?` (OQLF, unlike France), so it looked right — and it
     * looked right by luck rather than by rule, which is exactly what D4
     * exists to stop.
     *
     * `newWorldArmed` takes the world's number because the panel's own
     * confirmation should name which of the three is about to go.
     */
    readonly restartArmed: string;
    readonly resetTeachingArmed: string;
    readonly newWorldArmed: (n: number) => string;
    /** The three, as a heading. Distinct from `newWorld`, which is the
     *  destructive action inside that panel rather than the panel itself. */
    readonly worlds: string;
    /** One world of the three, by number. */
    readonly worldN: (n: number) => string;
    /**
     * The perk hunt, across all three worlds — the hall of fame's TOTALS tab.
     *
     * A perk belongs to the world that found it, so the shop's shelf only ever
     * shows the world you are standing in. This is the one place all three can
     * be seen at once, which is what makes a find on world 2 a thing you can
     * still point at a month later.
     */
    readonly perksFound: string;
    readonly noPerksYet: string;
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
    /** The five world goals, met and unmet — the atlas's own fold. */
    readonly survey: string;
    /**
     * The atlas, headed on the END SCREEN (2026-09-01).
     *
     * The ending already carries a stat grid of the RUN, so the world block
     * under it needs a word saying whose numbers those are. In the WORLDS
     * panel the panel title does that job and there is no head at all.
     */
    readonly thisWorld: string;
    /** A slot nobody has played yet. */
    readonly emptyWorld: string;
    /** Marks the world the run in progress is on. Empty on a daily, where
     *  the player is not in a world at all. */
    readonly hereNow: string;
    /**
     * WHICH GAME YOU ARE IN (2026-09-02).
     *
     * There are three modes and this body named none of them. A `?seed=` link
     * is the ordinary way a stranger meets Ashwake — it is what SHARE hands
     * out — and the recipient landed on an unchanged front door, began, played
     * a run on somebody else's world, banked nothing, and was never told that
     * was the deal. Ashwake 1 said so in three places, and START is the one it
     * argued about hardest, because a shared link's recipient is exactly the
     * person reading a manual for the first time.
     *
     * `now` is which one you are in and is the only line always shown. The
     * other three fold: they are a reference, not a lesson.
     */
    readonly which: {
      readonly title: string;
      readonly nowWorld: string;
      /**
       * What does NOT apply on a daily or a shared board.
       *
       * These two said "nothing below about KEEPING or buying applies here"
       * until 2026-09-09, and keeping now does: the ending offers to continue
       * the board as one of the three worlds, carrying the ground walked and
       * the territories claimed. Buying is still the honest half — a board
       * with no ledger is played on the shipped dials, with no upgrade, no
       * unlock and no perk, which is what makes a shared score comparable.
       */
      readonly nowShared: string;
      readonly nowDaily: string;
      readonly world: string;
      readonly shared: string;
      readonly daily: string;
      /** SHARE, on the ending, is what turns a run into such a link. */
      readonly howToShare: string;
      /**
       * THE SAME TWO FACTS, SHORT ENOUGH FOR A DOOR (2026-09-09).
       *
       * `shared` and `daily` above are the MANUAL's sentences: a reader who
       * opened WHICH GAME wants the whole deal, and 190 characters is the
       * right length there. The FRONT DOOR printed the same paragraphs — so
       * the first screen anybody sees, and the screen a public link lands on,
       * asked a stranger to read seven lines about run modes before their
       * first tap.
       *
       * Measured rather than judged: `which.shared` was the longest string on
       * any screen a player is trying to ACT on, with `settleNote` under it
       * and a second button between them.
       *
       * One sentence each. What a door owes is the deal in a breath — this
       * board is not yours to keep, and nothing you buy applies — and the
       * manual is one tap away for the rest. Two sentences rather than a
       * truncation of one, because a door and a reference page are two
       * different jobs and D4 says the catalogue holds the sentence each
       * needs.
       */
      readonly doorShared: string;
      readonly doorDaily: string;
    };
    /**
     * BEGIN, on a door that is not this device's own world.
     *
     * The button said BEGIN whatever board was behind it, so the loudest
     * control on the screen was the one place the mode could have been named
     * and was not.
     */
    readonly beginShared: string;
    readonly beginDaily: (day: string) => string;
    /**
     * The onward invitation, beside SHARE on a run that arrived by link.
     *
     * A recipient gets the same SHARE button as everybody and the chain
     * propagates; nothing ever said so. One quiet line, next to the button that
     * acts on it.
     */
    readonly cameByLink: string;
    /**
     * THE ENDING'S HEADLINE AND ITS LEDGER (2026-09-02).
     *
     * The audit of this body against Ashwake 1 found the end screen was where
     * the most had been lost, and all of it the same kind of thing: facts the
     * game had already computed and then declined to say.
     *
     * - `settle` folded the run into the record book and threw the answer away,
     *   so a run that beat the standing best said nothing. It is the one line
     *   on this screen a player might screenshot.
     * - `shortOfBest` rather than restating the best beside a run that missed
     *   it: Ashwake 1's ruling, and the reason is that "how far short" is the
     *   question and "best 480" is not an answer to it. Silent where there is
     *   no standing best at all, which a shared-seed replay on a fresh device
     *   has: "0 short of best" under a score is a line lying twice.
     * - `run` and `try` name WHICH run this was. A daily counts tries and
     *   confesses them, per the design's own honesty rule.
     * - `relicsBanked` is what the run pays into the roguelite, as distinct
     *   from the score. `endingPayout` has computed it since the rules were
     *   lifted and nothing printed it.
     */
    readonly ending: {
      /**
       * WHAT THIS SCREEN IS, said once, in a heading (2026-09-02).
       *
       * The end screen had no `h1`: the score was a `<p>`, and the first
       * heading on the page was an `h2` that only exists when the run had a
       * world. So the screen a run ends on had no name at all — heading
       * navigation, which is how a screen reader arrives anywhere, landed on
       * nothing — and the loudest thing on it announced as a bare number.
       *
       * The score IS the heading; this is what the heading says.
       */
      readonly scored: (n: number) => string;
      readonly newBest: string;
      readonly shortOfBest: (n: number) => string;
      readonly run: (n: number) => string;
      readonly try: (n: number) => string;
      /**
       * THE REASON TO COME BACK TOMORROW (2026-09-09).
       *
       * `dailyStreak` has been computed since Stage 4 and printed in exactly
       * one place: the front door's daily badge, which a player reads BEFORE
       * they play. The moment it does any work is the moment they finish —
       * and the ending said `TRY 3` and nothing else. **The word "tomorrow"
       * appeared in neither catalogue.**
       *
       * This game has no backend by ruling (D13): no push, no email, no store
       * listing. So the home-screen icon and this sentence are the entire
       * habit, which makes a computed-and-unprinted streak the cheapest
       * retention bug there is.
       *
       * Two sentences rather than one with a fork inside it: on day one there
       * is no streak to protect and the honest line is an invitation, not a
       * tally. `streak` is only spoken above 1 — see `Ending.dailyStreak`.
       */
      readonly streak: (days: number) => string;
      /** Day one, or a streak just broken: nothing to protect yet. */
      readonly comeBack: string;
      /** Replay today's board. The retry loop lives where the itch is. */
      readonly tryAgain: string;
      /**
       * On a daily's ending: KEEP today's board as one of this device's three
       * worlds and carry on exploring it.
       *
       * It used to open a fresh expedition into whichever world you came from,
       * which is what the words say only if you already know a daily is not one
       * of your worlds. Marc, 2026-09-05, on what the sentence had always meant
       * to him: *"i want to import this seed in one of my 3 worlds as a new
       * world that i'd like to explore further, with this first run in mind."*
       * So it opens the picker below instead, and the plain way back to a world
       * you already have is the main menu, which is where every other door home
       * lives.
       */
      readonly continueInWorld: string;
      /**
       * The picker's own heading: which of the three this board becomes.
       *
       * The one thing a player must not be surprised by here is what they are
       * about to spend: picking a world that has been played asks to ABANDON
       * it, in the words `newWorldArmed` already uses.
       */
      readonly importInto: string;
      /**
       * What travels and what does not — `meta/world.ts`'s `worldFromRun`, in
       * words.
       *
       * It named the ground alone until 2026-09-09, when the territories
       * started travelling too (Marc: *"make sure territories follow up in a
       * new world"*). A sentence listing what you keep is a sentence that has
       * to be re-read every time that list moves, which is why the list lives
       * in one function and this says the same three things it does.
       */
      readonly importKeeps: string;
      readonly relicsBanked: (n: number) => string;
      /**
       * The run's own shape, as the six facts Ashwake 1 fixed the grid at.
       *
       * Fixed so the screen does not change shape between a short run and a
       * long one. LUCK is deliberately not among them: the ending bonus has
       * already folded the unspent purse into the relics line, and this grid is
       * about the run's shape rather than its currency.
       */
      readonly placements: string;
      readonly popped: string;
      readonly biggestPop: string;
      /** "412 at 78%" — how big, and how far through the run it landed. */
      readonly biggestPopAt: (points: number, pct: number) => string;
      readonly destinations: string;
      readonly bounties: string;
      /** Nothing to report in a cell that is always present. */
      readonly none: string;
    };
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
    /**
     * THE STAT ROW'S OWN WORDS (2026-09-02).
     *
     * They lived in `screens/Hud.tsx` behind `s.locale === 'fr-CA' ? … : …`,
     * four times — grepped, the ONLY locale branch on player-visible words
     * anywhere in this app. (`text/format.ts`'s three are formatting rules,
     * which is what that file is for.)
     *
     * D4's whole point is that a missing sentence is a TYPE ERROR: every word a
     * player reads is a field on this object, so a new language cannot compile
     * until it has said everything. A ternary on the locale is the opposite —
     * it makes a missing French label an `if` nobody wrote, and it is a shape
     * that spreads, because the next screen with two words in it has a
     * precedent to point at.
     *
     * `luck` is deliberately not here: it is one of the seven ideas the concept
     * registry names, and the row draws `s.lesson.luck.name` so the board, the
     * purse, the shop and the ending cannot call it four things.
     *
     * The words themselves do not move, so no English snapshot moves with them.
     */
    readonly stats: Readonly<Record<'tiles' | 'points' | 'map' | 'cost' | 'left', string>>;
    /**
     * THE FEATURE SWITCHES' OWN THREE WORDS (2026-09-02).
     *
     * `SETTINGS` rendered `'ON'`, `'OFF'` and `'NOT BUILT'` as English string
     * literals — **on the panel whose top row is the language picker**. A
     * player switching the game to French watched three English words stay put
     * on the screen that just took the instruction.
     *
     * `notBuilt` is the honest word for a flag with nothing behind it, and it
     * exists because `features.ts` argues that a registry of aspirational flags
     * is a to-do list that lies: the row is SHOWN rather than hidden, so it has
     * to say what it is.
     */
    readonly flag: Readonly<Record<'on' | 'off' | 'notBuilt', string>>;
    /** A perk being worn, and the button that puts one on. */
    readonly worn: string;
    readonly wear: string;
    /**
     * Take a perk OFF (2026-09-05, Marc: *"a way to equip/unequip"*).
     *
     * `worn` is a STATE — what the shop prints on the row you are wearing —
     * and it was doing duty as the label of a button that could not be
     * pressed, because the shop disabled the only worn row while one slot was
     * filled. So there was no way to wear NOTHING, which matters for the two
     * perks that take something as well as give it (ROOTBOUND punishes strayed
     * ground; the note on each says so). A verb, because it is now a verb.
     */
    readonly takeOff: string;
    /** An upgrade at the top of its ladder — a rung you can see the end of. */
    readonly maxed: string;
    /**
     * THE SHOP, SAID ALOUD (2026-09-02).
     *
     * Three labels for three things the shop showed and never named. A screen
     * reader takes a control's name from its content, and the shop's contents
     * are numbers: the buy button was called `12`, the balance line was called
     * `412`, and the perk heading was a level-two heading called `3/5`. Each is
     * legible beside the thing it belongs to and meaningless in a list of
     * controls, which is how a screen reader gives them.
     *
     * Sentences, so the catalogue decides how a quantity meets a noun and the
     * component never does (D4).
     */
    readonly buy: (name: string, price: number) => string;
    /** The relic balance, as a sentence rather than a bare count. */
    readonly relicsHeld: (n: number) => string;
    /** How much of the perk pool this device has found. */
    readonly perksTally: (found: number, all: number) => string;
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
     * The way to the third-party notices (2026-09-09).
     *
     * Ashwake serves two OFL typefaces and one MIT icon set, and both licences
     * require the notice to be distributed WITH the work. `/third-party.txt`
     * is that distribution; this is the only thing on any screen that says it
     * exists, and it sits under the privacy sentence because they answer the
     * same question — what is in this page that is not mine.
     *
     * A plain link and not a panel: it is a legal notice, it is read once by
     * almost nobody, and a screen for it would be a screen to maintain.
     */
    readonly notices: string;
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
    /**
     * The lens's own way out, as a control (2026-09-01).
     *
     * Marc: *"a quick 'Lens off' button (see other repo)."* Ashwake 1 has
     * carried one since 2026-08-27, for his own reason then: *"sometimes its
     * hard with tiles in hand"*. The two gestures that let a lens go are a
     * second long-press on the card that lit it and a second tap on the fog,
     * and both ask you to remember which one you used. A button that is only
     * there while a lens is lit asks nothing.
     *
     * `lensClear` is the word on it, short enough for a floating control.
     * `lensClearLabel` is what a screen reader hears, which has room to name
     * the ground the lens is holding up.
     */
    readonly lensClear: string;
    readonly lensClearLabel: (ground: string) => string;
    /** A new build is already downloaded; the tap is the reload. */
    readonly newVersion: string;
    /**
     * THE TWO NOTES ABOUT WHERE THIS GAME IS LIVING (2026-09-02).
     *
     * `install` is an invitation, in the quietest voice on the ending, and only
     * where the browser actually handed over a dialog to open — Ashwake 1's
     * launch audit found it printing directions to a menu while Chrome held the
     * real thing unopened, so words are the fallback and a button is the offer.
     *
     * `inApp` is the counterweight to the game's own distribution: a SHARE link
     * most often lands inside Instagram or TikTok, whose WebView storage is
     * partitioned and commonly wiped when the host app closes. The useful half
     * of the sentence is the instruction, not the diagnosis, so it says what to
     * do about it.
     */
    readonly install: string;
    /**
     * HOW TO INSTALL BY HAND, on the platform with no dialog (2026-09-09).
     *
     * iOS never fires `beforeinstallprompt`, so `s.ui.install` — a BUTTON —
     * can never appear there, and until today no screen in the game mentioned
     * the home screen at all. With no backend by ruling (D13) the home-screen
     * icon is the only way back, so on iPhone the way back was unreachable and
     * unmentioned.
     *
     * It names Safari's two taps exactly, which is why the sniff behind it
     * excludes Chrome and Firefox on iOS: a sentence pointing at the wrong
     * menu is worse than no sentence. The icons are spelled in WORDS rather
     * than drawn, because the share glyph belongs to iOS and is not in this
     * game's registry (D10: a symbol invented in one place).
     */
    readonly handInstall: string;
    /**
     * THAT A WORLD LIVES IN ONE PLACE (2026-09-09).
     *
     * BACK UP has worked since Stage 4 and sits three taps deep behind
     * SETTINGS ▸ DEVICE. The only proactive storage warning fires inside an
     * in-app browser, so an ordinary player with a world worth keeping was
     * never told it could be lost — and losing it is the one failure nobody
     * comes back from.
     *
     * Said once, and only once there is something to lose.
     */
    readonly backUpNote: string;
    readonly inApp: string;
    /*
     * There was a `dismiss` here — 'Not now' / 'Pas maintenant' — cut
     * 2026-09-10 when `pnpm sweep` found it read by nothing. Both notices it
     * was written for make the SENTENCE the button: the update line and the
     * in-app warning are each one `<button>` wearing the whole warning, and
     * the toast's dismissal is a tap on the paragraph plus Escape. Nothing in
     * this game offers a decline beside a notice, so there was no caller to be
     * missing — the `Confirming.holdMs` distinction, landing the other way.
     */
    /** Hand this run to somebody. The game's only distribution mechanism. */
    readonly share: string;
    /** No share sheet here, so it went to the clipboard instead. */
    readonly copied: string;
    /**
     * Neither worked (2026-09-02).
     *
     * `share()` has returned `'failed'` since it was written — no share sheet
     * AND no clipboard, which is an in-app browser with permissions locked
     * down, the exact place a shared link most often lands — and the end
     * screen mapped it to `null`, which is the same thing it shows for a tap
     * that has not happened yet. So the one distribution mechanism this game
     * has could fail in total silence, on the screen it exists on.
     */
    readonly shareFailed: string;
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
      /**
       * The board had a context and the device took it back for good
       * (`PASS.md` P8.3). Its own sentence rather than `broke`, because
       * nothing broke: the run is intact, the shell is live, and the one thing
       * that cannot be true again on this page is the picture.
       */
      readonly boardLost: string;
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
   * Ashwake 1 wrote these words straight into its end screen in English,
   * which is exactly the mistake this block exists to make impossible: the
   * engine counts, the catalogue names, and a language missing one of these is
   * a type error rather than an English word on a French screen.
   *
   * There was a `heading` here — 'WHERE THE POINTS CAME FROM' — cut 2026-09-10
   * when `pnpm sweep` found it read by nothing. It never had a screen: the
   * fold's own summary is DETAILS in both bodies, those five words were a
   * COMMENT in Ashwake 1's `game.ts`, and the three `Bars` below carry their
   * own headings. A sentence written for a title no screen ever had.
   */
  readonly payout: {
    readonly byColour: string;
    readonly byRarity: string;
    readonly bySource: string;
    readonly rarity: Readonly<Record<Rarity, string>>;
    /**
     * A COUNT of rare tiles, as a phrase (2026-09-02).
     *
     * TAKE's value read `` `1 ${s.payout.rarity[…]}` `` — a number glued to a
     * noun in a component, which is safe at one and is the exact shape that
     * breaks the day a pocket can hand over two: English needs a plural, French
     * needs a plural AND an agreement, and neither is a screen's decision (D4).
     *
     * The treasure is always one today. That is what makes this the right
     * moment to move it: the sentence is a phrase now rather than a
     * concatenation, so the day the number varies the catalogue is already the
     * thing that decides how it reads.
     */
    readonly treasureCount: (n: number, rarity: string) => string;
    readonly source: Readonly<Record<PointSource, string>>;
    /** Points paid for claiming sites outright, which no pop split contains. */
    readonly sites: string;
    /** The shape of the run's harvests, over the run. */
    readonly arc: string;
    /**
     * THE SCORE, IN THE THREE TERMS THE ENGINE ADDS IT UP IN (2026-09-02).
     *
     * The breakdown above answers "off which tiles"; it cannot answer "why is
     * the total bigger than the tiles". `endingBonus` pays two things once, at
     * the moment a run stops — reach, and claims — and neither had ever
     * appeared on a screen, so three honest columns summed to a number the
     * player could see was wrong and could not find.
     *
     * SITES is its own row rather than part of POPS: a ★ is paid outright the
     * moment it is claimed, and folding it into pops made one word name two
     * unlike things. Ashwake 1 split them the day its own breakdown could not
     * explain the row above it.
     */
    readonly pops: string;
    readonly reachBonus: (reach: number, per: number) => string;
    readonly claimBonus: (claims: number, per: number) => string;
    readonly total: string;
  };
};

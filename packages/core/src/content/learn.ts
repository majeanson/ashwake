/**
 * THE FIRST WORLD A DEVICE EVER HAS IS A CHOSEN ONE (2026-10-12).
 *
 * Two strangers, of the first minute: _"ça prendrait un forced tutorial avec 0
 * randomness pour les 20 premières tiles"_, and _"trop d'information trop vite
 * trop tôt"_. A tutorial that is a separate mode would be a fourth kind of run
 * and a fourth set of doors (`MODES.md` is the cost of that), and a scripted
 * hand would move the rules and `sim.golden.txt`. This is neither: a world is
 * already a place with a seed, a seed already fixes the ground and the order
 * the tiles come in, so the first world is simply a seed somebody looked at.
 *
 * **What was looked for**, by walking the bot (`shell/walk.ts`) thirty
 * placements into the first 250 seeds and keeping the boards where, in
 * placements:
 *
 *  - a wall is in view by the 6th, so WALL is met early;
 *  - a cache is in view by the 8th, so there is somewhere to build TOWARD;
 *  - the first pocket can be popped between the 8th and 14th, so the central
 *    idea arrives while the player still remembers what the card said;
 *  - a site is in view by the 16th, a goal a short way off;
 *  - no shrine or territory in view before the 24th, and nothing rare in the
 *    hand before the 14th — the things that earn a NEW chip wait their turn;
 *  - a POOR HAND within eight placements of the first pop (the best any card
 *    can do anywhere is 2 or less), so the player has just earned luck when the
 *    game first has a reason to say REDRAW exists (`tuning.poorHandBelow`).
 *
 * Three of 250 passed the first five, and 2,100 seeds were scanned for the
 * sixth: only a handful have one at all, and none has a sustained stretch of
 * them, which is why the lesson is a hint on a poor hand and not a rigged deal.
 * This is the one with the site nearest (placement 1) and poor hands on the
 * 11th, 12th and 15th, the first pop being the 9th. `shell/learn.test.ts` pins every line above,
 * so a change that moves the ground or the deal fails there rather than on a
 * stranger's phone.
 *
 * It is the seed of the device's FIRST world only. Every later world, and the
 * same world's later runs, are as random as they were: a world's later runs
 * deal fresh tiles on this same map (`GameState.deal`), so what repeats is the
 * ground, which is what a tutorial wants and a returning player never sees
 * twice in a row.
 */
export const LEARN_SEED = 933;

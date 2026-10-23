# ashwake.marcportal.com — stranger review (2026-10-23)

Visited cold on a phone (375 px): title screen, Begin, the story dialog, How to play, the
how-it-works dialog, first three placements.

## First impression

Beautiful, moody title screen — and it says nothing. A stranger sees ASHWAKE, BEGIN, MENU and
has to commit before knowing whether this is a puzzle, an idle game or a roguelike. Once in,
the onboarding is thorough but arrives as two dialogs and a manual before the first tap.

## Friction, most important first

1. **No pitch on the title screen.** One line under the logo — « Pose des tuiles, fais-les
   mûrir, récolte. Une partie : 5 minutes. » — answers « what is this / how long ». The
   marketplace card already has the sentence.
2. **Two modals before playing.** « The Story » → GOT IT → « How it works » → GOT IT, then an
   in-board coach. The in-board coach (« Tap a glowing edge… ») is the best of the three; let
   it carry the first run and move the story to after the first run ends (it lands better once
   you've felt the dark).
3. **Language mismatch.** The page `<title>` and meta are French (« un établissement au bord
   d'une plaine noire »), `lang="en"`, and the whole UI is English. Link previews will be FR,
   the game EN. Either offer FR or make the meta EN.
4. **Typo: « You are walking out into a dark _plane_ »** in How to play (the story says
   « plain »).
5. **How to play is dense ALL-CAPS jargon** (POCKET, RIPE, POP, STONE, SIZE BONUS, REACH,
   RELICS, COST) in one long scroll. Most of it is only needed after run one. Split into
   « first run » (place, ripen, pop) and « later » (reach, size bonus, relics, shop).
6. **Manual tabs overflow off-screen with no affordance**: EXPEDITION · GROUNDS · WORLD are
   visible, HAND is clipped, and nothing hints the row scrolls. Add a fade edge or wrap.
7. **First tap on the board did nothing** (the board didn't change; the next taps worked).
   Possibly the tap dismissed the coach or landed during the camera settle — either way the
   very first action felt ignored. Accept the first tap or block input visibly until ready.
8. **MENU button doesn't match BEGIN** (left-aligned label, different weight/border). Small,
   but it's 50 % of the title screen.

## Deeper pass: menu, settings, the first pop

Resumed the run, opened MENU and SETTINGS, kept placing until the first pocket ripened and
popped. The end-of-run screen and shop were not reached.

1. **Six tutorial dialogs in about the first ten moves**: The Story → How it works → (coach
   strip) → RIPE (fires the instant a tile first ripens) → POP → YOUR FIRST POP (a score
   breakdown) → THE MAP (two pages: SITE, BOUNTY). Each one arrives on top of a tap the player
   meant for the board.
2. **The first POP press doesn't pop.** Pressing POP opened the « POP » explainer instead;
   after GOT IT the score was still 0 and the pocket unpopped, so POP had to be pressed again.
   Same with « THE MAP »: of five placement taps, one landed and the dialog ate the rest. Never
   swallow the action that triggered a tip: do the action, then show the tip (or show tips only
   between actions, as the coach strip does).
3. **The POP button doesn't say POP.** It shows a small hand icon and « +1 · 1 PTS » in tiny
   caps; the word POP that every dialog tells you to press isn't on it.
4. **The board isn't refit after it grows**: after a few placements the right-hand edge hexes
   (worth 2, 3) were cut off at the screen edge, and after the first ripen the camera zoomed in
   so far that the coach strip covered the bottom row.
5. **The coach strip goes stale**: « A pocket is ripe. Tap a ripe tile… then press POP »
   stayed up after the pop.
6. **The first-pop score breakdown is a formula a newcomer can't check**: Worth 1 × Size bonus
   × 1 × Distance × 1, For the placing + 2, Paid per pop × 26 %, Points = 1. Show just « +1 pt,
   +1 tile » the first time; keep the breakdown behind a tap.
7. **Idle stamp over the board**: after ~15 s untouched, the board dims and a large ASHWAKE
   logo is drawn over the middle of it — mid-tutorial, while the coach text is still asking for
   a move. Dim without the logo, or wait longer while a tip is on screen.
8. **French exists** (Settings → Langue) — so the « Language mismatch » point above is only
   about the default: the page meta is French, the first run follows the browser. Fine for a
   Québec audience if the meta follows suit.
9. **« plane » vs « plain »** appears in Settings too (« The plane once somebody stayed: a
   village at dusk… ») next to the Story's « a dark plain ». If « plane » is deliberate (a
   plane of existence), the Story should match; if not, it's three typos.
10. **SETTINGS exposes developer things**: « LAST ERROR » and a « SHARPNESS 2.00× » slider sit
    among player settings; « RESTART » sits under « THIS DEVICE » next to Settings with no hint
    of what it restarts (the run? the world? everything?).

Good: MENU has DAILY and MY WORLDS (so the daily idea below is about _surfacing_ it on the
title screen); vibration and sound exist (off by default); « Nothing leaves your phone: no
account, no analytics, no server » is stated plainly; the title screen switches BEGIN to RESUME
once a run exists.

## Ideas

- **Show a 3-second animated board behind the title** (tiles placing, one pocket popping) so the
  title screen sells the loop by itself.
- **A « daily » chip on the title screen** (« Today's world · 214 played ») — the manual
  mentions a Daily; it's a strong reason to come back and isn't visible up front.
- **End-of-run share card** with the seed link (« beat my 1 240 on this world ») — the manual
  says shared runs exist; make them the default end-screen action.
- **Turn vibration on by default** on phones that support it (the setting exists, off): the
  ripen / pop moment is the game's hook and a short buzz makes it felt.

## Worked well

- Visual identity: the gold hex logo, serif type and dark palette are distinctive.
- The in-board coach text is clear and contextual.
- Keyboard access is thought through (« Arrow keys walk a marker… Enter does what a tap… »).
- Fits a 375 px phone with the hand bar at thumb height; no horizontal overflow.

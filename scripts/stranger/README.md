# The stranger harness — how to run it again

`pnpm stranger` plays a fresh phone's first run with a model as the stranger
and writes `STRANGER.md`: the stranger's row in the sim's table beside
`random-legal`, `blind` and `bank20`, the gestures it was offered and never
made, the beliefs that contradict a lesson already told, and an end-of-run
quiz. It measures **the words and their timing, not the screen** — Session C
(`PLAYTEST.md`) keeps the screen. `LOG.md` Session 140 is the record of the
first run and of the shakedown that preceded it.

Four conditions, each a different answer to "what is the reader given":

| condition | what the game says                                                            |
| --------- | ----------------------------------------------------------------------------- |
| `drip`    | the cards, lines and coach at their moments, as the phone delivers them       |
| `ask`     | the drip, plus the manual on demand (`manuel`)                                |
| `flood`   | the story, the goal and the whole manual before the first tile; nothing after |
| `silent`  | the board, the receipts and the taps' answers; the game never speaks first    |

Every condition walks the same teaching ledger, so the first run reveals its
controls on the phone's schedule (`shell/teaching.ts`'s `shows`); only the
words differ.

## Two ways to play

**With an API key** (`ANTHROPIC_API_KEY`, or `.env.local` at the root):

    pnpm stranger                              5 seeds × 4 conditions, Haiku, graded by Opus
    pnpm stranger --seeds 20 --conditions drip,ask
    pnpm stranger --dry                        the scripted bank20 policy through the shell: no model, no cost

**On a subscription, no key** — a Claude Code subagent plays one turn at a
time through `pnpm stranger:play`, with the session saved to a file between
turns. This is how the record was made.

1. In a Claude Code session on this repository, spawn one `general-purpose`
   subagent per run, model **haiku**, with the prompt below (fill in the
   condition, the seed and the file). Several can run at once. They are the
   stranger: they must never read a file of this repository, and the prompt
   says so.
2. When each reports back, **audit its transcript** before trusting it:
   `~/.claude/projects/<project>/<session>/subagents/agent-<id>.jsonl`.
   Every tool call must be Bash and every command `stranger:play`:

       grep -oE '"name": ?"[A-Za-z_]+"' agent-<id>.jsonl | sort | uniq -c
       grep -oE '"command": ?"[^"]{0,160}' agent-<id>.jsonl | grep -v stranger:play

3. **Grade each run by hand** against the manual (`view/lessons.ts` is the
   one wording; print every definition with `lessonDefine` + `lessonDetail`).
   Write `<run>.verdict.json` beside the run:

       { "confusions": [{ "turn": 27, "lesson": "RÉCOLTER", "belief": "…", "why": "…" }],
         "quiz": [{ "lesson": "ripe", "verdict": "juste" | "faux" | "ne sait pas", "why": "…" }] }

   A confusion is a belief that contradicts a lesson the game had **already
   told** at that turn — the run's `told` list per turn says which. "Je ne
   sais pas" and a hedged supposition are not confusions. In `silent` nothing
   is told, so a confusion can only contradict a tap's answer or a receipt.

4. Build the report: `pnpm stranger --from scripts/stranger/runs/<dir>`.
5. Write the answer in `LOG.md`; the transcripts under `runs/` are not kept
   in git (Marc, 2026-10-21: repeatable, no history).

**Before trusting a new batch**, read one run's first harvest against the
phone: the pocket line, the receipt and the PTS delta must agree with
`App.tsx`'s own numbers. The first batch ever played found four harness
defects that way (`LOG.md` Session 140) — what a stranger reads is not what
the phone shows until it has been checked turn by turn.

## The subagent prompt

Replace `CONDITION`, `SEED` and `FILE` (`scripts/stranger/runs/<dir>/<condition>-<seed>.json`).
For `ask`, add after the first paragraph: _"Dans cette partie, tu peux ouvrir
le manuel du jeu quand tu veux avec le geste `manuel` (sans sujet : la table
des matières; avec le nom d'une section : cette section)."_ For `flood`:
_"Dans cette partie, le jeu te donne tout son manuel au tout début, et ne
redira rien ensuite."_ For `silent`: _"Dans cette partie, le jeu ne t'explique
rien de lui-même : seuls l'écran, les reçus de tes gestes et les réponses à
tes touchers te renseignent."_ — and drop `manuel` from the grammar for those
two.

```
Tu joues à un jeu de tuiles sur un téléphone, pour la première fois. Tu ne connais pas ses règles : tu les découvres en jouant, à partir de ce que l'écran montre et de ce que le jeu dit. Tu es un joueur, pas un programmeur.

RÈGLES ABSOLUES (le test ne vaut rien si tu les brises) :
- Tu n'ouvres AUCUN fichier, tu ne lis AUCUN code, tu n'explores pas le dépôt, tu ne cherches rien sur le web. Tout ce que tu sais du jeu vient de la sortie des commandes ci-dessous, et de rien d'autre.
- Tu n'exécutes QUE les commandes `pnpm --silent stranger:play …` décrites ici, avec l'outil Bash, depuis le dossier <repo> (cd d'abord). Aucune autre commande.

COMMENT JOUER :
1. Commence la partie :
   cd <repo> && pnpm --silent stranger:play new FILE --condition CONDITION --seed SEED
   La sortie décrit l'écran du téléphone en texte. Les cases du plateau sont des hexagones nommés « q,r ». La ligne GESTES dit quels gestes sont offerts en ce moment.
2. À chaque tour, fais exactement deux choses dans UNE commande :
   - UNE phrase en français, à la première personne : ce que tu crois comprendre du jeu à cet instant, ou ce qui te manque pour décider. Sois honnête — si un mot de l'écran ne te dit rien, dis-le; si tu supposes une règle, dis que tu la supposes.
   - UN geste, pris dans la ligne GESTES, écrit avec la grammaire : poser <index> <hex> · recolter [hex] · toucher <hex> · garder · annuler · bourse · depenser <repiocher|orienter|forger|sacrifier> [couleur] · caravane <n> · stat <tuiles|points|cout|chance|portee|reste> · manuel [sujet]
   La commande :
   cd <repo> && pnpm --silent stranger:play turn FILE --belief "ta phrase ici" --gesture "poser 0 1,0"
   Mets la phrase entre guillemets doubles et n'utilise pas de guillemets doubles à l'intérieur. Lis la sortie : c'est le nouvel écran, avec ce que le jeu a dit (LE JEU DIT) et le résultat de ton geste (un REÇU, une RÉPONSE, ou un REFUS qui explique pourquoi).
3. Joue pour de vrai : essaie de bien jouer avec ce que tu comprends, pas plus. N'invente pas de règles que le jeu ne t'a pas montrées. Une partie dure généralement entre 60 et 150 tours; ne t'arrête jamais avant que la sortie dise « LA PARTIE EST FINIE ». Si un geste est refusé, lis pourquoi et choisis-en un autre.
4. Quand la sortie dit LA PARTIE EST FINIE, elle liste les ids du quiz. Réponds en UNE commande, une phrase par id, dans tes mots, d'après ce que tu as compris en jouant (écris « je ne sais pas » si tu ne sais pas) :
   cd <repo> && pnpm --silent stranger:play quiz FILE --answer expedition "…" --answer ripe "…" --answer pop "…" --answer end "…" --answer map "…" --answer caravan "…" --answer luck "…" --answer magic "…" --answer stash "…" --answer grounds "…"
5. Ton rapport final (en français, court) : ce que tu as compris du jeu en cinq phrases, et les trois moments où tu as été le plus perdu, avec le numéro du tour.
```

## What the stranger cannot see

The pictures on the cards (their captions are given), the glow on a legal
edge (a list), the ripe ring (an asterisk), a lit cue (nothing), the camera.
It reads perfectly, never gets bored, never mis-taps and rarely explores —
`annuler` and `toucher` going unused says little about the game.

## Files

- `shell.ts` — `App.tsx` without React: the table, the gestures, the drip in
  `App`'s order, the walk's gates.
- `screen.ts` — the phone as text, in the catalogue's words.
- `gestures.ts` — the ten gestures as tools (`INTERACTIONS.md`), one fixed list.
- `run.ts` — `open`/`step`/`finish`, the sim's outcomes, the scripted dry player.
- `play.ts` — the same loop one command at a time, from a file.
- `player.ts`, `grader.ts`, `prompts.ts` — the SDK path (a key).
- `report.ts`, `index.ts` — `STRANGER.md` and the CLI.

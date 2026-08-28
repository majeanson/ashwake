# CLAUDE.md

This is **Ashwake 2**: the same game as `../tiles` (Ashwake 1, frozen at
v1.0.0, live at tiles.marcportal.com) in a new body. The rules are lifted
verbatim into `packages/core`; the screen is rebuilt in `apps/game` on a 3D
board (Three.js + React Three Fiber) with React chrome. The decision record for
that is `DECISIONS.md` D1 and the plan is `ROADMAP.md`.

Read `STATUS.md` first — what is done **and verified**. `ROADMAP.md` is the six
stages and v2.0's definition of done. `LOG.md` is the per-session record, one
written question per session. `DESIGN.md` is Ashwake 1's design record, carried
over whole because the rules did not move; `PLAYTEST.md` is the phone script,
carried over for the day this body is playable.

**Check a ledger against the code before acting on it.** Ashwake 1 lost a
session to a stale open-list once; it is cheaper to grep than to trust.

Hard rules — all inherited, all still enforced:

- **The core is pure.** `packages/core` has no DOM, no `Math.random`, no
  `Date`, no async, no React, no three. ESLint enforces every one of those
  (`eslint.config.js`); the layering `content <- engine <- meta <- view`,
  `content <- theme <- render`, is a lint error, not a convention.
- **The rules did not move, and CI proves it every push.** `pnpm sim` must
  print exactly `packages/core/sim.golden.txt`, captured from
  `tiles@42d4da3`. A diff there is a rule that moved. If a rule is ever meant
  to move, the golden file moves in the same commit with the reason in
  `LOG.md`.
- **Every balance number lives in `packages/core/src/content/`.**
- **Every system ships behind a flag or a tuning dial that zeroes it**,
  defaulting off. Run one is the smallest game there is.
- **Plain words.** No invented vocabulary until a concept has earned a name.
- **One question per prototype.** Write it down before building, answer it
  after playing, in `LOG.md`.
- **Testing happens on the deployed site, on a phone, in portrait.** Not
  localhost, not a resized desktop window.
- **One page, many sessions.** A scene change is a state change, never a
  reload; the only reloads allowed are the service-worker update and the
  boot-failure panel.
- **The palette answers to tests.** The contrast budget (4.5:1 text, 3:1
  marks) and the greyscale ladder in `packages/core/src/theme/*.test.ts` run
  over every direction, and — once the board is lit — over the materials a
  hex actually renders in. Do not relax a threshold to pass; darken something.
- **The board host never remounts.** The R3F `<Canvas>` lives once, above
  every scene; losing it loses the WebGL context.
- **No PR gate.** Land on `main`; CI gates the deploy.

The stranger test (`PLAYTEST.md` Session C) is v2.0's gate and has never been
run on either body. A stranger is a one-shot resource: nothing that changes the
first minute ships between Session A's last clean pass and their run.

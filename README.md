# Ashwake 2

The same game as [Ashwake](https://tiles.marcportal.com) — place tiles, ripen
them, pop them, push on before the light runs out — in a new body: a lit 3D
board and a rebuilt screen. The rules are not re-implemented; they are the same
code, and CI proves it on every push by diffing the balance harness's output
against Ashwake 1's.

```
packages/core   the rules — engine, content, meta, the balance harness, the props layer, the teaching registry
apps/game       the body — Three.js + React Three Fiber board, React chrome, the shell
```

```bash
pnpm install
pnpm dev          # the app, on the LAN (see CLAUDE.md: phones are the test device)
pnpm test         # every test in the workspace
pnpm sim          # the balance harness — must match packages/core/sim.golden.txt
pnpm lint && pnpm typecheck && pnpm build
```

Read `CLAUDE.md` for the rules of working here and `ROADMAP.md` for where it is
going.

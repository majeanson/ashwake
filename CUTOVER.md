# CUTOVER.md — tiles.marcportal.com becomes Ashwake 2

Written 2026-09-25 (`LOG.md` Session 116), **before** it can happen: the cutover
is v2.0's last step and waits for Session C (`ROADMAP.md` § Deploy, `NEXT.md`
§0). Nothing here has been run. Every file reference was read on the day; where
a line is about Cloudflare's or a browser's behaviour rather than this code, it
says **inferred**.

## Today

|             | Ashwake 1                                                                 | Ashwake 2                                                  |
| ----------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Worker      | `tiles` (`../tiles/wrangler.toml:10-18`)                                  | `ashwake` (`wrangler.toml:9-17`)                           |
| Hostname    | `tiles.marcportal.com`, a Custom Domain                                   | `ashwake.marcportal.com`, a Custom Domain                  |
| workers.dev | `tiles.marc-jeanson.workers.dev` (`workers_dev = true`)                   | `ashwake.marc-jeanson.workers.dev`                         |
| CI deploy   | `../tiles/.github/workflows/ci.yml:37-76`, gated on `vars.DEPLOY_ENABLED` | `.github/workflows/ci.yml:207-239`, needs `ci` and `smoke` |
| Frozen at   | `v1.0.0`; live `7b9a751` differs from it in docs only                     |                                                            |

## What a player's phone does on the day

- **Saves cannot collide.** v1 writes `tiles.*` keys
  (`../tiles/src/shell/store.ts:49-124`), v2 writes `ashwake.*`
  (`apps/game/src/shell/storage.ts:52-139`), and v2's wipe, restore and shed
  only ever touch its own (`isOwnKey`, `packages/core/src/meta/backup.ts`).
- **But v2 never reads v1's keys on its own.** The only bridge is D3's manual
  one: BACK UP in v1, RESTORE in v2, where `decodeBackup` maps `LEGACY_KEYS`
  through `migrateLegacy`. **Once v2 is what loads on tiles.marcportal.com,
  v1's BACK UP button is gone from that origin**, so a v1 player who did not
  back up first keeps their worlds on the phone with no screen that reaches
  them. This is decision 1 below.
- **The service worker hands over cleanly.** Both register `/sw.js` at scope
  `/`, so v2's is an update of v1's registration. v1 re-checks every 15 minutes
  and on return to the foreground (`../tiles/src/main.ts:55-60`); v2's installs,
  `skipWaiting`s, deletes every other cache and `clients.claim`s
  (`apps/game/public/sw.js:88-97`); an open v1 page shows its own reload note.
  On a line slower than 2.5 s the first visit may still get cached v1, and v2
  arrives once the new worker activates (inferred; benign).
- **Installed home-screen apps stay the same app**: both manifests use
  `id`, `start_url` and `scope` `/`, name "Ashwake". The language, colours and
  description change; Android updates them in time, iOS may keep the old icon
  (inferred).
- **Shared links keep working**: `?seed=` and `?daily=` parse the same in both,
  and v2 builds new ones from `location.origin` (`share.ts`).

## Decisions for Marc, before the day

1. **Bring v1 worlds over automatically?** A one-time offer on boot, on
   tiles.marcportal.com only, when `tiles.*` keys exist and `ashwake.*` do not:
   _"Bring your Ashwake 1 worlds over?"_, reusing `migrateLegacy`. A stranger
   has no `tiles.*` keys, so it cannot touch their first minute; it is still a
   new screen, so it is built after Session C. Without it, every v1 player who
   did not back up loses their worlds, daily book and records.
2. **Warn v1 players first?** A last v1 deploy saying "back up now" would break
   the `v1.0.0` freeze. Unneeded if decision 1 is yes.
3. **What becomes of ashwake.marcportal.com?** Keep it as a second domain (two
   origins, each with its own saves), or 301 it to tiles through a zone
   Redirect Rule (the worker has no `main` to do it), or drop it. Either of the
   last two strands the saves made there — Marc's own and every tester's — so
   they back up and restore first.

## The steps

**0. Prepare, and do not push.**

- `wrangler.toml`: the route becomes `tiles.marcportal.com` (plus
  ashwake.marcportal.com if decision 3 keeps it).
- `apps/game/index.html`: the canonical link, `og:url`, `og:image` and
  `twitter:image`.
- `packages/core/src/meta/identity.ts`: `SITE`.
- `scripts/verify-deploy.ts`: the default `BASE`.
- Decision 1's offer, if yes.
- In `../tiles`: remove the `routes` line and keep `workers_dev`, or any later
  tiles deploy tries to take the hostname back.

**1. Pre-flight, read-only.** `wrangler deployments list` for both workers, so
there are version ids to roll back to, and `curl /version.json` on all four
hosts.

**2. Disarm tiles' CI.** `gh variable set DEPLOY_ENABLED --body false -R majeanson/tiles`.
Check with `gh variable list -R majeanson/tiles`. Undo: set it back to `true`.

**3. Move the hostname, by hand.** On the prepared commit, from a clean tree:
`pnpm build && pnpm exec wrangler deploy`, so the prompt about
tiles.marcportal.com belonging to `tiles` is seen and answered by a person.
Whether wrangler moves a domain bound to another worker, and what it does
without a prompt in CI, was **not** confirmed; the dashboard (tiles → Domains →
remove, then add it on `ashwake`) is the other way, with a short window where
the host answers nothing.

- Check: `DEPLOY_URL=https://tiles.marcportal.com pnpm verify:deploy` (the sha,
  bundles, fonts, install surface, the stamped worker and the CSP);
  `curl https://tiles.marc-jeanson.workers.dev/version.json` still says
  `7b9a751`; on a phone with v1 installed, open it, see the reload note, land on
  v2.
- Undo: in `../tiles` at HEAD, `pnpm build && pnpm exec wrangler deploy`, or
  re-add the domain in the dashboard. Safe in both directions, because the two
  key sets are disjoint.

**4. Push the ashwake commit.** CI redeploys the same build; watch `deploy`
and its Verify step.

**5. Commit the tiles route removal** in `../tiles`, a post-freeze commit with
a line in its ledger. Leave `DEPLOY_ENABLED` false. Undo: revert.

**6. Tag `v2.0`.**

## Where v1 still lives afterwards

`tiles.marc-jeanson.workers.dev`, and the `v1.0.0` tag. It is a different
origin from tiles.marcportal.com, so no player's saves are there: it is a
museum, not a way back.

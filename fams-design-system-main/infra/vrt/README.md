# Visual Regression Tracker (self-hosted) — phase 4 §2

[Visual Regression Tracker](https://github.com/Visual-Regression-Tracker/Visual-Regression-Tracker)
(VRT), self-hosted via its official Docker images. Apache-2.0 — compliant
with the DS's "MIT / Apache-2.0 / BSD only" hard rule #1 (root `CLAUDE.md`
rule 1). This is an **optional** lane: neither showcase's `visual-all`
suite nor the demo app's `visual-matrix` suite requires VRT to run — both
default to Playwright's own local, OS-specific, gitignored baseline
snapshots (see each suite's own `e2e/.gitignore` / `.gitignore` note). VRT is
for teams who want a shared, browsable, human-Accept/Reject baseline
workflow instead of committed PNGs.

## What's here

- `docker-compose.yml` — `ui` + `api` + `migration` + `postgres`, official
  `visualregressiontracker/{ui,api,migration}` images + `postgres:12`, pinned
  to a known-matched version trio (`.env.example`). Local image storage (no
  S3/AWS dependency — no paid deps).
- `.env.example` — copy to `.env` (gitignored) before `docker compose up`.

## 1. Start it

```bash
cd infra/vrt
cp .env.example .env   # defaults are fine for local use
docker compose up -d
docker compose ps      # api + postgres "Up (healthy)"; migration exits 0 (one-shot)
```

- UI: http://localhost:8080
- API: http://localhost:4200 (health check: `curl http://localhost:4200/health`)

Verified while wiring this: `docker compose config` validates, and a full
`docker compose up` was run end-to-end locally — postgres becomes healthy,
`migration` runs Prisma migrations and seeds a **default project + user**
(see its logs: `docker compose logs migration`), and the `api`/`ui` services
serve traffic. A real screenshot was tracked through
`@visual-regression-tracker/agent-playwright` against this exact stack (a
build was created, a test-run uploaded, and the expected "no baseline yet"
first-run response came back — see step 3).

## 2. Create your project + get an API key

The `migration` container seeds a **default project** ("Default project" /
branch `master`) and a **default user** on first run — see
`docker compose logs migration` for its login + API key
(`visual-regression-tracker@example.com` / `123456`, API key
`DEFAULTUSERAPIKEYTOBECHANGED` at the pinned version in `.env.example` — log
in via the UI and rotate/replace both before using this beyond a local
smoke test). For a real project:

1. Open the UI, log in with the default user (or register a new one).
2. Create a project named to match what you'll pass as `VRT_PROJECT`
   (suggested: `fams-showcase` / `fams-v5-demo-environment`, matching each suite's
   `vrt.ts` default).
3. Project → General → copy the **API key**.

## 3. Wire it into the suites

Both `workshop/showcase/e2e/visual-all.spec.ts` (this repo) and
`app/e2e/visual-matrix.spec.ts` (`fams-v5-demo-environment`) read the same env-var
contract (`e2e/support/vrt.ts` in each):

| Env var | Meaning | Unset behavior |
|---|---|---|
| `VRT_URL` | VRT API base URL (e.g. `http://localhost:4200`) — **the master switch**: unset → local Playwright snapshot mode (unchanged, default); set → every screenshot uploads to VRT instead | local snapshot mode |
| `VRT_APIKEY` | the project API key from step 2 | — |
| `VRT_PROJECT` | project name from step 2 | `fams-showcase` / `fams-v5-demo-environment` |
| `VRT_BRANCHNAME` | branch name shown in the VRT UI | `local` |
| `VRT_CIBUILDID` | optional CI build id/link | unset |

```bash
# DS — showcase
VRT_URL=http://localhost:4200 \
VRT_APIKEY=<your key> \
VRT_PROJECT=fams-showcase \
VRT_BRANCHNAME=$(git branch --show-current) \
pnpm --filter @fams/showcase test:visual-all

# demo — app
VRT_URL=http://localhost:4200 \
VRT_APIKEY=<your key> \
VRT_PROJECT=fams-v5-demo-environment \
VRT_BRANCHNAME=$(git branch --show-current) \
pnpm --filter app test:visual
```

Both suites force `workers: 1` whenever `VRT_URL` is set (see each
`playwright.config.ts`) — VRT's Playwright agent creates one "build" per
process, so a single worker keeps a whole run as one build instead of
fragmenting it across parallel workers.

## 4. The Accept/Reject flow becomes the new baseline

A screenshot with **no prior baseline** (the very first run of a new test
name, or after a real UI change) reports `status: "new"`/"no baseline" — this
is VRT's intended workflow, not an error to silence: `enableSoftAssert` is on
in both `vrt.ts` helpers, so a missing baseline **logs** instead of failing
the run. A human then opens the VRT UI, reviews the new screenshot per test
name, and clicks **Approve** — that becomes the baseline every future run
diffs against. **Reject** flags it as a real regression instead. This is the
whole point of running VRT instead of committing baseline PNGs: the
accept/reject queue *is* the review step, not a CI gate that blocks on day
one of a new route.

## 5. Deterministic fonts in CI

Both suites already self-host their fonts (Gilroy, `@fams/tokens`), disable
animations, freeze the clock, and pin viewport/locale/color-scheme/
`reducedMotion` (see each spec's own determinism comments) — but font
**rasterization** still varies subtly by OS (this repo's own `.gitignore`
notes this is exactly why local baselines are OS-suffixed and not committed).
For CI screenshots to match each other consistently, run the suite inside
Playwright's own Docker image, which pins the exact browser + OS font stack
CI expects:

```bash
docker run --rm --network host \
  -v "$PWD":/work -w /work/workshop/showcase \
  mcr.microsoft.com/playwright:v1.61.1-noble \
  npx playwright test --project=visual-all
# (swap the working dir + project for the demo app's app/ + visual-matrix)
```

`--network host` lets the containerized browser reach both the app's own
`webServer` (spawned by Playwright inside the same container) and, if
`VRT_URL` is set, this `infra/vrt` stack running on the host. Match the image
tag to the `@playwright/test` version pinned in each `package.json`.

## 6. CI wiring

See `.github/workflows/visual.yml` (this repo) / the demo repo's equivalent —
both are `workflow_dispatch` + label-triggered only, **not** part of the
required PR gate (they need this VRT service running somewhere reachable;
keeping required CI fast is the explicit phase-4 instruction). Local/pre-merge
gate for now, same status as the existing `visual.spec.ts`/route-smoke suites
(see each repo's `CLAUDE.md` "Testing" section).

#!/usr/bin/env node
/**
 * test-registry.mjs — validates the committed repo-root `registry.json`
 * (phase 4 §4). Wired into both the root `pnpm test` script (as a plain run)
 * AND `pnpm lint` (as `--check`, same CLI convention as
 * `build-llms.mjs --check`) so a stale or broken registry fails a
 * non-flaky, always-run gate — not only `pnpm test`, which runs under full
 * turbo concurrency and is known-flaky independent of this check. `--check`
 * is accepted for that convention/clarity; this script never writes, so its
 * behavior is identical either way — every assertion below always runs.
 *
 * Asserts:
 *  1. It parses (JSON.parse doesn't throw).
 *  2. It is NOT STALE — re-running `buildRegistry()` against the current
 *     `workshop/showcase/src/registry.tsx` + package barrels (which now
 *     walks same-package local imports transitively, so a dependency moved
 *     into a helper module — e.g. `echarts-engine.ts` — is still attributed
 *     to its registry item) produces byte-identical JSON to what's
 *     committed. (If this fails, run `pnpm build:registry` and commit the
 *     result.) This is the drift guard: it fails whenever committed
 *     `registry.json` and a fresh generation disagree, for any reason —
 *     a source file changed, a dependency moved, or `registry.json` was
 *     hand-edited.
 *  3. Every item's `files[].path` exists on disk.
 *  4. Every showcase member (ui-kit + v5-templates scope) appears exactly
 *     once — no duplicates, none missing (the generator itself throws loudly
 *     on a duplicate id at generation time; this re-asserts it against the
 *     committed file specifically, since that's the artifact CI/agents read).
 *  5. The REVERSE direction — every renderable component exported from
 *     `@fams/ui-kit` is actually rendered in the showcase (or explicitly
 *     allowlisted as covered via its parent). Assertions 1–4 only ever proved
 *     "registry member ⇒ real export"; this closes "real export ⇒ demo".
 *     See `scripts/check-demo-coverage.mjs`.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { buildRegistry, REPO_ROOT, OUTPUT_PATH } from './build-registry.mjs'
import { demoCoverageFailures } from './check-demo-coverage.mjs'

const check = process.argv.includes('--check')
const failures = []

let committedRaw
try {
  committedRaw = readFileSync(OUTPUT_PATH, 'utf8')
} catch {
  console.error(`[test-registry] ${OUTPUT_PATH} does not exist — run "pnpm build:registry".`)
  process.exit(1)
}

let committed
try {
  committed = JSON.parse(committedRaw)
} catch (err) {
  console.error(`[test-registry] registry.json does not parse: ${err.message}`)
  process.exit(1)
}

// 2. Staleness — regenerate and compare byte-for-byte (same serialization the
// generator itself uses).
const fresh = buildRegistry()
const freshRaw = `${JSON.stringify(fresh, null, 2)}\n`
if (freshRaw !== committedRaw) {
  failures.push(
    'registry.json is STALE — it does not match what scripts/build-registry.mjs currently ' +
      'generates from workshop/showcase/src/registry.tsx + the package barrels. ' +
      'Run "pnpm build:registry" and commit the result.',
  )
}

// 3. Every file exists.
for (const item of committed.items ?? []) {
  for (const file of item.files ?? []) {
    const abs = join(REPO_ROOT, file.path)
    if (!existsSync(abs)) {
      failures.push(`item "${item.name}": files[].path "${file.path}" does not exist on disk.`)
    }
  }
}

// 4. Every showcase member appears exactly once (no duplicate names; count
// matches the freshly-parsed showcase scope).
const names = (committed.items ?? []).map((i) => i.name)
const nameSet = new Set(names)
if (nameSet.size !== names.length) {
  const dupes = names.filter((n, i) => names.indexOf(n) !== i)
  failures.push(`duplicate item name(s) in registry.json: ${[...new Set(dupes)].join(', ')}`)
}
if (names.length !== fresh.items.length) {
  failures.push(
    `registry.json has ${names.length} item(s), but the current showcase scope has ${fresh.items.length} member(s) — regenerate.`,
  )
}

// 5. Reverse coverage — every exported ui-kit component is demoed somewhere in
// the showcase, or explicitly allowlisted as covered via its parent.
failures.push(...demoCoverageFailures())

if (failures.length > 0) {
  console.error(`[test-registry] ${check ? '--check' : 'run'} FAILED:\n` + failures.map((f) => `  - ${f}`).join('\n'))
  process.exit(1)
}

console.log(
  `[test-registry] ${check ? 'check' : 'run'} OK — ${names.length} item(s), all files exist, no duplicates, not stale, ` +
    'every exported ui-kit component demoed or allowlisted.',
)

/**
 * Single source of truth for "what is publishable and where does it publish to".
 *
 * Consumed by `scripts/release.mjs`, `scripts/pack-smoke-test.mjs` and
 * `.github/workflows/release.yml`. Nothing else in the repo hardcodes the
 * publishable list or the registry switch — see `docs/PUBLISHING.md`.
 *
 * ── The registry switch ──────────────────────────────────────────────────────
 * There is exactly ONE switch: the `FAMS_NPM_REGISTRY` environment variable.
 * It is registry-agnostic (Verdaccio, GitHub Packages, Gitea, Artifactory, an
 * npm Enterprise host, …) — no vendor is hardcoded anywhere in this repo.
 *
 * `publishConfig` deliberately carries `access` ONLY, no `registry`. That is
 * not an omission: `pnpm publish` gives `publishConfig.registry` ABSOLUTE
 * precedence over every other channel, so putting the switch (or a placeholder)
 * there makes the switch inoperable. Verified 2026-08-05 on pnpm 11.1.3 — the
 * full matrix is documented in `scripts/guard-publish.mjs` and
 * `docs/PUBLISHING.md` § How the switch actually works.
 *
 * How the value gets in: `scripts/release.mjs` renders `.npmrc.publish` into a
 * transient workspace-root `.npmrc` (`@fams:registry=<url>` + the auth token),
 * which is the one channel `pnpm publish` reads. `changeset publish` shells out
 * to `pnpm publish`, so it inherits the same target.
 *
 * How accidents are prevented: every publishable package has a
 * `prepublishOnly` guard (`scripts/guard-publish.mjs`) that hard-fails unless
 * `FAMS_NPM_REGISTRY` is set to a non-npmjs.org registry. That runs for npm,
 * for pnpm, and therefore for changesets — and does NOT run on `pnpm pack`.
 */

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The env var that selects the registry. The only switch. */
export const REGISTRY_ENV = 'FAMS_NPM_REGISTRY'

/** The env var holding the publish credential. Never committed anywhere. */
export const TOKEN_ENV = 'FAMS_NPM_TOKEN'

/** The npm scope every publishable package lives under. */
export const SCOPE = '@fams'

/** The `prepublishOnly` guard every publishable package must wire up. */
export const GUARD_SCRIPT = 'node ../../scripts/guard-publish.mjs'

/**
 * PUBLISHABLE — the seven library packages. Everything here loses `private:
 * true` and gains `publishConfig`.
 */
export const PUBLISHABLE = [
  'packages/tokens',
  'packages/ui-kit',
  'packages/skeleton-kit',
  'packages/v5-composer',
  'packages/v5-templates',
  'packages/v5-kit',
  'packages/demo-kit',
]

/**
 * FOREVER PRIVATE — internal workshop/preview surfaces and the repo root.
 * These are NOT distributables: they are apps that consume the packages.
 * They stay `private: true` AND stay in `.changeset/config.json`'s `ignore`
 * list. Adding a workshop package to PUBLISHABLE is a mistake, not a task —
 * `assertPublishFields()` fails if any of these becomes publishable.
 */
export const FOREVER_PRIVATE = [
  '.', // the monorepo root
  'workshop/showcase',
  'workshop/skeleton-example',
  'workshop/storybook',
]

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

export function readPkg(relDir) {
  return readJson(join(REPO_ROOT, relDir, 'package.json'))
}

/**
 * Resolve the registry from the environment.
 * @returns {{ registry: string|null, reason: string }}
 */
export function resolveRegistry(env = process.env) {
  const raw = env[REGISTRY_ENV]
  if (!raw || !raw.trim()) {
    return { registry: null, reason: `${REGISTRY_ENV} is unset` }
  }
  const value = raw.trim()
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${REGISTRY_ENV} is not a valid URL: ${JSON.stringify(value)}`)
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`${REGISTRY_ENV} must be http(s), got ${url.protocol}`)
  }
  if (/^registry\.npmjs\.org$/i.test(url.hostname) || /^registry\.yarnpkg\.com$/i.test(url.hostname)) {
    throw new Error(
      `${REGISTRY_ENV} points at the PUBLIC npm registry (${url.hostname}). ` +
        `@fams packages are internal (publishConfig.access = "restricted"); refusing.`,
    )
  }
  return { registry: value, reason: 'set' }
}

/**
 * Structural audit of the publish surface. Throws on the first problem with a
 * list of every problem found. Cheap enough to run before every publish.
 */
export function assertPublishFields() {
  const problems = []

  for (const dir of PUBLISHABLE) {
    const pkg = readPkg(dir)
    const at = `${dir} (${pkg.name})`

    if (pkg.private) problems.push(`${at}: still has "private": true — it cannot be published`)
    if (!pkg.name?.startsWith(`${SCOPE}/`)) problems.push(`${at}: name is not under the ${SCOPE} scope`)
    if (!pkg.version) problems.push(`${at}: no "version"`)
    if (!pkg.license) problems.push(`${at}: no "license"`)
    if (!Array.isArray(pkg.files) || pkg.files.length === 0) problems.push(`${at}: no "files" allowlist`)
    if (pkg.sideEffects === undefined) problems.push(`${at}: no "sideEffects" declaration`)
    if (!pkg.exports) problems.push(`${at}: no "exports" map`)

    const pc = pkg.publishConfig
    if (!pc) {
      problems.push(`${at}: no "publishConfig"`)
    } else {
      if (pc.access !== 'restricted') {
        problems.push(`${at}: publishConfig.access must be "restricted", got ${JSON.stringify(pc.access)}`)
      }
      // `pnpm publish` gives publishConfig.registry absolute precedence, so a
      // value here — vendor URL or placeholder — silently disables the switch.
      for (const key of ['registry', `${SCOPE}:registry`]) {
        if (pc[key]) {
          problems.push(
            `${at}: publishConfig["${key}"] = ${JSON.stringify(pc[key])} — remove it. ` +
              `pnpm publish gives it absolute precedence, which disables the ${REGISTRY_ENV} ` +
              `switch. The registry is set at publish time via .npmrc.publish; see docs/PUBLISHING.md.`,
          )
        }
      }
    }

    if (pkg.scripts?.prepublishOnly !== GUARD_SCRIPT) {
      problems.push(
        `${at}: scripts.prepublishOnly must be ${JSON.stringify(GUARD_SCRIPT)} (the fail-closed ` +
          `publish guard), got ${JSON.stringify(pkg.scripts?.prepublishOnly)}`,
      )
    }
  }

  for (const dir of FOREVER_PRIVATE) {
    const pkg = readPkg(dir)
    if (!pkg.private) {
      problems.push(
        `${dir} (${pkg.name}): must stay "private": true forever — it is an internal ` +
          `workshop/preview surface, not a distributable`,
      )
    }
    if (pkg.publishConfig) {
      problems.push(`${dir} (${pkg.name}): has a publishConfig but must never be published`)
    }
  }

  // The changesets ignore list must cover every forever-private workspace
  // package (the repo root is not a changesets package, so it is excluded).
  const cs = readJson(join(REPO_ROOT, '.changeset/config.json'))
  const ignore = new Set(cs.ignore ?? [])
  for (const dir of FOREVER_PRIVATE.filter((d) => d !== '.')) {
    const name = readPkg(dir).name
    if (!ignore.has(name)) {
      problems.push(`.changeset/config.json: "ignore" must list ${name} (${dir})`)
    }
  }
  for (const dir of PUBLISHABLE) {
    const name = readPkg(dir).name
    if (ignore.has(name)) {
      problems.push(`.changeset/config.json: "ignore" must NOT list the publishable package ${name}`)
    }
  }

  if (problems.length) {
    throw new Error(`Publish surface audit failed (${problems.length}):\n  - ${problems.join('\n  - ')}`)
  }
  return { checked: PUBLISHABLE.length + FOREVER_PRIVATE.length }
}

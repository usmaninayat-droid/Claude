#!/usr/bin/env node
/**
 * `pnpm release` — the publish half of the version + publish flow.
 *
 *   pnpm changeset            # 1. author a changeset (per PR)
 *   pnpm version-packages     # 2. changeset version → bumps + CHANGELOGs
 *   pnpm release              # 3. audit → build → changeset publish   ← this file
 *
 * DORMANT BY DEFAULT. With the `FAMS_NPM_REGISTRY` switch unset this script
 * runs the audit, prints a loud banner explaining exactly what a human must
 * do, and exits 0 WITHOUT building or publishing. That is the state of the
 * repo today: no registry has been chosen and no credential exists.
 *
 * Flags:
 *   --dry-run     do everything except the actual publish (implies a build,
 *                 runs `pnpm publish --dry-run` per package so the resolved
 *                 target registry is printed and asserted)
 *   --skip-build  skip `turbo run build` (only if you just built)
 *   --audit-only  run the publish-surface audit and exit
 *
 * See docs/PUBLISHING.md for the full human runbook.
 */

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  PUBLISHABLE,
  REGISTRY_ENV,
  REPO_ROOT,
  SCOPE,
  TOKEN_ENV,
  assertPublishFields,
  readPkg,
  resolveRegistry,
} from './publish-config.mjs'

const argv = process.argv.slice(2)
const has = (f) => argv.includes(f)
const DRY_RUN = has('--dry-run')
const SKIP_BUILD = has('--skip-build')
const AUDIT_ONLY = has('--audit-only')

const banner = (title, lines) => {
  const width = Math.max(title.length, ...lines.map((l) => l.length)) + 4
  const bar = '='.repeat(Math.min(width, 100))
  console.log(`\n${bar}\n  ${title}\n${bar}`)
  for (const l of lines) console.log(`  ${l}`)
  console.log(`${bar}\n`)
}

const run = (cmd, args, opts = {}) => {
  console.log(`$ ${cmd} ${args.join(' ')}`)
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: REPO_ROOT, ...opts })
  if (r.status !== 0) {
    throw new Error(`\`${cmd} ${args.join(' ')}\` exited with ${r.status ?? `signal ${r.signal}`}`)
  }
}

// ── 1. audit the publish surface ────────────────────────────────────────────
const { checked } = assertPublishFields()
console.log(`✔ publish-surface audit passed (${checked} package.json files checked)`)
console.log(
  `  publishable: ${PUBLISHABLE.map((d) => readPkg(d).name).join(', ')}`,
)
if (AUDIT_ONLY) process.exit(0)

// ── 2. resolve the registry switch ──────────────────────────────────────────
let registry
try {
  ;({ registry } = resolveRegistry())
} catch (err) {
  banner(`REFUSING TO PUBLISH — bad ${REGISTRY_ENV}`, [err.message])
  process.exit(1)
}

if (!registry) {
  banner(`RELEASE LANE IS DORMANT — ${REGISTRY_ENV} is not set`, [
    'Nothing was built and NOTHING was published. This is the expected state until',
    'a registry is chosen and credentials exist.',
    '',
    'To arm it (see docs/PUBLISHING.md § Runbook):',
    `  1. choose a registry and export ${REGISTRY_ENV}=https://<host>/<path>`,
    `  2. export ${TOKEN_ENV}=<a publish token for that registry>`,
    '  3. re-run `pnpm release`',
    '',
    'In CI: set the repository VARIABLE `FAMS_NPM_REGISTRY` and the repository',
    'SECRET `FAMS_NPM_TOKEN`, then dispatch .github/workflows/release.yml.',
    '',
    'Every publishable package also carries a `prepublishOnly` guard',
    '(scripts/guard-publish.mjs) that hard-fails without the switch, so a stray',
    '`npm publish` / `pnpm publish` cannot leak an internal package to',
    'registry.npmjs.org either.',
  ])
  process.exit(0)
}

const token = process.env[TOKEN_ENV]
if (!token && !DRY_RUN) {
  banner(`REFUSING TO PUBLISH — ${TOKEN_ENV} is not set`, [
    `${REGISTRY_ENV} is set to ${registry}, but no credential was provided.`,
    `Export ${TOKEN_ENV}=<publish token>, or re-run with --dry-run.`,
  ])
  process.exit(1)
}

console.log(`✔ ${REGISTRY_ENV} = ${registry}`)
console.log(`✔ ${TOKEN_ENV} ${token ? 'is set' : 'is NOT set (dry run)'}`)

// ── 3. build ────────────────────────────────────────────────────────────────
if (!SKIP_BUILD) run('pnpm', ['turbo', 'run', 'build'])
else console.log('… skipping build (--skip-build)')

// ── 4. publish ──────────────────────────────────────────────────────────────
// The registry + credential reach npm/pnpm through a TRANSIENT workspace-root
// `.npmrc` rendered from `.npmrc.publish`. That file is the only channel
// `pnpm publish` (and therefore `changeset publish`, which shells out to it)
// actually honours — see scripts/guard-publish.mjs for the verified matrix of
// what does and does not work. It is removed in the `finally` below, so the
// token never persists and there is no committed `.npmrc`.
const npmrcPath = join(REPO_ROOT, '.npmrc')
const templatePath = join(REPO_ROOT, '.npmrc.publish')
const previousNpmrc = existsSync(npmrcPath) ? readFileSync(npmrcPath, 'utf8') : null
if (previousNpmrc) {
  console.log('⚠ an existing .npmrc was found; it is backed up in memory and restored afterwards')
}

const url = new URL(registry)
const authKey = `//${url.host}${url.pathname.replace(/\/$/, '')}/:_authToken`

try {
  writeFileSync(
    npmrcPath,
    readFileSync(templatePath, 'utf8')
      .replaceAll('{{REGISTRY}}', registry)
      .replaceAll('{{AUTH_KEY}}', authKey)
      .replaceAll('{{TOKEN}}', token ?? '')
      // drop the auth line entirely when there is no token (dry runs)
      .replace(new RegExp(`^${authKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=\\n`, 'm'), ''),
    { mode: 0o600 },
  )
  console.log(`✔ rendered a transient .npmrc pinning ${SCOPE}:registry → ${registry}`)

  if (DRY_RUN) {
    // changesets has no --dry-run, so prove the wiring per package instead:
    // `pnpm publish --dry-run` prints the registry it WOULD publish to, and the
    // prepublishOnly guard runs, so this exercises the real gate.
    for (const dir of PUBLISHABLE) {
      const pkg = readPkg(dir)
      console.log(`\n── dry-run: ${pkg.name}@${pkg.version} ──`)
      run('pnpm', ['publish', '--dry-run', '--no-git-checks', '--access', 'restricted'], {
        cwd: join(REPO_ROOT, dir),
      })
    }
    banner('DRY RUN COMPLETE — nothing was published', [
      `Target registry: ${registry}`,
      'Re-run without --dry-run (and with a valid token) to publish for real.',
    ])
  } else {
    // `changeset publish` also creates git tags. That is intended for a real
    // release; pass --no-git-tag through if the caller asked for it.
    const csArgs = ['exec', 'changeset', 'publish']
    if (has('--no-git-tag')) csArgs.push('--no-git-tag')
    run('pnpm', csArgs)
    banner('PUBLISHED', [
      `Registry: ${registry}`,
      'Next: flip consumers onto the versioned path — in fams-v5-demo-environment run',
      '  node tools/ds-consumption.mjs --mode registry',
      '(see that repo README § Design-system consumption).',
    ])
  }
} finally {
  if (previousNpmrc !== null) writeFileSync(npmrcPath, previousNpmrc)
  else rmSync(npmrcPath, { force: true })
  console.log('✔ transient .npmrc removed')
}

#!/usr/bin/env node
/*
 * `node scripts/publish-github.mjs [--dry-run]`
 *
 * Publishes the seven library packages to GitHub Packages, PRIVATE, under the
 * account that owns the repos.
 *
 * WHY A SEPARATE SCRIPT FROM release.mjs. GitHub Packages requires the npm
 * scope to match the owning account, and `@fams` on github.com belongs to an
 * unrelated user. `voltro-dxb` is in no organisation, so the published names
 * must be `@voltro-dxb/fams-<pkg>`. We refuse to rename anything in the repo
 * for that: the code, the imports, the workspace protocol and every downstream
 * consumer keep saying `@fams/<pkg>`.
 *
 * So the rename happens at PACK time, in a temp directory, and the repo is
 * never touched:
 *
 *   1. `pnpm pack` the package as-is (dist only — the files field decides)
 *   2. extract it, and rewrite ONLY its package.json:
 *        name          @fams/ui-kit        -> @voltro-dxb/fams-ui-kit
 *        dependencies  "@fams/tokens": *   -> "npm:@voltro-dxb/fams-tokens@<v>"
 *        + repository (GitHub Packages links a package to a repo through it)
 *        + publishConfig.registry -> npm.pkg.github.com
 *        - scripts (a published library needs none, and prepublishOnly points
 *          at a repo path that does not exist inside the tarball)
 *   3. `npm publish` from that directory
 *
 * The dependency ALIAS is the trick that makes this invisible: pnpm/npm install
 * `@voltro-dxb/fams-tokens` into `node_modules/@fams/tokens`, so the compiled
 * dist's `import … from '@fams/tokens'` resolves untouched, in every package
 * and in every consumer.
 *
 * Credential: GITHUB_TOKEN (or FAMS_NPM_TOKEN) — a classic PAT with
 * `write:packages`. Nothing is published without it; --dry-run needs none.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, rmSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir, homedir } from 'node:os'
import { PUBLISHABLE, SCOPE } from './publish-config.mjs'

const REPO_ROOT = new URL('..', import.meta.url).pathname
const DRY_RUN = process.argv.includes('--dry-run')

const OWNER = 'voltro-dxb'
const PUBLISHED_SCOPE = `@${OWNER}`
const PREFIX = 'fams-'
// `--registry <url>` exists so the whole flow can be proven against a local
// registry (verdaccio) without touching GitHub. The shape published there is
// byte-identical to what GitHub Packages receives; only auth differs.
const registryFlag = process.argv.indexOf('--registry')
const REGISTRY =
  registryFlag !== -1 ? process.argv[registryFlag + 1] : 'https://npm.pkg.github.com'
const IS_GITHUB = REGISTRY.includes('npm.pkg.github.com')
/*
 * The credential, found rather than demanded. Nobody should have to remember
 * an `export` before releasing — if a token is already filed in ~/.npmrc for
 * this registry (which `pnpm use-token` in the demo repo does), reuse it.
 * Env vars still win, for CI.
 */
function findToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN
  if (process.env.FAMS_NPM_TOKEN) return process.env.FAMS_NPM_TOKEN
  try {
    const host = new URL(REGISTRY).host
    const line = readFileSync(join(homedir(), '.npmrc'), 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#') && !l.startsWith(';'))
      .find((l) => l.startsWith(`//${host}/:_authToken=`))
    return line ? line.split('=').slice(1).join('=').trim() : undefined
  } catch {
    return undefined
  }
}
const TOKEN = findToken()

/** `@fams/ui-kit` -> `@voltro-dxb/fams-ui-kit` */
const publishedName = (internal) =>
  `${PUBLISHED_SCOPE}/${PREFIX}${internal.slice(SCOPE.length + 1)}`

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} → exit ${r.status}`)
}

/*
 * Is this exact name@version already on the registry?
 *
 * A registry NEVER lets you republish a version — npm fails with "You cannot
 * publish over the previously published versions", which aborted the whole run
 * partway through and left the remaining packages unpublished. Publishing is
 * therefore resumable: already-there is a skip, not an error.
 */
const alreadyPublished = (name, version, userconfig) => {
  const r = spawnSync(
    'npm',
    ['view', `${name}@${version}`, 'version', '--registry', REGISTRY, '--userconfig', userconfig],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  )
  return r.status === 0 && String(r.stdout).trim() !== ''
}

if (!DRY_RUN && !TOKEN) {
  console.error(
    '\n✖ no credential. Export a classic PAT with write:packages:\n\n' +
      '    export GITHUB_TOKEN=ghp_xxxxxxxx\n' +
      '    node scripts/publish-github.mjs\n\n' +
      '  Create one at https://github.com/settings/tokens (classic, write:packages).\n' +
      '  Or re-run with --dry-run to verify everything except the upload.\n',
  )
  process.exit(1)
}

const staging = mkdtempSync(join(tmpdir(), 'fams-publish-'))
console.log(`staging: ${staging}\n`)

const results = []
for (const dir of PUBLISHABLE) {
  const pkgDir = join(REPO_ROOT, dir)
  const manifest = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'))
  const { name, version } = manifest

  // 1. pack exactly what a consumer would get
  run('pnpm', ['pack', '--pack-destination', staging], { cwd: pkgDir })
  const tgz = readdirSync(staging).find(
    (f) => f.startsWith(name.replace('@', '').replace('/', '-')) && f.endsWith('.tgz'),
  )
  if (!tgz) throw new Error(`could not find the packed tarball for ${name}`)

  // 2. extract and rewrite the manifest
  const outDir = join(staging, `${PREFIX}${name.slice(SCOPE.length + 1)}`)
  run('mkdir', ['-p', outDir])
  run('tar', ['xzf', join(staging, tgz), '-C', outDir, '--strip-components=1'])

  const m = JSON.parse(readFileSync(join(outDir, 'package.json'), 'utf8'))
  m.name = publishedName(name)
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    if (!m[field]) continue
    for (const dep of Object.keys(m[field])) {
      if (!dep.startsWith(`${SCOPE}/`)) continue
      // Keep the KEY as @fams/* so the compiled imports resolve; point it at
      // the published package via an npm: alias.
      m[field][dep] = `npm:${publishedName(dep)}@${version}`
    }
  }
  m.repository = { type: 'git', url: `git+https://github.com/${OWNER}/fams-design-system.git` }
  m.publishConfig = { registry: REGISTRY, access: 'restricted' }
  delete m.scripts
  writeFileSync(join(outDir, 'package.json'), JSON.stringify(m, null, 2) + '\n')

  results.push({ internal: name, published: m.name, version, dir: outDir, deps: m.dependencies })
  console.log(`  ${name} → ${m.name}@${version}`)
}

// 3. publish (or report)
console.log('')
if (DRY_RUN) {
  console.log('── DRY RUN — nothing uploaded ─────────────────────────────────')
  for (const r of results) {
    const aliased = Object.entries(r.deps || {}).filter(([, v]) => String(v).startsWith('npm:'))
    console.log(`\n${r.published}@${r.version}`)
    for (const [k, v] of aliased) console.log(`   dep  ${k} → ${v}`)
  }
  console.log(`\nstaged manifests are in ${staging} — inspect them, then re-run with a token.`)
  process.exit(0)
}

const npmrc = join(staging, '.npmrc')
writeFileSync(
  npmrc,
  `${PUBLISHED_SCOPE}:registry=${REGISTRY}\n${new URL(REGISTRY).host ? `//${new URL(REGISTRY).host}${new URL(REGISTRY).pathname.replace(/\/$/, '')}/:_authToken=${TOKEN}\n` : ''}`,
)

let published = 0
let skipped = 0
for (const r of results) {
  if (alreadyPublished(r.published, r.version, npmrc)) {
    console.log(`── skip ${r.published}@${r.version} — already on the registry`)
    skipped++
    continue
  }
  console.log(`\n── publishing ${r.published}@${r.version} ──`)
  run('npm', ['publish', '--userconfig', npmrc, '--access', 'restricted'], { cwd: r.dir })
  published++
}

rmSync(npmrc, { force: true })
console.log(
  `\n✔ ${published} newly published, ${skipped} already present — ${results.length} total on ${REGISTRY}\n` +
    `  They are PRIVATE: visibility follows the linked repository, which is private.\n` +
    `  Consumers need a classic PAT with read:packages — see ONBOARDING.md.\n`,
)

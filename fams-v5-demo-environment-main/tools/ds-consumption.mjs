#!/usr/bin/env node
/**
 * `node tools/ds-consumption.mjs` — switch how this repo consumes the FAMS
 * design system.
 *
 * Two modes, one command:
 *
 *   link      (DEFAULT, and the state this repo ships in)
 *             `@fams/*` deps are pnpm `link:` specifiers pointing at a sibling
 *             `../fams-design-system` checkout. Non-hermetic on purpose: local
 *             dev needs edit-and-see-it, and no registry is live yet.
 *
 *   registry  Exact, PINNED versions (`"@fams/ui-kit": "0.9.0"` — no range, no
 *             caret) resolved from the registry named by FAMS_NPM_REGISTRY.
 *             Hermetic: the lockfile records integrity hashes and the sibling
 *             checkout stops mattering. Turn this on ONE step after the
 *             packages are actually published.
 *
 * Because no registry exists yet, `registry` mode can be PROVEN offline against
 * local tarballs instead:
 *
 *   --tarballs <dir>   resolve the pinned versions from `pnpm pack` output in
 *                      <dir> via a pnpm `overrides` block, so the whole
 *                      versioned graph installs and builds with no registry at
 *                      all. This is a PROOF HARNESS, not the production path —
 *                      it is what verified the versioned path works.
 *
 * Usage:
 *   node tools/ds-consumption.mjs --status
 *   node tools/ds-consumption.mjs --mode link
 *   node tools/ds-consumption.mjs --mode registry [--version 0.9.0]
 *   node tools/ds-consumption.mjs --mode registry --tarballs /tmp/fams-tarballs
 *
 * It only rewrites package.json / pnpm-workspace.yaml. It never installs — run
 * `pnpm install` yourself afterwards (the output tells you to).
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DS = resolve(REPO, '..', 'fams-design-system')

/**
 * The canonical `link:` targets. This map is the single source of truth for
 * switching in either direction — the paths are relative to the manifest that
 * declares them, which is why they are stored per manifest.
 *
 * `root` = the resolve/check/capture/promote tool suite (needs only the
 * composer's blueprint types + validateBlueprint). `app` = the Vite demo app.
 */
const MANIFESTS = {
  'package.json': {
    '@fams/v5-composer': 'link:../fams-design-system/packages/v5-composer',
  },
  'app/package.json': {
    '@fams/demo-kit': 'link:../../fams-design-system/packages/demo-kit',
    '@fams/skeleton-kit': 'link:../../fams-design-system/packages/skeleton-kit',
    '@fams/tokens': 'link:../../fams-design-system/packages/tokens',
    '@fams/ui-kit': 'link:../../fams-design-system/packages/ui-kit',
    '@fams/v5-composer': 'link:../../fams-design-system/packages/v5-composer',
    '@fams/v5-kit': 'link:../../fams-design-system/packages/v5-kit',
    '@fams/v5-templates': 'link:../../fams-design-system/packages/v5-templates',
  },
}

const ALL_PACKAGES = [...new Set(Object.values(MANIFESTS).flatMap((m) => Object.keys(m)))].sort()

// ── args ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2)
const flag = (name) => {
  const i = argv.indexOf(name)
  return i === -1 ? undefined : argv[i + 1]
}
const MODE = flag('--mode')
const STATUS = argv.includes('--status') || (!MODE && !argv.includes('--help'))
const TARBALLS = flag('--tarballs')
let VERSION = flag('--version')

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))
const writeJson = (p, j) => writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`)

// ── status ──────────────────────────────────────────────────────────────────
function currentMode() {
  const specs = []
  for (const [rel, deps] of Object.entries(MANIFESTS)) {
    const j = readJson(join(REPO, rel))
    for (const name of Object.keys(deps)) {
      const spec = j.dependencies?.[name] ?? j.devDependencies?.[name]
      specs.push({ rel, name, spec })
    }
  }
  const linked = specs.filter((s) => s.spec?.startsWith('link:'))
  const mode = linked.length === specs.length ? 'link' : linked.length === 0 ? 'registry' : 'MIXED'
  return { mode, specs }
}

if (STATUS) {
  const { mode, specs } = currentMode()
  const ws = readFileSync(join(REPO, 'pnpm-workspace.yaml'), 'utf8')
  console.log(`\ndesign-system consumption mode: ${mode}\n`)
  for (const s of specs) console.log(`  ${s.rel.padEnd(18)} ${s.name.padEnd(22)} ${s.spec}`)
  console.log(
    ws.includes('# >>> ds-consumption tarball overrides')
      ? '\n  ⚠ a tarball-overrides block is ACTIVE in pnpm-workspace.yaml (proof harness, not production)\n'
      : '\n  no tarball overrides active\n',
  )
  process.exit(0)
}

if (MODE !== 'link' && MODE !== 'registry') {
  console.error('--mode must be "link" or "registry" (or pass --status). See the header of this file.')
  process.exit(1)
}

// ── resolve the version to pin (registry mode) ──────────────────────────────
if (MODE === 'registry' && !VERSION) {
  // Prefer the sibling checkout's real versions — they are what would have been
  // published. Fall back to requiring --version when there is no sibling.
  const versions = new Set()
  for (const name of ALL_PACKAGES) {
    const p = join(DS, 'packages', name.replace('@fams/', ''), 'package.json')
    if (existsSync(p)) versions.add(readJson(p).version)
  }
  if (versions.size === 1) {
    VERSION = [...versions][0]
    console.log(`(no --version given; using ${VERSION} from the sibling ../fams-design-system checkout)`)
  } else {
    console.error(
      versions.size === 0
        ? 'No sibling ../fams-design-system checkout — pass --version <exact version> explicitly.'
        : `The sibling checkout has mixed versions (${[...versions].join(', ')}) — pass --version explicitly.`,
    )
    process.exit(1)
  }
}

// ── rewrite the manifests ───────────────────────────────────────────────────
for (const [rel, deps] of Object.entries(MANIFESTS)) {
  const p = join(REPO, rel)
  const j = readJson(p)
  for (const [name, linkSpec] of Object.entries(deps)) {
    const field = j.dependencies?.[name] !== undefined ? 'dependencies' : 'devDependencies'
    if (j[field]?.[name] === undefined) {
      console.error(`${rel}: expected a ${name} dependency, found none`)
      process.exit(1)
    }
    // EXACT version, deliberately: no caret. A design system consumed by a
    // demo environment should move only when someone bumps it on purpose.
    j[field][name] = MODE === 'link' ? linkSpec : VERSION
  }
  writeJson(p, j)
  console.log(`✔ ${rel} → ${MODE === 'link' ? 'link:' : VERSION}`)
}

// ── tarball overrides (the offline proof harness) ────────────────────────────
const WS = join(REPO, 'pnpm-workspace.yaml')
const START = '# >>> ds-consumption tarball overrides (proof harness — see tools/ds-consumption.mjs)'
const END = '# <<< ds-consumption tarball overrides'

// The markers contain regex metacharacters — ( ) . — so they must be escaped
// before going into a RegExp, or the strip silently no-ops.
const rx = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

let ws = readFileSync(WS, 'utf8')
const stripped = ws.replace(new RegExp(`\\n*${rx(START)}[\\s\\S]*?${rx(END)}\\n?`), '\n')

if (TARBALLS) {
  if (MODE !== 'registry') {
    console.error('--tarballs only makes sense with --mode registry')
    process.exit(1)
  }
  const dir = resolve(TARBALLS)
  const tgzs = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.tgz')) : []
  const lines = []
  for (const name of ALL_PACKAGES) {
    const prefix = `${name.replace('@', '').replace('/', '-')}-`
    const hit = tgzs.find((f) => f.startsWith(prefix))
    if (!hit) {
      console.error(`No tarball for ${name} in ${dir} (expected ${prefix}<version>.tgz)`)
      console.error('Generate them from the design system repo with:')
      console.error(`  node scripts/pack-smoke-test.mjs --tarballs-only ${dir}`)
      process.exit(1)
    }
    lines.push(`  '${name}': 'file:${join(dir, hit)}'`)
  }
  // pnpm 11 reads `overrides` from pnpm-workspace.yaml, not package.json.
  ws = `${stripped.trimEnd()}\n\n${START}\n# Resolves the PINNED @fams versions above from local \`pnpm pack\` tarballs so the\n# versioned/hermetic consumption path can be proven with NO registry running.\n# Remove this block (\`--mode registry\` without --tarballs, or \`--mode link\`)\n# before using a real registry.\noverrides:\n${lines.join('\n')}\n${END}\n`
  writeFileSync(WS, ws)
  console.log(`✔ pnpm-workspace.yaml → tarball overrides for ${ALL_PACKAGES.length} packages from ${dir}`)
} else if (ws !== stripped) {
  writeFileSync(WS, stripped)
  console.log('✔ pnpm-workspace.yaml → tarball overrides removed')
}

// ── what next ───────────────────────────────────────────────────────────────
console.log('')
if (MODE === 'link') {
  console.log('Next:')
  console.log('  cd ../fams-design-system && pnpm install && pnpm turbo run build')
  console.log('  cd - && pnpm install')
} else if (TARBALLS) {
  console.log('Next (offline proof):')
  console.log('  pnpm install --no-frozen-lockfile && pnpm demo check && pnpm test:all')
} else {
  console.log('Next (real registry):')
  console.log('  export FAMS_NPM_REGISTRY=https://<host>/<path>')
  console.log('  printf "@fams:registry=%s\\n" "$FAMS_NPM_REGISTRY" >> .npmrc   # + a read token')
  console.log('  pnpm install --no-frozen-lockfile   # then COMMIT the lockfile — it is now hermetic')
  console.log('  pnpm demo check && pnpm test:all && pnpm --filter app build')
}
console.log('')

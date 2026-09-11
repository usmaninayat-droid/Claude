#!/usr/bin/env node
/**
 * `pnpm smoke:pack` — the outside-repo consumption smoke test.
 *
 * Phase 1 §2 shipped this as an ad-hoc, hand-run `pnpm pack` + import check
 * covering only `@fams/ui-kit` and `@fams/v5-templates` (PROGRESS.md, Task 2).
 * This is that test made permanent and widened to EVERY publishable package
 * and EVERY entry point in its `exports` map — including the separate
 * `@fams/v5-templates/map` entry.
 *
 * What it proves, with no registry involved:
 *   1. `pnpm pack` succeeds for all 7 packages and rewrites `workspace:` /
 *      `catalog:` protocols to real, registry-resolvable ranges.
 *   2. The published tarball actually CONTAINS every file referenced by
 *      `main` / `module` / `types` / `exports` (the `files` allowlist is right).
 *   3. A consumer OUTSIDE this repo, resolving the packages only from those
 *      tarballs, can install them together (transitive @fams deps included).
 *   4. Every `exports` subpath resolves through Node's ESM resolver in that
 *      consumer — i.e. the exports map is externally correct, not just
 *      bundler-tolerant.
 *   5. `tsc --noEmit` type-checks a consumer that imports every JS entry point
 *      and touches a real symbol from each — proving `types` / `exports.types`.
 *   6. Every entry point that can legitimately run under Node actually imports
 *      at runtime (jsdom-backed, so DOM-touching module bodies are honest).
 *
 * Usage:
 *   node scripts/pack-smoke-test.mjs [--keep] [--tarballs-only <dir>] [--offline]
 *
 *   --keep              leave the temp workspace on disk and print its path
 *   --tarballs-only     just pack into <dir> (used by the demo repo's
 *                       versioned-consumption proof) and exit
 *   --offline           pass --prefer-offline to the consumer install
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, posix, resolve } from 'node:path'
import { PUBLISHABLE, REPO_ROOT, readPkg } from './publish-config.mjs'

const argv = process.argv.slice(2)
const KEEP = argv.includes('--keep')
const OFFLINE = argv.includes('--offline')
const tarballsOnlyIdx = argv.indexOf('--tarballs-only')
const TARBALLS_ONLY = tarballsOnlyIdx !== -1 ? resolve(argv[tarballsOnlyIdx + 1] ?? '') : null

let failures = 0
const fail = (msg) => {
  failures++
  console.error(`  ✖ ${msg}`)
}
const ok = (msg) => console.log(`  ✔ ${msg}`)

const sh = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', ...opts })
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' }
}
const shOrThrow = (cmd, args, opts = {}) => {
  const r = sh(cmd, args, opts)
  if (r.status !== 0) {
    throw new Error(
      `\`${cmd} ${args.join(' ')}\` failed (${r.status}) in ${opts.cwd ?? process.cwd()}\n` +
        `${r.stdout}\n${r.stderr}`,
    )
  }
  return r
}

// ── entry-point model ───────────────────────────────────────────────────────
/**
 * Expand a package's `exports` map into concrete entry specifiers.
 * Wildcards (`./fonts/*`, `./schemas/*`) are expanded against the real files on
 * disk so the test grows automatically when a file is added.
 */
function entryPoints(dir, pkg) {
  const out = []
  const pkgDir = join(REPO_ROOT, dir)
  for (const [sub, target] of Object.entries(pkg.exports)) {
    const spec = sub === '.' ? pkg.name : posix.join(pkg.name, sub.replace(/^\.\//, ''))
    if (sub.includes('*')) {
      const targetStr = typeof target === 'string' ? target : (target.import ?? target.default)
      const globDir = join(pkgDir, targetStr.replace(/^\.\//, '').split('*')[0])
      if (!existsSync(globDir)) {
        fail(`${pkg.name}: exports "${sub}" points at a missing directory (${globDir})`)
        continue
      }
      const files = readdirSync(globDir, { withFileTypes: true })
      // one representative leaf file is enough to prove the pattern resolves
      const leaf = files.find((f) => f.isFile())
      const nested = files.find((f) => f.isDirectory())
      if (leaf) out.push({ spec: spec.replace('*', leaf.name), kind: 'asset' })
      else if (nested) {
        const inner = readdirSync(join(globDir, nested.name), { withFileTypes: true }).find((f) => f.isFile())
        if (inner) out.push({ spec: spec.replace('*', `${nested.name}/${inner.name}`), kind: 'asset' })
      } else fail(`${pkg.name}: exports "${sub}" matches no files`)
      continue
    }
    const targetStr = typeof target === 'string' ? target : (target.import ?? target.default)
    out.push({ spec, kind: /\.(css|json)$/.test(targetStr) ? 'asset' : 'js', target: targetStr })
  }
  return out
}

/**
 * Entry points that are expected to import cleanly under plain Node + jsdom.
 * Everything NOT listed here is still resolve-checked and type-checked; it is
 * excluded from the runtime import only for a stated reason.
 */
const RUNTIME_IMPORT_SKIP = {
  // `map/index.js` pulls maplibre-gl / deck.gl at module scope; both are
  // WebGL-only and jsdom has no WebGL context. Bundler-only by construction —
  // it is a lazy, browser-only entry (see v5-templates/tsup.config.ts).
  '@fams/v5-templates/map': 'WebGL-only (maplibre-gl + deck.gl); no WebGL in jsdom',
}

// ── 1. pack ─────────────────────────────────────────────────────────────────
const workDir = TARBALLS_ONLY ?? mkdtempSync(join(tmpdir(), 'fams-pack-smoke-'))
const tarballDir = TARBALLS_ONLY ?? join(workDir, 'tarballs')
mkdirSync(tarballDir, { recursive: true })

console.log(`\n══ 1. pnpm pack (${PUBLISHABLE.length} packages) → ${tarballDir}`)
const packed = []
for (const dir of PUBLISHABLE) {
  const pkg = readPkg(dir)
  shOrThrow('pnpm', ['pack', '--pack-destination', tarballDir], { cwd: join(REPO_ROOT, dir) })
  const tgz = readdirSync(tarballDir).find(
    (f) => f.startsWith(`${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}`) && f.endsWith('.tgz'),
  )
  if (!tgz) throw new Error(`${pkg.name}: pnpm pack produced no tarball in ${tarballDir}`)
  packed.push({ dir, pkg, tgz: join(tarballDir, tgz) })
  ok(`${pkg.name}@${pkg.version} → ${tgz} (${(statSync(join(tarballDir, tgz)).size / 1024).toFixed(0)} kB)`)
}

if (TARBALLS_ONLY) {
  console.log(`\nTarballs written to ${tarballDir}. (--tarballs-only: skipping the consumer test.)`)
  process.exit(0)
}

// ── 2. tarball contents + manifest hygiene ──────────────────────────────────
console.log('\n══ 2. tarball manifest + contents')
for (const { pkg, tgz } of packed) {
  const listing = shOrThrow('tar', ['-tzf', tgz]).stdout.split('\n').filter(Boolean)
  const files = new Set(listing.map((l) => l.replace(/^package\//, '')))

  const manifestRaw = shOrThrow('tar', ['-xzOf', tgz, 'package/package.json']).stdout
  const manifest = JSON.parse(manifestRaw)

  if (manifest.private) fail(`${pkg.name}: packed manifest still has "private": true`)
  if (!manifest.publishConfig) fail(`${pkg.name}: packed manifest has no publishConfig`)

  // protocol rewriting — the whole reason a workspace package can be published
  for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [dep, range] of Object.entries(manifest[field] ?? {})) {
      if (/^(workspace|catalog):/.test(range)) {
        fail(`${pkg.name}: ${field}.${dep} = "${range}" — pnpm pack did not rewrite the protocol`)
      }
    }
  }

  // every file the manifest points at must be inside the tarball
  const referenced = new Set()
  for (const f of ['main', 'module', 'types']) if (manifest[f]) referenced.add(manifest[f])
  const walk = (node) => {
    if (typeof node === 'string') {
      if (node.startsWith('./') && !node.includes('*')) referenced.add(node)
    } else if (node && typeof node === 'object') Object.values(node).forEach(walk)
  }
  walk(manifest.exports)
  for (const rel of referenced) {
    const p = rel.replace(/^\.\//, '')
    if (!files.has(p)) fail(`${pkg.name}: manifest references ${rel} but it is NOT in the tarball`)
  }
  ok(`${pkg.name}: ${listing.length} files, ${referenced.size} manifest-referenced paths all present, protocols rewritten`)
}

// ── 3. outside-repo consumer install ────────────────────────────────────────
const consumer = join(workDir, 'consumer')
mkdirSync(consumer, { recursive: true })

const famsDeps = Object.fromEntries(packed.map(({ pkg }) => [pkg.name, pkg.version]))
// pnpm.overrides stands in for the (nonexistent) registry: every @fams
// specifier — direct AND transitive, since packed manifests depend on each
// other by exact version — resolves to the local tarball.
const overrides = Object.fromEntries(packed.map(({ pkg, tgz }) => [pkg.name, `file:${tgz}`]))

writeFileSync(
  join(consumer, 'package.json'),
  `${JSON.stringify(
    {
      name: 'fams-pack-smoke-consumer',
      private: true,
      version: '0.0.0',
      type: 'module',
      dependencies: {
        ...famsDeps,
        react: '^19',
        'react-dom': '^19',
      },
      devDependencies: {
        '@types/react': '^19',
        '@types/react-dom': '^19',
        jsdom: '^25',
        typescript: '^5',
      },
    },
    null,
    2,
  )}\n`,
)
// pnpm 11 reads `overrides` from pnpm-workspace.yaml, not package.json.
writeFileSync(
  join(consumer, 'pnpm-workspace.yaml'),
  [
    'packages: []',
    // mirrors the repo root pnpm-workspace.yaml's allowBuilds policy so the
    // consumer install is not blocked by ERR_PNPM_IGNORED_BUILDS
    'allowBuilds:',
    '  esbuild: true',
    "  '@vaadin/vaadin-usage-statistics': false",
    '  msw: false',
    'overrides:',
    ...Object.entries(overrides).map(([k, v]) => `  '${k}': '${v}'`),
    '',
  ].join('\n'),
)

console.log('\n══ 3. install in an outside-repo consumer')
console.log(`  cwd: ${consumer}`)
shOrThrow('pnpm', ['install', ...(OFFLINE ? ['--prefer-offline'] : [])], {
  cwd: consumer,
  stdio: ['ignore', 'inherit', 'inherit'],
})
ok('pnpm install resolved all 7 @fams packages from tarballs only (no registry)')

// ── 4. exports resolution ───────────────────────────────────────────────────
console.log('\n══ 4. Node ESM resolution of every exports subpath')
const allEntries = packed.flatMap(({ dir, pkg }) => entryPoints(dir, pkg).map((e) => ({ ...e, pkg: pkg.name })))
const resolveScript = join(consumer, 'resolve-check.mjs')
writeFileSync(
  resolveScript,
  `import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const specs = ${JSON.stringify(allEntries.map((e) => e.spec))}
let bad = 0
for (const s of specs) {
  try {
    // import.meta.resolve honours the "exports" map (incl. the "import" condition)
    const url = import.meta.resolve(s)
    if (!url) throw new Error('no url')
    console.log('  ✔ ' + s + ' → ' + url.replace(/^.*\\/node_modules\\//, 'node_modules/'))
  } catch (err) {
    bad++
    console.error('  ✖ ' + s + ' → ' + err.message)
  }
}
process.exit(bad ? 1 : 0)
`,
)
const resolveRun = sh('node', [resolveScript], { cwd: consumer })
process.stdout.write(resolveRun.stdout)
process.stderr.write(resolveRun.stderr)
if (resolveRun.status !== 0) fail(`exports resolution failed for at least one subpath (${allEntries.length} checked)`)
else ok(`all ${allEntries.length} exports subpaths resolve`)

// ── 5. typecheck a consumer that imports everything ─────────────────────────
console.log('\n══ 5. tsc --noEmit over a consumer importing every JS entry')
const jsEntries = allEntries.filter((e) => e.kind === 'js')
const tsLines = [
  '// generated by scripts/pack-smoke-test.mjs — imports every publishable JS entry point',
  '/* eslint-disable */',
]
const probes = []
jsEntries.forEach((e, i) => {
  tsLines.push(`import * as m${i} from '${e.spec}'`)
  probes.push(`  ['${e.spec}', Object.keys(m${i}).length] as const,`)
})
tsLines.push('', 'export const entryExportCounts = [', ...probes, '] as const', '')
// a couple of real named-symbol probes so `types` is exercised, not just resolved
tsLines.push(
  "import { Button } from '@fams/ui-kit'",
  "import { validateBlueprint } from '@fams/v5-composer'",
  "import { createFamsApp } from '@fams/skeleton-kit'",
  "import { bootstrapTenant } from '@fams/v5-kit'",
  "import { EntityProfile } from '@fams/v5-templates'",
  "import { MapPanel } from '@fams/v5-templates/map'",
  "import { RelationalStore } from '@fams/demo-kit'",
  "import { usePersona } from '@fams/demo-kit/react'",
  "import { DemoConsole } from '@fams/demo-kit/console'",
  '',
  'export const probes = { Button, validateBlueprint, createFamsApp, bootstrapTenant, EntityProfile, MapPanel, RelationalStore, usePersona, DemoConsole }',
  '',
)
writeFileSync(join(consumer, 'consumer.ts'), tsLines.join('\n'))
writeFileSync(
  join(consumer, 'tsconfig.json'),
  `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'ESNext',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: ['react', 'react-dom'],
      },
      include: ['consumer.ts'],
    },
    null,
    2,
  )}\n`,
)
const tsc = sh('pnpm', ['exec', 'tsc', '--noEmit', '-p', 'tsconfig.json'], { cwd: consumer })
process.stdout.write(tsc.stdout)
process.stderr.write(tsc.stderr)
if (tsc.status !== 0) fail(`tsc --noEmit failed for the external consumer (${jsEntries.length} entries imported)`)
else ok(`tsc --noEmit clean: ${jsEntries.length} JS entries + 7 named-symbol probes`)

// ── 6. runtime import under jsdom ───────────────────────────────────────────
console.log('\n══ 6. runtime import under Node + jsdom')
const runtimeSpecs = jsEntries.map((e) => e.spec).filter((s) => !RUNTIME_IMPORT_SKIP[s])
for (const [s, why] of Object.entries(RUNTIME_IMPORT_SKIP)) console.log(`  – skipped ${s}: ${why}`)
const runtimeScript = join(consumer, 'runtime-check.mjs')
writeFileSync(
  runtimeScript,
  `import { JSDOM } from 'jsdom'
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
for (const k of ['window','document','navigator','HTMLElement','Element','Node','CustomEvent','Event','DOMParser','getComputedStyle','requestAnimationFrame','cancelAnimationFrame','matchMedia','MutationObserver']) {
  if (!(k in globalThis)) globalThis[k] = dom.window[k] ?? (() => {})
}
globalThis.matchMedia ??= () => ({ matches: false, addEventListener(){}, removeEventListener(){}, addListener(){}, removeListener(){} })
globalThis.ResizeObserver ??= class { observe(){} unobserve(){} disconnect(){} }
globalThis.IntersectionObserver ??= class { observe(){} unobserve(){} disconnect(){} }

const specs = ${JSON.stringify(runtimeSpecs)}
let bad = 0
for (const s of specs) {
  try {
    const mod = await import(s)
    const n = Object.keys(mod).length
    if (n === 0) throw new Error('module has zero exports')
    console.log('  ✔ ' + s + ' (' + n + ' exports)')
  } catch (err) {
    bad++
    console.error('  ✖ ' + s + ' → ' + (err && err.message))
  }
}
process.exit(bad ? 1 : 0)
`,
)
const runtimeRun = sh('node', [runtimeScript], { cwd: consumer })
process.stdout.write(runtimeRun.stdout)
process.stderr.write(runtimeRun.stderr)
if (runtimeRun.status !== 0) fail(`runtime import failed for at least one entry (${runtimeSpecs.length} attempted)`)
else ok(`all ${runtimeSpecs.length} runtime-eligible entries imported with non-empty export sets`)

// ── 7. asset entries are real, non-empty files ──────────────────────────────
console.log('\n══ 7. asset entries (css / json / fonts) are real, non-empty files')
const assetSpecs = allEntries.filter((e) => e.kind === 'asset').map((e) => e.spec)
const assetScript = join(consumer, 'asset-check.mjs')
writeFileSync(
  assetScript,
  `import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const specs = ${JSON.stringify(assetSpecs)}
let bad = 0
for (const s of specs) {
  try {
    const p = fileURLToPath(import.meta.resolve(s))
    const size = statSync(p).size
    if (size === 0) throw new Error('empty file')
    console.log('  ✔ ' + s + ' (' + size + ' bytes)')
  } catch (err) { bad++; console.error('  ✖ ' + s + ' → ' + err.message) }
}
process.exit(bad ? 1 : 0)
`,
)
const assetRun = sh('node', [assetScript], { cwd: consumer })
process.stdout.write(assetRun.stdout)
process.stderr.write(assetRun.stderr)
if (assetRun.status !== 0) fail('at least one asset entry is missing or empty')
else ok(`all ${assetSpecs.length} asset entries present and non-empty`)

// ── done ────────────────────────────────────────────────────────────────────
if (KEEP) console.log(`\n(--keep) temp workspace left at ${workDir}`)
else rmSync(workDir, { recursive: true, force: true })

console.log(
  failures
    ? `\n✖ pack/import smoke test FAILED — ${failures} problem(s)\n`
    : `\n✔ pack/import smoke test PASSED — ${PUBLISHABLE.length} packages, ${allEntries.length} entry points\n`,
)
process.exit(failures ? 1 : 0)

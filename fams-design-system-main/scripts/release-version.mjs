#!/usr/bin/env node
/*
 * `node scripts/release-version.mjs <patch|minor|major|x.y.z> [--publish]`
 *
 * Bumps all seven publishable packages to one version AND updates the version
 * the demo environment asks for, in the same step.
 *
 * WHY THESE TWO THINGS MUST MOVE TOGETHER. A consumer in `registry` mode is
 * pinned to an exact version. The moment the design system gains something the
 * demo environment's blueprints use — a new `uiConfig` property, say — a
 * consumer on the old pin gets a working app that FAILS ITS OWN VALIDATION,
 * because the JSON Schema it validates against is the published one. That
 * happened on day one with `stageTabs`. So: bump, build, publish, and move the
 * pin, or registry consumers silently drift behind.
 *
 * This bypasses changesets deliberately — changesets versions packages
 * independently from changelog intent, and these seven are consumed as one
 * unit at one pinned version.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { PUBLISHABLE } from './publish-config.mjs'

const REPO_ROOT = new URL('..', import.meta.url).pathname
const DEMO = join(REPO_ROOT, '..', 'fams-v5-demo-environment')
const arg = process.argv[2]
const DO_PUBLISH = process.argv.includes('--publish')

if (!arg) {
  console.error('usage: release-version.mjs <patch|minor|major|x.y.z> [--publish]')
  process.exit(1)
}

const readPkg = (dir) => JSON.parse(readFileSync(join(REPO_ROOT, dir, 'package.json'), 'utf8'))
const current = readPkg(PUBLISHABLE[0]).version

// Every package must already agree, or "one pinned version" is a fiction.
const disagree = PUBLISHABLE.filter((d) => readPkg(d).version !== current)
if (disagree.length) {
  console.error(
    `✖ these packages are not at ${current}: ${disagree
      .map((d) => `${readPkg(d).name}@${readPkg(d).version}`)
      .join(', ')}\n  Bring them into line before releasing.`,
  )
  process.exit(1)
}

const next = /^\d+\.\d+\.\d+$/.test(arg)
  ? arg
  : (() => {
      const [maj, min, pat] = current.split('.').map(Number)
      if (arg === 'major') return `${maj + 1}.0.0`
      if (arg === 'minor') return `${maj}.${min + 1}.0`
      if (arg === 'patch') return `${maj}.${min}.${pat + 1}`
      throw new Error(`unrecognised version argument: ${arg}`)
    })()

console.log(`\n${current} → ${next}\n`)

for (const dir of PUBLISHABLE) {
  const path = join(REPO_ROOT, dir, 'package.json')
  const raw = readFileSync(path, 'utf8')
  // Textual replace of just the version line, so key order and formatting survive.
  const updated = raw.replace(/("version":\s*")[^"]+(")/, `$1${next}$2`)
  writeFileSync(path, updated)
  console.log(`  ${readPkg(dir).name} → ${next}`)
}

// The consumer's pin. Without this the release is only half done.
const configPath = join(DEMO, 'ds.config.json')
if (existsSync(configPath)) {
  const raw = readFileSync(configPath, 'utf8')
  writeFileSync(raw.includes('"registryVersion"') ? configPath : configPath, raw.replace(/("registryVersion":\s*")[^"]+(")/, `$1${next}$2`))
  console.log(`\n  ../fams-v5-demo-environment/ds.config.json registryVersion → ${next}`)
} else {
  console.log(`\n  ⚠ no sibling demo environment found — remember to set
    ds.config.json "registryVersion": "${next}" there, or registry-mode
    consumers stay on ${current}.`)
}

if (!DO_PUBLISH) {
  console.log(`
Next:
  pnpm turbo run build
  export GITHUB_TOKEN=<classic PAT with write:packages>
  node scripts/publish-github.mjs

Then commit BOTH repos: the version bump here, the pin there.
`)
  process.exit(0)
}

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: REPO_ROOT, ...opts })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
console.log('\n── building ──')
run('pnpm', ['turbo', 'run', 'build'])
console.log('\n── publishing ──')
run('node', ['scripts/publish-github.mjs'])

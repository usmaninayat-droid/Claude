#!/usr/bin/env node
// PD-363: keeps package.json#exports in lock-step with the tsup entry map
// (scripts/entry-map.mjs), which is itself generated from src/index.ts. This
// script is the other half of "cannot drift" — the entry map decides what
// tsup BUILDS, this decides what the package MANIFEST advertises, and both
// read the same source of truth.
//
//   node scripts/check-exports.mjs           — verify (CI/lint mode, exit 1 on drift)
//   node scripts/check-exports.mjs --write    — regenerate package.json in place
//
// Preserves the ".", "./tailwind.css", "./styles.css" and "./utilities.css"
// exports exactly as hand-authored; only the per-component subpaths are
// generated. ("./utilities.css" is the design system's single compiled
// Tailwind stylesheet — built once by scripts/build-css.mjs at the repo root
// and copied into this package's dist by scripts/copy-utilities.mjs — so a
// consumer installing from a registry gets working styles without our src/ on
// disk.)
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getPublicEntries, PKG_DIR } from './entry-map.mjs'

const WRITE = process.argv.includes('--write')
const pkgPath = join(PKG_DIR, 'package.json')
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))

const entries = getPublicEntries()
const HAND_AUTHORED = ['.', './tailwind.css', './styles.css', './utilities.css']

/** @type {Record<string, unknown>} */
const generatedSubpaths = {}
for (const [key, srcPath] of Object.entries(entries)) {
  if (key === 'index') continue // "." export, hand-authored, left alone
  generatedSubpaths[`./${key}`] = {
    types: `./dist/${key}.d.ts`,
    import: `./dist/${key}.js`,
  }
  void srcPath
}

const nextExports = {
  '.': pkg.exports['.'],
  './tailwind.css': pkg.exports['./tailwind.css'],
  './styles.css': pkg.exports['./styles.css'],
  './utilities.css': pkg.exports['./utilities.css'],
  ...generatedSubpaths,
}

const current = JSON.stringify(pkg.exports, null, 2)
const next = JSON.stringify(nextExports, null, 2)

if (current === next) {
  console.log(`✔ package.json#exports matches src/index.ts (${Object.keys(generatedSubpaths).length} subpaths + 3 hand-authored)`)
  process.exit(0)
}

if (!WRITE) {
  console.error(
    '✖ package.json#exports is out of date with src/index.ts.\n' +
      '  Run `node scripts/check-exports.mjs --write` (or `pnpm --filter @fams/ui-kit lint`) to regenerate.',
  )
  process.exit(1)
}

pkg.exports = nextExports
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
console.log(`✔ package.json#exports regenerated: ${Object.keys(generatedSubpaths).length} subpaths + 3 hand-authored`)

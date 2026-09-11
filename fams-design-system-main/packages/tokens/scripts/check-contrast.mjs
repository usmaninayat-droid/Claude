#!/usr/bin/env node
/**
 * check-contrast.mjs — token contrast/sanity guard.
 *
 * Runs the checks defined in contrast-lib.mjs (AA contrast, non-collision,
 * light/dark divergence) against:
 *   1. the SOURCE token JSON (tokens/core.tokens.json), and
 *   2. the COMPILED output (dist/theme.css AND dist/tokens.css),
 * so a build-step bug (e.g. a broken dark-mode action) can't slip through
 * even if the source JSON is fine, and vice versa.
 *
 * Wired into `pnpm --filter @fams/tokens lint` (see package.json), which is
 * itself part of the root `pnpm lint` (`turbo run lint`) — same wiring
 * pattern as this repo's other guard scripts (guard-publish.mjs,
 * check-peer-singletons.mjs).
 *
 * Exit code 0 = clean, 1 = at least one failure. Prints one line per failure
 * with the token names, resolved values, computed ratio (where applicable),
 * required threshold, and which check failed — enough to fix without
 * opening this file.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildSourceColorMaps, buildCompiledColorMaps, runChecks } from './contrast-lib.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PKG_ROOT = join(__dirname, '..')

function loadSourceMaps() {
  const json = JSON.parse(readFileSync(join(PKG_ROOT, 'tokens/core.tokens.json'), 'utf8'))
  return buildSourceColorMaps(json)
}

function loadCompiledMaps(file, lightMarker, darkMarker) {
  const css = readFileSync(join(PKG_ROOT, 'dist', file), 'utf8')
  return buildCompiledColorMaps(css, { lightMarker, darkMarker })
}

function main() {
  /** @type {import('./contrast-lib.mjs').runChecks extends (...a: any) => infer R ? R : never} */
  let allFailures = []

  allFailures = allFailures.concat(runChecks(loadSourceMaps(), 'tokens/core.tokens.json'))
  allFailures = allFailures.concat(
    runChecks(
      loadCompiledMaps('theme.css', '@theme static {', ':root[data-theme="dark"] {'),
      'dist/theme.css',
    ),
  )
  allFailures = allFailures.concat(
    runChecks(loadCompiledMaps('tokens.css', ':root {', ':root[data-theme="dark"] {'), 'dist/tokens.css'),
  )

  if (allFailures.length === 0) {
    console.log('✔ token contrast guard: all declared pairs pass (source JSON + dist/theme.css + dist/tokens.css)')
    return
  }

  console.error('')
  console.error('='.repeat(78))
  console.error(`  TOKEN CONTRAST GUARD FAILED — ${allFailures.length} issue(s)`)
  console.error('='.repeat(78))
  for (const f of allFailures) {
    console.error(`  ✖ ${f.message}`)
  }
  console.error('='.repeat(78))
  console.error('  Fix: edit packages/tokens/tokens/core.tokens.json, then')
  console.error('  `pnpm --filter @fams/tokens build` and re-run this guard.')
  console.error('  See packages/tokens/scripts/contrast-lib.mjs for the pair/allowlist data.')
  console.error('='.repeat(78))
  console.error('')
  process.exitCode = 1
}

main()

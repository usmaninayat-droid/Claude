#!/usr/bin/env node
/**
 * build-llms.mjs — generates/checks each package's `llms.txt` (phase 4 §4).
 *
 * WHAT `llms.txt` IS
 * -------------------
 * A compact, machine-readable export index for an agent that needs to know
 * "what does this package expose, one line each" without reading source.
 * One line per public barrel export GROUP (i.e. per `export { … } from '…'`
 * statement — the same granularity as a `registry.json` item): the primary
 * symbol name (+ how many sibling symbols ship alongside it), a one-line
 * purpose, a best-effort flat prop/param list, and the source file.
 *
 * TWO GENERATION MODES, PER PACKAGE (`PACKAGES` below)
 * ------------------------------------------------------
 * - `generated` (`ui-kit`, `v5-templates`): fully derived — purpose text
 *   reuses the exact `registry.json` description (`buildRegistry()`) for any
 *   export that's also a showcase member; the handful that aren't (a
 *   compound primitive's internal sub-part, a type-only re-export) fall back
 *   to a JSDoc-derived summary or a generic phrase. `node scripts/build-llms.mjs`
 *   (no flag) OVERWRITES these two files every run — never hand-edit them.
 * - `authored` (`skeleton-kit`, `demo-kit`, `v5-composer`, `v5-kit`): these
 *   packages have no showcase coverage to draw descriptions from, and
 *   JSDoc-derived one-liners for boot/data-layer machinery read worse than a
 *   human summary. Per the task brief, a hand-written `llms.txt` is
 *   acceptable here — `build-llms.mjs` never overwrites these four files.
 *   What it DOES do, in both modes, is enforce the staleness contract:
 *
 * `--check` (wired into root `pnpm lint`)
 * -----------------------------------------
 * - `generated` packages: regenerate and diff byte-for-byte against the
 *   committed file (same contract as `registry.json`), THEN ALSO run the
 *   same mention-coverage assertion as authored packages (below) against the
 *   freshly-regenerated text — every symbol currently exported from the
 *   package's barrel(s) must appear as a whole word. This is deliberate
 *   defense-in-depth: the byte-diff only catches drift from what
 *   `buildGeneratedLlms` currently produces, not a latent bug in
 *   `buildGeneratedLlms` itself (e.g. an export group silently collapsed to
 *   "+N sibling(s)" instead of naming every sibling) that would make the
 *   generator stably wrong. The contract this artifact exists to satisfy —
 *   "every barrel export is findable by grep in llms.txt" — is asserted
 *   directly, not just inferred from reproducibility.
 * - `authored` packages: assert every symbol currently exported from the
 *   package's barrel(s) appears as a whole word somewhere in the committed
 *   `llms.txt`. A new export with no matching mention = stale = fail. This is
 *   deliberately one-directional (extra prose mentioning things beyond the
 *   current export surface is fine) — it only catches "we shipped a new
 *   export and forgot to document it".
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  REPO_ROOT,
  buildRegistry,
  parseExportStatements,
  namedBindingIdentifiers,
  resolveModuleFile,
} from './build-registry.mjs'

const PACKAGES = [
  { pkg: 'ui-kit', mode: 'generated', barrels: ['packages/ui-kit/src/index.ts'] },
  {
    pkg: 'v5-templates',
    mode: 'generated',
    barrels: ['packages/v5-templates/src/index.ts', 'packages/v5-templates/src/map/index.ts'],
  },
  { pkg: 'skeleton-kit', mode: 'authored', barrels: ['packages/skeleton-kit/src/index.ts'] },
  {
    pkg: 'demo-kit',
    mode: 'authored',
    barrels: ['packages/demo-kit/src/index.ts', 'packages/demo-kit/src/react.ts', 'packages/demo-kit/src/console/index.ts'],
  },
  {
    pkg: 'v5-composer',
    mode: 'authored',
    barrels: ['packages/v5-composer/src/index.ts', 'packages/v5-composer/src/fields/index.ts'],
  },
  { pkg: 'v5-kit', mode: 'authored', barrels: ['packages/v5-kit/src/index.ts'] },
]

/* ────────────────────────────────────────────────────────────────────────
 * Every currently-exported symbol per package (for the authored-mode
 * mention-coverage check).
 * ──────────────────────────────────────────────────────────────────────── */
function currentExportSymbols(barrelRelPaths) {
  const symbols = new Set()
  for (const rel of barrelRelPaths) {
    const abs = join(REPO_ROOT, rel)
    for (const { braceBody } of parseExportStatements(abs)) {
      for (const symbol of namedBindingIdentifiers(braceBody)) symbols.add(symbol)
    }
  }
  return symbols
}

/* ────────────────────────────────────────────────────────────────────────
 * `generated` mode — one line per export group, reusing registry.json
 * descriptions where available, else a JSDoc/generic fallback.
 * ──────────────────────────────────────────────────────────────────────── */

function firstSentence(text, maxLen = 160) {
  const collapsed = text.replace(/\s+/g, ' ').trim()
  const cut = collapsed.match(/^.*?[.!?](?=\s|$)/)
  const sentence = cut ? cut[0] : collapsed
  return sentence.length > maxLen ? `${sentence.slice(0, maxLen - 1)}…` : sentence
}

/** Best-effort: find a `/** … *\/` JSDoc block immediately above the first
 * declaration of `symbol` in `source`, and return its first sentence. */
function jsDocSummary(source, symbol) {
  const declRe = new RegExp(
    `(?:^|\\n)[ \\t]*export\\s+(?:default\\s+)?(?:async\\s+)?(?:function|class|const|interface|type)\\s+${symbol}\\b`,
  )
  const declMatch = source.match(declRe)
  if (!declMatch) return undefined
  const declIndex = declMatch.index + declMatch[0].indexOf(symbol) - symbol.length // approx start of decl line
  const before = source.slice(0, source.indexOf(declMatch[0].trim(), Math.max(0, declIndex - 1)) + 1)
  const jsDocMatch = before.match(/\/\*\*([\s\S]*?)\*\/\s*$/)
  if (!jsDocMatch) return undefined
  const stripped = jsDocMatch[1]
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, ''))
    .join(' ')
  return firstSentence(stripped)
}

function genericFallback(primary, modulePath) {
  if (/^use[A-Z]/.test(primary)) return 'React hook.'
  if (!modulePath.startsWith('.')) return `Type/value re-exported from the ${modulePath} package.`
  return `No showcase entry or leading JSDoc to summarize — read ${modulePath}.`
}

/** Best-effort flat prop-name list from `interface/type ${primary}Props`. */
function propsSummary(source, primary) {
  const typeNames = [`${primary}Props`, `${primary}Options`]
  for (const typeName of typeNames) {
    const re = new RegExp(`(?:interface|type)\\s+${typeName}\\b[^{]*\\{`)
    const match = source.match(re)
    if (!match) continue
    const start = match.index + match[0].length
    let depth = 1
    let i = start
    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth++
      else if (source[i] === '}') depth--
      i++
    }
    const body = source.slice(start, i - 1)
    const props = []
    for (const line of body.split('\n')) {
      const propMatch = line.match(/^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\??\s*:/)
      if (propMatch && !line.trim().startsWith('*') && !line.trim().startsWith('//')) props.push(propMatch[1])
    }
    if (props.length > 0) {
      const shown = props.slice(0, 8)
      return shown.join(', ') + (props.length > shown.length ? `, +${props.length - shown.length} more` : '')
    }
  }
  return '—'
}

/**
 * Every sibling symbol named inline (not collapsed to a count) — the whole
 * point of `llms.txt` is that a plain `grep -w SomeExport` finds it, so
 * `DialogFooter`/`TabsTrigger`/`SelectContent`/etc must actually appear.
 * Wraps at a sensible width instead of one giant line; wrapping is purely
 * cosmetic here (nothing parses this file per-line — see file header), so
 * continuation lines are plain indented text.
 */
function formatPrimaryWithSiblings(primary, rest, width = 100) {
  if (rest.length === 0) return primary
  const prefix = `${primary} (also: `
  const indent = ' '.repeat(prefix.length)
  const rows = []
  let current = ''
  for (const name of rest) {
    const piece = current.length === 0 ? name : `, ${name}`
    if (current.length > 0 && current.length + piece.length > width) {
      rows.push(`${current},`)
      current = name
    } else {
      current += piece
    }
  }
  if (current.length > 0) rows.push(current)
  return `${prefix}${rows.join(`\n${indent}`)})`
}

function buildGeneratedLlms(pkg, barrelRelPaths) {
  const registry = buildRegistry()
  const descByPath = new Map(registry.items.map((item) => [item.files[0].path, item.description]))

  const lines = [
    `# llms.txt — @fams/${pkg} export index (generated by scripts/build-llms.mjs from the package barrel(s) + registry.json — DO NOT hand-edit)`,
    '# format: PrimarySymbol[ (also: Sibling1, Sibling2, …)] :: purpose :: props/signature :: file',
    "# every sibling is named in full (never collapsed to a count) so a plain grep for any export finds it",
    '',
  ]

  for (const barrelRel of barrelRelPaths) {
    const barrelAbs = join(REPO_ROOT, barrelRel)
    const barrelDir = join(barrelAbs, '..')
    for (const { braceBody, modulePath } of parseExportStatements(barrelAbs)) {
      const identifiers = namedBindingIdentifiers(braceBody)
      if (identifiers.length === 0) continue
      const [primary, ...rest] = identifiers
      const heading = formatPrimaryWithSiblings(primary, rest)

      if (!modulePath.startsWith('.')) {
        lines.push(`${heading} :: Re-exported from the \`${modulePath}\` package for convenience. :: — :: (external)`)
        continue
      }

      const absFile = resolveModuleFile(barrelDir, modulePath)
      const relFile = relative(REPO_ROOT, absFile).split('\\').join('/')
      const source = readFileSync(absFile, 'utf8')

      const purpose = descByPath.get(relFile) ?? jsDocSummary(source, primary) ?? genericFallback(primary, modulePath)
      const props = propsSummary(source, primary)
      lines.push(`${heading} :: ${purpose} :: ${props} :: ${relFile}`)
    }
  }
  lines.push('')
  return lines.join('\n')
}

/* ────────────────────────────────────────────────────────────────────────
 * Mention-coverage: every symbol in `symbols` must appear as a whole word
 * somewhere in `text`. Shared by authored-mode's check (against the
 * committed file) and generated-mode's check (against the freshly
 * regenerated text, as a direct assertion of the "every export is
 * grep-able" contract independent of the byte-diff — see file header).
 * ──────────────────────────────────────────────────────────────────────── */
function mentionCoverageMissing(symbols, text) {
  return [...symbols].filter((symbol) => !new RegExp(`\\b${symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text))
}

/* ────────────────────────────────────────────────────────────────────────
 * Main
 * ──────────────────────────────────────────────────────────────────────── */

function main() {
  const check = process.argv.includes('--check')
  const failures = []

  for (const { pkg, mode, barrels } of PACKAGES) {
    const outPath = join(REPO_ROOT, 'packages', pkg, 'llms.txt')

    if (mode === 'generated') {
      const fresh = buildGeneratedLlms(pkg, barrels)
      if (check) {
        if (!existsSync(outPath)) {
          failures.push(`packages/${pkg}/llms.txt does not exist — run "pnpm build:registry".`)
          continue
        }
        const committed = readFileSync(outPath, 'utf8')
        if (committed !== fresh) {
          failures.push(`packages/${pkg}/llms.txt is STALE — run "pnpm build:registry" and commit the result.`)
        }
        // Defense-in-depth: assert the actual contract (every barrel export
        // findable by grep) against the freshly-generated text, not just
        // byte-equality with what the generator currently happens to produce.
        const symbols = currentExportSymbols(barrels)
        const missing = mentionCoverageMissing(symbols, fresh)
        if (missing.length > 0) {
          failures.push(
            `packages/${pkg}/llms.txt does not mention ${missing.length}/${symbols.size} exported symbol(s) as whole words: ` +
              `${missing.join(', ')}. buildGeneratedLlms() has a coverage bug — fix it so every barrel export is named.`,
          )
        }
      } else {
        writeFileSync(outPath, fresh)
        console.log(`[build:llms] wrote packages/${pkg}/llms.txt (generated).`)
      }
      continue
    }

    // authored mode — never write; only check mention-coverage.
    if (!existsSync(outPath)) {
      failures.push(`packages/${pkg}/llms.txt does not exist. This package is "authored" mode — write it by hand (see scripts/build-llms.mjs).`)
      continue
    }
    const committed = readFileSync(outPath, 'utf8')
    const symbols = currentExportSymbols(barrels)
    const missing = mentionCoverageMissing(symbols, committed)
    if (missing.length > 0) {
      failures.push(
        `packages/${pkg}/llms.txt is STALE — exported symbol(s) not mentioned: ${missing.join(', ')}. ` +
          `Add a line for each (packages/${pkg}/llms.txt is hand-authored, not generated).`,
      )
    } else if (!check) {
      console.log(`[build:llms] packages/${pkg}/llms.txt is authored — left untouched (${symbols.size} export(s), all mentioned).`)
    }
  }

  if (failures.length > 0) {
    console.error(`[build:llms] ${check ? '--check' : 'build'} FAILED:\n` + failures.map((f) => `  - ${f}`).join('\n'))
    process.exit(1)
  }
  console.log(`[build:llms] ${check ? 'check' : 'build'} OK.`)
}

main()

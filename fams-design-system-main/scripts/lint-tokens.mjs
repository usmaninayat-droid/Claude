#!/usr/bin/env node
/**
 * lint-tokens.mjs — no raw hex / raw px in component source (phase 1 §6,
 * `pnpm lint:tokens`, folded into root `pnpm lint`).
 *
 * Hard rule 2 (CLAUDE.md): "NEVER hardcode hex / px / font values in a
 * component. Use Tailwind utilities backed by `@fams/tokens`." This script is
 * the mechanical, CI-enforced half of that rule for colors and pixel sizes
 * (font values and the token pipeline itself are out of scope here).
 *
 * EXACT SCOPE
 * -----------
 * - Files scanned: `packages/{ui-kit,skeleton-kit,v5-templates,v5-composer,v5-kit,demo-kit}/src/**\/*.ts`
 *   and `.tsx` — component source only.
 * - Excluded: `*.test.ts(x)`, `*.stories.ts(x)`, anything under a `demos/`
 *   directory (none exist in these packages today, but excluded for when
 *   they do — demos/stories are allowed to use illustrative one-off values).
 * - Violation 1 — raw hex color: `/#[0-9a-fA-F]{3,8}\b/` (3/4/6/8-digit hex,
 *   with or without alpha).
 * - Violation 2 — raw pixel value in a Tailwind arbitrary-value class:
 *   `/\[-?[0-9]+(\.[0-9]+)?px\]/`, e.g. `w-[42px]`, `text-[11px]`,
 *   `rounded-[6px]`. Deliberately narrow to the *class* form (the brief's own
 *   example), not any substring "16px" that might appear in prose inside a
 *   JSDoc comment describing a design value — that's documentation, not
 *   styling, and flagging it would just be noise.
 * - `var(--token, <fallback>)` CSS custom-property fallbacks are EXPLICITLY
 *   ALLOWED and stripped before scanning — see decision note in the task 6
 *   brief: "allow var(--…, …) fallbacks, flag everything else." This is
 *   deliberately not smart enough to check whether the fallback matches the
 *   token's real value (too subtle for v1) — it's a byte-for-byte content
 *   match on `var(...)`, nothing more.
 * - `resolveToken('--token', <fallback>)` is the established equivalent for
 *   contexts that need a plain JS string, not a live CSS var — e.g. ECharts
 *   canvas/SVG option objects (Gauge, ComplianceGauge) that read
 *   `getComputedStyle` at render time and fall back to a literal when the
 *   token isn't resolvable (SSR/tests). Same exemption as `var(...)`: a
 *   byte-for-byte match on `resolveToken(...)`, no smarter.
 * - Non-bracket arbitrary values in other units (rem, %, vh, …) are NOT
 *   flagged — only `px` is in scope, matching the brief precisely. `rem`
 *   brackets (e.g. `min-w-[8rem]`) are an existing, accepted pattern
 *   elsewhere in ui-kit (DropdownMenu, Select) and are left alone.
 *
 * COMMENTS ARE STRIPPED BEFORE SCANNING
 * --------------------------------------
 * `//` line comments and `/* *\/` block comments are removed before the hex/px
 * regexes run, via a small character-by-character state machine (see
 * `stripComments` below) that also tracks single-quote, double-quote, and
 * template-literal string state so a `//` or `/*` sequence *inside* a string
 * (e.g. a URL) isn't mistaken for a comment start. This matters in practice:
 * this codebase's `@usage-v5` JSDoc blocks routinely quote legacy Vue hex
 * values for migration traceability — that's documentation, not styling, and
 * flagging it was pure noise inflating the grandfather baseline.
 * KNOWN LIMITATIONS (acceptable for a lint gate, not a full parser):
 *   - Regex literals (e.g. `/foo\/\/bar/`) are not specially recognized, so a
 *     `/` inside a regex literal could desync comment-vs-code state. None of
 *     the scanned source uses regex literals containing `/*` or `//` today.
 *   - Template-literal `${…}` expressions are not parsed as nested code —
 *     while inside a template literal, a stray backtick inside `${}` (rare)
 *     could close the literal early. Not observed in current source.
 *   - Nested/unbalanced quotes inside a single comment (e.g. an apostrophe in
 *     prose) are fine — comment state ignores quote characters entirely.
 *
 * LINE-SCOPED EXEMPTION — `// token-exempt: <reason>`
 * ---------------------------------------------------
 * A `// token-exempt: <reason>` comment exempts the line it sits on and the
 * line immediately after it (see `exemptLines` below for why both). The reason
 * text is mandatory. Use it for a value that genuinely cannot be a token —
 * an ECharts canvas option that needs a literal string rather than a live CSS
 * var, or a Figma-sourced one-off directional shadow with no DS equivalent —
 * never as a shortcut past rule 2. `node scripts/lint-tokens.mjs --list`
 * prints every exemption in force, so they stay auditable.
 *
 * GRANDFATHERING
 * --------------
 * Existing violations at the time this gate was added are listed, file-by-
 * file, in `scripts/token-lint-baseline.mjs` — same migrate-on-touch pattern
 * as `packages/ui-kit/eslint.radix-allowlist.mjs` (decision #7). A baselined
 * file is skipped ENTIRELY (not per-violation) — when it's next touched for
 * real work, fix its raw hex/px and remove it from the list. NEVER add a
 * newly-written file to the baseline; it exists only for what predates this
 * gate.
 *
 * Regenerate the current violation list with:
 *   node scripts/lint-tokens.mjs --list
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tokenLintBaseline } from './token-lint-baseline.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(__dirname, '..')

const SCAN_ROOTS = [
  'packages/ui-kit/src',
  'packages/skeleton-kit/src',
  'packages/v5-templates/src',
  'packages/v5-composer/src',
  'packages/v5-kit/src',
  'packages/demo-kit/src',
]

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g
const PX_RE = /\[-?[0-9]+(?:\.[0-9]+)?px\]/g
const VAR_RE = /var\([^)]*\)/g
const RESOLVE_TOKEN_RE = /resolveToken\([^)]*\)/g

// Strip `//` line comments and `/* */` block comments from source before
// scanning, tracking string state (single/double quote, template literal) so
// a `//` or `/*` inside a string literal isn't mistaken for a comment start.
// Replaces comment content with spaces (newlines preserved) so line numbers
// in violation reports stay accurate. See header for documented limitations.
function stripComments(source) {
  let out = ''
  let state = 'code' // code | line | block | sq | dq | tpl
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    const c2 = i + 1 < source.length ? source[i + 1] : ''
    if (state === 'code') {
      if (c === '/' && c2 === '/') {
        state = 'line'
        out += '  '
        i += 1
        continue
      }
      if (c === '/' && c2 === '*') {
        state = 'block'
        out += '  '
        i += 1
        continue
      }
      if (c === "'") {
        state = 'sq'
        out += c
        continue
      }
      if (c === '"') {
        state = 'dq'
        out += c
        continue
      }
      if (c === '`') {
        state = 'tpl'
        out += c
        continue
      }
      out += c
      continue
    }
    if (state === 'line') {
      if (c === '\n') {
        state = 'code'
        out += c
      } else {
        out += ' '
      }
      continue
    }
    if (state === 'block') {
      if (c === '*' && c2 === '/') {
        state = 'code'
        out += '  '
        i += 1
      } else {
        out += c === '\n' ? '\n' : ' '
      }
      continue
    }
    // string states: sq, dq, tpl — copy through verbatim (including any
    // '//' or '/*' inside), honoring backslash escapes so an escaped quote
    // doesn't end the string early.
    if (state === 'sq' || state === 'dq' || state === 'tpl') {
      if (c === '\\') {
        out += c + c2
        i += 1
        continue
      }
      if ((state === 'sq' && c === "'") || (state === 'dq' && c === '"') || (state === 'tpl' && c === '`')) {
        state = 'code'
      }
      out += c
      continue
    }
  }
  return out
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, files)
    else if (['.ts', '.tsx'].includes(extname(p))) files.push(p)
  }
  return files
}

function isExcluded(relPath) {
  if (/\.test\.(ts|tsx)$/.test(relPath)) return true
  if (/\.stories\.(ts|tsx)$/.test(relPath)) return true
  if (/(^|\/)demos\//.test(relPath)) return true
  return false
}

/**
 * Line-scoped opt-out: `// token-exempt: <reason>`.
 *
 * Read from the RAW source, before `stripComments` erases it. A directive
 * exempts the line it sits on (trailing form, e.g. `resolveToken(…) //
 * token-exempt: echarts needs a literal`) AND the line immediately after it
 * (own-line form, which is how the multi-line JSX cases are written). Nothing
 * else — it is not a file-level or block-level switch, and a reason is
 * mandatory: `// token-exempt:` with nothing after it is not a directive and
 * exempts nothing.
 *
 * Why it exists: the codebase already carried 24 of these comments, written
 * as documentation of a deliberate decision, and they meant NOTHING to this
 * script (Phase 7 code review, finding F5 — "documentary only"). The choice
 * was to delete them or make them real. Making them real is strictly stronger
 * than the alternative that was available for the same cases — adding the
 * whole FILE to `token-lint-baseline.mjs`, which switches off every check in
 * it forever. This narrows the escape hatch from a file to a line and forces a
 * written reason next to the value.
 */
const EXEMPT_RE = /\/\/\s*token-exempt:\s*\S/

function exemptLines(source) {
  const exempt = new Set()
  source.split('\n').forEach((line, i) => {
    if (!EXEMPT_RE.test(line)) return
    exempt.add(i + 1) // trailing form: the value sits on this line
    exempt.add(i + 2) // own-line form: the value sits on the next one
  })
  return exempt
}

function findViolations(source) {
  const exempt = exemptLines(source)
  const noComments = stripComments(source)
  const stripped = noComments
    .replace(VAR_RE, (m) => ' '.repeat(m.length))
    .replace(RESOLVE_TOKEN_RE, (m) => ' '.repeat(m.length))
  const violations = []
  const exempted = []
  const lines = stripped.split('\n')
  lines.forEach((line, i) => {
    const bucket = exempt.has(i + 1) ? exempted : violations
    for (const m of line.matchAll(HEX_RE)) {
      bucket.push({ line: i + 1, kind: 'hex', text: m[0] })
    }
    for (const m of line.matchAll(PX_RE)) {
      bucket.push({ line: i + 1, kind: 'px', text: m[0] })
    }
  })
  findViolations.lastExempted = exempted
  return violations
}

const listMode = process.argv.includes('--list')
const baselineSet = new Set(tokenLintBaseline)

let realViolationFiles = 0
let realViolationCount = 0
let exemptedCount = 0
const drifted = []

for (const root of SCAN_ROOTS) {
  const abs = join(REPO_ROOT, root)
  for (const f of walk(abs)) {
    const relPath = relative(REPO_ROOT, f)
    if (isExcluded(relPath)) continue
    const source = readFileSync(f, 'utf8')
    const violations = findViolations(source)
    const exempted = findViolations.lastExempted
    if (listMode && exempted.length > 0) {
      console.log(`[token-exempt] ${relPath} — ${exempted.length} line-exempted occurrence(s)`)
      exemptedCount += exempted.length
    }
    if (violations.length === 0) continue

    if (baselineSet.has(relPath)) {
      if (listMode) console.log(`[grandfathered] ${relPath} — ${violations.length} occurrence(s)`)
      continue
    }


    realViolationFiles += 1
    realViolationCount += violations.length
    console.error(`\n${relPath}`)
    for (const v of violations) {
      console.error(`  ${v.line}: raw ${v.kind} — ${v.text}`)
    }
  }
}

// Baseline drift check (informational only): a file in the baseline that no
// longer has any violations should be removed from the list — not a failure,
// just a nudge so the baseline doesn't silently outlive its reason to exist.
for (const relPath of baselineSet) {
  const abs = join(REPO_ROOT, relPath)
  let source
  try {
    source = readFileSync(abs, 'utf8')
  } catch {
    drifted.push(`${relPath} (file no longer exists — remove from baseline)`)
    continue
  }
  if (findViolations(source).length === 0) {
    drifted.push(`${relPath} (no violations remain — remove from baseline)`)
  }
}
if (drifted.length > 0) {
  console.warn('\n[lint:tokens] baseline drift (non-blocking) — these entries can be removed:')
  for (const d of drifted) console.warn(`  - ${d}`)
}

if (realViolationFiles > 0) {
  console.error(
    `\n[lint:tokens] ${realViolationCount} raw hex/px violation(s) in ${realViolationFiles} file(s) not covered by the baseline.\n` +
      'Use a token/Tailwind theme class instead, or (only for genuinely pre-existing code) add the file to scripts/token-lint-baseline.mjs with a migrate-on-touch note.',
  )
  process.exit(1)
}

if (listMode && exemptedCount > 0) {
  console.log(`\n[lint:tokens] ${exemptedCount} occurrence(s) carry a \`// token-exempt: <reason>\` directive.`)
}
console.log('[lint:tokens] no raw hex/px violations outside the grandfathered baseline.')

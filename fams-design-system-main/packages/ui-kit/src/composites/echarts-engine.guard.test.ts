import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * PD-363 regression guard.
 *
 * `ChartContainer.tsx` used to `import * as echarts from 'echarts'` at
 * module scope, with a side effect (`echarts.registerTheme(...)`) sitting at
 * module top level. Because `packages/ui-kit/tsup.config.ts` builds a single
 * physical `dist/index.js` and `echarts` doesn't declare `sideEffects: false`,
 * that one static import made the entire chart engine (echarts + zrender,
 * ~3.8 MB unminified) unavoidable for ANY consumer bundling ANY export of
 * `@fams/ui-kit` — even one that never renders a chart.
 *
 * The fix moved the engine behind `echarts-engine.ts`'s dynamic
 * `import('echarts')`. This test statically scans every source file in
 * `src/` and fails if a module-scope VALUE import of `echarts` (or an
 * `echarts/*` subpath) shows up anywhere outside that one file — the only
 * place allowed to own the engine. `import type { ... } from 'echarts'` is
 * erased at compile time and ships nothing to a bundle, so it's exempt.
 */

const SRC_ROOT = join(__dirname, '..')
const ALLOWED_FILE = join(__dirname, 'echarts-engine.ts')

// A static `import` declaration naming `echarts` or an `echarts/...`
// subpath as its source, capturing whether it's a `import type` (group 1) —
// the codebase's own import style keeps every import statement on one line,
// so this intentionally does not span newlines (avoids a lazy multi-line
// regex bleeding across unrelated, later import statements).
const IMPORT_RE = /^import\s+(type\s+)?.*from\s+['"]echarts(?:\/[^'"]*)?['"]/gm

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      collectSourceFiles(full, acc)
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(full)
    }
  }
  return acc
}

describe('echarts engine guard (PD-363)', () => {
  it('has no module-scope VALUE import of echarts outside composites/echarts-engine.ts', () => {
    const offenders: string[] = []

    for (const file of collectSourceFiles(SRC_ROOT)) {
      if (file === ALLOWED_FILE) continue
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(IMPORT_RE)) {
        const isTypeOnly = Boolean(match[1])
        if (!isTypeOnly) {
          offenders.push(`${relative(SRC_ROOT, file)}: ${match[0]}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })
})

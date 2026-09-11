import chartTheme from '@fams/tokens/theme.echarts.json'

/**
 * echarts-engine — the ONLY place that ever pulls the ECharts engine
 * (echarts + zrender, ~3.8 MB unminified) into memory. [L3 composite support]
 *
 * PD-363: `ChartContainer` used to `import * as echarts from 'echarts'` at
 * module scope. `packages/ui-kit/tsup.config.ts` builds a single physical
 * `dist/index.js` (`splitting: false`), and echarts is intentionally left
 * `external` there (not bundled by tsup — it's the *consumer's* bundler that
 * resolves it). Because that static import sat at module top level with a
 * real side effect (`echarts.registerTheme(...)`), a consumer's bundler
 * (Vite/Rollup/webpack) could never tree-shake it away — echarts doesn't
 * declare `sideEffects: false` — so importing ANY single export from
 * `@fams/ui-kit` (say, just `Button`) pulled the entire chart engine into
 * that consumer's bundle.
 *
 * The fix: turn the value import into a `dynamic import()`, memoized here so
 * every caller (`ChartContainer`, tests, a manual warm-up) shares the same
 * load and the same registered theme instance. A consumer's bundler now sees
 * a genuine async split point and emits the engine as its own lazy chunk,
 * fetched only when a chart actually mounts.
 *
 * `import type` elsewhere in the codebase (`ECharts`, `EChartsOption`, …) is
 * unaffected — type-only imports are erased at compile time and never
 * reach a bundle regardless of this module's existence.
 */

/** The `echarts` module namespace, exactly as `import * as echarts from 'echarts'` would type it — but never imported as a value outside this file. */
export type EchartsModule = typeof import('echarts')

/** Name every `ChartContainer` composite must pass to `echarts.init` to pick up the `@fams/tokens` theme registered below. */
export const THEME_NAME = 'fams'

// Module-scope cache: the resolved module (sync fast-path) and the
// in-flight promise (so concurrent callers before resolution share one
// load instead of racing separate `import()` calls).
let cachedModule: EchartsModule | null = null
let loadPromise: Promise<EchartsModule> | null = null

/**
 * Synchronous accessor for the already-resolved engine, or `null` if it
 * hasn't loaded yet. `ChartContainer` uses this to decide whether it can
 * `init` synchronously (warm cache — the common case once any chart has
 * mounted, and always true in tests after `preloadEcharts()`) or must first
 * `await loadEcharts()`.
 */
export function getLoadedEcharts(): EchartsModule | null {
  return cachedModule
}

/**
 * Loads the ECharts engine, memoized — calling this any number of times,
 * concurrently or not, only ever starts one `import('echarts')`. Registers
 * the `@fams/tokens` theme under `THEME_NAME` exactly once, immediately
 * after the module resolves and before the returned promise settles for any
 * caller — so nothing can ever call `echarts.init(host, THEME_NAME, …)`
 * before that theme exists.
 */
export function loadEcharts(): Promise<EchartsModule> {
  if (!loadPromise) {
    loadPromise = import('echarts').then((mod) => {
      mod.registerTheme(THEME_NAME, chartTheme)
      cachedModule = mod
      return mod
    })
  }
  return loadPromise
}

/**
 * Public warm-up hook: fire the load without needing a real chart to mount.
 * Used by the ui-kit test suite (`vitest.setup.echarts.ts`) to pre-resolve
 * the engine once before any test runs, so every existing synchronous chart
 * assertion (`onChartReady` invoked before `render()` returns, etc.) keeps
 * working unmodified against the warm-cache path in `ChartContainer`.
 */
export function preloadEcharts(): Promise<void> {
  return loadEcharts().then(() => undefined)
}

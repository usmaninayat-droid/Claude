import { preloadEcharts } from './src/composites/echarts-engine'

// PD-363: ChartContainer.tsx no longer imports `echarts` as a module-scope
// value — it's loaded on demand via `echarts-engine.ts`'s memoized
// `loadEcharts()`, so a consumer bundling unrelated `@fams/ui-kit` exports
// never pays for the chart engine. Every existing chart test, however, was
// written against the old always-synchronous `echarts.init` call inside
// ChartContainer's mount effect — hundreds of assertions read
// `onChartReady.mock.calls[0][0]` (or similar) immediately after `render()`
// returns, with no `await`/`waitFor` in between.
//
// Warming the engine here, once, before any test file runs, keeps that
// contract intact: by the time a single test executes, `getLoadedEcharts()`
// is already non-null, so ChartContainer's mount effect takes its
// synchronous fast path — same call order, same timing, as before this fix.
// The cold (first-ever-load) path is exercised separately, deliberately,
// in `echarts-engine.cold.test.tsx`.
await preloadEcharts()

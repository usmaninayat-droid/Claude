import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react'
import type { ECharts, EChartsOption } from 'echarts'
import { cn } from '../lib/cn'
import { Skeleton } from './Skeleton'
import type { ChartDataTableSpec } from './chart-data-table'
import { getLoadedEcharts, loadEcharts, THEME_NAME, type EchartsModule } from './echarts-engine'

export type { ChartDataTableSpec } from './chart-data-table'

/**
 * ChartContainer — the one place in the design system that imports ECharts. [L3 composite]
 *
 * The engine itself (echarts + zrender) is loaded lazily via `./echarts-engine`
 * (PD-363) — a dynamic `import('echarts')`, not a module-scope value import —
 * so a consumer bundling any *other* `@fams/ui-kit` export never pays for the
 * chart engine. If the engine is already warm (`getLoadedEcharts()`), `init`
 * happens synchronously in the same effect, same call order, as before;
 * otherwise the effect awaits `loadEcharts()` first. See `echarts-engine.ts`
 * for the memoization/theme-registration contract.
 *
 * Owns the engine lifecycle only: `echarts.init`/`dispose`, ResizeObserver-driven
 * `resize()`, the `@fams/tokens` ECharts theme, `prefers-reduced-motion`, and
 * ambient RTL. Every bar/line/pie/heatmap composite built afterwards renders
 * through this — it never touches `echarts` directly. No series/axis semantics
 * live here: `option` is forwarded verbatim (plus the two integration-safety
 * merges documented below), so this component carries zero business vocabulary
 * and zero knowledge of what a "fleet" or a "bin" is.
 *
 * **Integration-safety merges (not business logic):**
 * - `tooltip.appendToBody`/`tooltip.confine` default to `true` *only when the
 *   caller already configured a `tooltip`* — `ChartCard`'s body wrapper is
 *   `overflow-hidden`, and ECharts' default floating tooltip is otherwise
 *   clipped at that edge. A caller-supplied `tooltip.appendToBody` always wins.
 * - `animation` is forced off when `prefers-reduced-motion: reduce` is active
 *   — a single top-level flag ECharts documents as globally safe to toggle,
 *   independent of series shape.
 *
 * **RTL:** there is no explicit `direction` prop to pass — the resolved
 * direction is read from the nearest ancestor `[dir]` attribute (falling back
 * to `<html dir>`) and applied to this component's own wrapper, so any DOM
 * chrome it owns (the loading overlay) is never mis-aligned. ECharts itself
 * has no native RTL layout: mirroring axis/legend/grid *positions* inside
 * `option` is the caller's job, using the same ambient `dir` its feature code
 * already reads — ChartContainer cannot do that safely without knowing the
 * chart's semantic layout. An explicit `dir` prop is still accepted and wins
 * over the ambient value, for the rare case a chart must stay LTR inside an
 * RTL page (e.g. a numeric-only sparkline).
 *
 * **Relief channel:** an ECharts canvas encodes everything in position and
 * colour, both of which are unavailable to a screen-reader user and unreliable
 * for a colour-vision-deficient one. `dataTable` renders a visually-hidden but
 * keyboard-reachable `<table>` twin of the chart's values, referenced from the
 * plot element via `aria-describedby`. The plot element — not the outer
 * wrapper — is the `role="img"`, because ARIA treats an image's subtree as
 * presentational: a table nested inside the `role="img"` would be invisible to
 * assistive tech, so the two are siblings.
 *
 * **State-agnostic (rule 8):** `loading` only toggles the visual overlay — it
 * never mutates `option`, fetches, or tracks its own async state.
 */
export interface ChartContainerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'aria-label'> {
  /** Full ECharts option object. Chart-agnostic — this component never reads into series/axis semantics. */
  option: EChartsOption
  /** Shows a token-styled `Skeleton` above the chart canvas, which stays mounted (dimmed) underneath so the instance and its size are preserved. Default `false`. */
  loading?: boolean
  /** Fixed container height — number is px, any string is used verbatim as a CSS length. Default `320`. */
  height?: number | string
  /** Required accessible description of what the chart shows. Applied as `aria-label` on the `role="img"` wrapper — the canvas/SVG ECharts renders has no text semantics of its own. */
  'aria-label': string
  /** `'canvas'` (default — fastest for dense series) or `'svg'` (crisper at low density, exportable; also the renderer to use under jsdom/automated tests, which have no real canvas 2D context). */
  renderer?: 'canvas' | 'svg'
  /** Escape hatch invoked once right after `echarts.init`, before the first `setOption`. Chart-specific composites use it to wire `chart.on(...)` handlers (click, legendselectchanged, datazoom, …) — ChartContainer itself never touches events. */
  onChartReady?: (chart: ECharts) => void
  /** Visually-hidden, keyboard-reachable `<table>` twin of the chart's values, linked to the plot via `aria-describedby`. The chart composites build this from their own data — callers rarely pass it directly. */
  dataTable?: ChartDataTableSpec
  /**
   * Puts the container in its EMPTY state: the ECharts option is replaced with
   * a blank one, so no placeholder geometry (a grey disc, a bare axis frame)
   * is painted, and `emptyText` is rendered centred over the plot box instead.
   * The card chrome around it is untouched — this is a chart state, not a
   * card state.
   */
  isEmpty?: boolean
  /** Message shown when `isEmpty`. Defaults to `'No data'`. */
  emptyText?: ReactNode
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false
}

/**
 * Nearest ancestor `[dir]` value, falling back to `<html dir>`, defaulting to
 * `'ltr'`. Starts the search at the parent — never the wrapper itself, which
 * always carries its own resolved `dir` attribute and would otherwise match
 * before any real ancestor is consulted.
 */
function resolveDirection(el: HTMLElement | null): 'ltr' | 'rtl' {
  if (typeof document === 'undefined') return 'ltr'
  const value = el?.parentElement?.closest('[dir]')?.getAttribute('dir') ?? document.documentElement.getAttribute('dir')
  return value === 'rtl' ? 'rtl' : 'ltr'
}

function withTooltipDefaults(tooltip: EChartsOption['tooltip']): EChartsOption['tooltip'] {
  if (tooltip == null || Array.isArray(tooltip)) return tooltip
  return { appendToBody: true, confine: true, ...tooltip }
}

function buildEffectiveOption(option: EChartsOption): EChartsOption {
  return {
    ...option,
    tooltip: withTooltipDefaults(option.tooltip),
    ...(prefersReducedMotion() ? { animation: false } : null),
  }
}

/** Blank option applied while `isEmpty` — nothing is painted at all. */
const EMPTY_OPTION: EChartsOption = { series: [] }

export function ChartContainer({
  option: rawOption,
  loading = false,
  height = 320,
  className,
  style,
  dir,
  renderer = 'canvas',
  onChartReady,
  dataTable,
  isEmpty = false,
  emptyText = 'No data',
  'aria-label': ariaLabel,
  ...rest
}: ChartContainerProps) {
  const option = useMemo(() => (isEmpty ? EMPTY_OPTION : rawOption), [isEmpty, rawOption])
  const tableId = `${useId()}-chart-data-table`
  const wrapperRef = useRef<HTMLDivElement>(null)
  const hostRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ECharts | null>(null)
  const optionRef = useRef(option)
  optionRef.current = option
  const onChartReadyRef = useRef(onChartReady)
  onChartReadyRef.current = onChartReady

  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr')

  useLayoutEffect(() => {
    setDirection(resolveDirection(wrapperRef.current))
  }, [])

  // Init + resize + dispose. Re-runs only if `renderer` changes — a live
  // ECharts instance can't swap renderers, so a renderer change is a
  // deliberate remount, not a data-driven re-render.
  //
  // PD-363: the engine (`echarts-engine.ts`) may or may not be loaded yet.
  // - Warm cache (`getLoadedEcharts()` non-null — the common case once any
  //   chart anywhere has mounted, and always true in tests after
  //   `preloadEcharts()`): `init` happens synchronously, right here, in the
  //   exact same order as before this fix — this is what keeps every
  //   existing synchronous `onChartReady`-after-`render()` assertion green.
  // - Cold cache: await `loadEcharts()` first. `cancelled` (closed over by
  //   both the `.then` callback and the cleanup below) guards every path
  //   that can race the load: unmount before resolve, React StrictMode's
  //   deliberate double-invoke (setup → cleanup → setup — each run gets its
  //   own `cancelled` flag, so a late resolution from the first run can
  //   never init/leak once its own cleanup already fired), and a `renderer`
  //   change firing a fresh effect run before the previous one's load
  //   settled. In every one of those cases `start()` simply never runs, so
  //   there is no `init` on a torn-down host, no double `init`, and nothing
  //   to `dispose` that was never created.
  useEffect(() => {
    const hostEl = hostRef.current
    if (!hostEl) return
    // Re-typed as a plain non-nullable binding (rather than relying on the
    // narrowing above) — narrowing from a runtime check does not persist
    // into the nested `start` closure below, so without this, TypeScript
    // re-widens every closed-over reference back to `HTMLDivElement | null`.
    const host: HTMLDivElement = hostEl

    let cancelled = false
    let chart: ECharts | null = null
    let observer: ResizeObserver | null = null
    let frame = 0

    function start(engine: EchartsModule) {
      if (cancelled) return
      chart = engine.init(host, THEME_NAME, { renderer })
      chartRef.current = chart
      chart.setOption(buildEffectiveOption(optionRef.current), { notMerge: true })
      onChartReadyRef.current?.(chart)

      observer = new ResizeObserver(() => {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(() => chart?.resize())
      })
      observer.observe(host)
    }

    const loaded = getLoadedEcharts()
    if (loaded) {
      start(loaded)
    } else {
      loadEcharts().then((engine) => {
        if (!cancelled) start(engine)
      })
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      observer?.disconnect()
      chart?.dispose()
      chartRef.current = null
    }
  }, [renderer])

  // Declarative option application: every `option` change fully replaces the
  // prior configuration (`notMerge: true`) — mirrors React's own re-render
  // semantics, no implicit partial merge for callers to reason about.
  useEffect(() => {
    chartRef.current?.setOption(buildEffectiveOption(option), { notMerge: true })
  }, [option])

  // Live-toggle animation if the OS-level reduced-motion setting flips mid-session.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => chartRef.current?.setOption(buildEffectiveOption(optionRef.current), { notMerge: true })
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  const resolvedHeight: CSSProperties['height'] = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      ref={wrapperRef}
      aria-busy={loading}
      dir={dir ?? direction}
      data-slot="chart-container"
      className={cn('relative w-full', className)}
      style={{ height: resolvedHeight, ...style }}
      {...rest}
    >
      <div
        ref={hostRef}
        role="img"
        aria-label={ariaLabel}
        aria-describedby={dataTable ? tableId : undefined}
        data-slot="chart-container-canvas"
        className={cn('size-full', loading && 'opacity-40')}
      />
      {/*
        Clip wrapper (fix5) — a `<table>` IGNORES `sr-only`'s `width: 1px`:
        auto table layout treats a specified width as a minimum, so the twin
        lays out at its full min-content width (>1000px for a busy map/chart)
        and, being `position: absolute`, it escapes any ancestor that is not
        itself a containing block. That leaked into the PAGE's scrollable
        overflow and made the whole document scroll sideways.

        This wrapper is `sr-only` too, so it is `position: absolute` (⇒ the
        containing block for the absolutely-positioned table) AND
        `overflow: hidden` (⇒ it clips it). The table therefore contributes
        exactly the wrapper's 1×1px to page overflow, while staying in the
        accessibility tree, keyboard reachable and fully populated.
      */}
      {dataTable ? (
        <div data-slot="chart-container-data-table-clip" className="sr-only overflow-hidden">
          <ChartDataTable id={tableId} spec={dataTable} />
        </div>
      ) : null}
      {isEmpty ? (
        <div
          data-slot="chart-container-empty"
          className="absolute inset-0 flex items-center justify-center px-4 text-center text-body-sm text-muted-foreground"
        >
          {emptyText}
        </div>
      ) : null}
      {loading ? (
        <div data-slot="chart-container-loading" className="absolute inset-0 flex items-center justify-center">
          <Skeleton variant="rect" className="size-full" />
        </div>
      ) : null}
    </div>
  )
}

ChartContainer.displayName = 'ChartContainer'

/**
 * The relief channel itself — `sr-only` so it never competes with the plot
 * visually, `tabIndex={0}` so a keyboard user can still reach and read it, and
 * a real `<caption>`/`<th scope>` structure so the values are navigable as a
 * table rather than as an undifferentiated run of text.
 */
function ChartDataTable({ id, spec }: { id: string; spec: ChartDataTableSpec }) {
  return (
    <table
      id={id}
      data-slot="chart-container-data-table"
      // Deliberate: a `sr-only` element is reachable by a screen-reader's
      // virtual cursor but NOT by Tab, and the whole point of this twin is
      // that a keyboard user can get to the numbers the canvas hides. The
      // rule models "non-interactive elements shouldn't be focusable" and
      // cannot express that exception; no role fits (`region`/`tabpanel`
      // would both lie about what this is).
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      className="sr-only"
    >
      <caption>{spec.caption}</caption>
      <thead>
        <tr>
          {spec.columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {spec.rows.map((row, rowIndex) => (
          <tr key={`${String(row[0])}-${rowIndex}`}>
            {row.map((cell, cellIndex) =>
              cellIndex === 0 ? (
                <th key={cellIndex} scope="row">
                  {cell}
                </th>
              ) : (
                <td key={cellIndex}>{cell}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

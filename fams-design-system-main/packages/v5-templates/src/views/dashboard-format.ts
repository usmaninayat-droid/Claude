/**
 * dashboard-format — the `kpiStrip[].format` presentation hint, made real.
 *
 * `format` has been in `DashboardModuleConfig.schema.json` since the schema
 * was written, but nothing read it: a tile authored as `3234` rendered
 * `3234` where the design shows `3,234`. This is the one place that hint is
 * interpreted, so every KPI in every dashboard separates thousands the same
 * way — and does it in the DOCUMENT'S locale (`<html lang>`), because
 * `1,234.5` and `1.234,5` are the same number written for different readers.
 *
 * Rule 8 still holds: this formats a number the blueprint already stated. It
 * never derives, aggregates, or rounds business meaning — a value that is
 * already a display string (`"7:45 hrs"`) passes through untouched.
 */

/** Fixed decimals when `'decimal'` is used without an explicit count. */
const DEFAULT_DECIMALS = 1
/** Decimals a `'percent'` reading keeps. */
const PERCENT_DECIMALS = 1

/** The reader's locale — `<html lang>`, else the runtime default. */
function documentLocale(): string | undefined {
  if (typeof document === 'undefined') return undefined
  return document.documentElement.lang || undefined
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed === '') return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function format(value: number, options: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(documentLocale(), options).format(value)
}

/**
 * Applies a `format` hint to a KPI value.
 *
 * Recognised hints — anything else returns the value verbatim, so an unknown
 * hint degrades to today's behaviour rather than mangling the reading:
 * - `'integer'`         → thousands separators, no decimals (`3,234`)
 * - `'decimal'`         → one fixed decimal (`6.2`)
 * - `'decimal:<n>'`     → `n` fixed decimals (`'decimal:2'` → `1.24`)
 * - `'percent'`         → up to one decimal plus `%` (`81%`)
 * - `'currency-<ISO>'`  → the locale's currency form (`'currency-AED'`)
 */
export function formatKpiValue(value: unknown, hint: string | undefined): string {
  if (value === undefined || value === null || value === '') return '—'
  if (!hint) return String(value)
  const numeric = toNumber(value)
  if (numeric === undefined) return String(value)

  if (hint === 'integer') return format(numeric, { maximumFractionDigits: 0 })
  if (hint === 'percent') {
    return `${format(numeric, { maximumFractionDigits: PERCENT_DECIMALS })}%`
  }
  if (hint === 'decimal' || hint.startsWith('decimal:')) {
    const requested = Number(hint.slice('decimal:'.length))
    const decimals = hint === 'decimal' || !Number.isFinite(requested) ? DEFAULT_DECIMALS : Math.max(0, Math.min(6, requested))
    return format(numeric, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  }
  if (hint.startsWith('currency-')) {
    const currency = hint.slice('currency-'.length).toUpperCase()
    if (!/^[A-Z]{3}$/.test(currency)) return String(value)
    return format(numeric, { style: 'currency', currency, maximumFractionDigits: 0 })
  }
  return String(value)
}

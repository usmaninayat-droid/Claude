export interface WallStatBarProps {
  label: string
  value: number
  /** Denominator the filled width is a proportion of. A `max` of 0 renders an
   *  empty track rather than dividing by zero. */
  max: number
  /** Fill colour. A raw CSS colour by design — the caller owns the semantic
   *  meaning (severity, stage, status), which no single token can carry. */
  color: string
}

/**
 * WallStatBar — one labelled proportion row inside a `WallPanel`.
 *
 * The dark sibling of `StatBar`: same anatomy, but it paints on the
 * always-dark `--color-wall-*` scope, so it cannot simply be `StatBar` with a
 * different className.
 */
export function WallStatBar({ label, value, max, color }: WallStatBarProps) {
  return (
    <div data-slot="wall-stat-bar" className="flex items-center gap-2 text-wall-stat text-wall-ink-dim">
      <span className="w-28 truncate text-wall-ink">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-wall-track">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color }}
        />
      </div>
      <span className="w-6 text-right tabular-nums">{value}</span>
    </div>
  )
}

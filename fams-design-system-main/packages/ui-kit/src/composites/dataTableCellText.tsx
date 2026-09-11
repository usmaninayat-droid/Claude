import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { cn } from '../lib/cn'
import { Tooltip, TooltipTrigger, TooltipContent } from '../primitives/Tooltip'
import type { DataTableColumnContentType } from './DataTable.types'

/**
 * dataTableCellText — `DataTable`'s default-cell text treatments for
 * `DataTableColumn.contentType`. [internal to DataTable — not part of the
 * public component surface, same convention as `DataTableGroupHeaderRow`]
 *
 * Implements the stakeholder-agreed responsive/overflow rules verbatim —
 * see `DataTableColumnContentType`'s doc comment in `DataTable.types.ts` for
 * the rule text. This file is only the RENDERING of those rules; `DataTable`
 * itself decides when to reach for it (default cell, `render` omitted) and
 * applies the matching column-width class.
 */

/**
 * Reused 2D canvas context for text-width measurement — same caching pattern
 * as `chart-axis.ts`'s `labelTextWidth` (that module is chart-internal, so
 * this is a small self-contained sibling rather than a composite-to-composite
 * import).
 */
let measureContext: CanvasRenderingContext2D | null | undefined

function textWidth(text: string, font: string): number {
  if (measureContext === undefined) {
    measureContext =
      typeof document === 'undefined' ? null : (document.createElement('canvas').getContext('2d') ?? null)
  }
  if (measureContext) {
    measureContext.font = font
    const measured = measureContext.measureText(text).width
    if (measured > 0) return measured
  }
  // jsdom / SSR: no text metrics. A per-character estimate is enough to
  // decide the fits/overflows branch; never reached in a real browser.
  return text.length * 7
}

const ELLIPSIS = '…'

/**
 * Keeps the START and END of `text`, dropping the middle, so it fits
 * `maxWidth` px at `font` — the "unique tail stays visible" rule, as opposed
 * to a trailing ellipsis that can hide exactly the part that disambiguates
 * two similar values.
 */
export function middleTruncate(text: string, maxWidth: number, font: string): string {
  if (maxWidth <= 0 || textWidth(text, font) <= maxWidth) return text
  let lo = 0
  let hi = Math.floor(text.length / 2)
  let best = 0
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2)
    const candidate = mid > 0 ? `${text.slice(0, mid)}${ELLIPSIS}${text.slice(text.length - mid)}` : ELLIPSIS
    if (textWidth(candidate, font) <= maxWidth) {
      best = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return best > 0 ? `${text.slice(0, best)}${ELLIPSIS}${text.slice(text.length - best)}` : ELLIPSIS
}

const BODY_FONT = '400 14px Gilroy, sans-serif'

function useElementWidth<T extends HTMLElement>(): [RefObject<T | null>, number] {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof ResizeObserver === 'undefined') {
      setWidth(el.clientWidth)
      return
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) setWidth(entry.contentRect.width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width]
}

/** `contentType="fixed-id"` / `"fixed-content"` — never truncated, natural width, single line. */
export function FixedIdentifierText({ value }: { value: ReactNode }) {
  return <span className="whitespace-nowrap text-sm text-foreground">{value}</span>
}

/**
 * `contentType="variable-id"` — wraps up to 2 lines by default; falls back
 * to a single MIDDLE-truncated line only when the full value is too long
 * even for 2 wrapped lines (checked via a rough "does it fit ~2 line-widths"
 * measurement — an approximation of real word-wrap layout, good enough to
 * gate the fallback without a full layout engine).
 */
export function VariableIdentifierText({ value }: { value: string }) {
  const [ref, width] = useElementWidth<HTMLSpanElement>()
  const fitsTwoLines = width === 0 || textWidth(value, BODY_FONT) <= width * 2
  if (fitsTwoLines) {
    return (
      <span
        ref={ref}
        title={value}
        className="line-clamp-2 block whitespace-normal break-words text-sm text-foreground"
      >
        {value}
      </span>
    )
  }
  return (
    <span ref={ref} title={value} className="block truncate whitespace-nowrap text-sm text-foreground">
      {middleTruncate(value, width, BODY_FONT)}
    </span>
  )
}

/**
 * `contentType="descriptive"` — single-line end-truncation, always paired
 * with one-gesture full-value access: a tooltip that opens on hover
 * (desktop, via the underlying Radix trigger) AND on tap (touch — `onClick`
 * toggles the SAME controlled tooltip, since a touch browser dispatches
 * click but not a hover event). This applies on web too, not only touch —
 * the control is a plain button either way.
 */
export function DescriptiveText({ value }: { value: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'block max-w-full truncate whitespace-nowrap text-start text-sm text-foreground outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          {value}
        </button>
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  )
}

/**
 * `DataTable`'s default (no `column.render`) cell body — em-dash for empty
 * values (unchanged), otherwise dispatched by `contentType`. Omitting
 * `contentType` renders the original plain string, byte-identical to before.
 */
export function renderDefaultCell(value: unknown, contentType?: DataTableColumnContentType): ReactNode {
  if (value == null || value === '') return <span className="text-muted-foreground">—</span>
  const text = String(value)
  switch (contentType) {
    case 'fixed-id':
    case 'fixed-content':
      return <FixedIdentifierText value={text} />
    case 'variable-id':
      return <VariableIdentifierText value={text} />
    case 'descriptive':
      return <DescriptiveText value={text} />
    default:
      return text
  }
}

/**
 * Column-width/whitespace class per `contentType`, applied to the `<td>`
 * regardless of a custom `render` (layout is a column-level decision, text
 * treatment is a content-level one — see `DataTableColumn.contentType`'s doc
 * comment). `max-w-64` is a Tailwind spacing-scale utility (token-backed),
 * not a hardcoded pixel value; a caller's own `width`/`minWidth` composes
 * fine alongside it since those style the `<th>`, not this `<td>` class.
 */
export const CONTENT_TYPE_TD_CLASS: Partial<Record<DataTableColumnContentType, string>> = {
  'fixed-id': 'whitespace-nowrap',
  'fixed-content': 'whitespace-nowrap',
  'variable-id': 'max-w-64',
  descriptive: 'max-w-64',
}

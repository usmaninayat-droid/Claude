import { forwardRef, useEffect, useMemo, useRef, useState } from 'react'
import {
  Input, TooltipProvider, Tooltip, TooltipTrigger, TooltipContent, cn,
} from '@fams/design-system'
import {
  Search, Tag, FileDown, X, ChevronRight, ChevronsRight,
} from 'lucide-react'
import { ZoneTable } from './ZoneTable'
import { ZonesMap } from './ZonesMap'
import { ZONES, flattenZones, type Zone } from './zonesData'

export type ZonesView = 'hybrid' | 'list' | 'map'

/** Default list/map split, as a % of the content column — matches the Figma. */
const DEFAULT_SPLIT = 40
const MIN_SPLIT = 26
const MAX_SPLIT = 70

/**
 * Zones Management — Figma "Zones" `10:31063`.
 *
 * A hybrid list + map surface supporting parent/child tree hierarchy, map popup cards,
 * 2-option action menus (Edit zone, Delete zone), and horizontal table scrolling.
 */
export function ZonesPage({
  view,
}: {
  view: ZonesView
  /** Kept in the prop contract for App.tsx's caller shape, even though every
      in-page control that used to call it (Close/Expand map) is now inert. */
  onViewChange?: (view: ZonesView) => void
}) {
  const [zones] = useState<Zone[]>(ZONES)
  const [query, setQuery] = useState('')
  const [hidden, setHidden] = useState<Set<string>>(() => new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [split, setSplit] = useState(DEFAULT_SPLIT)

  const splitRef = useRef<HTMLDivElement>(null)

  /* All flat zones for map lookups */
  const allFlatZones = useMemo(() => flattenZones(zones), [zones])

  /* ---------- search filter (tree-preserving), ordered by zone code ---------- */
  const listed = useMemo(() => {
    const q = query.trim().toLowerCase()
    function filterTree(list: Zone[]): Zone[] {
      const result: Zone[] = []
      for (const z of list) {
        const matchesSelf =
          !q ||
          z.id.toLowerCase().includes(q) ||
          z.name.toLowerCase().includes(q) ||
          z.location.toLowerCase().includes(q) ||
          z.description.toLowerCase().includes(q) ||
          z.tags.some((t) => t.toLowerCase().includes(q))

        const matchingChildren = z.children ? filterTree(z.children) : []
        if (matchesSelf || matchingChildren.length > 0) {
          result.push({
            ...z,
            children: matchingChildren.length > 0 ? matchingChildren : z.children,
          })
        }
      }
      return result
    }

    return [...filterTree(zones)].sort((a, b) => a.id.localeCompare(b.id))
  }, [zones, query])

  /** What the map paints: all flat zones except eye-hidden ones. */
  const mapped = useMemo(() => allFlatZones.filter((z) => !hidden.has(z.id)), [allFlatZones, hidden])

  /* A zone filtered out of the list must not stay selected on the map. */
  useEffect(() => {
    if (selectedId && !allFlatZones.some((z) => z.id === selectedId)) setSelectedId(null)
  }, [allFlatZones, selectedId])

  /* ---------- mutations ---------- */
  const toggleIn = (set: Set<string>, id: string) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  }

  /**
   * A zone owns its whole subtree on the map — hiding a parent must take its
   * children with it, otherwise the nested polygons stay painted inside a
   * boundary that is no longer there.
   */
  const subtreeIds = (id: string): string[] => {
    const zone = allFlatZones.find((z) => z.id === id)
    return zone ? flattenZones([zone]).map((z) => z.id) : [id]
  }

  const toggleVisible = (id: string) =>
    setHidden((h) => {
      const next = new Set(h)
      const show = h.has(id)
      subtreeIds(id).forEach((i) => (show ? next.delete(i) : next.add(i)))
      return next
    })
  const toggleAllVisible = () =>
    setHidden((h) => {
      const allVisible = allFlatZones.every((z) => !h.has(z.id))
      const next = new Set(h)
      allFlatZones.forEach((z) => (allVisible ? next.add(z.id) : next.delete(z.id)))
      return next
    })

  /* ---------- splitter drag ---------- */
  const onSplitDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    const rect = splitRef.current?.getBoundingClientRect()
    if (!rect) return
    const move = (ev: MouseEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setSplit(Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, pct)))
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  const showList = view !== 'map'
  const showMap = view !== 'list'

  return (
    <TooltipProvider delayDuration={200}>
      <div ref={splitRef} className="flex min-h-0 flex-1 overflow-hidden bg-background">
        {/* ── List half ─────────────────────────────────────────────────── */}
        {showList ? (
          <div
            className="flex min-h-0 min-w-0 flex-col gap-4 py-6 pl-6 pr-6"
            style={showMap ? { width: `${split}%`, paddingRight: 12 } : undefined}
          >
            {/* Toolbar — search, plus Tag / Export affordances (presentational
                for now; view switching lives in the module top-bar tabs). */}
            <div className="flex shrink-0 items-center gap-3.5">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search zones"
                  aria-label="Search zones"
                  className="h-12 rounded-[6px] pl-12 text-sm"
                />
                {query ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setQuery('')}
                    className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>

              <ToolbarButton label="Filter by tag">
                <Tag className="size-5" />
              </ToolbarButton>
              <ToolbarButton label="Export">
                <FileDown className="size-5" />
              </ToolbarButton>
            </div>

            <div className="flex shrink-0 items-center">
              <span className="text-sm text-muted-foreground">
                Showing {allFlatZones.length} item{allFlatZones.length === 1 ? '' : 's'}
                {hidden.size ? ` · ${hidden.size} hidden on map` : ''}
              </span>
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col">
              <ZoneTable
                zones={listed}
                hidden={hidden}
                selectedId={selectedId}
                hoverId={hoverId}
                expanded={expanded}
                onToggleVisible={toggleVisible}
                onToggleAllVisible={toggleAllVisible}
                onToggleExpanded={(id) => setExpanded((e) => toggleIn(e, id))}
                onSelect={setSelectedId}
                onHover={setHoverId}
              />
            </div>
          </div>
        ) : null}

        {/* ── Map half ──────────────────────────────────────────────────── */}
        {showMap ? (
          <div className="relative min-w-0 flex-1">
            <ZonesMap
              zones={mapped}
              selectedId={selectedId}
              hoverId={hoverId}
              onSelect={setSelectedId}
              onHover={setHoverId}
              className={cn('h-full w-full', showList && 'rounded-l-[6px] border-l border-border')}
            />

            {/* Splitter control — Close/Expand map are presentational only
                (same List/Map views the top-bar tabs no longer switch to);
                drag-to-resize stays functional since it doesn't change view. */}
            {showList ? (
              <div className="absolute left-0 top-1/2 z-[820] flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[6px] border border-border bg-card shadow-md">
                <SplitButton label="Close map">
                  <X className="size-4" />
                </SplitButton>
                <SplitButton
                  label="Drag to resize"
                  onMouseDown={onSplitDrag}
                  onDoubleClick={() => setSplit(DEFAULT_SPLIT)}
                  className="cursor-col-resize"
                >
                  <ChevronRight className="size-4" />
                </SplitButton>
                <SplitButton label="Expand map" last>
                  <ChevronsRight className="size-4" />
                </SplitButton>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </TooltipProvider>
  )
}

/**
 * 48×48 bordered square in the list toolbar.
 */
const ToolbarButton = forwardRef<
  HTMLButtonElement,
  {
    label: string
    children: React.ReactNode
    active?: boolean
    badge?: number
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function ToolbarButton({ label, children, active, badge, ...rest }, ref) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={ref}
          type="button"
          aria-label={label}
          aria-pressed={active}
          className={cn(
            'relative flex size-12 shrink-0 items-center justify-center rounded-[6px] border transition-colors',
            active
              ? 'border-[color:var(--primary)]/30 bg-[color:var(--primary)]/12 text-primary'
              : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          {...rest}
        >
          {children}
          {badge ? (
            <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {badge}
            </span>
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
})

function SplitButton({
  label, children, last, className, ...rest
}: {
  label: string
  children: React.ReactNode
  last?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'flex size-8 items-center justify-center text-foreground transition-colors hover:bg-muted',
            !last && 'border-b border-border',
            className
          )}
          {...rest}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

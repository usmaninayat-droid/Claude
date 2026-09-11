import { useEffect, useRef, useState } from 'react'
import {
  Badge, cn,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  Tooltip, TooltipTrigger, TooltipContent,
} from '@fams/design-system'
import {
  Eye, EyeOff, ChevronRight, MoreVertical, Trash2, SquarePen,
} from 'lucide-react'
import { CustomScrollbar, type CustomScrollbarHandle } from '../../components/CustomScrollbar'
import { flattenZones, type Zone } from './zonesData'

export interface ZoneTableProps {
  zones: Zone[]
  hidden: Set<string>
  selectedId: string | null
  hoverId: string | null
  expanded: Set<string>
  onToggleVisible: (id: string) => void
  onToggleAllVisible: () => void
  onToggleExpanded: (id: string) => void
  onSelect: (id: string | null) => void
  onHover: (id: string | null) => void
}

/**
 * The hybrid view's list half — Figma "Zones" `10:31063`.
 *
 * Renders the zone tree (a parent expands to show its children as indented
 * sub-rows) with a leading visibility toggle and a per-row action menu.
 */
export function ZoneTable(props: ZoneTableProps) {
  const {
    zones, hidden, selectedId, hoverId, expanded,
    onToggleVisible, onToggleAllVisible, onToggleExpanded,
    onSelect, onHover,
  } = props

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})
  const viewportRef = useRef<CustomScrollbarHandle>(null)

  /* Map → list sync: bring the map's pick into view. */
  useEffect(() => {
    if (!selectedId) return
    rowRefs.current[selectedId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [selectedId])

  /**
   * The pinned action column's edge shade only means something while table
   * content is still hidden past the right edge. Once the table is scrolled
   * fully right the column sits at its natural end-of-row position with nothing
   * underneath it, so the shade fades out (as it does when there's no
   * horizontal overflow at all).
   */
  const [atRightEnd, setAtRightEnd] = useState(true)
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      // 1px of slack absorbs sub-pixel layout rounding at the scroll extreme.
      setAtRightEnd(max <= 1 || el.scrollLeft >= max - 1)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  /** Soft left-edge shade on the pinned column — see `atRightEnd` above. */
  const edgeShade = cn(
    'pointer-events-none absolute inset-y-0 left-0 w-4 -translate-x-full',
    'bg-gradient-to-l from-[rgba(16,24,40,0.06)] to-transparent',
    'transition-opacity duration-200',
    atRightEnd ? 'opacity-0' : 'opacity-100'
  )

  const flatVisibleZones = flattenZones(zones)
  const allVisible = flatVisibleZones.length > 0 && flatVisibleZones.every((z) => !hidden.has(z.id))

  // Flatten the visible tree (respecting expand state) so each row can see the
  // depth of the NEXT row — an expanded subtree then renders as one grouped
  // block with a divider only where the next top-level zone begins.
  const flatRows: { zone: Zone; depth: number }[] = []
  const walk = (list: Zone[], depth: number) => {
    for (const zone of list) {
      flatRows.push({ zone, depth })
      if (expanded.has(zone.id) && zone.children?.length) walk(zone.children, depth + 1)
    }
  }
  walk(zones, 0)

  const renderRow = ({ zone, depth }: { zone: Zone; depth: number }, i: number): React.ReactNode => {
    const isHidden = hidden.has(zone.id)
    const isSelected = zone.id === selectedId
    const isOpen = expanded.has(zone.id)
    const hasChildren = !!(zone.children && zone.children.length > 0)
    // Divide only when the next row starts a fresh top-level zone; rows inside
    // an expanded subtree stay seamless so the group reads as one unit.
    const next = flatRows[i + 1]
    const divider = !!next && next.depth === 0

    return (
          <tr
            key={zone.id}
            ref={(el) => { rowRefs.current[zone.id] = el }}
            onClick={() => onSelect(isSelected ? null : zone.id)}
            onMouseEnter={() => onHover(zone.id)}
            onMouseLeave={() => onHover(null)}
            className={cn(
              'h-16 cursor-pointer border-border transition-colors',
              divider && 'border-b',
              isSelected ? 'bg-muted/90 font-medium' : zone.id === hoverId ? 'bg-muted/60' : 'hover:bg-muted/40',
              isHidden && 'opacity-55'
            )}
          >
            {/* 1. Visibility toggle */}
            <td className="w-12 pl-4 pr-0" onClick={(e) => e.stopPropagation()}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onToggleVisible(zone.id)}
                    aria-pressed={!isHidden}
                    aria-label={isHidden ? `Show ${zone.name} on the map` : `Hide ${zone.name} on the map`}
                    className={cn(
                      'flex size-7 items-center justify-center rounded-[4px] transition-colors',
                      isHidden
                        ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    )}
                  >
                    {isHidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{isHidden ? 'Show on map' : 'Hide on map'}</TooltipContent>
              </Tooltip>
            </td>

            {/* 2. Spacer — keeps the eye → tree gap; the expand chevron lives
                inline in the Zone cell so the hierarchy reads as a tree. */}
            <td className="w-6 px-0" aria-hidden />

            {/* 3. Tree cell — indent + chevron + colour dot + code, cascading by
                depth. The chevron slot is reserved even for leaf zones so their
                dots line up under a sibling's chevron. */}
            <td className="w-[210px] px-3">
              <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 22}px` }}>
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onToggleExpanded(zone.id) }}
                    aria-expanded={isOpen}
                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${zone.name}`}
                    className="flex size-5 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <ChevronRight className={cn('size-4 transition-transform', isOpen && 'rotate-90')} />
                  </button>
                ) : (
                  <span aria-hidden className="size-5 shrink-0" />
                )}
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: zone.color }}
                />
                {/* Variable-length identifier (DS text-truncation guideline §2):
                    wrap to a max of 2 lines rather than single-line ellipsis, so
                    a long zone name still reads in full in the common case. */}
                <span className="line-clamp-2 min-w-0 break-words text-sm font-medium text-foreground">
                  {zone.id}
                </span>
              </div>
            </td>

            {/* 4. Tags */}
            <td className="w-[180px] overflow-hidden px-3">
              <div className="flex items-center gap-1.5">
                {zone.tags.slice(0, 2).map((t) => (
                  <Badge key={t} variant="success" className="rounded-[4px] font-medium">{t}</Badge>
                ))}
                {zone.tags.length > 2 ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="muted" className="rounded-[4px] font-medium">+{zone.tags.length - 2}</Badge>
                    </TooltipTrigger>
                    <TooltipContent>{zone.tags.slice(2).join(', ')}</TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
            </td>

            {/* 5. Location — descriptive text (DS text-truncation guideline §3/§6):
                end-truncation is allowed here, but only with a guaranteed
                one-gesture path to the full value — hover tooltip, and the same
                tooltip on keyboard focus (tabIndex makes the span focusable). */}
            <td className="w-[200px] px-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="block truncate rounded-[2px] text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {zone.location}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{zone.location}</TooltipContent>
              </Tooltip>
            </td>

            {/* 6. Description — same descriptive-text rule as Location above. */}
            <td className="w-[220px] px-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="block truncate rounded-[2px] text-sm text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {zone.description}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{zone.description}</TooltipContent>
              </Tooltip>
            </td>

            {/* 7. Action Menu — Edit / Delete are presentational for now. */}
            <td
              className={cn(
                'sticky right-0 w-10 min-w-10 px-0 text-center',
                isSelected ? 'bg-muted/90' : 'bg-card'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left-edge shade instead of a border, so the pinned column reads
                  as floating over the content scrolling beneath it. A gradient
                  rather than `box-shadow` because Chrome doesn't reliably paint
                  cell shadows in a `border-collapse: collapse` table, and a
                  shadow would also band above/below every row. */}
              <span aria-hidden className={edgeShade} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Actions for ${zone.name}`}
                    className="mx-auto flex size-7 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <MoreVertical className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem>
                    <SquarePen className="size-4 mr-2" /> Edit zone
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-[color:var(--status-error)] focus:text-[color:var(--status-error)]">
                    <Trash2 className="size-4 mr-2 text-[color:var(--status-error)]" /> Delete zone
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </td>
          </tr>
    )
  }

  return (
    <CustomScrollbar ref={viewportRef} className="min-h-0 flex-1 rounded-[6px] border border-border bg-card">
      <table className="w-full min-w-[850px] border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="h-12 border-b border-border">
            <th scope="col" className="w-12 pl-4 pr-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={onToggleAllVisible}
                    aria-label={allVisible ? 'Hide all zones on the map' : 'Show all zones on the map'}
                    className="flex size-6 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {allVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{allVisible ? 'Hide all on map' : 'Show all on map'}</TooltipContent>
              </Tooltip>
            </th>
            <th scope="col" className="w-6 px-0" aria-hidden />
            <HeadCell className="w-[210px]">Zone</HeadCell>
            <HeadCell className="w-[180px]">Tags</HeadCell>
            <HeadCell className="w-[200px]">Location</HeadCell>
            <HeadCell className="w-[220px]">Description</HeadCell>
            <th scope="col" aria-hidden className="sticky right-0 w-10 min-w-10 bg-card px-0">
              {/* Same left-edge shade as the body cells, so the pinned column's
                  edge reads continuously through the sticky header. */}
              <span aria-hidden className={edgeShade} />
            </th>
          </tr>
        </thead>

        <tbody>
          {flatRows.map(renderRow)}

          {zones.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-16 text-center text-sm text-muted-foreground">
                No zones match your search or filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </CustomScrollbar>
  )
}

function HeadCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn('truncate px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground', className)}
    >
      {children}
    </th>
  )
}

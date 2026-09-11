import type { ReactNode } from 'react'
import { LayoutGrid, MapPin } from '@fams/ui-kit/icons'

/**
 * ViewTypePreview — the miniature app mock rendered inside a `ViewTypePicker`
 * option card (figma new-view spec §2: a stylized thumbnail per view type —
 * blue side-rail, skeleton list bars, tinted map art). [tier-2 pattern]
 *
 * Keyed by `previewKey` (normally the view-kind id); an unknown key renders
 * the generic placeholder, per the spec's "unknown types get a generic
 * placeholder". Purely decorative — every preview is `aria-hidden`; the
 * option's accessible name is its label, owned by the picker card.
 *
 * Tokens only: rail = `primary`, canvas = `card`, skeleton bars = `muted`/
 * `border`, map tint = `primary/10` — no raw hex/px (root rule 2).
 */

/** Shared mock chrome: blue rail + white canvas. */
function MiniShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full overflow-hidden rounded-xs border border-border bg-card">
      <div className="w-3 shrink-0 bg-primary" data-slot="view-type-preview-rail" />
      <div className="flex min-w-0 flex-1">{children}</div>
    </div>
  )
}

/** A column of skeleton text bars (list rows). */
function MiniBars({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex w-full flex-col gap-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-1.5 w-full rounded-full bg-muted" />
      ))}
    </div>
  )
}

function MiniListColumn({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex h-full w-full flex-col gap-2 p-3">
      <div className="h-2 w-1/3 rounded-full bg-border" />
      <MiniBars rows={rows} />
    </div>
  )
}

/** Tinted map art: soft primary wash + faux roads + a pin. */
function MiniMapArea() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-primary/10">
      <div className="absolute inset-y-0 start-1/3 w-1 bg-card/80" />
      <div className="absolute inset-x-0 top-1/3 h-1 bg-card/80" />
      <div className="absolute inset-x-0 top-2/3 h-0.5 bg-card/60" />
      <div className="absolute start-2/3 inset-y-0 w-0.5 bg-card/60" />
      <MapPin className="absolute start-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 fill-primary text-primary-foreground rtl:translate-x-1/2" />
    </div>
  )
}

function MiniKanban() {
  return (
    <div className="grid h-full w-full grid-cols-3 gap-2 p-3">
      {Array.from({ length: 3 }, (_, col) => (
        <div key={col} className="flex flex-col gap-2">
          <div className="h-1.5 w-2/3 rounded-full bg-border" />
          <div className="h-6 rounded-xs border border-border bg-background" />
          <div className="h-6 rounded-xs border border-border bg-background" />
        </div>
      ))}
    </div>
  )
}

function MiniGrid() {
  return (
    <div className="grid h-full w-full grid-cols-3 gap-2 p-3">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="rounded-xs bg-muted" />
      ))}
    </div>
  )
}

/** Mini header label (spec: a labelled mini header per preview). */
function MiniHeader({ label }: { label: string }) {
  return <div className="h-1.5 w-1/3 rounded-full bg-border" aria-hidden="true" data-mini-label={label} />
}

function MiniCalendar() {
  return (
    <div className="flex h-full w-full flex-col gap-2 p-3">
      <MiniHeader label="Calendar View" />
      <div className="grid flex-1 grid-cols-7 gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={`h-${i}`} className="h-1 rounded-full bg-border" />
        ))}
        {Array.from({ length: 14 }, (_, i) => (
          <div key={i} className="rounded-xs bg-muted" />
        ))}
      </div>
    </div>
  )
}

function MiniGroupedList() {
  return (
    <div className="flex h-full w-full flex-col gap-2 p-3">
      <div className="h-2 w-1/2 rounded-full bg-primary/30" />
      <MiniBars rows={2} />
      <div className="h-2 w-1/2 rounded-full bg-primary/30" />
      <MiniBars rows={2} />
    </div>
  )
}

/** The generic placeholder for unknown preview keys. */
function MiniPlaceholder() {
  return (
    <div className="grid h-full w-full place-items-center">
      <LayoutGrid className="size-6 text-muted-foreground" />
    </div>
  )
}

const PREVIEWS: Record<string, () => ReactNode> = {
  list: () => <MiniListColumn />,
  'grouped-list': () => <MiniGroupedList />,
  kanban: () => <MiniKanban />,
  grid: () => <MiniGrid />,
  calendar: () => <MiniCalendar />,
  map: () => <MiniMapArea />,
  hybrid: () => (
    <>
      <div className="w-2/5 shrink-0 border-e border-border">
        <MiniListColumn rows={5} />
      </div>
      <MiniMapArea />
    </>
  ),
}

export interface ViewTypePreviewProps {
  /** Which mock to render — normally the view-kind id. Unknown → placeholder. */
  previewKey?: string
}

export function ViewTypePreview({ previewKey }: ViewTypePreviewProps) {
  const body = previewKey ? PREVIEWS[previewKey] : undefined
  return (
    <div aria-hidden="true" data-slot="view-type-preview" className="h-full w-full">
      <MiniShell>{body ? body() : <MiniPlaceholder />}</MiniShell>
    </div>
  )
}

ViewTypePreview.displayName = 'ViewTypePreview'

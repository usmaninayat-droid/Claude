import { useState, type ReactNode } from 'react'
import { Plus, type LucideIcon } from '@fams/ui-kit/icons'
import { Badge, Button, FieldGrid, Input, Popover, PopoverContent, PopoverTrigger, type BadgeVariant } from '@fams/ui-kit'
import { cn } from '../lib/cn'
import type { EntityProfileTag } from './EntityProfile.types'

/**
 * Tag-chip color rotation (figma-spec-profile.md's "Tags row": a green then
 * an orange solid-pastel pill) — cycles deterministically by index over
 * `Badge`'s existing STATUS variants rather than adding a per-tag color
 * field to `EntityProfileTag`, which keeps the API unchanged.
 */
const TAG_VARIANT_ROTATION: BadgeVariant[] = ['success', 'warning', 'info']

/**
 * The "+" add-tag control's own popover (tanker-detail frames: a `+` square
 * that opens a small panel with a text field) — entirely self-contained UI
 * state (open/input value), never the tag list itself (Rule 8: this
 * component neither stores nor persists a tag, it only reports the trimmed
 * label the user typed once they submit).
 */
function AddTagPopover({
  onAddTag,
  addTagLabel,
}: {
  onAddTag: (label: string) => void
  addTagLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onAddTag(trimmed)
    setValue('')
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setValue('')
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={addTagLabel}
          title={addTagLabel}
          // `bg-gray-100`, not `bg-muted`: the rail's own surface IS
          // `bg-muted` now, so a `bg-muted` control was invisible against
          // it. Square and chip-height, matching the frame's `+` affordance.
          className="flex size-6 shrink-0 items-center justify-center rounded-xs bg-gray-100 text-foreground transition-colors outline-none hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-3">
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            submit()
          }}
        >
          {/* No explicit `autoFocus` (jsx-a11y/no-autofocus) — Radix's own
              `PopoverContent` already moves focus onto its first focusable
              child (this input) the moment it opens. */}
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="Tag name"
            aria-label={addTagLabel}
          />
          <Button type="submit" variant="primary" size="sm" disabled={!value.trim()}>
            Add
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  )
}

export interface EntityIdentityPanelProps {
  image?: string
  /**
   * A caller-rendered illustration for the art tile — e.g. a 3D vehicle
   * icon — shown centered when there is no `image`. Wins over
   * `placeholderIcon`/`avatarFallback` (a real illustration beats a generic
   * glyph or initials block), loses to `image` (a real photo always wins).
   * A plain `ReactNode` slot keeps this component entity-agnostic — it has
   * no opinion on what the art IS, only where it goes.
   */
  art?: ReactNode
  avatarFallback?: string
  /** Centered glyph shown on a light-grey slot instead of `avatarFallback`'s solid-color initials block when there is no `image`. Omit to keep the initials look. */
  placeholderIcon?: LucideIcon
  /**
   * Status chip overlaid top-start ON the art tile (the tanker-detail frames'
   * `Active` pill sits directly on the artwork, absolutely positioned inside
   * the tile's own `relative` container) — a caller's own node lands here
   * unchanged.
   */
  statusOverlay?: ReactNode
  name: ReactNode
  entityId?: ReactNode
  status?: { label: ReactNode; tone: BadgeVariant }
  tags?: EntityProfileTag[]
  onRemoveTag?: (id: string) => void
  /**
   * Trailing "+" affordance after the tag chips — opens a small popover (an
   * `Input` + submit) and calls back with the trimmed label the user typed.
   * Omit to hide the control entirely (no add-tag flow wired); this
   * component owns the popover's OWN open/input UI state but never the tag
   * LIST itself — appending/persisting the new tag is the caller's job
   * (Rule 8), same contract `onRemoveTag` already has.
   */
  onAddTag?: (label: string) => void
  addTagLabel?: string
  infoTitle?: ReactNode
  details: { id?: string; label: ReactNode; value: ReactNode; onClick?: () => void; interactiveLabel?: string }[]
  className?: string
}

/**
 * EntityIdentityPanel — the fixed identity rail of `EntityProfile`, faithful to
 * Shaheer's `EntityDetail` identity design (status pill, art tile, name, ID,
 * tag chips + add-tag, then a titled key-details block) but rebuilt on core
 * primitives (`Badge`, `FieldGrid`) with tokens-only styling and logical
 * properties. Chrome + data in, no fetching (Rule 8).
 */
export function EntityIdentityPanel({
  image,
  art,
  avatarFallback,
  placeholderIcon: PlaceholderIcon,
  statusOverlay,
  name,
  entityId,
  status,
  tags,
  onRemoveTag,
  onAddTag,
  addTagLabel = 'Add tag',
  infoTitle = 'Details',
  details,
  className,
}: EntityIdentityPanelProps) {
  return (
    <aside
      data-slot="entity-profile-identity"
      className={cn(
        // Rail geometry re-measured off the tanker-detail frames: the rail spans
        // x=492…808 at 1920 (316px ⇒ `lg:w-[19.75rem]`, down from 368px) on
        // `Surface/Minimal` (#f9fafb = `bg-muted`, not the previous `bg-muted/40`
        // half-tint), with a symmetric 24px gutter (`px-6`) — the old
        // `ps-[1.75rem]` with no end padding at all let long values run into the
        // rail's own end border. `min-h-0` + `overflow-y-auto` keep the rail its
        // own scrollport so the content pane scrolls independently of it.
        'fams-scroll-region flex min-h-0 w-full shrink-0 flex-col gap-section overflow-y-auto border-b border-border bg-muted px-6 py-section text-start lg:w-[19.75rem] lg:border-b-0 lg:border-e',
        className,
      )}
    >
      {/* 200px art tile on `Border/Lightest`-adjacent #f2f4f7 (`bg-gray-100`),
          both frame measurements — the previous 280px tile pushed the
          title/ID/tags block below the fold at a 1080-tall viewport, and its
          `bg-muted` matched the rail exactly so the tile had no visible edge.
          `relative` so the status pill can overlay top-start ON the artwork
          (the tanker-detail frames' `Active` chip sits directly on the tile,
          not as a separate block above it). */}
      {/* `shrink-0` (P1-O, run-2026-09-05-job-orders, fix7): this `aside` is
          a `flex-col` scrollport (`overflow-y-auto` above) — a record whose
          `details` block runs long (e.g. a preventive-maintenance rule's
          ~10-row Details list) pushed the FLEX ALGORITHM'S default shrink
          onto every flex child, including this one, once combined content
          height exceeded the rail's available height — even though nothing
          here overflowed VISIBLY (the rail scrolled instead), the art tile's
          explicit `h-[12.5rem]` got silently compressed to a squat ~1/3 of
          its height before the browser ever reached for scrolling, clipping
          the artwork/initials and crowding the status-overlay badge into
          the shrunk box. `shrink-0` makes the tile a fixed 200px no matter
          how tall the rest of the rail's content is; the rail's own
          `overflow-y-auto` is what should (and now does) absorb any excess,
          exactly like every other non-shrinking rail child. */}
      <div className="relative h-[12.5rem] w-full shrink-0 overflow-hidden rounded-sm bg-gray-100">
        {statusOverlay ? (
          <div data-slot="entity-profile-status" className="absolute start-2 top-2 z-10 flex items-center gap-1.5">
            {statusOverlay}
          </div>
        ) : null}
        {image ? (
          <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : art ? (
          <div aria-hidden="true" className="grid h-full w-full place-items-center">
            {art}
          </div>
        ) : PlaceholderIcon ? (
          // Figma "Asset Details": a light-grey slot + large grey glyph —
          // distinct from `avatarFallback`'s solid-color initials block
          // below (finding: a location-flavored record's hero rendered a
          // solid green "VT" square, not a placeholder look).
          <div aria-hidden="true" className="grid h-full w-full place-items-center">
            <PlaceholderIcon className="size-24 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="grid h-full w-full place-items-center bg-primary text-h2 font-bold text-primary-foreground"
          >
            {avatarFallback}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-h4 font-semibold leading-snug text-foreground">{name}</h2>
        {/* `ID #9232734` — the frames put the space before the hash, not after
            the "ID" (this rendered as `ID# 9232734`). */}
        {entityId ? <p className="text-body-sm font-medium text-muted-foreground">ID #{entityId}</p> : null}
        {(status && !statusOverlay) || tags?.length || onAddTag ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {status && !statusOverlay ? (
              // Suppressed when a hero-image `statusOverlay` is already shown
              // (generic default: never show the same status twice) — Figma
              // "Asset Details" shows tags here, not a second status pill,
              // once the hero already carries the solid status chip.
              <Badge variant={status.tone} dot>
                {status.label}
              </Badge>
            ) : null}
            {(tags ?? []).map((tag, index) => (
              <Badge
                key={tag.id}
                variant={TAG_VARIANT_ROTATION[index % TAG_VARIANT_ROTATION.length]}
                // Default size, not `size="lg"`: the tanker-detail frames' tag
                // chips are ~24px tall beside a 24px `+` control, and `lg`'s 40px
                // made the tag row taller than the ID line above it.
                className="gap-1.5"
              >
                {tag.label}
                {onRemoveTag ? (
                  <button
                    type="button"
                    aria-label={`Remove tag ${tag.label}`}
                    onClick={() => onRemoveTag(tag.id)}
                    className="grid size-4 place-items-center rounded-full text-current transition-colors hover:bg-foreground/10"
                  >
                    <span aria-hidden="true" className="text-body-sm leading-none">
                      ×
                    </span>
                  </button>
                ) : null}
              </Badge>
            ))}
            {onAddTag ? <AddTagPopover onAddTag={onAddTag} addTagLabel={addTagLabel} /> : null}
          </div>
        ) : null}
      </div>

      {details.length ? (
        <div className="flex flex-col gap-2">
          <p className="text-body-sm font-semibold text-muted-foreground">{infoTitle}</p>
          <FieldGrid
            layout="rows"
            fields={details.map((d, i) => ({
              id: d.id ?? String(i),
              label: d.label,
              value: d.value,
              onClick: d.onClick,
              interactiveLabel: d.interactiveLabel,
            }))}
          />
        </div>
      ) : null}
    </aside>
  )
}

EntityIdentityPanel.displayName = 'EntityIdentityPanel'

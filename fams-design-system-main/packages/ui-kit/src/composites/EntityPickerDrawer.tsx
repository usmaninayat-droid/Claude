import { forwardRef, useEffect, useId, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react'
import { Search, X } from '../icons'
import { cn } from '../lib/cn'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '../primitives/Sheet'
import { Button } from '../primitives/Button'
import { Checkbox } from '../primitives/Checkbox'
import { Avatar } from '../primitives/Avatar'
import { Badge } from '../primitives/Badge'

/**
 * EntityPickerDrawer + LinkedEntityChip — bulk entity-linking pair. [L3 composite]
 *
 * EntityPickerDrawer is the full-drawer counterpart to `Combobox`: instead of an
 * inline dropdown, it opens a `Sheet` for reviewing a longer candidate list —
 * search, checkbox/radio rows, empty and no-match states — and stages the
 * selection until the user explicitly confirms (or cancels, discarding it).
 * LinkedEntityChip is the small removable pill used to display the result
 * above the field that opened the drawer.
 *
 * State-agnostic (Rule 8): filters `items` it was GIVEN, locally, by
 * label/secondary/tag. Fetching candidates and persisting the link is the
 * caller's concern — `onChange` fires once, on confirm, with the full id list.
 *
 * @usage-v5
 *   Retires the v5 codebase's `*EntityLinkingDrawer.vue` fork family (byte-identical
 *   copies in iwmp/ead/fams `components/dialog/`, wired into 15 files — mostly the
 *   `DeviceSim`/`DeviceTracker`/`AssetVehicle`/`WorkforceDriver` profile templates,
 *   plus `ServiceLocationBins.vue`) and its siblings `PlansEntityLinking.vue`
 *   (`EspPlansPanel.vue`) and `EntitySelectDrawer.vue`. All share the same shape:
 *   a `mutipleLinkage` boolean toggling checkbox vs single-select rows (`Company.vue`
 *   passes `:use-checkboxes="false"`), a `search` ref, and a confirm button emitting
 *   the selected id(s). LinkedEntityChip replaces the small "linked X" pill each
 *   caller re-draws by hand once the drawer confirms.
 *   Forms needed: single vs multi rows, search, empty vs no-match states, pluralized confirm CTA.
 * @usage-index entity-picker-drawer
 */

export interface EntityPickerItem {
  id: string
  label: string
  avatarSrc?: string
  /** Secondary line under the label — email, type, code, etc. */
  secondary?: string
  tags?: string[]
}

export interface EntityPickerDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Always caller-supplied — state-agnostic (Rule 8), no fetching inside. */
  items: EntityPickerItem[]
  /** Selection at open time. The drawer stages further changes internally and
   *  only reports them via `onChange` when the user confirms. */
  value: string[]
  /** Fires once, with the full staged id list, when the user confirms. */
  onChange: (value: string[]) => void
  /** Checkbox multi-select vs single radio-style pick. Defaults to multi. */
  multiple?: boolean
  title?: ReactNode
  description?: ReactNode
  searchPlaceholder?: string
  /** Shown when `items` itself is empty (no candidates at all). */
  emptyText?: ReactNode
  /** Singular noun used to pluralize the confirm CTA, e.g. "contact" → "Add 3 contacts". */
  entityLabel?: string
  confirmLabelPrefix?: string
  side?: 'left' | 'right'
  disabled?: boolean
  className?: string
}

export const EntityPickerDrawer = forwardRef<HTMLDivElement, EntityPickerDrawerProps>(
  (
    {
      open,
      onOpenChange,
      items,
      value,
      onChange,
      multiple = true,
      title = 'Select entities',
      description,
      searchPlaceholder = 'Search…',
      emptyText = 'Nothing available to link yet.',
      entityLabel = 'item',
      confirmLabelPrefix = 'Add',
      side = 'right',
      disabled = false,
      className,
    },
    ref,
  ) => {
    const [query, setQuery] = useState('')
    const [draft, setDraft] = useState<Set<string>>(() => new Set(value))
    const searchId = useId()
    const listId = useId()

    // Re-seed the working draft from `value` every time the drawer opens —
    // edits inside stay local until Confirm reports them back.
    useEffect(() => {
      if (open) {
        setDraft(new Set(value))
        setQuery('')
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase()
      if (!q) return items
      return items.filter((item) => {
        if (item.label.toLowerCase().includes(q)) return true
        if (item.secondary?.toLowerCase().includes(q)) return true
        if (item.tags?.some((t) => t.toLowerCase().includes(q))) return true
        return false
      })
    }, [items, query])

    const toggle = (id: string) => {
      setDraft((prev) => {
        const next = new Set(prev)
        if (multiple) {
          if (next.has(id)) next.delete(id)
          else next.add(id)
        } else {
          next.clear()
          next.add(id)
        }
        return next
      })
    }

    const count = draft.size
    const confirmLabel =
      count > 0 ? `${confirmLabelPrefix} ${count} ${entityLabel}${count === 1 ? '' : 's'}` : confirmLabelPrefix

    const handleConfirm = () => {
      onChange(Array.from(draft))
      onOpenChange(false)
    }

    const handleCancel = () => {
      onOpenChange(false)
    }

    return (
      <Sheet open={open} onOpenChange={disabled ? undefined : onOpenChange}>
        <SheetContent ref={ref} side={side} className={cn('gap-0 p-0 sm:max-w-md', className)}>
          <SheetHeader className="gap-3 pb-4">
            <div>
              <SheetTitle>{title}</SheetTitle>
              {description ? <SheetDescription>{description}</SheetDescription> : null}
            </div>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id={searchId}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label="Search"
                aria-controls={listId}
                disabled={disabled}
                className={cn(
                  'h-9 w-full rounded-sm border border-border bg-input-background ps-9 pe-3 text-body-sm text-foreground outline-none transition-colors',
                  'placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
                  disabled && 'pointer-events-none opacity-50',
                )}
              />
            </div>
          </SheetHeader>

          <div id={listId} data-slot="entity-picker-list" className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex h-full min-h-40 items-center justify-center px-6 py-12 text-center text-body-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-full min-h-40 items-center justify-center px-6 py-12 text-center text-body-sm text-muted-foreground">
                No {entityLabel}s match &ldquo;{query}&rdquo;.
              </div>
            ) : (
              <ul
                className="divide-y divide-border"
                role={multiple ? undefined : 'radiogroup'}
                aria-label={multiple ? undefined : `${entityLabel} options`}
              >
                {filtered.map((item) => {
                  const selected = draft.has(item.id)
                  const rowId = `${searchId}-${item.id}`
                  return (
                    <li key={item.id}>
                      {multiple ? (
                        <label
                          htmlFor={rowId}
                          data-slot="entity-picker-row"
                          className={cn(
                            'flex cursor-pointer items-center gap-3 px-6 py-3 transition-colors hover:bg-muted',
                            selected && 'bg-secondary/40',
                            disabled && 'pointer-events-none opacity-50',
                          )}
                        >
                          <Checkbox
                            id={rowId}
                            checked={selected}
                            onCheckedChange={() => toggle(item.id)}
                            aria-label={`Select ${item.label}`}
                            isDisabled={disabled}
                          />
                          <EntityRow item={item} />
                        </label>
                      ) : (
                        <button
                          type="button"
                          id={rowId}
                          role="radio"
                          aria-checked={selected}
                          onClick={() => toggle(item.id)}
                          disabled={disabled}
                          data-slot="entity-picker-row"
                          className={cn(
                            'flex w-full cursor-pointer items-center gap-3 px-6 py-3 text-start transition-colors hover:bg-muted',
                            selected && 'bg-secondary/40',
                            disabled && 'pointer-events-none opacity-50',
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              'flex size-4 shrink-0 items-center justify-center rounded-full border border-border',
                              selected && 'border-primary',
                            )}
                          >
                            {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
                          </span>
                          <EntityRow item={item} />
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <SheetFooter>
            <Button type="button" variant="tertiary" onClick={handleCancel}>
              Cancel
            </Button>
            <Button type="button" variant="primary" disabled={disabled || count === 0} onClick={handleConfirm}>
              {confirmLabel}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  },
)

EntityPickerDrawer.displayName = 'EntityPickerDrawer'

function EntityRow({ item }: { item: EntityPickerItem }) {
  return (
    <>
      <Avatar size="sm" name={item.label} src={item.avatarSrc} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm font-medium text-foreground">{item.label}</span>
        {item.secondary ? (
          <span className="block truncate text-caption text-muted-foreground">{item.secondary}</span>
        ) : null}
      </span>
      {item.tags?.length ? (
        <span className="flex shrink-0 items-center gap-1.5">
          {item.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" size="xs">
              {tag}
            </Badge>
          ))}
        </span>
      ) : null}
    </>
  )
}

/**
 * LinkedEntityChip — removable pill for one already-linked entity. [L3 composite]
 *
 * The read side of the EntityPickerDrawer pair: rendered above the field that
 * opened the drawer, one per confirmed selection. `onRemove` omitted renders a
 * read-only chip (no remove affordance).
 */
export interface LinkedEntityChipProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  label: string
  avatarSrc?: string
  onRemove?: () => void
}

export const LinkedEntityChip = forwardRef<HTMLSpanElement, LinkedEntityChipProps>(
  ({ label, avatarSrc, onRemove, className, ...props }, ref) => (
    <span
      ref={ref}
      data-slot="linked-entity-chip"
      className={cn(
        'inline-flex max-w-40 items-center gap-2 rounded-full border border-border bg-card py-1 ps-1 pe-2 text-body-xs text-foreground shadow-sm',
        className,
      )}
      {...props}
    >
      <Avatar size="xs" name={label} src={avatarSrc} />
      <span className="min-w-0 truncate">{label}</span>
      {onRemove ? (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          className="grid shrink-0 place-items-center rounded-full p-0.5 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  ),
)

LinkedEntityChip.displayName = 'LinkedEntityChip'

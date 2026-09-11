import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { Check } from '@fams/ui-kit/icons'
import { viewLabelIn, type ViewKind } from '@fams/v5-composer'
import { Button } from '@fams/ui-kit'
import { cn } from '../lib/cn'
import { ViewTypePreview } from './ViewTypePreviews'

/**
 * One selectable view-type option (figma new-view spec §"metadata-driven
 * contract"): the picker renders N of these as preview cards. Options are
 * NEVER hardcoded per module — derive them from the module's blueprint
 * metadata (see `viewTypeOptionsFromKinds`).
 */
export interface ViewTypeOption {
  /** Stable id — normally a `ViewKind`; drives which renderer the created view mounts. */
  id: string
  /** Card label ("Hybrid View", "Map View", …). */
  label: string
  /**
   * Which built-in preview mock the card shows (see `ViewTypePreview`).
   * Unknown/omitted keys render the generic placeholder.
   */
  previewKey?: string
  /** Fully custom preview node — wins over `previewKey` when given. */
  preview?: ReactNode
}

/**
 * Derive picker options from a blueprint's `views: ViewKind[]` declaration —
 * the metadata-driven default: label via the composer's context-aware
 * `viewLabelIn` ("Map View"/"List View" beside a `hybrid` sibling,
 * per the new-view Figma; plain names otherwise), preview keyed by the kind
 * id, duplicates dropped.
 */
export function viewTypeOptionsFromKinds(kinds: ViewKind[]): ViewTypeOption[] {
  const seen = new Set<string>()
  const out: ViewTypeOption[] = []
  for (const kind of kinds) {
    if (seen.has(kind)) continue
    seen.add(kind)
    out.push({ id: kind, label: viewLabelIn(kind, kinds), previewKey: kind })
  }
  return out
}

export interface ViewTypePickerProps {
  /** The module's available view types (metadata-derived — see `viewTypeOptionsFromKinds`). */
  options: ViewTypeOption[]
  /** Pre-selected option; defaults to the first option (spec: "first option pre-selected"). */
  defaultOptionId?: string
  /** Heading. Also the radiogroup's accessible name. */
  heading?: string
  /**
   * Module-supplied hint line, pinned near the bottom (figma spec §4). The
   * bold "Hint:" prefix is the component's; pass only the sentence. Omit to
   * hide the row entirely.
   */
  hint?: ReactNode
  /**
   * Fires once per open with the selected option id — `'create'` for
   * "Create Only", `'customize'` for "Create & Customize". Both buttons
   * disable after the first activation (double-click guard, UX-NOTES §5).
   */
  onCreate: (optionId: string, mode: 'create' | 'customize') => void
  /**
   * Escape handler (spec: Escape returns to the previously active view).
   * Omit when the picker is the module's undismissable initial state
   * (zero views yet) — Escape is then a no-op.
   */
  onCancel?: () => void
  /** External in-flight flag — also disables both actions. */
  creating?: boolean
  /** Label overrides (i18n). */
  createLabel?: string
  customizeLabel?: string
  className?: string
}

/**
 * ViewTypePicker — the "Select Preferred View" full-content-area takeover
 * (figma new-view spec, node 495:25723). [tier-2 pattern]
 *
 * Rendered by `ModuleView` in place of the active view body when the view-tab
 * strip's "+" is clicked (or as the initial state of a module with zero
 * views). NOT an overlay: no scrim, no portal — the surrounding chrome (side
 * nav, top nav, existing view tabs) stays live, and clicking another view tab
 * is the implicit cancel (handled by the parent).
 *
 * The option cards form a radiogroup (single-select, roving tabindex):
 * Left/Right/Up/Down arrows move selection (direction-aware for RTL),
 * Home/End jump, Enter/Space select, one Tab stop for the whole group, then
 * Tab reaches Create Only → Create & Customize. Escape fires `onCancel`.
 * With >3 options the row wraps (UX-NOTES §5) — never crushes thumbnails.
 *
 * Presentational (Rule 8): creation itself is the parent's — this component
 * only reports intent via `onCreate`.
 */
export function ViewTypePicker({
  options,
  defaultOptionId,
  heading = 'Select Preferred View',
  hint,
  onCreate,
  onCancel,
  creating = false,
  createLabel = 'Create Only',
  customizeLabel = 'Create & Customize',
  className,
}: ViewTypePickerProps) {
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (defaultOptionId && options.some((o) => o.id === defaultOptionId)) return defaultOptionId
    return options[0]?.id ?? ''
  })
  // One-shot guard: after either create button fires, both disable until the
  // parent unmounts the picker (or `creating` clears after a failed attempt).
  const [fired, setFired] = useState(false)
  const disabled = creating || fired

  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.id === selectedId),
  )

  // Radios move focus WITH selection (roving tabindex) — but only for
  // keyboard-driven changes, tracked here so a plain click doesn't scroll.
  const focusPendingRef = useRef(false)
  useEffect(() => {
    if (!focusPendingRef.current) return
    focusPendingRef.current = false
    cardRefs.current.get(selectedId)?.focus()
  }, [selectedId])

  const selectByOffset = (offset: number) => {
    if (!options.length) return
    const next = (selectedIndex + offset + options.length) % options.length
    focusPendingRef.current = true
    setSelectedId(options[next].id)
  }
  const selectIndex = (index: number) => {
    if (!options.length) return
    focusPendingRef.current = true
    setSelectedId(options[Math.min(Math.max(index, 0), options.length - 1)].id)
  }

  // Attached to each CARD (the focusable radios), not the radiogroup
  // container — jsx-a11y correctly insists key handlers live on focusable
  // elements; the roving-tabindex card is the group's one tab stop anyway.
  const onOptionKeyDown = (event: KeyboardEvent<HTMLDivElement>, optionId: string) => {
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl'
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        setSelectedId(optionId)
        break
      case 'ArrowRight':
        event.preventDefault()
        selectByOffset(rtl ? -1 : 1)
        break
      case 'ArrowLeft':
        event.preventDefault()
        selectByOffset(rtl ? 1 : -1)
        break
      case 'ArrowDown':
        event.preventDefault()
        selectByOffset(1)
        break
      case 'ArrowUp':
        event.preventDefault()
        selectByOffset(-1)
        break
      case 'Home':
        event.preventDefault()
        selectIndex(0)
        break
      case 'End':
        event.preventDefault()
        selectIndex(options.length - 1)
        break
      default:
    }
  }

  // Escape works from ANYWHERE inside the takeover (cards, buttons, the
  // scroll container itself) — a native listener on the root rather than a
  // JSX handler, since the root is a non-interactive scroll region
  // (jsx-a11y/no-static-element-interactions).
  const rootRef = useRef<HTMLDivElement>(null)
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape' && onCancelRef.current) {
        event.stopPropagation()
        onCancelRef.current()
      }
    }
    root.addEventListener('keydown', onKeyDown)
    return () => root.removeEventListener('keydown', onKeyDown)
  }, [])

  // A dismissible takeover (opened from the "+" tab, which lives in the top
  // nav OUTSIDE this subtree) moves focus to the selected card on open —
  // otherwise focus stays on the "+" button and neither the arrow-key
  // radiogroup nor the Escape cancel is reachable without an extra Tab.
  // The UNDISMISSABLE zero-views initial state (`onCancel` absent) does NOT
  // steal focus: it renders on page load, where autofocus would yank the
  // user out of the nav.
  const autoFocusOnMount = useRef(Boolean(onCancel))
  useEffect(() => {
    if (!autoFocusOnMount.current) return
    autoFocusOnMount.current = false
    cardRefs.current.get(selectedId)?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fire = (mode: 'create' | 'customize') => {
    if (disabled || !selectedId) return
    setFired(true)
    onCreate(selectedId, mode)
  }

  const headingId = useId()

  return (
    <div
      ref={rootRef}
      data-slot="view-type-picker"
      className={cn('flex h-full min-h-0 w-full flex-col overflow-auto bg-background', className)}
    >
      {/* Column width fits THREE 288px cards + two 24px gaps (912px) inside
          the px-8 padding (spec: 3 options render as one row at 1440, and the
          buttons/hint stay above the fold at 1280x800) — `max-w-4xl` (896px)
          wrapped the third card. >3 metadata-declared options still wrap. */}
      <div className="m-auto flex w-full max-w-[61rem] flex-col items-center gap-12 px-8 py-10">
        <h2 id={headingId} className="text-center text-h4 font-bold capitalize text-foreground">
          {heading}
        </h2>

        <div
          role="radiogroup"
          aria-labelledby={headingId}
          data-slot="view-type-picker-options"
          className="flex flex-wrap items-start justify-center gap-6"
        >
          {options.map((option) => {
            const selected = option.id === selectedId
            return (
              <div
                key={option.id}
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                data-slot="view-type-picker-option"
                data-state={selected ? 'checked' : 'unchecked'}
                ref={(el) => {
                  if (el) cardRefs.current.set(option.id, el)
                  else cardRefs.current.delete(option.id)
                }}
                className="group flex w-72 cursor-pointer flex-col gap-3 outline-none"
                onClick={() => setSelectedId(option.id)}
                onKeyDown={(event) => onOptionKeyDown(event, option.id)}
              >
                <div
                  className={cn(
                    'relative h-48 w-full rounded-sm border bg-muted p-4 transition-colors duration-fast ease-standard',
                    selected ? 'border-primary' : 'border-transparent hover:border-border',
                    'group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2',
                  )}
                >
                  {option.preview ?? <ViewTypePreview previewKey={option.previewKey} />}
                  {selected ? (
                    <span
                      aria-hidden="true"
                      data-slot="view-type-picker-check"
                      // Negative logical inset inline (see LiveFiltersPopover's note).
                      style={{ insetInlineEnd: '-0.5rem' }}
                      className="absolute -top-2 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"
                    >
                      <Check className="size-3" />
                    </span>
                  ) : null}
                </div>
                <span className="self-start text-body-lg font-semibold text-foreground">
                  {option.label}
                </span>
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button
            type="button"
            variant="tertiary"
            size="lg"
            className="w-56 border-primary text-primary hover:bg-primary/5 hover:text-primary"
            disabled={disabled}
            onClick={() => fire('create')}
          >
            {createLabel}
          </Button>
          <Button
            type="button"
            size="lg"
            className="w-56"
            disabled={disabled}
            onClick={() => fire('customize')}
          >
            {customizeLabel}
          </Button>
        </div>

        {/* VISIBLE cancel affordance (round-1 interaction P2: the takeover was
            dismissible only by Escape or by picking another view tab — a
            keyboard-only exit is not an affordance). Absent in the
            undismissable zero-views initial state, where `onCancel` is too. */}
        {onCancel ? (
          <Button
            type="button"
            variant="ghost"
            data-slot="view-type-picker-cancel"
            onClick={onCancel}
          >
            Cancel
          </Button>
        ) : null}
      </div>

      {hint ? (
        <p
          data-slot="view-type-picker-hint"
          className="px-8 pb-8 text-center text-body-md leading-normal text-muted-foreground"
        >
          <strong className="font-bold text-foreground">Hint: </strong>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

ViewTypePicker.displayName = 'ViewTypePicker'

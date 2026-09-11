import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { Lock, Search, X } from '../icons'
import { cn } from '../lib/cn'
import { Switch } from '../primitives/Switch'

/**
 * ColumnCustomizer — the standard DS table "Columns" chooser.
 *
 * Richer than v5's `ColumnMenu.vue`: adds search, drag-reorder of the shown
 * columns, grouped categories, per-column icons and toggle switches. Reference
 * design Figma node 495-25285 (FAMS V5 Launch Pad); reference behavior the v5
 * `ColumnMenu.vue`. Kept in strict API-parity with the Vue build.
 *
 * `value` is the single source of truth: the ORDERED array of visible column
 * keys. It captures BOTH visibility and order —
 *   - "Shown" renders exactly `value` in order (drag/keyboard reorder).
 *   - Every catalog item NOT in `value` renders under its `group`, toggle OFF.
 *   - Toggle ON  → append key. Toggle OFF → remove key (blocked if `required`).
 *
 * Tokens only, RTL-safe (logical utilities + `[dir]`-aware handle/thumb).
 */

export interface ColumnCatalogItem {
  /** Matches `DataTableColumn.key`. */
  key: string
  label: string
  /** Section label, e.g. "Asset – Basic Info". Shown items ignore this. */
  group: string
  /** 16px glyph. Optional. */
  icon?: ReactNode
  /** Cannot be hidden (toggle disabled). May still be reorderable. */
  required?: boolean
}

export interface ColumnCustomizerProps {
  catalog: ColumnCatalogItem[]
  /** Ordered array of visible column keys (visibility + order). */
  value: string[]
  onChange: (orderedVisibleKeys: string[]) => void
  onClose?: () => void
}

/** The literal header for the shown-columns section. */
const SHOWN_GROUP = 'Shown'

/** A group header is uppercased when it names an ASSET category. */
function isAssetGroup(group: string): boolean {
  return /^asset\b/i.test(group.trim())
}

/** 6-dot grid drag handle (2 cols × 3 rows). Muted, `cursor-grab`, 12px. */
function DragDots() {
  return (
    <svg
      viewBox="0 0 6 10"
      width="12"
      height="12"
      aria-hidden="true"
      className="text-muted-foreground"
      fill="currentColor"
    >
      <circle cx="1" cy="1" r="1" />
      <circle cx="5" cy="1" r="1" />
      <circle cx="1" cy="5" r="1" />
      <circle cx="5" cy="5" r="1" />
      <circle cx="1" cy="9" r="1" />
      <circle cx="5" cy="9" r="1" />
    </svg>
  )
}

export function ColumnCustomizer({
  catalog,
  value,
  onChange,
  onClose,
}: ColumnCustomizerProps) {
  const [query, setQuery] = useState('')
  const [dragKey, setDragKey] = useState<string | null>(null)
  const handleRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const byKey = useMemo(() => {
    const m = new Map<string, ColumnCatalogItem>()
    for (const c of catalog) m.set(c.key, c)
    return m
  }, [catalog])

  const idBase = useId()
  const requiredKey = (key: string) => Boolean(byKey.get(key)?.required)

  const matches = (item: ColumnCatalogItem) =>
    item.label.toLowerCase().includes(query.trim().toLowerCase())

  /* ---- Shown section: exactly `value`, in order, matching search ---- */
  const shownItems = useMemo(
    () =>
      value
        .map((k) => byKey.get(k))
        .filter((c): c is ColumnCatalogItem => Boolean(c))
        .filter(matches),
    [value, byKey, query],
  )

  /* ---- Remaining groups: catalog items NOT in `value`, grouped by `group` ---- */
  const otherGroups = useMemo(() => {
    const visible = new Set(value)
    const groups = new Map<string, ColumnCatalogItem[]>()
    for (const item of catalog) {
      if (visible.has(item.key)) continue
      if (!matches(item)) continue
      const list = groups.get(item.group) ?? []
      list.push(item)
      groups.set(item.group, list)
    }
    return [...groups.entries()]
  }, [catalog, value, query])

  /* ---- toggle / reorder ---- */
  const show = (key: string) => {
    if (value.includes(key)) return
    onChange([...value, key])
  }
  const hide = (key: string) => {
    if (requiredKey(key)) return
    onChange(value.filter((k) => k !== key))
  }
  const toggle = (key: string, next: boolean) => (next ? show(key) : hide(key))

  const reorder = (fromKey: string, toKey: string) => {
    if (fromKey === toKey) return
    const next = [...value]
    const from = next.indexOf(fromKey)
    const to = next.indexOf(toKey)
    if (from < 0 || to < 0) return
    next.splice(to, 0, next.splice(from, 1)[0])
    onChange(next)
  }

  const moveBy = (key: string, delta: number) => {
    const from = value.indexOf(key)
    if (from < 0) return
    const to = from + delta
    if (to < 0 || to >= value.length) return
    const next = [...value]
    next.splice(to, 0, next.splice(from, 1)[0])
    onChange(next)
    // Keep focus on the moved handle after re-render.
    requestAnimationFrame(() => handleRefs.current[key]?.focus())
  }

  /*
   * Round-4 UX finding N1: the whole ROW is the pointer target, not just the
   * 32×18 switch. The All Filters popover already works this way (200×32
   * `label` rows) and the Columns popover — 75 rows of 18px switches — did
   * not, so the only way to toggle a column was an 18px-tall target. The
   * switch and the reorder handle keep their own hit tests, so a click on
   * either is never counted twice, and keyboard operation is unchanged (the
   * switch is still the focusable control).
   */
  const rowTarget = (key: string, checked: boolean, disabled: boolean) =>
    disabled
      ? {}
      : {
          onClick: (event: MouseEvent<HTMLLIElement>) => {
            if ((event.target as HTMLElement).closest('button,input,[role="switch"]')) return
            toggle(key, !checked)
          },
        }

  const onHandleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, key: string) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      moveBy(key, -1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      moveBy(key, 1)
    }
  }

  return (
    <div
      data-slot="column-customizer"
      className="flex max-h-[70vh] w-[260px] flex-col gap-4 overflow-y-auto overflow-x-hidden rounded-sm border border-border bg-popover px-3 py-4 text-popover-foreground shadow-popover outline-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold text-foreground">Columns</span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            // 24×24 target on a 16px glyph (UX-NOTES C18 / round-4 N2).
            className="grid size-6 place-items-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Columns"
          aria-label="Search Columns"
          className="h-8 w-full rounded-sm border border-border bg-background ps-8 pe-2.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25"
        />
      </div>

      {/* Groups */}
      <div className="flex flex-col gap-6">
        {/* Shown */}
        {shownItems.length > 0 ? (
          <section aria-label={SHOWN_GROUP}>
            <div className="mb-4 text-xs font-semibold text-muted-foreground">
              {SHOWN_GROUP}
            </div>
            <ul className="flex flex-col gap-4">
              {shownItems.map((item) => {
                const disabled = Boolean(item.required)
                return (
                  <li
                    key={item.key}
                    draggable
                    onDragStart={() => setDragKey(item.key)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragKey) reorder(dragKey, item.key)
                      setDragKey(null)
                    }}
                    onDragEnd={() => setDragKey(null)}
                    data-dragging={dragKey === item.key || undefined}
                    {...rowTarget(item.key, true, disabled)}
                    className={cn(
                      'flex w-full items-center justify-between data-[dragging]:opacity-50',
                      !disabled && 'cursor-pointer',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <button
                        type="button"
                        ref={(el) => {
                          handleRefs.current[item.key] = el
                        }}
                        onKeyDown={(e) => onHandleKeyDown(e, item.key)}
                        aria-label={`Reorder ${item.label}`}
                        className="flex cursor-grab items-center outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <DragDots />
                      </button>
                      {item.icon ? (
                        <span className="grid size-4 shrink-0 place-items-center text-muted-foreground">
                          {item.icon}
                        </span>
                      ) : null}
                      <span className="truncate text-xs font-medium text-foreground">
                        {item.label}
                      </span>
                      {/* "Cannot be turned off" must not rest on the paler
                          toggle colour alone (WCAG 1.4.1, round-1 UX finding
                          16): a lock glyph + a `Required` caption carry the
                          same meaning without colour, and the toggle itself
                          announces `aria-disabled` with a title. */}
                      {disabled ? (
                        <span
                          id={`${idBase}-required-${item.key}`}
                          data-slot="column-required"
                          className="inline-flex shrink-0 items-center gap-1 text-caption font-semibold text-muted-foreground"
                        >
                          <Lock className="size-3" aria-hidden="true" />
                          Required
                        </span>
                      ) : null}
                    </span>
                    <Switch
                      checked
                      disabled={disabled}
                      aria-disabled={disabled || undefined}
                      // The accessible NAME stays `Toggle <label>` (consumers
                      // query on it); the required state is described, not
                      // renamed.
                      aria-describedby={disabled ? `${idBase}-required-${item.key}` : undefined}
                      title={disabled ? `${item.label} is required and cannot be hidden` : undefined}
                      onCheckedChange={(next) => toggle(item.key, next)}
                      aria-label={`Toggle ${item.label}`}
                    />
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {/* Other groups */}
        {otherGroups.map(([group, items]) => (
          <section key={group} aria-label={group}>
            <div
              className={cn(
                'mb-4 text-xs font-semibold text-muted-foreground',
                isAssetGroup(group) && 'uppercase',
              )}
            >
              {group}
            </div>
            <ul className="flex flex-col gap-4">
              {items.map((item) => (
                <li
                  key={item.key}
                  {...rowTarget(item.key, false, false)}
                  className="flex w-full cursor-pointer items-center justify-between"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {item.icon ? (
                      <span className="grid size-4 shrink-0 place-items-center text-muted-foreground">
                        {item.icon}
                      </span>
                    ) : null}
                    <span className="truncate text-xs font-medium text-foreground">
                      {item.label}
                    </span>
                  </span>
                  <Switch
                    checked={false}
                    onCheckedChange={(next) => toggle(item.key, next)}
                    aria-label={`Toggle ${item.label}`}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

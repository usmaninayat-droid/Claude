import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Save, ChevronDown, Settings, Tag, X } from '../icons'
import { Checkbox } from '../primitives/Checkbox'

/**
 * FilterPanel — the standard DS fleet "All Filters" panel.
 *
 * Same visual language as `ColumnCustomizer` (white `bg-popover` panel, grouped
 * sections, DS tokens, RTL-safe logical utilities). Opened as popover content
 * from the Live Monitoring filter (sliders) button. Reference design Figma node
 * 517-11477 (FAMS V5 Launch Pad). Kept in strict API-parity with the Vue build.
 *
 * Faceted filtering contract (applied by the CALLER, not this component):
 *   - Checking/unchecking toggles a value in `value.groups[groupKey]`.
 *   - Multiple checks WITHIN a group = OR; ACROSS groups = AND.
 *   - A group with 0 checked options does not constrain results.
 *   - Counts are supplied per-option by the caller (`FilterOption.count`).
 *
 * `value` is the single source of truth (`{ tags, groups }`). This component is
 * fully controlled — every mutation flows out through `onChange`.
 */

export interface FilterOption {
  value: string
  label: string
  count?: number
}

export interface FilterGroup {
  key: string
  label: string
  options: FilterOption[]
}

export interface FilterValue {
  /** Free-form tag chips (multi-select). */
  tags: string[]
  /** Selected option values per `FilterGroup.key`. */
  groups: Record<string, string[]>
}

export interface FilterPanelProps {
  groups: FilterGroup[]
  value: FilterValue
  onChange: (value: FilterValue) => void
  /** Options offered in the Tags multi-select. */
  tagOptions?: FilterOption[]
  /** Fired (alongside onChange with the empty value) when "Clear all" is used. */
  onClear?: () => void
  /** Optional close affordance (wired to the popover). */
  onClose?: () => void
  /** Optional "Save view" action (stub in the demo). */
  onSave?: () => void
}

const EMPTY_VALUE: FilterValue = { tags: [], groups: {} }

export function FilterPanel({
  groups,
  value,
  onChange,
  tagOptions = [],
  onClear,
  onClose,
  onSave,
}: FilterPanelProps) {
  const [tagQuery, setTagQuery] = useState('')
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  const saveMenuRef = useRef<HTMLDivElement>(null)
  const tagOptionsId = useId()

  // Dismiss the "Save options" menu on outside click or Escape — only while
  // it's open, so we're not leaking a document-level listener per instance.
  useEffect(() => {
    if (!saveMenuOpen) return

    const handlePointerDown = (e: PointerEvent) => {
      if (!saveMenuRef.current?.contains(e.target as Node)) {
        setSaveMenuOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSaveMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [saveMenuOpen])

  /* ---- group option toggles (within-group OR set) ---- */
  const isChecked = (groupKey: string, optValue: string) =>
    (value.groups[groupKey] ?? []).includes(optValue)

  const toggleOption = (groupKey: string, optValue: string, next: boolean) => {
    const current = value.groups[groupKey] ?? []
    const updated = next
      ? [...current, optValue]
      : current.filter((v) => v !== optValue)
    const nextGroups = { ...value.groups }
    if (updated.length > 0) nextGroups[groupKey] = updated
    else delete nextGroups[groupKey]
    onChange({ ...value, groups: nextGroups })
  }

  /* ---- tag chips ---- */
  const addTag = (tag: string) => {
    const t = tag.trim()
    if (!t || value.tags.includes(t)) {
      setTagQuery('')
      return
    }
    onChange({ ...value, tags: [...value.tags, t] })
    setTagQuery('')
  }

  const removeTag = (tag: string) => {
    onChange({ ...value, tags: value.tags.filter((t) => t !== tag) })
  }

  const onTagKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag(tagQuery)
    } else if (
      e.key === 'Backspace' &&
      tagQuery === '' &&
      value.tags.length > 0
    ) {
      removeTag(value.tags[value.tags.length - 1])
    }
  }

  /* ---- clear all ---- */
  const clearAll = () => {
    onChange({ tags: [], groups: {} })
    onClear?.()
  }

  // Tag suggestions: unselected options whose label matches the current query.
  const tagSuggestions = tagOptions.filter(
    (o) =>
      !value.tags.includes(o.value) &&
      o.label.toLowerCase().includes(tagQuery.trim().toLowerCase()),
  )

  return (
    <div
      data-slot="filter-panel"
      className="flex max-h-[80vh] w-[480px] max-w-[calc(100vw-2rem)] flex-col gap-6 overflow-y-auto overflow-x-hidden rounded-md border border-border bg-popover p-6 text-popover-foreground shadow-popover outline-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">All Filters</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-medium text-destructive-emphasis outline-none transition-colors hover:text-destructive-emphasis/80 focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear all
          </button>

          {/* Save split-button (save + chevron dropdown affordance) */}
          <div ref={saveMenuRef} className="relative flex">
            <button
              type="button"
              onClick={() => {
                setSaveMenuOpen(false)
                onSave?.()
              }}
              aria-label="Save filters"
              className="grid size-9 place-items-center rounded-s-sm border border-e-0 border-border bg-card text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Save className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Save options"
              aria-expanded={saveMenuOpen}
              onClick={() => setSaveMenuOpen((o) => !o)}
              className="grid size-9 place-items-center rounded-e-sm border border-border bg-card text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronDown className="size-4" />
            </button>
            {saveMenuOpen ? (
              <div
                role="menu"
                className="absolute end-0 top-full z-20 mt-1 w-44 rounded-sm border border-border bg-popover p-1 text-sm shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSaveMenuOpen(false)
                    onSave?.()
                  }}
                  className="block w-full rounded-xs px-2 py-1.5 text-start text-foreground outline-none hover:bg-muted focus-visible:bg-muted"
                >
                  Save as new view
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSaveMenuOpen(false)
                    onSave?.()
                  }}
                  className="block w-full rounded-xs px-2 py-1.5 text-start text-foreground outline-none hover:bg-muted focus-visible:bg-muted"
                >
                  Update view
                </button>
              </div>
            ) : null}
          </div>

          {/* Settings gear */}
          <button
            type="button"
            aria-label="Filter settings"
            className="grid size-9 place-items-center rounded-sm border border-border bg-card text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Settings className="size-4" />
          </button>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid size-9 place-items-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Tags */}
      <section aria-label="Tags">
        <div className="mb-2 text-sm font-semibold text-muted-foreground">
          Tags
        </div>
        <div className="flex min-h-12 w-full flex-wrap items-center gap-2 rounded-sm border border-border bg-background px-3 py-2 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/25">
          <Tag className="size-4 shrink-0 text-muted-foreground" />
          {value.tags.map((tag) => {
            const opt = tagOptions.find((o) => o.value === tag)
            return (
              <span
                key={tag}
                data-slot="tag-chip"
                className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground"
              >
                {opt?.label ?? tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove ${opt?.label ?? tag}`}
                  className="grid place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-3" />
                </button>
              </span>
            )
          })}
          <input
            type="text"
            list={tagOptionsId}
            value={tagQuery}
            onChange={(e) => setTagQuery(e.target.value)}
            onKeyDown={onTagKeyDown}
            placeholder={value.tags.length === 0 ? 'Select Tags' : ''}
            aria-label="Add tag"
            className="min-w-24 flex-1 border-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <datalist id={tagOptionsId}>
            {tagSuggestions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </datalist>
        </div>
      </section>

      {/* Grouped facet sections */}
      {groups.map((group) => (
        <section key={group.key} aria-label={group.label}>
          <div className="mb-4 text-sm font-semibold text-muted-foreground">
            {group.label}
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {group.options.map((opt) => {
              const checked = isChecked(group.key, opt.value)
              return (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) =>
                      toggleOption(group.key, opt.value, next === true)
                    }
                    aria-label={opt.label}
                  />
                  <span className="text-[15px] text-foreground">
                    {opt.label}
                  </span>
                  {opt.count !== undefined ? (
                    <span className="ms-1 text-xs text-muted-foreground">
                      {opt.count}
                    </span>
                  ) : null}
                </label>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

export { EMPTY_VALUE as EMPTY_FILTER_VALUE }

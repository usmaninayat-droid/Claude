import { useEffect, useRef, useState } from 'react'
import { Bookmark, Check, ChevronDown, Pencil, Trash2 } from '@fams/ui-kit/icons'
import { Button, Input, Popover, PopoverContent, PopoverTrigger } from '@fams/ui-kit'
import { conditionCount, type LiveFilterValue, type SavedLiveFilter } from './live-filter-model'

/**
 * SavedLiveFilters — the All Filters popover's bookmark dropdown (figma
 * live-monitoring spec §1.7 saved filters): empty state → "Save Current
 * Filter" → inline name input → saved list whose rows apply on click and
 * reveal edit/delete on hover AND focus (UX-NOTES §7 — hover-only
 * affordances are unacceptable). State-agnostic: the saved list and every
 * mutation come in as props; ids are minted by the caller.
 */
export interface SavedLiveFiltersProps {
  saved: SavedLiveFilter[]
  /** The popover's current filter value — what "Save Current Filter" captures. */
  current: LiveFilterValue
  onSave: (name: string) => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onApply: (filter: SavedLiveFilter) => void
}

function NameInput({
  initial,
  onCancel,
  onCommit,
}: {
  initial?: string
  onCancel: () => void
  onCommit: (name: string) => void
}) {
  const [name, setName] = useState(initial ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  // Focus on mount without the autoFocus attribute (jsx-a11y/no-autofocus) —
  // the input appears from an explicit user action, so moving focus is expected.
  useEffect(() => inputRef.current?.focus(), [])
  const commit = () => {
    const trimmed = name.trim()
    if (trimmed) onCommit(trimmed)
  }
  return (
    <div data-slot="saved-filter-name" className="flex items-center gap-2 p-2">
      <Input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            e.stopPropagation()
            onCancel()
          }
        }}
        placeholder="Filter name"
        aria-label="Filter name"
        className="h-8 flex-1"
      />
      <Button variant="tertiary" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button size="sm" onClick={commit} disabled={!name.trim()}>
        Save
      </Button>
    </div>
  )
}

export function SavedLiveFilters({ saved, current, onSave, onRename, onDelete, onApply }: SavedLiveFiltersProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const close = () => {
    setOpen(false)
    setSaving(false)
    setEditingId(null)
  }

  return (
    <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <PopoverTrigger asChild>
        {/*
         * Figma pairs the bookmark glyph with a caret inside a BORDERED
         * radius-8 button. Measured on 517:8640 at 1024/1920 = x1.875: the
         * two header buttons' boxes run y42→59 (17 frame rows → 32px) and the
         * caret one is 25 frame px wide (→47), the gear 17 (→32). Rounds 1–3
         * read this pair at ~20px (visual #46) and shrank both; 32px is what
         * the frame actually draws, and it is also the 17px of the round-4
         * height shortfall N5 filed against the popover.
         */}
        {/* `text-muted-foreground`: the header action glyphs render two tone
            steps lighter than the popover's body text, per 517:8640 — see the
            gear button in `LiveFiltersPopover` for the full V4 reasoning. */}
        <Button
          variant="tertiary"
          size="icon"
          className="h-8 w-auto shrink-0 gap-0.5 rounded-lg px-2 text-muted-foreground"
          aria-label="Saved filters"
        >
          <Bookmark className="size-4" aria-hidden="true" />
          <ChevronDown className="size-3 opacity-60" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1" data-slot="saved-filters-menu">
        {saving ? (
          <NameInput
            onCancel={() => setSaving(false)}
            onCommit={(name) => {
              onSave(name)
              setSaving(false)
            }}
          />
        ) : (
          <>
            {saved.length === 0 ? (
              <p className="px-3 py-2 text-body-sm text-muted-foreground">No saved filters</p>
            ) : (
              <ul className="max-h-64 overflow-y-auto" aria-label="Saved filters">
                {saved.map((filter) =>
                  editingId === filter.id ? (
                    <li key={filter.id}>
                      <NameInput
                        initial={filter.name}
                        onCancel={() => setEditingId(null)}
                        onCommit={(name) => {
                          onRename(filter.id, name)
                          setEditingId(null)
                        }}
                      />
                    </li>
                  ) : (
                    <li key={filter.id} className="group flex items-center gap-1 rounded-xs hover:bg-muted focus-within:bg-muted">
                      <button
                        type="button"
                        onClick={() => {
                          onApply(filter)
                          close()
                        }}
                        className="flex min-h-10 min-w-0 flex-1 flex-col items-start rounded-xs px-3 py-1.5 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="w-full truncate text-body-sm font-medium text-foreground">{filter.name}</span>
                        <span className="text-caption text-muted-foreground">
                          {conditionCount(filter.value)} conditions
                        </span>
                      </button>
                      <span className="flex items-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10"
                          aria-label={`Rename ${filter.name}`}
                          onClick={() => setEditingId(filter.id)}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-10 text-destructive"
                          aria-label={`Delete ${filter.name}`}
                          onClick={() => onDelete(filter.id)}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </span>
                    </li>
                  ),
                )}
              </ul>
            )}
            <div className="border-t border-border pt-1">
              <button
                type="button"
                onClick={() => setSaving(true)}
                disabled={conditionCount(current) === 0}
                className="flex min-h-10 w-full items-center gap-2 rounded-xs px-3 py-2 text-body-sm font-medium text-primary outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Check className="size-4" aria-hidden="true" />
                Save Current Filter
              </button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

SavedLiveFilters.displayName = 'SavedLiveFilters'

import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from '@fams/ui-kit/icons'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@fams/ui-kit'
import { toggleLiveFilter, type LiveFilterGroup, type LiveFilterValue } from './live-filter-model'

/**
 * LiveFilterChips — the applied-filter chip rows under the list panel's
 * search bar (figma live-monitoring spec §1.7): one chip per group with
 * selections whose label is the joined values and whose ▾ opens an inline
 * value-editor dropdown; one chip per tag; every chip has a ≥40px-hit ✕; and
 * a "Hide/Show applied filters" collapse toggle. Chips wrap to multiple rows
 * — the row owns no horizontal scroll (UX-NOTES §6).
 */
export interface LiveFilterChipsProps {
  groups: LiveFilterGroup[]
  value: LiveFilterValue
  onChange: (value: LiveFilterValue) => void
}

const CHIP_CLASS =
  'inline-flex h-6 items-center gap-1 rounded-xs border border-border bg-card ps-2 text-caption font-medium text-foreground'

function ChipRemove({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      // 24px visual, ≥40px hit area via negative-margin padding extension.
      className="relative flex size-6 items-center justify-center rounded-xs outline-none before:absolute before:-inset-2 before:content-[''] hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    >
      <X className="size-3" aria-hidden="true" />
    </button>
  )
}

export function LiveFilterChips({ groups, value, onChange }: LiveFilterChipsProps) {
  const [collapsed, setCollapsed] = useState(false)
  const activeGroups = groups.filter((g) => (value.filters[g.col]?.length ?? 0) > 0)
  const hasChips = activeGroups.length > 0 || value.tags.length > 0
  if (!hasChips) return null

  return (
    <div data-slot="live-filter-chips" className="flex flex-col gap-1">
      {!collapsed ? (
        <div className="flex flex-wrap items-center gap-1">
          {activeGroups.map((group) => {
            const selected = value.filters[group.col] ?? []
            const label = selected.join(', ')
            return (
              <span key={group.col} data-slot="live-filter-chip" title={`${group.label}: ${label}`} className={CHIP_CLASS}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Edit ${group.label} filter`}
                      className="relative flex max-w-48 items-center gap-1 outline-none before:absolute before:-inset-y-2 before:-inset-x-1 before:content-[''] focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="truncate">{label}</span>
                      <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden="true" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>{group.label}</DropdownMenuLabel>
                    {group.options.map((option) => (
                      <DropdownMenuCheckboxItem
                        key={option.value}
                        checked={selected.includes(option.value)}
                        onCheckedChange={(checked) =>
                          onChange(toggleLiveFilter(value, group.col, option.value, checked === true))
                        }
                        onSelect={(e) => e.preventDefault()}
                      >
                        {option.value}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <ChipRemove
                  label={`Clear ${group.label} filter`}
                  onClick={() => onChange({ ...value, filters: { ...value.filters, [group.col]: [] } })}
                />
              </span>
            )
          })}
          {value.tags.map((tag) => (
            <span key={tag} data-slot="live-filter-chip" title={`Tag: ${tag}`} className={CHIP_CLASS}>
              <span className="max-w-48 truncate">{tag}</span>
              <ChipRemove
                label={`Remove tag ${tag}`}
                onClick={() => onChange({ ...value, tags: value.tags.filter((t) => t !== tag) })}
              />
            </span>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((c) => !c)}
        className="flex min-h-6 items-center gap-1 self-start rounded-xs text-caption font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {collapsed ? 'Show applied filters' : 'Hide applied filters'}
        {collapsed ? (
          <ChevronDown className="size-3" aria-hidden="true" />
        ) : (
          <ChevronUp className="size-3" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}

LiveFilterChips.displayName = 'LiveFilterChips'

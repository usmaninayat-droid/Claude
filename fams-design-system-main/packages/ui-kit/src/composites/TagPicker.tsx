import { useCallback, useMemo, useState } from 'react'
import { Command } from 'cmdk'
import { ChevronDown, Loader2, Search, Tag as TagIcon } from '../icons'
import { cn } from '../lib/cn'
import { Popover, PopoverTrigger, PopoverContent } from '../primitives/Popover'
import { TagChipList, type TagOption } from './TagChipList'

export interface TagPickerProps {
  /** DOM id for the trigger element — lets a caller's `<label htmlFor>` bind to the real focusable control. */
  id?: string
  /** Always caller-supplied — static list, or resolved by an app-layer hook (e.g. `useTagOptions`). */
  options: TagOption[]
  value: string[]
  onChange: (value: string[]) => void
  /**
   * Group keys where selecting a tag deselects any other selected tag
   * already in that same group — the v5 "single_select category" rule
   * (e.g. a "Priority" category where only one priority tag can apply).
   * Groups not listed here behave as independent multi-select.
   */
  exclusiveGroups?: string[]
  loading?: boolean
  emptyText?: ReactNodeLike
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Kept local to avoid importing `ReactNode` just for one optional prop type.
type ReactNodeLike = import('react').ReactNode

const TRIGGER_SIZE: Record<NonNullable<TagPickerProps['size']>, string> = {
  sm: 'min-h-8 px-2 text-xs',
  md: 'min-h-9 px-3 text-sm',
  lg: 'min-h-10 px-4 text-base',
}

/**
 * TagPicker — assign/filter by tag, grouped with optional per-group
 * exclusivity. Retires the v5 codebase's `TagsCard`/`TagFilter`/`TagsInput`
 * lineage (~4 near-duplicate Pinia-coupled popups) — this presenter takes
 * `options` and never reads a tag store; resolving/fetching tags is the
 * caller's `useTagOptions`-style hook, same contract as `useEntityPicker`.
 */
export function TagPicker({
  id,
  options,
  value,
  onChange,
  exclusiveGroups = [],
  loading = false,
  emptyText = 'No tags',
  placeholder = 'Select tags…',
  disabled = false,
  size = 'md',
  className,
}: TagPickerProps) {
  // F1 fix: cmdk's `Command.List` always overwrites any `id` we pass it with
  // its own internally-generated one (verified against cmdk@1.1.1's source —
  // it spreads props before setting `id: b.listId`), so a static `useId()`
  // value here would dangle. Instead we read the id cmdk actually assigned
  // via a ref once the list mounts and mirror it into the trigger's
  // `aria-controls`, so it always points at the real `role="listbox"` node.
  const [listboxId, setListboxId] = useState<string>()
  const registerListboxRef = useCallback((node: HTMLDivElement | null) => {
    setListboxId(node?.id)
  }, [])
  const [query, setQuery] = useState('')
  const selectedTags = useMemo(() => options.filter((o) => value.includes(o.value)), [options, value])

  const groups = useMemo(() => {
    const order: string[] = []
    const byGroup = new Map<string, TagOption[]>()
    for (const opt of options) {
      const key = opt.group ?? ''
      if (!byGroup.has(key)) {
        byGroup.set(key, [])
        order.push(key)
      }
      byGroup.get(key)!.push(opt)
    }
    return order.map((key) => ({ key, label: key || 'Tags', options: byGroup.get(key)! }))
  }, [options])

  // cmdk's own `shouldFilter` is left off (see below) so the query drives
  // this local filter directly — same self-filter pattern as Combobox.
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map((g) => ({ ...g, options: g.options.filter((o) => o.label.toLowerCase().includes(q)) }))
      .filter((g) => g.options.length > 0)
  }, [groups, query])

  const toggle = (opt: TagOption) => {
    const isSelected = value.includes(opt.value)
    if (isSelected) {
      onChange(value.filter((v) => v !== opt.value))
      return
    }
    const exclusive = opt.group && exclusiveGroups.includes(opt.group)
    const next = exclusive
      ? [...value.filter((v) => options.find((o) => o.value === v)?.group !== opt.group), opt.value]
      : [...value, opt.value]
    onChange(next)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          data-slot="tag-picker-trigger"
          className={cn(
            'flex w-full items-center gap-2 rounded-sm border border-border bg-input-background text-start text-foreground outline-none',
            TRIGGER_SIZE[size],
            'focus:ring-2 focus:ring-ring focus:border-primary',
            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <TagIcon className="size-4 shrink-0 text-muted-foreground" />
          {selectedTags.length > 0 ? (
            <TagChipList tags={selectedTags} size="sm" className="flex-1" />
          ) : (
            <span className="flex-1 truncate text-muted-foreground">{placeholder}</span>
          )}
          {loading ? (
            <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" data-motion="essential" />
          ) : (
            <ChevronDown className="size-4 shrink-0 opacity-50" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent aria-label="Tags" className="w-72 max-h-80 overflow-hidden p-0">
        {options.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          // `shouldFilter={false}`: WE filter `groups` ourselves (see
          // `filteredGroups` above) — same self-filter contract as Combobox —
          // so cmdk is only responsible for the roving highlight / keyboard
          // path (arrow up/down, Enter, type-ahead via the query it drives).
          <Command shouldFilter={false} data-slot="tag-picker-command">
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Search tags…"
                className="h-9 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Command.List
              ref={registerListboxRef}
              aria-multiselectable="true"
              className="max-h-64 overflow-y-auto p-2"
            >
              {filteredGroups.length === 0 ? (
                <Command.Empty className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No matches
                </Command.Empty>
              ) : (
                <div className="flex flex-col gap-field">
                  {filteredGroups.map((group) => (
                    <Command.Group
                      key={group.key || '__ungrouped'}
                      heading={group.key ? group.label : undefined}
                      className="[&_[cmdk-group-heading]]:mb-inline [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
                    >
                      <div className="flex flex-wrap gap-inline">
                        {group.options.map((opt) => {
                          const selected = value.includes(opt.value)
                          return (
                            <Command.Item
                              key={opt.value}
                              value={opt.value}
                              onSelect={() => toggle(opt)}
                              className={cn(
                                'inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-medium outline-none transition-colors',
                                'data-[selected=true]:ring-2 data-[selected=true]:ring-ring',
                                selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/70',
                              )}
                            >
                              {opt.color ? (
                                <span
                                  aria-hidden="true"
                                  className="size-1.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: selected ? 'currentColor' : opt.color }}
                                />
                              ) : null}
                              {opt.label}
                            </Command.Item>
                          )
                        })}
                      </div>
                    </Command.Group>
                  ))}
                </div>
              )}
            </Command.List>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  )
}

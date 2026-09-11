import { forwardRef, useCallback, useId, useMemo, useState } from 'react'
import { Command } from 'cmdk'
import { Search } from '../icons'
import { toArray } from '../lib/toArray'
import { Popover, PopoverTrigger, PopoverContent } from '../primitives/Popover'
import { Checkbox } from '../primitives/Checkbox'
import type { PeoplePickerProps, PersonOption } from './PeoplePicker.types'
import { PersonRow } from './PeoplePickerRow'
import { PeoplePickerTrigger } from './PeoplePickerTrigger'

/**
 * PeoplePicker — the one searchable person selector. [L3 composite]
 *
 * Consolidates single-pick (Owner/Created-By) and multi-pick (Assignee) into
 * one presenter: `multiple` swaps the row glyph between a decorative radio
 * dot (click-and-close) and a real `Checkbox` (toggle-and-stay), sharing the
 * same popover body — search, an optional pinned "you" row, select-all, and
 * empty state. `triggerVariant="assignee-chip"` folds in the dashed "+ Assign"
 * empty-state trigger; `"field"` matches the bordered Input/Select trigger.
 *
 * State-agnostic (Rule 8): filters `people` it was GIVEN, locally, by name/email.
 * Fetching the roster is the caller's concern, same contract as Combobox.
 *
 * Structure: this file owns state + composition; the trigger button variants
 * live in `PeoplePickerTrigger.tsx`, the row in `PeoplePickerRow.tsx`, and the
 * shared avatar pieces in `PeoplePickerAvatar.tsx` (same decomposition
 * convention as `DataTable.tsx` + its sibling subcomponents). Types are in
 * `PeoplePicker.types.ts`.
 *
 * @usage-v5
 *   Retires ~5 forked assignee/owner pickers in the v5 codebase:
 *   - `iwmp/components/pipeline/AssigneeSelector.vue` — single-pick popup, `avatarOnly`/`editable` flags
 *   - `shared/components/list/SelectUserList.vue` — q-select + use-input + client-side `filterFn`
 *   - `shared/components/list/AssigneeList.vue`, `UserList.vue` — read-only rosters, same row shape
 *   - `iwmp/components/list/ReporterList.vue` — reporter selection (single-pick variant)
 *   - `iwmp/components/inspector/common/Assignee.vue` — resolved-single-person card (maps to pinned/chosen row)
 *   Forms needed: single vs multi, search, pinned "you", select-all, dashed "+ Assign" empty state.
 * @usage-index people-picker
 */

export type { PersonColorIndex, PersonOption, PeoplePickerProps } from './PeoplePicker.types'

export const PeoplePicker = forwardRef<HTMLButtonElement, PeoplePickerProps>(
  (
    {
      id,
      people,
      value,
      onChange,
      multiple = false,
      currentPersonId,
      sectionLabel = 'People',
      placeholder,
      emptyText = 'No people found',
      disabled = false,
      triggerVariant = 'field',
      onClear,
      size = 'md',
      align = 'start',
      className,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState('')
    const searchId = useId()
    const selectAllId = useId()

    // F1 fix: cmdk's `Command.List` always overwrites any `id` we pass it
    // with its own internally-generated one (verified against cmdk@1.1.1's
    // source — it spreads props before setting `id: b.listId`), so a static
    // `useId()` value here would dangle. Instead we read the id cmdk
    // actually assigned via a ref once the list mounts and mirror it into
    // the trigger's `aria-controls`, so it always points at the real
    // `role="listbox"` node.
    const [listboxId, setListboxId] = useState<string>()
    const registerListboxRef = useCallback((node: HTMLDivElement | null) => {
      setListboxId(node?.id)
    }, [])

    const byId = useMemo(() => new Map(people.map((p) => [p.id, p] as const)), [people])
    const selectedIds = toArray(value)
    const chosen = useMemo(
      () => selectedIds.map((id) => byId.get(id)).filter((p): p is PersonOption => Boolean(p)),
      [selectedIds, byId],
    )

    const currentPerson = currentPersonId ? byId.get(currentPersonId) : undefined
    const others = useMemo(() => {
      const q = query.trim().toLowerCase()
      return people.filter((p) => {
        if (p.id === currentPersonId) return false
        if (!q) return true
        return p.name.toLowerCase().includes(q) || (p.email ?? '').toLowerCase().includes(q)
      })
    }, [people, currentPersonId, query])

    const allOthersSelected = others.length > 0 && others.every((p) => selectedIds.includes(p.id))
    const someOthersSelected = others.some((p) => selectedIds.includes(p.id))

    const toggle = (id: string) => {
      if (multiple) {
        const next = selectedIds.includes(id) ? selectedIds.filter((v) => v !== id) : [...selectedIds, id]
        onChange(next)
        return
      }
      onChange(id === selectedIds[0] ? null : id)
      setOpen(false)
    }

    const toggleSelectAll = () => {
      onChange(
        allOthersSelected
          ? selectedIds.filter((id) => !others.some((p) => p.id === id))
          : Array.from(new Set([...selectedIds, ...others.map((p) => p.id)])),
      )
    }

    const resolvedPlaceholder = placeholder ?? (triggerVariant === 'assignee-chip' ? 'Assign' : 'Unassigned')

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <PeoplePickerTrigger
            id={id}
            ref={ref}
            triggerVariant={triggerVariant}
            disabled={disabled}
            open={open}
            listboxId={listboxId}
            chosen={chosen}
            multiple={multiple}
            resolvedPlaceholder={resolvedPlaceholder}
            onClear={onClear}
            size={size}
            className={className}
          />
        </PopoverTrigger>

        <PopoverContent align={align} aria-label="People" className="w-72 overflow-hidden p-0">
          {/* `shouldFilter={false}`: WE filter `others` ourselves via `query`
              (unchanged from before) — same self-filter contract as Combobox —
              so cmdk is only responsible for the roving highlight / keyboard
              path (arrow up/down, Enter, type-ahead via the query it drives). */}
          <Command shouldFilter={false} data-slot="people-picker-command">
            <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Command.Input
                id={searchId}
                value={query}
                onValueChange={setQuery}
                placeholder="Search by name or email"
                className="w-full bg-transparent text-body-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>

            <Command.List
              ref={registerListboxRef}
              aria-label={sectionLabel}
              data-slot="people-picker-list"
              className="max-h-72 overflow-auto p-1.5"
            >
              {currentPerson ? (
                <PersonRow
                  person={currentPerson}
                  selected={selectedIds.includes(currentPerson.id)}
                  mode={multiple ? 'multi' : 'single'}
                  youLabel
                  onToggle={() => toggle(currentPerson.id)}
                  checkboxId={`${searchId}-you`}
                />
              ) : null}

              <div className="flex items-center justify-between px-2 pb-1 pt-2">
                <span className="text-caption font-semibold text-muted-foreground">{sectionLabel}</span>
                {multiple && others.length > 0 ? (
                  <label htmlFor={selectAllId} className="flex cursor-pointer items-center gap-2">
                    <span className="text-caption font-semibold text-primary">
                      {allOthersSelected ? 'Clear all' : 'Select all'}
                    </span>
                    <Checkbox
                      id={selectAllId}
                      checked={allOthersSelected ? true : someOthersSelected ? 'indeterminate' : false}
                      onCheckedChange={toggleSelectAll}
                    />
                  </label>
                ) : null}
              </div>

              {others.length ? (
                others.map((p) => (
                  <PersonRow
                    key={p.id}
                    person={p}
                    selected={selectedIds.includes(p.id)}
                    mode={multiple ? 'multi' : 'single'}
                    onToggle={() => toggle(p.id)}
                    checkboxId={`${searchId}-${p.id}`}
                  />
                ))
              ) : (
                // Plain div, not `Command.Empty`: cmdk's Empty hides itself
                // whenever ANY item is registered (e.g. the pinned "You" row),
                // but this text must show whenever `others` has no matches,
                // regardless of whether a pinned row is also present.
                <div className="px-2 py-3 text-center text-body-sm text-muted-foreground">{emptyText}</div>
              )}
            </Command.List>
          </Command>
        </PopoverContent>
      </Popover>
    )
  },
)

PeoplePicker.displayName = 'PeoplePicker'

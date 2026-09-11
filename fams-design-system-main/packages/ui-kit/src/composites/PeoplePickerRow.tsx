import { Command } from 'cmdk'
import { cn } from '../lib/cn'
import { Checkbox } from '../primitives/Checkbox'
import type { PersonOption } from './PeoplePicker.types'
import { PersonAvatar } from './PeoplePickerAvatar'

/**
 * `PeoplePickerRow` — a single person row inside `PeoplePicker`'s list, split
 * out from `PeoplePicker.tsx` (same decomposition convention as `TableCell.tsx`
 * + its siblings). Switches between a decorative single-pick radio dot and a
 * real multi-pick `Checkbox` based on `mode`.
 */
export function PersonRow({
  person,
  selected,
  mode,
  youLabel,
  onToggle,
  checkboxId,
}: {
  person: PersonOption
  selected: boolean
  mode: 'single' | 'multi'
  youLabel?: boolean
  onToggle: () => void
  checkboxId: string
}) {
  const content = (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-body-sm font-medium text-foreground">
        {youLabel ? 'You' : person.name}
      </span>
      {person.email ? (
        <span className="block truncate text-caption text-muted-foreground">{person.email}</span>
      ) : null}
    </span>
  )

  if (mode === 'multi') {
    return (
      // `Command.Item` gives this row the roving highlight + Enter-to-toggle
      // keyboard path (mirrors Combobox's cmdk pattern). The native
      // `<label htmlFor>` keeps its own click → `Checkbox.onCheckedChange`
      // wiring for mouse/touch (unchanged from before); its `onClick` stops
      // propagation so that click doesn't ALSO re-fire through cmdk's own
      // item click handler and double-toggle.
      <Command.Item
        value={person.id}
        onSelect={onToggle}
        data-slot="people-picker-row"
        className="rounded-sm outline-none data-[selected=true]:bg-muted"
      >
        {/* Not new interactivity: `<label htmlFor>` is already natively
            click-activated (forwards to the associated `Checkbox`, itself
            fully keyboard-operable) — `onClick` here only stops that click
            from bubbling into cmdk's own item handler, see comment above. */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
        <label
          htmlFor={checkboxId}
          onClick={(e) => e.stopPropagation()}
          className="flex w-full cursor-pointer items-center gap-3 px-2 py-1.5"
        >
          <Checkbox id={checkboxId} checked={selected} onCheckedChange={onToggle} />
          <PersonAvatar person={person} size="sm" />
          {content}
        </label>
      </Command.Item>
    )
  }

  return (
    <Command.Item
      value={person.id}
      onSelect={onToggle}
      data-slot="people-picker-row"
      className="flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-start outline-none data-[selected=true]:bg-muted"
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
      <PersonAvatar person={person} size="sm" />
      {content}
    </Command.Item>
  )
}

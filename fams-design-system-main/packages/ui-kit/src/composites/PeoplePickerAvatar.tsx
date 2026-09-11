import { cn } from '../lib/cn'
import { Avatar } from '../primitives/Avatar'
import type { PersonColorIndex, PersonOption } from './PeoplePicker.types'

/**
 * `PeoplePicker` avatar pieces — split out from `PeoplePicker.tsx` (same
 * decomposition convention as `TableCell.tsx` + its siblings). Shared by both
 * `PeoplePickerRow` (list rows) and `PeoplePickerTrigger` (the chosen-people
 * stack shown on the trigger itself).
 */

/** Categorical index → `--color-chart-1..5` ring, cycling every 5 (1→1, …, 5→5,
 *  6→1, …), same escape hatch as `Badge`'s `colorIndex`. */
const AVATAR_RING_CLASSES: Record<PersonColorIndex, string> = {
  1: 'ring-chart-1',
  2: 'ring-chart-2',
  3: 'ring-chart-3',
  4: 'ring-chart-4',
  5: 'ring-chart-5',
  6: 'ring-chart-1',
  7: 'ring-chart-2',
  8: 'ring-chart-3',
  9: 'ring-chart-4',
  10: 'ring-chart-5',
}

export function colorIndexFor(person: PersonOption): PersonColorIndex {
  if (person.colorIndex) return person.colorIndex
  let hash = 0
  for (let i = 0; i < person.id.length; i++) hash = (hash * 31 + person.id.charCodeAt(i)) >>> 0
  return ((hash % 10) + 1) as PersonColorIndex
}

export function PersonAvatar({
  person,
  size,
  className,
}: {
  person: PersonOption
  size: 'xs' | 'sm'
  className?: string
}) {
  return (
    <Avatar
      size={size}
      name={person.name}
      src={person.avatarUrl}
      className={cn(
        'ring-2 ring-offset-1 ring-offset-card',
        AVATAR_RING_CLASSES[colorIndexFor(person)],
        className,
      )}
    />
  )
}

export function AvatarStack({ people, size }: { people: PersonOption[]; size: 'xs' | 'sm' }) {
  return (
    <span className="flex shrink-0 items-center">
      {people.slice(0, 3).map((p, i) => (
        <PersonAvatar key={p.id} person={p} size={size} className={i > 0 ? '-ms-2' : undefined} />
      ))}
    </span>
  )
}

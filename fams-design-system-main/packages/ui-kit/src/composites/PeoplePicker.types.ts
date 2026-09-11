import type { ReactNode } from 'react'

/**
 * `PeoplePicker` types — split out from `PeoplePicker.tsx` (same decomposition
 * convention as `DataTable.types.ts` / `DataTable.tsx`, `TableCell.types.ts` /
 * `TableCell.tsx`). See `PeoplePicker.tsx` for the component's own doc
 * comment (usage rationale, retired v5 pickers).
 */

export type PersonColorIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export interface PersonOption {
  id: string
  name: string
  email?: string
  avatarUrl?: string
  /** Categorical avatar ring tint (1–10, cycling every 5 → `--color-chart-1..5`). Derived from `id` when omitted. */
  colorIndex?: PersonColorIndex
}

export interface PeoplePickerProps {
  /** DOM id for the trigger button — lets a caller's `<label htmlFor>` bind to the real focusable control. */
  id?: string
  /** Always caller-supplied — state-agnostic (Rule 8), no fetching inside. */
  people: PersonOption[]
  /** Controlled selection: a single id (single mode) or an array of ids (multi mode). */
  value: string | string[] | null
  onChange: (value: string | string[] | null) => void
  /** Checkbox multi-select (toggle-and-stay) vs single radio-style pick-and-close. */
  multiple?: boolean
  /** Pins this person to the top of the list, labelled "You". */
  currentPersonId?: string
  /** Section label above the list (e.g. "Assignee", "Owner"). */
  sectionLabel?: string
  placeholder?: string
  emptyText?: ReactNode
  disabled?: boolean
  /** `field` = bordered control matching Input/Select. `assignee-chip` = borderless, dashed "+ Assign" pill when empty. */
  triggerVariant?: 'field' | 'assignee-chip'
  /**
   * One-click clear on the `assignee-chip` trigger: a hover-revealed "×" at
   * the end of the assigned chip. Only rendered when there's a selection AND
   * this is provided — omit to keep the chip clear-less.
   */
  onClear?: () => void
  size?: 'sm' | 'md' | 'lg'
  align?: 'start' | 'end'
  className?: string
}

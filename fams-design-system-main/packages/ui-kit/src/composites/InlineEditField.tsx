import { useState, type ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/Popover'
import { Pencil } from '../icons'

export interface InlineEditFieldProps {
  /** The rendered value, shown until the user edits it. Truncates when long. */
  value: ReactNode
  /** Names the field for assistive tech — becomes "Edit {label}" on the pencil. */
  label: string
  /** Popup body. Call the supplied `close()` once a value commits. */
  children: (close: () => void) => ReactNode
}

/**
 * InlineEditField — edit a value in place: hover (or keyboard-focus) reveals a
 * pencil at the end of the value, which opens an anchored popover.
 *
 * The pencil is opacity-0 until `group-hover` or `focus-visible`, so the row
 * stays quiet when nobody is editing but the control is still reachable by
 * keyboard — an affordance that is hidden, not absent.
 *
 * It owns only the trigger and the anchoring; the body is yours. Pair it with
 * `PickerList` for the common "pick a replacement value" case.
 */
export function InlineEditField({ value, label, children }: InlineEditFieldProps) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span data-slot="inline-edit-field" className="group inline-flex min-w-0 max-w-full items-center gap-1">
        <span className="min-w-0 truncate">{value}</span>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Edit ${label}`}
            data-slot="inline-edit-pencil"
            className="shrink-0 text-primary opacity-0 outline-none transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Pencil aria-hidden className="size-3.5" />
          </button>
        </PopoverTrigger>
      </span>
      <PopoverContent align="start" className="w-64">
        {children(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  )
}

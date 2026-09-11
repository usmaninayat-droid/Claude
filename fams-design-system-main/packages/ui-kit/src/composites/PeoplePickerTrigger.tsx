import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { ChevronsUpDown, Plus, X } from '../icons'
import { cn } from '../lib/cn'
import type { PeoplePickerProps, PersonOption } from './PeoplePicker.types'
import { AvatarStack } from './PeoplePickerAvatar'

/**
 * `PeoplePickerTrigger` — the `field` / `assignee-chip` trigger button
 * variants, split out from `PeoplePicker.tsx` (same decomposition convention
 * as `TableCell.tsx` + its siblings).
 *
 * Extends the native button props (not just its own named ones) because
 * `PopoverTrigger asChild` clones this element with ITS OWN `onClick` (the
 * handler that actually opens the popover), `data-state`, and fallback
 * `aria-*` — via `React.cloneElement`, which lands them as plain props on
 * this component, not on the DOM node. Dropping them here would silently
 * break click-to-open. `...rest` is spread first so our own explicit
 * `aria-haspopup`/`aria-expanded`/`aria-controls` (driven by the real
 * `listboxId`, see `PeoplePicker.tsx`'s F1 fix) still win over Radix's
 * generic dialog-flavored defaults.
 */

const FIELD_TRIGGER_SIZE: Record<NonNullable<PeoplePickerProps['size']>, string> = {
  sm: 'h-8 px-2 text-xs',
  md: 'h-9 px-3 text-sm',
  lg: 'h-10 px-4 text-base',
}

const TRIGGER_AVATAR_SIZE: Record<NonNullable<PeoplePickerProps['size']>, 'xs' | 'sm'> = {
  sm: 'xs',
  md: 'xs',
  lg: 'sm',
}

export interface PeoplePickerTriggerProps
  extends Omit<ComponentPropsWithoutRef<'button'>, 'disabled' | 'className' | 'children'> {
  triggerVariant: NonNullable<PeoplePickerProps['triggerVariant']>
  disabled: boolean
  open: boolean
  /** Mirrors the id cmdk actually assigned the listbox (see `PeoplePicker.tsx`'s F1 fix) — omitted while the popover is closed and the listbox doesn't exist yet. */
  listboxId: string | undefined
  chosen: PersonOption[]
  multiple: boolean
  resolvedPlaceholder: string
  onClear?: () => void
  size: NonNullable<PeoplePickerProps['size']>
  className?: string
}

export const PeoplePickerTrigger = forwardRef<HTMLButtonElement, PeoplePickerTriggerProps>(
  (
    {
      triggerVariant,
      disabled,
      open,
      listboxId,
      chosen,
      multiple,
      resolvedPlaceholder,
      onClear,
      size,
      className,
      ...rest
    },
    ref,
  ) => {
    const avatarSize = TRIGGER_AVATAR_SIZE[size]

    if (triggerVariant === 'assignee-chip') {
      return (
        <button
          {...rest}
          ref={ref}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          data-slot="people-picker-trigger"
          className={cn(
            chosen.length
              ? 'group inline-flex max-w-full items-center gap-2 rounded-sm px-1.5 py-1 text-start outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring'
              : 'inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/50 py-1 ps-1.5 pe-2.5 text-xs font-semibold text-primary outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring',
            disabled && 'pointer-events-none opacity-50',
            className,
          )}
        >
          {chosen.length ? (
            <>
              <AvatarStack people={chosen} size={avatarSize} />
              <span className="truncate text-body-sm font-medium text-foreground">
                {multiple && chosen.length > 1 ? `${chosen.length} selected` : chosen[0].name}
              </span>
              {onClear ? (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Clear"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    onClear()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.stopPropagation()
                      e.preventDefault()
                      onClear()
                    }
                  }}
                  className="grid size-4 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 outline-none transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
                >
                  <X className="size-3" />
                </span>
              ) : null}
            </>
          ) : (
            <>
              <span className="grid size-5 shrink-0 place-items-center rounded-full border border-dashed border-primary/50">
                <Plus className="size-3" />
              </span>
              {resolvedPlaceholder}
            </>
          )}
        </button>
      )
    }

    return (
      <button
        {...rest}
        ref={ref}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        data-slot="people-picker-trigger"
        className={cn(
          'flex w-full min-w-0 items-center justify-between gap-2 rounded-sm border border-border bg-input-background text-start text-foreground outline-none',
          FIELD_TRIGGER_SIZE[size],
          'focus:ring-2 focus:ring-ring focus:border-primary',
          disabled && 'pointer-events-none cursor-not-allowed opacity-50',
          className,
        )}
      >
        {chosen.length ? (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <AvatarStack people={chosen} size={avatarSize} />
            <span className="min-w-0 flex-1 truncate">
              {multiple && chosen.length > 1 ? `${chosen.length} selected` : chosen[0].name}
            </span>
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{resolvedPlaceholder}</span>
        )}
        <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
      </button>
    )
  },
)

PeoplePickerTrigger.displayName = 'PeoplePickerTrigger'

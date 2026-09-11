import { useId, type ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Switch } from '../primitives/Switch'
import { Checkbox } from '../primitives/Checkbox'
import { Card } from './Card'

/**
 * ToggleFieldGroup — a labelled panel whose body only renders while a switch
 * or checkbox gate is ON. [L3 composite]
 *
 * Generalizes two shapes the platform's create-rule wizard needs (Figma
 * `create-rule-wizard` SPEC §1.4 Trigger Rule / §1.3 Reminders): three
 * independently-gated bordered cards, each pairing an interval-style input
 * with a "Send Reminder Before" input; and three checkbox-gated rows, each
 * revealing a recipient picker when checked. Same shape, different control —
 * `controlKind` picks which (rule 10: no business vocabulary — `odometer`/
 * `trigger`/`reminder`/`maintenance` never appear here; the wizard's own
 * blueprint/composition layer supplies those as `label`/`children`).
 *
 * Fully controlled and state-agnostic (Rule 8): this component holds no
 * field values of its own, only the gate's own `checked` boolean. It never
 * clears anything on toggle — `{checked && children}` unmounts the revealed
 * content while OFF, but the underlying VALUES a consumer's `children` are
 * bound to live in the consumer's own state, so toggling OFF then back ON
 * retains whatever was staged (the B3 UX ruling: discarding user input on a
 * toggle is destructive and unexpected). A switched-OFF panel still shows
 * `summary` — a one-line recap of its current values — so hidden
 * configuration stays discoverable instead of vanishing without a trace.
 *
 * Accessibility (B3): the gate control is labelled by the panel's own title
 * via `aria-labelledby` (never a redundant second accessible name); the
 * revealed/hidden transition is announced via `aria-live="polite"` on the
 * content region (the ARIA-safe option for a `switch`/`checkbox` role, which
 * — unlike `button` — do not support `aria-expanded` per the ARIA role
 * spec).
 */
export interface ToggleFieldGroupProps {
  /** Whether the panel's gate is ON (content shown) or OFF (summary shown). */
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** Panel title — also becomes the gate control's accessible name. */
  label: ReactNode
  /** Rendered only while `checked` is true. */
  children?: ReactNode
  /**
   * Static caption at the trailing edge of the revealed content (e.g. a
   * "Before Due" caption sitting beside the last field in `children`).
   * Omitted entirely when not passed.
   */
  trailingLabel?: ReactNode
  /**
   * One-line recap of the panel's current values, shown in place of
   * `children` while `checked` is false — the discoverability requirement
   * from B3 ("a switched-OFF panel keeps a one-line summary of its current
   * values"). Omitted entirely when not passed (an OFF panel with no
   * `summary` shows just its title + gate, matching Figma's collapsed
   * anatomy).
   */
  summary?: ReactNode
  /**
   * Which control gates the panel: a `Switch` (Trigger Rule's three cards) or
   * a `Checkbox` (Reminders' three channel rows). Defaults to `'switch'`.
   */
  controlKind?: 'switch' | 'checkbox'
  disabled?: boolean
  className?: string
}

export function ToggleFieldGroup({
  checked,
  onCheckedChange,
  label,
  children,
  trailingLabel,
  summary,
  controlKind = 'switch',
  disabled,
  className,
}: ToggleFieldGroupProps) {
  const labelId = useId()

  return (
    <Card data-slot="toggle-field-group" className={cn('p-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <span id={labelId} className="text-body-sm font-medium text-foreground">
          {label}
        </span>
        {controlKind === 'checkbox' ? (
          <Checkbox
            checked={checked}
            onCheckedChange={onCheckedChange}
            aria-labelledby={labelId}
            disabled={disabled}
          />
        ) : (
          <Switch
            checked={checked}
            onCheckedChange={onCheckedChange}
            aria-labelledby={labelId}
            disabled={disabled}
          />
        )}
      </div>

      <div aria-live="polite" data-slot="toggle-field-group-content">
        {checked ? (
          <div className="mt-3 flex items-end justify-between gap-4">
            <div className="min-w-0 flex-1">{children}</div>
            {trailingLabel ? (
              <span className="shrink-0 pb-1 text-caption text-muted-foreground">{trailingLabel}</span>
            ) : null}
          </div>
        ) : summary ? (
          <p data-slot="toggle-field-group-summary" className="mt-2 text-caption text-muted-foreground">
            {summary}
          </p>
        ) : null}
      </div>
    </Card>
  )
}

ToggleFieldGroup.displayName = 'ToggleFieldGroup'

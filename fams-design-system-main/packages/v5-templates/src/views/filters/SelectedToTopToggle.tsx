import { cn } from '../../lib/cn'

/**
 * SelectedToTopToggle — the side sheet's `Selected to Top` ⇄ `Original order`
 * control (FAMILY C, WAVE C5). [v5-templates]
 *
 * Spec: `specs/filters/INTERACTIONS.md` R-32 (DN-22/DN-27) — "Selected to Top
 * moves selected entities to the top of the list; once enabled it converts to
 * 'original order', which restores the actual order". So this is ONE button
 * whose label names the state it will move to, not a label that describes the
 * current state.
 *
 * a11y (D-4 / UX D.31): a real toggle button with `aria-pressed`, so the
 * pressed state is exposed independently of the label swap; the label change
 * is announced by the sheet's own live region (this component stays DOM-free
 * of live regions so two of them never fight).
 *
 * Deliberately has no knowledge of rows, selection or entities — it is a
 * two-state button. The ordering itself lives in `ExpandableSelectorSheet`.
 */
export interface SelectedToTopToggleProps {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  /** Label shown while OFF — activating it turns selected-to-top on (R-32). */
  onLabel?: string
  /** Label shown while ON — activating it restores the original order (DN-22). */
  offLabel?: string
  disabled?: boolean
  className?: string
}

export const SELECTED_TO_TOP_ON_LABEL = 'Selected to Top'
export const SELECTED_TO_TOP_OFF_LABEL = 'Original order'

export function SelectedToTopToggle({
  pressed,
  onPressedChange,
  onLabel = SELECTED_TO_TOP_ON_LABEL,
  offLabel = SELECTED_TO_TOP_OFF_LABEL,
  disabled = false,
  className,
}: SelectedToTopToggleProps) {
  return (
    <button
      type="button"
      data-slot="selected-to-top"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={() => onPressedChange(!pressed)}
      className={cn(
        // `success-text` (D-6), never the 2.62:1 `#12b76a` fill colour the
        // Figma uses for this label (I.80).
        'rounded-xs text-sm font-medium text-success-text outline-none',
        'hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {pressed ? offLabel : onLabel}
    </button>
  )
}

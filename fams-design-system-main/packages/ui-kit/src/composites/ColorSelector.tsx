import { forwardRef, useId, useState, type HTMLAttributes } from 'react'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import { Check } from '../icons'
import { cn } from '../lib/cn'

export interface ColorSelectorProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
  /** Current color as a hex string (e.g. `#0072d6`). */
  value: string
  /** Fires with the new hex — preset click, canvas drag, or hex typing. */
  onChange: (value: string) => void
  /** Preset swatch row (hex strings) — supplied by the caller, no built-in
   *  palette (same contract as `ColorPicker`). When present, the field opens
   *  in preset mode with a "Pick Custom Color" toggle to the full picker. */
  presets?: string[]
  /** Field label caption (12px, top-start). */
  label?: string
  /** Renders the required asterisk next to the label. */
  required?: boolean
  disabled?: boolean
  /** Copy for the mode-toggle link (override for i18n). */
  customModeLabel?: string
  presetModeLabel?: string
}

/**
 * ColorSelector — inline color field (Figma Design System V2, node 5580:3108).
 * [L3 composite]
 *
 * An outlined field card with a label header and a trailing mode-toggle link,
 * hosting either a preset swatch row (selected swatch shows a check) or a
 * custom picker: `react-colorful` saturation canvas + hue slider, a color
 * lump, and a validated hex field. Fully controlled via `value`/`onChange`;
 * mode is local UI state. No built-in palette — presets come from the caller.
 */
export const ColorSelector = forwardRef<HTMLDivElement, ColorSelectorProps>(
  (
    {
      value,
      onChange,
      presets,
      label,
      required = false,
      disabled = false,
      customModeLabel = 'Pick Custom Color',
      presetModeLabel = 'Predefined Colors',
      className,
      ...props
    },
    ref,
  ) => {
    const hasPresets = Boolean(presets && presets.length > 0)
    const [custom, setCustom] = useState(!hasPresets)
    const showToggle = hasPresets
    const reactId = useId()
    const labelId = `${reactId}-label`
    const normalized = value.toLowerCase()
    return (
      <div
        ref={ref}
        role="group"
        aria-labelledby={label ? labelId : undefined}
        data-slot="color-selector"
        className={cn(
          'flex w-full flex-col gap-2 rounded-sm border border-input bg-input-background px-3 py-2',
          disabled && 'pointer-events-none opacity-50',
          className,
        )}
        {...props}
      >
        <div className="flex w-full items-start justify-between gap-2 text-xs">
          <span id={labelId} className="flex items-center gap-1 font-semibold text-muted-foreground">
            {label}
            {required ? (
              <span aria-hidden className="font-medium text-destructive-emphasis">
                *
              </span>
            ) : null}
          </span>
          {showToggle ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setCustom((c) => !c)}
              className="rounded-xs font-semibold text-primary outline-none transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {custom ? presetModeLabel : customModeLabel}
            </button>
          ) : null}
        </div>
        {!custom && hasPresets ? (
          <div
            role="radiogroup"
            aria-labelledby={label ? labelId : undefined}
            tabIndex={-1}
            className="flex w-full flex-wrap items-center justify-between gap-2"
            onKeyDown={(e) => {
              // Roving radiogroup: arrows move selection between swatches (fix3).
              const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']
              if (!presets || !keys.includes(e.key)) return
              e.preventDefault()
              const idx = presets.findIndex((c) => c.toLowerCase() === normalized)
              const dir = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1
              const next = presets[(idx + dir + presets.length) % presets.length]
              onChange(next)
              const btn = e.currentTarget.querySelector<HTMLButtonElement>(`[aria-label="${next}"]`)
              btn?.focus()
            }}
          >
            {presets!.map((preset) => {
              const selected = preset.toLowerCase() === normalized
              return (
                <button
                  key={preset}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={preset}
                  disabled={disabled}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => onChange(preset)}
                  className="flex size-6 shrink-0 items-center justify-center rounded-xs outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-95"
                  style={{ backgroundColor: preset }}
                >
                  {selected ? <Check aria-hidden className="size-3.5 text-primary-foreground" /> : null}
                </button>
              )
            })}
          </div>
        ) : null}
        {custom ? (
          <div className="flex w-full flex-col gap-3" inert={disabled || undefined}>
            <HexColorPicker
              color={value}
              onChange={onChange}
              className="color-selector-canvas"
              style={{ width: '100%' }}
            />
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-4 shrink-0 rounded-xs border border-border"
                style={{ backgroundColor: value }}
              />
              <div className="flex flex-1 items-center gap-1 rounded-sm bg-muted px-3 py-2 text-sm">
                <span aria-hidden className="font-medium text-muted-foreground">
                  #
                </span>
                <HexColorInput
                  aria-label="Hex color"
                  color={value}
                  onChange={onChange}
                  disabled={disabled}
                  className="w-full bg-transparent font-medium text-foreground uppercase outline-none"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    )
  },
)

ColorSelector.displayName = 'ColorSelector'

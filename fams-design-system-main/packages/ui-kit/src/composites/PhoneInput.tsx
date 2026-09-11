import { useId, useMemo, useState } from 'react'
import { ChevronDown } from '../icons'
import { cn } from '../lib/cn'
import { Popover, PopoverTrigger, PopoverContent } from '../primitives/Popover'

export interface PhoneCountry {
  /** ISO 3166-1 alpha-2 (e.g. `'AE'`). */
  iso: string
  name: string
  /** Leading `+`, e.g. `'+971'`. */
  dialCode: string
}

/**
 * Regional-indicator flag emoji from an ISO alpha-2 code — zero assets, zero
 * dependencies (root CLAUDE.md hard rule 1: OSS-only, no paid/asset deps).
 * Renders as a real flag glyph on platforms with emoji flag support and
 * degrades to the two letters elsewhere; acceptable per figma-spec-create-
 * sheet.md §2's "spare unicode-emoji flag rendering" allowance.
 */
export function isoToFlagEmoji(iso: string): string {
  const codePoints = iso
    .toUpperCase()
    .split('')
    .map((c) => 0x1f1e6 - 65 + c.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

/** A small builtin roster — callers pass their own `countries` list to extend/replace it. */
export const DEFAULT_PHONE_COUNTRIES: PhoneCountry[] = [
  { iso: 'AE', name: 'United Arab Emirates', dialCode: '+971' },
  { iso: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
  { iso: 'QA', name: 'Qatar', dialCode: '+974' },
  { iso: 'KW', name: 'Kuwait', dialCode: '+965' },
  { iso: 'BH', name: 'Bahrain', dialCode: '+973' },
  { iso: 'OM', name: 'Oman', dialCode: '+968' },
  { iso: 'EG', name: 'Egypt', dialCode: '+20' },
  { iso: 'JO', name: 'Jordan', dialCode: '+962' },
  { iso: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { iso: 'US', name: 'United States', dialCode: '+1' },
  { iso: 'IN', name: 'India', dialCode: '+91' },
  { iso: 'PK', name: 'Pakistan', dialCode: '+92' },
]

export interface PhoneInputProps {
  id?: string
  name?: string
  /** Combined value, `"${dialCode}${nationalNumber}"` (e.g. `"+971504200000"`) — a
   *  single string so it round-trips through the same `col` a plain text
   *  field would use. */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  countries?: PhoneCountry[]
  defaultCountry?: string
  disabled?: boolean
  hasError?: boolean
  placeholder?: string
  /** Strips the outer border/background/height for nesting inside a shell
   *  that already supplies the outline (e.g. `InsetField`). */
  bare?: boolean
  ariaLabel?: string
  className?: string
}

function splitValue(value: string, countries: PhoneCountry[], fallback: PhoneCountry): { country: PhoneCountry; number: string } {
  // Longest dial-code prefix match (so `+1` doesn't shadow a longer code).
  const match = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length).find((c) => value.startsWith(c.dialCode))
  if (!match) return { country: fallback, number: value.replace(/^\+\d*/, '') }
  return { country: match, number: value.slice(match.dialCode.length) }
}

/**
 * PhoneInput — country-flag + dial-code prefix segment, then the number.
 * [L3 composite]
 *
 * figma-spec-create-sheet.md §2.8: one bordered field containing a flag chip
 * → dial code → mini chevron (its own nested country popover) → a divider →
 * the number. Generic across any `Phone`-typed field (no business
 * vocabulary) — country roster is caller-suppliable, defaults to a small
 * GCC-first list. State-agnostic: emits ONE combined string, same contract
 * as a plain text widget.
 */
export function PhoneInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  countries = DEFAULT_PHONE_COUNTRIES,
  defaultCountry = 'AE',
  disabled = false,
  hasError = false,
  placeholder,
  bare = false,
  ariaLabel,
  className,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false)
  const numberId = useId()
  const fallback = countries.find((c) => c.iso === defaultCountry) ?? countries[0]!
  const { country, number } = useMemo(() => splitValue(value, countries, fallback), [value, countries, fallback])

  const setCountry = (next: PhoneCountry) => {
    onChange(`${next.dialCode}${number}`)
    setOpen(false)
  }
  const setNumber = (next: string) => {
    onChange(`${country.dialCode}${next.replace(/[^\d]/g, '')}`)
  }

  return (
    <div
      data-slot="phone-input"
      className={cn(
        'flex w-full items-center gap-2',
        bare
          ? undefined
          : cn(
              'h-11 rounded-sm border bg-background px-3',
              // Composite focus ring (fix3): the inner country button + tel
              // input are chrome-less on purpose (this wrapper is the field
              // box), so keyboard focus on either lights the wrapper. Bare
              // mode skips it — there the InsetField shell owns the ring.
              'has-[:focus-visible]:border-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
              hasError ? 'border-destructive' : 'border-border',
              disabled && 'opacity-60',
            ),
        className,
      )}
    >
      <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            aria-label={ariaLabel ? `${ariaLabel} country code` : 'Country code'}
            aria-haspopup="listbox"
            aria-expanded={open}
            className="flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground outline-none disabled:cursor-not-allowed"
          >
            <span aria-hidden className="text-base leading-none">
              {isoToFlagEmoji(country.iso)}
            </span>
            <span>{country.dialCode}</span>
            <ChevronDown className="size-3 text-muted-foreground" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-1" aria-label={ariaLabel ? `${ariaLabel} country` : 'Country'}>
          <div role="listbox" aria-label="Country">
            {countries.map((c) => (
              <button
                key={c.iso}
                type="button"
                role="option"
                aria-selected={c.iso === country.iso}
                onClick={() => setCountry(c)}
                className="flex w-full items-center gap-2 rounded-xs px-2 py-1.5 text-start text-sm text-foreground outline-none transition-colors hover:bg-muted"
              >
                <span aria-hidden className="text-base leading-none">
                  {isoToFlagEmoji(c.iso)}
                </span>
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="text-muted-foreground">{c.dialCode}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <span aria-hidden className="h-4 w-px shrink-0 bg-border" />

      <input
        id={id ?? numberId}
        name={name}
        type="tel"
        inputMode="tel"
        disabled={disabled}
        aria-invalid={hasError || undefined}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        onBlur={onBlur}
        className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
    </div>
  )
}

PhoneInput.displayName = 'PhoneInput'

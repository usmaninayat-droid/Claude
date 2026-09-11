import { useRef, useState, type Ref } from 'react'
import { X } from '@fams/ui-kit/icons'
import { Input, SearchRefractionIcon } from '@fams/ui-kit'
import { cn } from '../../lib/cn'
import { handOffFocus } from '../../lib/focus-handoff'

/**
 * LiveSearchField — the live-monitoring search input (figma SPEC v2 §2.2,
 * frames 551:12319/18786): a 32px-tall input with the leading
 * search-refraction glyph; on focus (or while filled) it gains the primary
 * ring (the `Input` primitive's own focus treatment) plus the tiny floating
 * label sitting over the top border. Shared by the hybrid list panel and the
 * list-only view — presentational only (Rule 8).
 */
export interface LiveSearchFieldProps {
  value: string
  onChange: (value: string) => void
  /** Placeholder — "Search" (hybrid panel) / "Search anything here" (list-only). */
  placeholder?: string
  /** Accessible name; also matched by the floating label's text. */
  ariaLabel?: string
  /** The floating focus label (551:12319). Defaults to "Search". */
  floatingLabel?: string
  /**
   * Accessible name for the in-field clear control (round-5 UX gate N3).
   * @default "Clear search"
   */
  clearLabel?: string
  /**
   * Ref onto the underlying `<input>` (round-6 UX gate U1). The field's own
   * in-field ✕ hands focus back on its own; this exposes the same target to
   * the OTHER self-removing clear control — the no-results empty state's
   * `Clear search` button, which lives in a sibling subtree and must land the
   * user in the same place. Additive and optional; callers that do not pass it
   * behave exactly as before.
   */
  inputRef?: Ref<HTMLInputElement>
  className?: string
}

export function LiveSearchField({
  value,
  onChange,
  placeholder = 'Search',
  ariaLabel = 'Search vehicles',
  floatingLabel = 'Search',
  clearLabel = 'Clear search',
  inputRef,
  className,
}: LiveSearchFieldProps) {
  const [focused, setFocused] = useState(false)
  const innerRef = useRef<HTMLInputElement | null>(null)
  const setInputRef = (node: HTMLInputElement | null) => {
    innerRef.current = node
    if (typeof inputRef === 'function') inputRef(node)
    else if (inputRef) (inputRef as { current: HTMLInputElement | null }).current = node
  }
  const floated = focused || value.trim() !== ''
  return (
    <div className={cn('relative min-w-0', className)}>
      {/* `search-refraction`, not lucide's plain `search-md` magnifier
          (round-4 visual #10) — 495:2998 draws the refraction stroke, and the
          map's own search tool has always rendered the right mark, so the two
          search affordances on this screen no longer disagree. */}
      <SearchRefractionIcon
        aria-hidden="true"
        className="pointer-events-none absolute start-2.5 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        ref={setInputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        // Figma: 12px `#98A2B3` placeholder, not 14px grey-500 (visual #35).
        // `pe-8` only while the clear control is painted, so an empty field
        // keeps the Figma text run exactly as it was.
        className={cn('h-8 ps-8 text-caption placeholder:text-gray-400', value !== '' && 'pe-8')}
      />
      {/*
       * In-field clear (round-5 UX gate N3, carried from round-4 N6): with no
       * ✕ here and no recovery action on the empty state, the only route back
       * from a no-results search was to select the text and delete it.
       *
       * The in-field ✕ is the deviation-free half of that fix — 551:22013 is a
       * frame of the EMPTY STATE and says nothing about the input, so nothing
       * in Figma is contradicted. 24x24 (UX-NOTES C18) with a 12px glyph, and
       * logical `end-1` so it mirrors under RTL.
       */}
      {value !== '' ? (
        <button
          type="button"
          data-slot="live-search-clear"
          aria-label={clearLabel}
          title={clearLabel}
          /* U1: the ✕ is painted only while the field is non-empty, so
             clearing unmounts it. Hand focus to the input the user was
             already in — which is also where they want to be, since the
             natural next act after clearing a search is typing another. */
          onClick={() => {
            onChange('')
            handOffFocus(innerRef.current)
          }}
          className="absolute end-1 top-1/2 z-10 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      ) : null}
      {floated ? (
        <span
          data-slot="live-search-float-label"
          aria-hidden="true"
          className={cn(
            // Tiny label riding the input's top border (551:12319) — masked
            // over the border with the card background.
            'pointer-events-none absolute -top-1.5 start-2 bg-card px-1 text-[0.625rem] font-medium leading-none',
            focused ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {floatingLabel}
        </span>
      ) : null}
    </div>
  )
}

LiveSearchField.displayName = 'LiveSearchField'

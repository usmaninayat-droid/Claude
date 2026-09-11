import { useState, type ReactNode } from 'react'
import { ChevronDown } from '@fams/ui-kit/icons'
import { cn } from '../lib/cn'

/**
 * DescriptionCard — a rounded, muted-background text block with a fade-to-
 * background overlay + "Show more"/"Show less" toggle while collapsed
 * (figma-spec-detail.md §5's Notes card: `#F9FAFB` near-white bg, no visible
 * border). [tier-2 internal]
 *
 * Shared by `TaskDetailAdditionalInfo`'s description block and the
 * `NotesSection` named section renderer (`section-renderers.tsx`) — pulled
 * out to its own file so both consume ONE implementation rather than two
 * near-duplicates.
 */
export function DescriptionCard({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="flex flex-col gap-2 rounded-sm bg-muted p-4">
      <div
        className={cn(
          'relative text-justify text-body-xs leading-normal text-muted-foreground',
          !expanded && 'max-h-[7.375rem] overflow-hidden',
        )}
      >
        {children}
        {!expanded ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-muted to-transparent"
          />
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="mx-auto flex items-center gap-1 text-body-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {expanded ? 'Show less' : 'Show more'}
        <ChevronDown aria-hidden className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
      </button>
    </div>
  )
}

DescriptionCard.displayName = 'DescriptionCard'

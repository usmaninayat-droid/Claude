import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'
import { AlertTriangle, Hourglass, Inbox, Lock } from '../icons'
import { cn } from '../lib/cn'

export interface StatusViewProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /**
   * Which full-page/full-panel status this is — drives the default icon,
   * title, description and icon-chip tone.
   */
  kind: 'empty' | 'error' | 'no-permission' | 'coming-soon'
  /**
   * What the status is ABOUT — the surface's own name. `coming-soon` folds it
   * into its default title ("<subject> is coming soon"), so a host with many
   * unbuilt surfaces gets one consistent line without composing copy per
   * call site. Ignored once `title` is supplied.
   */
  subject?: string
  /** Overrides the kind's default icon. */
  icon?: ReactNode
  title?: ReactNode
  description?: ReactNode
  /** e.g. a "Create" button (empty), a "Retry" button (error) — omit for no-permission. */
  action?: ReactNode
}

const DEFAULTS: Record<StatusViewProps['kind'], { title: string; description: string }> = {
  empty: {
    title: 'Nothing here yet',
    description: 'Once records are created, they’ll show up here.',
  },
  error: {
    title: 'Something went wrong',
    description: 'The data couldn’t be loaded.',
  },
  'no-permission': {
    title: 'Restricted',
    description: 'You don’t have permission to view this.',
  },
  'coming-soon': {
    title: 'Coming soon',
    description: 'This surface hasn’t been built yet.',
  },
}

/**
 * Icon-chip tone per kind. `coming-soon` is the one FORWARD-looking status,
 * so it reads in the brand tint (secondary chip + primary glyph) rather than
 * the neutral muted chip the "nothing to show" statuses use.
 */
const CHIP_TONE: Record<Exclude<StatusViewProps['kind'], 'error'>, string> = {
  empty: 'bg-muted text-muted-foreground',
  'no-permission': 'bg-muted text-muted-foreground',
  'coming-soon': 'bg-secondary text-primary',
}

const DEFAULT_ICON: Record<Exclude<StatusViewProps['kind'], 'error'>, ReactNode> = {
  empty: <Inbox className="size-6" />,
  'no-permission': <Lock className="size-6" />,
  'coming-soon': <Hourglass className="size-6" />,
}

/**
 * StatusView — the one full-page/full-panel status shape a list, table, or
 * route can be in besides "loaded with data": empty, error, no-permission,
 * or coming-soon. [L3 composite]
 *
 * Consolidates what used to be three near-identical composites — `EmptyState`,
 * `ErrorState`, and the `block` variant of `NoPermission` — all icon + title +
 * description + optional action, differing only in the default icon/copy and
 * (for `error`) an alert role. `kind` picks the sensible default; every piece
 * is overridable per call site via `icon`/`title`/`description`/`action`.
 *
 * `coming-soon` is the platform's one "not built yet" surface (the
 * dispatcher prototype's `ComingSoonState`): the same anatomy in the brand
 * tint, with `subject` composing "<subject> is coming soon" so every unbuilt
 * module and settings panel reads identically. No module is a dead click.
 *
 * `NoPermission`'s `inline` shape (wrap a single live control, disabled, with
 * a tooltip reason) stays a separate, smaller component — it gates one
 * control rather than replacing a whole surface. Which shape to use for a
 * privilege gap is the app's manifest-driven decision; this component never
 * decides that for you.
 *
 * @usage-v5
 *   No dedicated empty/error/no-permission UI exists in the v5 codebase
 *   today: fetch errors go straight to `console.warn` with no UI, empty
 *   lists/tables render a bare blank area, and privilege gaps either hide
 *   the surface silently or surface a raw 403. `StatusView` is the one shape
 *   every fetch-driven or privilege-gated composite should render instead of
 *   inventing its own blank/failure layout.
 * @usage-index status-view
 */
export const StatusView = forwardRef<HTMLDivElement, StatusViewProps>(function StatusView(
  { kind, subject, icon, title, description, action, className, ...props },
  ref,
) {
  const fallback = DEFAULTS[kind]
  const isError = kind === 'error'
  const defaultTitle =
    kind === 'coming-soon' && subject ? `${subject} is coming soon` : fallback.title

  return (
    <div
      ref={ref}
      data-slot="status-view"
      role={isError ? 'alert' : undefined}
      className={cn('flex flex-col items-center gap-inline py-section text-center', className)}
      {...props}
    >
      {isError ? (
        (icon ?? <AlertTriangle className="size-8 text-destructive" />)
      ) : (
        <div className={cn('grid size-12 place-items-center rounded-full', CHIP_TONE[kind])}>
          {icon ?? DEFAULT_ICON[kind]}
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-foreground">{title ?? defaultTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description ?? fallback.description}</p>
      </div>
      {action ? <div className="mt-inline">{action}</div> : null}
    </div>
  )
})
StatusView.displayName = 'StatusView'

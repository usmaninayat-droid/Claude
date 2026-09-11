import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Stack } from '../layout/Stack'
import { FormGrid, type FormGridProps } from '../layout/FormGrid'
import { Toolbar } from '../layout/Toolbar'

/**
 * RecordLayout — a FLAT (non-tabbed) detail page: header + a main column of
 * `DetailSection` blocks + an optional sticky aside. Chrome + slots only —
 * zero domain content, zero data fetching. Companion to `ProfileLayout`
 * (which adds a tab strip); reach for this one when the record has no tabs.
 *
 * @usage-v5
 *   No flat full-page equivalent exists in v5 — every "detail" view is either
 *   a tab panel inside `ProfileLayout`/`ProfileTabs`, or a card:
 *   - packages/iwmp/components/cards/AssetGroupCard.vue (+ fams/ead forks) —
 *     the de-facto DetailSection+FieldGrid combo, 16 tab-panel call sites
 *     (asset/bin/contract/company/contact/vehicle/device/sim/workforce).
 *   - packages/shared/components/cards/EntityProfileCard.vue — icon+title+
 *     subtitle header over a chunked `col-3` label/value grid.
 *   - packages/shared/components/pipeline/LabelValueView.vue — an orphaned,
 *     unused label/value row primitive (zero current call sites).
 *   Forms needed: header slots (icon/category/status/meta/actions), a titled
 *   section wrapper, and a configurable-column key/value grid.
 * @usage-index record-layout
 */
export interface RecordLayoutProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Small leading identity element in the header (e.g. an `IconBadge`). */
  icon?: ReactNode
  /** Small caption above the title (record type/category). */
  category?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  /** Status indicator rendered inline next to the title (e.g. a `Badge`). */
  status?: ReactNode
  /** Secondary badges/metadata row under the subtitle. */
  meta?: ReactNode
  /** Header action buttons (edit, link, unlink, …). */
  actions?: ReactNode
  /** Sticky secondary column (profile card, key facts, activity feed, …). */
  aside?: ReactNode
  /** Main column content — typically a stack of `DetailSection`. */
  children: ReactNode
}

/**
 * RecordLayout — see module doc above. Owns header layout, main/aside
 * composition, and responsive stacking. Has no opinion about what a
 * `DetailSection` contains.
 */
export function RecordLayout({
  icon,
  category,
  title,
  subtitle,
  status,
  meta,
  actions,
  aside,
  children,
  className,
  ...props
}: RecordLayoutProps) {
  return (
    <div data-slot="record-layout" className={cn('flex flex-col', className)} {...props}>
      <Stack direction="row" gap="field" className="border-b border-border bg-card p-section">
        {icon ? <div className="shrink-0">{icon}</div> : null}
        <div className="min-w-0 flex-1">
          {category ? (
            <div className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              {category}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-inline">
            <h2 className="truncate text-h6 font-semibold text-foreground">{title}</h2>
            {status}
          </div>
          {subtitle ? <p className="mt-0.5 truncate text-body-sm text-muted-foreground">{subtitle}</p> : null}
          {meta ? <div className="mt-inline flex flex-wrap items-center gap-inline">{meta}</div> : null}
        </div>
        {actions ? (
          <Toolbar gap="inline" className="shrink-0">
            {actions}
          </Toolbar>
        ) : null}
      </Stack>

      <div className={cn('flex flex-col gap-section p-section', aside && 'lg:flex-row lg:items-start')}>
        <Stack gap="section" className="min-w-0 flex-1">
          {children}
        </Stack>
        {aside ? (
          <Stack as="aside" gap="section" className="min-w-0 lg:sticky lg:top-6 lg:w-80 lg:shrink-0">
            {aside}
          </Stack>
        ) : null}
      </div>
    </div>
  )
}

export interface DetailSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Section title — omit for an untitled/borderless content block. */
  title?: ReactNode
  /** Right-aligned header actions (edit, expand, …). Only shown alongside `title`. */
  actions?: ReactNode
  children: ReactNode
}

/**
 * DetailSection — a titled card block for `RecordLayout`'s main column
 * (or its aside). Chrome only: title row + padded body. Content is a slot.
 *
 * Single `p-4` box, no separate header bar — the title sits directly above
 * the body with the same left/right rhythm as the body itself (Figma "Asset
 * Details" card: `rounded-sm` box, title flush inside, no divider under
 * it — the first rule the design shows is a `FieldGrid` row's own `border-b`).
 */
export function DetailSection({ title, actions, children, className, ...props }: DetailSectionProps) {
  return (
    <section data-slot="detail-section" className={cn('rounded-sm border border-border bg-card p-4', className)} {...props}>
      <Stack gap="field">
        {title ? (
          <div className="flex items-center justify-between gap-inline">
            <h3 className="truncate text-body-sm font-semibold text-foreground">{title}</h3>
            {actions ? <Toolbar gap="inline">{actions}</Toolbar> : null}
          </div>
        ) : null}
        {children}
      </Stack>
    </section>
  )
}

export interface FieldGridField {
  /** Stable row key; falls back to array index when omitted. */
  id?: string
  label: ReactNode
  value: ReactNode
  /**
   * `layout="rows"` only — makes the whole row an interactive control (e.g.
   * a linked-record field that navigates elsewhere on click) instead of a
   * plain `<div>`. Generic and field-agnostic: the caller decides what a
   * click on THIS row does; `FieldGrid` has no opinion on the row's data
   * shape.
   */
  onClick?: () => void
  /** `onClick` only — accessible name for the row's own interactive role, when `label`/`value` don't already read as one (e.g. `"View <name>'s workforce record"`). */
  interactiveLabel?: string
}

export interface FieldGridProps extends Omit<FormGridProps, 'children'> {
  fields: FieldGridField[]
  /**
   * `'stacked'` (default): a `FormGrid` of cells, label (caption) above value
   * (body) — the original, still the right shape for a dense multi-column
   * form-style grid (`TaskDetail`, the generic `RecordLayout` demo).
   *
   * `'rows'`: one full-width row per field, label start / value end on the
   * same baseline, `border-b` under every row but the last — the Figma
   * "Asset Details" field-list pattern (confirmed canonical across both the
   * identity-panel key-facts list and every section card in that frame, not
   * a one-off). `columns` is ignored in this mode; every row is full width.
   *
   * `'inline'`: label and value share one row, label fixed at a `116px`-
   * equivalent (`7.25rem`) column so values start on a shared baseline
   * across rows — the Task/Lease Detail page's key-value grid pattern
   * (figma-spec-detail.md §3.3/§4, "label(12px,#98a2b3,w:116px) +
   * value(14px,black/#1d2939)", repeated identically inside every
   * collapsible section — see `emphasis`'s doc comment for why the LABEL
   * color deviates from this spec value). `columns` still controls how many
   * label/value pairs share a row.
   */
  layout?: 'stacked' | 'rows' | 'inline'
  /**
   * `layout="inline"` only — fixed label-column width, in any valid CSS
   * length. Defaults to `7.25rem` (116px, the original Task/Lease Detail
   * measurement). A different record surface can pixel-match its OWN Figma
   * label column (e.g. the Ticket Detail page's 145px / 132px KPI-section
   * columns, figma-spec-detail.md §3/§6) without changing every other
   * `layout="inline"` consumer — applied as an inline `style.width` (not a
   * Tailwind arbitrary-value class) specifically because it is a per-call
   * runtime value, which Tailwind's build-time class scanner cannot see.
   */
  labelWidth?: string
  /**
   * `layout="inline"` only — text weight/color treatment for the label and
   * value. `'regular'` (default, unchanged) is the original Ticket/Lease
   * Detail finding: Title Case label at `font-normal`/`text-muted-foreground`
   * over a `font-medium` value. `'strong'` matches a DIFFERENT confirmed
   * Figma source — the incident Task Detail sheet (SPEC
   * `task-detail-29-42895` §1.3/§1.4.4, fresh `get_design_context` extraction
   * against file `PAk7skcUc0OeD8FcQyDVe7`): EVERY label/value pair in that
   * screen renders `Gilroy:SemiBold` (confirmed by the same extraction's
   * lone two `Gilroy:Medium` nodes being unrelated body-paragraph text, not
   * labels — i.e. this file deliberately varies label weight by field-grid
   * role, not a blanket per-file convention). Per-call opt-in so the original
   * Ticket/Lease Detail consumer's confirmed-correct look is untouched.
   *
   * Label color (fix7, A7 gate blocker): the Figma source draws `#98a2b3`
   * (`gray-400`) here, but that measures 2.46:1 on `background`/`card` —
   * this run's rule ("Figma wins on look, UX heuristics win on behavior")
   * puts legibility on the heuristics side, and A7 already named exactly
   * this class of failure a gate blocker. Renders `text-muted-foreground-
   * strong` instead (a NEW role token, not a `gray-400` edit — see that
   * token's docblock in `core.tokens.json`): ~7.36–7.69:1 in light, ~5.71–
   * 6.90:1 in dark (the theme-aware reason a raw `text-gray-600` utility
   * would have been wrong here — `gray-600` isn't redefined per theme, so it
   * would have read as near-invisible ~2:1 text on a dark surface).
   */
  emphasis?: 'regular' | 'strong'
}

/**
 * FieldGrid — a labeled key/value grid for record fields. `layout="stacked"`
 * (default) builds on `FormGrid` so column count and gaps stay in the shared
 * layout vocabulary; `layout="rows"` renders the one-row-per-field, bordered
 * list variant instead (see `FieldGridProps.layout`). Both modes render a
 * missing value as an em dash rather than a blank cell.
 */
export function FieldGrid({
  fields,
  columns = 2,
  layout = 'stacked',
  labelWidth = '7.25rem',
  emphasis = 'regular',
  className,
  ...props
}: FieldGridProps) {
  if (layout === 'inline') {
    return (
      <div
        data-slot="field-grid"
        className={cn('grid gap-x-8 gap-y-3', className)}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        {...props}
      >
        {fields.map((field, index) => (
          <div key={field.id ?? index} className="flex min-w-0 items-center gap-4">
            {/* Title Case in both weights (never the uppercase/semibold-caps
                treatment `layout="stacked"` uses below — finding: every
                `layout="inline"` label once rendered ALL CAPS instead of the
                Figma-specified Title Case). `'regular'` (default) is the
                Ticket/Lease Detail page's own label style (figma-spec-
                detail.md §3: ~12px regular, Grey/400); `'strong'` is the
                incident Task Detail sheet's (SPEC `task-detail-29-42895`
                §1.3, `Gilroy:SemiBold` throughout) — see `emphasis`'s doc
                comment above. */}
            <span
              className={cn(
                'shrink-0 text-caption',
                emphasis === 'strong' ? 'font-semibold text-muted-foreground-strong' : 'font-normal text-muted-foreground',
              )}
              style={{ width: labelWidth }}
            >
              {field.label}
            </span>
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-body-sm text-foreground',
                emphasis === 'strong' ? 'font-semibold' : 'font-medium',
              )}
            >
              {field.value ?? '—'}
            </span>
          </div>
        ))}
      </div>
    )
  }
  if (layout === 'rows') {
    return (
      <div data-slot="field-grid" className={cn('flex flex-col', className)} {...props}>
        {fields.map((field, index) => {
          const rowClassName = cn(
            'flex w-full items-center justify-between gap-inline py-4 text-body-sm',
            index < fields.length - 1 && 'border-b border-border',
          )
          const content = (
            <>
              {/* `text-muted-foreground-strong`, not the Figma-drawn `text-gray-400`
                  (fix7, A7 gate blocker) — this is the "Asset Details" identity-panel
                  key-facts list (`EntityIdentityPanel`'s `details` block), measured at
                  2.46:1 on `#f9fafb`/`#ffffff`. See `FieldGrid`'s `emphasis` doc comment
                  above for the full reasoning (same role, same fix, applied here since
                  this layout mode never offered a `'regular'`-style escape hatch). */}
              <span className="shrink-0 font-medium text-muted-foreground-strong">{field.label}</span>
              <span className="truncate text-end font-semibold text-foreground">{field.value ?? '—'}</span>
            </>
          )
          if (field.onClick) {
            return (
              <button
                key={field.id ?? index}
                type="button"
                onClick={field.onClick}
                aria-label={field.interactiveLabel}
                className={cn(rowClassName, 'text-start transition-colors outline-none hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-ring')}
              >
                {content}
              </button>
            )
          }
          return (
            <div key={field.id ?? index} className={rowClassName}>
              {content}
            </div>
          )
        })}
      </div>
    )
  }
  return (
    <FormGrid data-slot="field-grid" columns={columns} className={className} {...props}>
      {fields.map((field, index) => (
        <div key={field.id ?? index} className="min-w-0">
          <div className="text-caption font-medium uppercase tracking-wide text-muted-foreground">
            {field.label}
          </div>
          <div className="mt-0.5 truncate text-body-sm font-medium text-foreground">{field.value ?? '—'}</div>
        </div>
      ))}
    </FormGrid>
  )
}

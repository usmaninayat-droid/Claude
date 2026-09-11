import { Avatar } from '@fams/ui-kit'
import { WORKFORCE_AVATAR_ART, type WorkforceStatusKey } from '../views/live/workforce-avatar-art'
import { cn } from '../lib/cn'
import { RecordTable } from './RecordTable'
import { resolveOptionalIcon } from './overview-widget-parts'
import type { EntityCardField, EntityCardHistoryProps } from './EntityCardHistory.types'

/**
 * EntityCardHistory — generic linked-record "info card + History table" tab.
 * [tier-2 pattern] See `EntityCardHistory.types.ts` for the full config
 * contract; used by the tanker-detail Devices/Workforce tabs, entity-agnostic
 * so any detail sheet's "one linked record's info + its link/unlink history"
 * tab can reuse it.
 */
export function EntityCardHistory({
  record,
  sectionTitle,
  actionLabel,
  imageField,
  icon,
  artField,
  title,
  titleField,
  subtitlePrefix,
  subtitleField,
  fields,
  historyField,
  historyColumns,
  strings,
  className,
}: EntityCardHistoryProps) {
  const s = {
    historyTitle: 'History',
    searchPlaceholder: 'Search anything here',
    ...strings,
  }

  const imageSrc = imageField ? (record?.[imageField] as string | undefined) : undefined
  const artKey = artField ? String(record?.[artField] ?? '') : ''
  const artSrc = artKey in WORKFORCE_AVATAR_ART ? WORKFORCE_AVATAR_ART[artKey as WorkforceStatusKey] : undefined
  const Glyph = resolveOptionalIcon(icon)
  const resolvedTitle = (titleField ? (record?.[titleField] as string | undefined) : undefined) ?? title
  const subtitleValue = subtitleField ? (record?.[subtitleField] as string | undefined) : undefined

  const startFields = fields.filter((f) => (f.column ?? 'start') === 'start')
  const endFields = fields.filter((f) => f.column === 'end')

  const renderField = (field: EntityCardField) => {
    const value = record?.[field.field]
    const empty = value == null || value === ''
    return (
      <div key={field.field} className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-b-0">
        <span className="text-body-sm text-muted-foreground">{field.label}</span>
        {!empty && field.render === 'avatar' ? (
          <span className="flex min-w-0 items-center gap-2">
            <Avatar name={String(value)} size="xs" />
            <span className="truncate text-body-sm font-semibold text-foreground">{String(value)}</span>
          </span>
        ) : (
          <span className="text-body-sm font-semibold text-foreground">{empty ? '—' : String(value)}</span>
        )}
      </div>
    )
  }

  return (
    <div data-slot="entity-card-history" className={cn('flex flex-col gap-section', className)}>
      <div data-slot="entity-card" className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-inline">
          <h3 className="text-body-sm font-semibold text-foreground">{sectionTitle}</h3>
          {actionLabel ? (
            <button
              type="button"
              className="text-body-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-4 rounded-md border border-border bg-card p-4 sm:flex-row">
          <div className="flex shrink-0 flex-col gap-1">
            {resolvedTitle ? (
              <div className="flex items-baseline gap-2">
                <span className="text-body-sm font-semibold text-foreground">{resolvedTitle}</span>
                {subtitleValue ? (
                  <span className="text-caption text-muted-foreground">
                    {subtitlePrefix}
                    {subtitleValue}
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="grid size-40 shrink-0 place-items-center overflow-hidden rounded-sm border border-border bg-muted">
              {imageSrc ? (
                <img src={imageSrc} alt={resolvedTitle ?? sectionTitle} loading="lazy" className="size-full object-contain" />
              ) : artSrc ? (
                <img src={artSrc} alt="" aria-hidden="true" draggable={false} width={82} height={90} className="block" />
              ) : Glyph ? (
                <Glyph className="size-10 text-muted-foreground" aria-hidden="true" />
              ) : null}
            </div>
          </div>

          <div className={cn('grid flex-1 grid-cols-1 gap-x-8', endFields.length ? 'sm:grid-cols-2' : undefined)}>
            <div className="flex flex-col">{startFields.map(renderField)}</div>
            {endFields.length ? <div className="flex flex-col">{endFields.map(renderField)}</div> : null}
          </div>
        </div>
      </div>

      <div data-slot="entity-card-history-table" className="flex flex-col gap-3">
        <h3 className="text-body-sm font-semibold text-foreground">{s.historyTitle}</h3>
        <RecordTable field={historyField} record={record} columns={historyColumns} search />
      </div>
    </div>
  )
}

EntityCardHistory.displayName = 'EntityCardHistory'

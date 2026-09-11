import { FileText, Upload } from '@fams/ui-kit/icons'
import { cn } from '../lib/cn'
import type { DocumentsListProps, DocumentsListRow } from './DocumentsList.types'

/**
 * DocumentsList — the tanker-detail Documents tab (node 31707:21825): a
 * titled list of bordered document rows + an end-aligned upload action.
 * [tier-2 pattern] Entity-agnostic (root `CLAUDE.md` rule 10): every value is
 * FIELD-KEY INDIRECTED off `record[field]`, no module vocabulary lives here.
 *
 * The "Upload Document" action is decorative (no `onClick` is expressible
 * from a JSON blueprint) — the same convention `RecordTable`'s
 * `timeframeSelect` affordance and `EntityCardHistory`'s header action use.
 */
export function DocumentsList({ record, field, strings, className }: DocumentsListProps) {
  const s = {
    title: 'Uploaded Documents',
    uploadLabel: 'Upload Document',
    emptyLabel: 'No documents uploaded yet.',
    expiryPrefix: 'Expiry Date: ',
    ...strings,
  }

  const rows = (() => {
    const raw = record?.[field]
    return Array.isArray(raw) ? (raw as DocumentsListRow[]) : []
  })()

  return (
    <div data-slot="documents-list" className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between gap-inline">
        <h3 className="text-body-sm font-semibold text-foreground">{s.title}</h3>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Upload className="size-4" aria-hidden="true" />
          {s.uploadLabel}
        </button>
      </div>

      {rows.length ? (
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <div
              key={row.id ?? index}
              data-slot="document-row"
              className="flex items-center gap-3 rounded-md border border-border bg-card p-3"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-sm bg-error-500/10 text-error-500">
                <FileText className="size-5" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-body-sm font-semibold text-foreground">{row.name}</span>
                {row.expiryDate ? (
                  <span className="text-caption text-muted-foreground">
                    {s.expiryPrefix}
                    {row.expiryDate}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-body-sm text-muted-foreground">{s.emptyLabel}</p>
      )}
    </div>
  )
}

DocumentsList.displayName = 'DocumentsList'

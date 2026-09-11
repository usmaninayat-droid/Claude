import type { ReactNode } from 'react'
import { FieldGrid, ImageGallery, Separator, type ImageGalleryImage } from '@fams/ui-kit'
import type { EntityRecord } from '@fams/v5-composer'
import { cn } from '../lib/cn'
import { DescriptionCard } from './DescriptionCard'
import { EditableImageList, EditableNotes } from './section-editors'
import type { SectionComponentProps } from '../lib/section-components'

/**
 * Built-in named SECTION renderers. `TaskDetail.tsx` registers both under
 * their names (`NotesSection`/`BeforePhotosSection`) — the same "opt in by
 * name, zero app code" contract the field-level `IconTextView`/`PersonView`/…
 * component registry already uses. Both renderers here are lightweight (no
 * heavy dependency), unlike `LocationMapSection` (registered separately,
 * lazily — see `map/LocationMapSectionSlot.tsx` — because it pulls the map
 * stack).
 *
 * DELIBERATELY no module-scope `registerSectionComponent(...)` call here:
 * this package builds with `"sideEffects": false` (`package.json`), and a
 * BARE `import './section-renderers'` with no imported bindings is exactly
 * what that flag tells esbuild it may drop entirely — verified against a
 * real `tsup` build (`dist/index.js`), which emitted "Ignoring this import
 * because … was marked as having no side effects" and never executed this
 * module at all. Exporting plain components and letting `TaskDetail.tsx`
 * import + register them BY NAME (a real, referenced binding) keeps this
 * module's evaluation tied to an import esbuild can't elide.
 */

/** `NotesSection` config — `ProfileSection.component.props` shape. */
export interface NotesSectionConfig {
  /** `record[textField]` — a string, or an array of paragraph strings, rendered as the Notes card body (figma-spec-detail.md §5). */
  textField: string
}

function readNotesBody(record: EntityRecord, field?: string): ReactNode {
  if (!field) return undefined
  const value = record[field]
  if (Array.isArray(value)) {
    return value.map((paragraph, index) => (
      <p key={index} className={index > 0 ? 'mt-2' : undefined}>
        {String(paragraph)}
      </p>
    ))
  }
  return value == null || value === '' ? undefined : String(value)
}

/** Notes section body — a gray card with fade + "Show more" (figma-spec-detail.md §5). Renders nothing when the configured field has no value. */
export function NotesSection({ record, props }: SectionComponentProps) {
  const cfg = (props ?? {}) as Partial<NotesSectionConfig>
  const body = readNotesBody(record, cfg.textField)
  if (!body) return null
  return <DescriptionCard>{body}</DescriptionCard>
}

/** `BeforePhotosSection` config — `ProfileSection.component.props` shape. */
export interface BeforePhotosSectionConfig {
  /** `record[imagesField]` — `ImageGalleryImage[]` (ui-kit shape: `{src, alt, caption?}`), the thumbnail gallery source (figma-spec-detail.md §7). */
  imagesField: string
}

/** Before Photos section body — a thumbnail gallery (figma-spec-detail.md §7). Renders nothing when the configured field is empty. */
export function BeforePhotosSection({ record, props }: SectionComponentProps) {
  const cfg = (props ?? {}) as Partial<BeforePhotosSectionConfig>
  const images = cfg.imagesField ? (record[cfg.imagesField] as ImageGalleryImage[] | undefined) : undefined
  if (!images?.length) return null
  return <ImageGallery images={images} size="md" />
}

/** `FieldColumnsSection` config — `ProfileSection.component.props` shape. */
export interface FieldColumnsSectionConfig {
  /**
   * Label/value columns per row. Defaults to `1` — the KPI accordion's
   * single-column stacked-list pattern (figma-spec-detail.md §6: "KPI, KPI
   * Category, Non Compliance, Compliance Time" each on their own row, values
   * at a fixed x, NOT the top field-grid's 2-column pairing). Pass `2` for a
   * section that wants the standard two-column field-grid instead. Matches
   * `FieldGrid`'s own `columns` range (1–4).
   */
  columns?: 1 | 2 | 3 | 4
  /** Label-column width override, same contract as `FieldGrid`'s `labelWidth` (figma-spec-detail.md §6's 132px KPI label column vs the top grid's 145px). */
  labelWidth?: string
}

/**
 * FieldColumnsSection — the SAME label/value `FieldGrid` presentation
 * `TaskDetail`'s default (no-`component`) section rendering already uses,
 * just with an explicit, per-section `columns` count instead of the
 * hardcoded `columns={2}` every section got before this existed (finding:
 * the KPI accordion rendered as a 2-column grid — "KPI | KPI Category" then
 * "Non Compliance | Compliance Time" — copying the top field-grid's layout
 * instead of the accordion's own single-column pattern). A blueprint opts a
 * section into this layout by name (`component: {name:
 * "FieldColumnsSection", props: {columns: 1}}`) — no `@fams/v5-composer`
 * schema change needed, since `component`/`componentProps` already thread
 * through generically for every section (`ProfileSection.component`,
 * `deriveDetail`), and TaskDetail already resolves every section's `fields`
 * through the FieldRegistry regardless of whether it also carries a
 * `component` override (see `SectionComponentProps.fields`'s doc comment).
 */
export function FieldColumnsSection({ props, fields }: SectionComponentProps) {
  const cfg = (props ?? {}) as Partial<FieldColumnsSectionConfig>
  return (
    <FieldGrid
      layout="inline"
      columns={cfg.columns ?? 1}
      labelWidth={cfg.labelWidth}
      fields={fields ?? []}
      className="px-[1.125rem]"
    />
  )
}

/** `NotesProofsSection` config — `ProfileSection.component.props` shape. */
export interface NotesProofsSectionConfig {
  /** `record[notesField]` — string or paragraph array, the subheaded Notes card (SPEC task-detail-29-42895 §1.4.2/§1.4.5). */
  notesField?: string
  /** `record[imagesField]` — `ImageGalleryImage[]`, the subheaded Proofs thumbnail row. */
  imagesField?: string
  /** Subheading labels — authored copy, defaulting to the spec's own "Notes"/"Proofs". */
  notesLabel?: string
  imagesLabel?: string
  /**
   * Optional SECOND gallery group (`record[imagesField2]`, subheaded
   * `imagesLabel2`) — the FM-6273 driver "Before / After" photo pair rendered
   * as two labeled galleries in ONE section. Rendered after the first group,
   * before the notes.
   */
  imagesField2?: string
  imagesLabel2?: string
  /**
   * Opts this section's UI into ALWAYS-ON in-place editing (product
   * direction 2026-09-02: the controls themselves convey editability — no
   * pencil toggles): the (first) image list renders as the DS `FileUploader`
   * (V2 nodes 5518:1777 empty / 8760:2761 with tiles) and the notes as an
   * always-editable `Textarea` (V2 node 8753:19364) committing on blur, both
   * saving through `SectionComponentProps.onSave`. Purely a UI opt-in:
   * with no host `onSave` wired the section stays read-only, and WHO may
   * edit remains the host's business (the same division the field-level
   * `wrapFieldValue` seam draws).
   */
  editable?: boolean
  /** Renders a separator line after the section body (an authored section boundary, e.g. UCCP's Reported Details → Assessment Notes split). */
  divider?: boolean
}

/**
 * NotesProofsSection — the "Incident Report"/"Completion Report" section
 * shape (SPEC `task-detail-29-42895` §1.4): a small grey subheading + the
 * SAME `DescriptionCard` (fade + Show more) `NotesSection` uses, then a
 * second subheading + the SAME `ImageGallery` `BeforePhotosSection` uses.
 * Pure composition of the two existing renderers with the spec's
 * subheadings — never a second notes/gallery implementation. Either half is
 * independently optional; renders nothing when both fields are empty.
 */
export function NotesProofsSection({ record, props, onSave }: SectionComponentProps) {
  const cfg = (props ?? {}) as Partial<NotesProofsSectionConfig>
  const body = readNotesBody(record, cfg.notesField)
  const images = cfg.imagesField ? (record[cfg.imagesField] as ImageGalleryImage[] | undefined) : undefined
  const images2 = cfg.imagesField2 ? (record[cfg.imagesField2] as ImageGalleryImage[] | undefined) : undefined
  // Editing is live only when BOTH the blueprint asked for it and the host
  // wired a save path — either alone renders the plain read-only section.
  const editable = Boolean(cfg.editable && onSave)
  if (!body && !images?.length && !images2?.length && !editable) return null

  const rawNotes = cfg.notesField ? record[cfg.notesField] : undefined
  const notesInitial = Array.isArray(rawNotes) ? rawNotes.map(String).join('\n\n') : String(rawNotes ?? '')

  return (
    <div data-slot="notes-proofs-section" className="flex flex-col gap-2 px-[1.125rem]">
      {/* SemiBold, not the FieldGrid stacked layout's `text-muted-foreground`
          (`#667085`) — fresh `get_design_context` extraction against
          `PAk7skcUc0OeD8FcQyDVe7` confirms the "Notes"/"Proofs" subheading is
          `Gilroy:SemiBold`, matching the same field-row label treatment as
          SPEC `task-detail-29-42895` §1.3 (see `FieldGrid`'s `emphasis="strong"`).
          Renders `text-muted-foreground-strong`, not the Figma-drawn `text-
          gray-400` (`#98a2b3`, 2.46:1 — a WCAG AA blocker, fix7/A7): see
          `FieldGrid`'s `emphasis` doc comment for the full reasoning; both
          call sites share the same fix for the same reason. */}
      {/* Proofs FIRST, then Notes (product direction 2026-09-01): the
          evidence gallery leads the section, the prose follows it. */}
      {images?.length || (editable && cfg.imagesField) ? (
        <>
          <span className="text-caption font-semibold text-muted-foreground-strong">{cfg.imagesLabel ?? 'Proofs'}</span>
          {editable && cfg.imagesField ? (
            <EditableImageList
              images={images ?? []}
              onChange={(next) => onSave?.({ [cfg.imagesField as string]: next })}
            />
          ) : (
            <ImageGallery images={images ?? []} size="md" />
          )}
        </>
      ) : null}
      {images2?.length ? (
        <>
          <span className={cn('text-caption font-semibold text-muted-foreground-strong', images?.length && 'mt-2')}>
            {cfg.imagesLabel2 ?? 'After'}
          </span>
          <ImageGallery images={images2} size="md" />
        </>
      ) : null}
      {body || (editable && cfg.notesField) ? (
        <>
          <span
            className={cn(
              'text-caption font-semibold text-muted-foreground-strong',
              (images?.length || images2?.length || (editable && cfg.imagesField)) && 'mt-2',
            )}
          >
            {cfg.notesLabel ?? 'Notes'}
          </span>
          {editable && cfg.notesField ? (
            <EditableNotes
              // Remount on an outside change so the draft resets to it.
              key={notesInitial}
              initial={notesInitial}
              label={cfg.notesLabel ?? 'Notes'}
              onCommit={(text) => {
                // Multi-paragraph text saves back as a paragraph array — the
                // same shape `readNotesBody` already renders (blank-line
                // separated), so a seeded array round-trips losslessly.
                const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
                onSave?.({ [cfg.notesField as string]: paragraphs.length > 1 ? paragraphs : text.trim() })
              }}
            />
          ) : (
            <DescriptionCard>{body}</DescriptionCard>
          )}
        </>
      ) : null}
      {cfg.divider ? <Separator className="mt-2" /> : null}
    </div>
  )
}

/**
 * FieldTilesSection / FieldTilesSectionConfig — moved to
 * `section-field-tiles.tsx` (root `CLAUDE.md` rule 12's ~300-line budget);
 * re-exported here so existing imports (`TaskDetail.tsx`, `index.ts`) keep
 * their `./section-renderers` path unchanged.
 */
export { FieldTilesSection, type FieldTilesSectionConfig } from './section-field-tiles'

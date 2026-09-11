import type { ReactNode } from 'react'
import {
  ChecklistSection,
  FileUploader,
  ImageGallery,
  type ChecklistItemData,
  type ChecklistItemState,
  type ImageGalleryImage,
  type UploadedFile,
} from '@fams/ui-kit'
import { DescriptionCard } from './DescriptionCard'

export interface TaskDetailChecklistProps {
  items: ChecklistItemData[]
  states?: ChecklistItemState[]
  /** Controlled: item id → current state id. Read-only when `onToggle` is omitted. */
  value: Record<string, string>
  onToggle?: (itemId: string, stateId: string) => void
}

export interface TaskDetailAttachmentsProps {
  files: UploadedFile[]
  onAdd?: (files: File[]) => void
  onRemove?: (id: string) => void
}

export interface TaskDetailAdditionalInfoProps {
  /** Section title, defaults to "Additional Info" (figma-spec-detail.md §4.4). */
  title?: ReactNode
  /** Rich description text — rendered inside a bordered card with a
   * fade-to-white overlay + "Show more" toggle while collapsed. */
  description?: ReactNode
  /** The same card pattern wraps a `ChecklistSection` instead of/alongside
   * plain paragraphs (the spec's own note, §4.4). */
  checklist?: TaskDetailChecklistProps
  attachments?: TaskDetailAttachmentsProps
  /** Image-typed attachments — rendered as a thumbnail grid rather than the
   * single-file row pattern (spec's own preferred alternative, §4.4). */
  images?: ImageGalleryImage[]
}

/**
 * TaskDetailAdditionalInfo — the "Additional Info" collapsible section's body
 * (figma-spec-detail.md §4.4, "Asset Handover Report" domain equivalent): a
 * description card, a checklist, an attachments dropzone, and an image grid.
 * Every sub-block is independently optional — a module without seed data for
 * one yet simply omits it (data-driven gaps are expected; see the WP7
 * progress log for exact seed shapes WP8 should provide). [tier-2 internal]
 */
export function TaskDetailAdditionalInfo({
  description,
  checklist,
  attachments,
  images,
}: TaskDetailAdditionalInfoProps) {
  const hasAny = Boolean(description) || Boolean(checklist) || Boolean(attachments) || Boolean(images?.length)
  if (!hasAny) return null
  return (
    <div data-slot="task-detail-additional-info" className="flex flex-col gap-4 px-6">
      {description ? <DescriptionCard>{description}</DescriptionCard> : null}
      {checklist ? (
        <ChecklistSection
          title="Checklist"
          items={checklist.items}
          states={checklist.states}
          value={checklist.value}
          onToggle={checklist.onToggle}
          readOnly={!checklist.onToggle}
        />
      ) : null}
      {attachments ? (
        <div className="flex flex-col gap-2">
          <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
            Attachments
          </span>
          <FileUploader
            files={attachments.files}
            onAdd={attachments.onAdd ?? (() => {})}
            onRemove={attachments.onRemove ?? (() => {})}
            disabled={!attachments.onAdd}
            addMoreText="Click here to upload your files"
            layout="bar"
          />
        </div>
      ) : null}
      {images?.length ? <ImageGallery images={images} /> : null}
    </div>
  )
}

TaskDetailAdditionalInfo.displayName = 'TaskDetailAdditionalInfo'

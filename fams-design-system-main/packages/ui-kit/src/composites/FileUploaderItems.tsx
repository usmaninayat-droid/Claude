import type { ReactNode } from 'react'
import { Loader2, Pencil, RotateCw, Trash2 } from '../icons'
import { cn } from '../lib/cn'
import { FileTypeIcon } from '../primitives/FileTypeIcon'
import type { UploadedFile } from './FileUploader'

/**
 * Internal presentation pieces for `FileUploader`'s figma-spec `panel` layout
 * (file-upload spec, DS V2 nodes 5518/5519/5520): the large uploaded tile with
 * overlay actions (re-upload / edit / delete), the single non-image row with
 * text actions, and the default dropzone illustration. Not exported from the
 * package barrel — consumers only ever use `FileUploader`.
 */

export interface FileItemActions {
  onRemove: (id: string) => void
  onReupload?: (id: string) => void
  onFileEdit?: (id: string) => void
  /** Click-to-view on an image tile (a host-owned lightbox) — when present, the tile's image becomes a preview button. */
  onPreview?: (id: string) => void
  disabled?: boolean
}

function isImage(file: UploadedFile): boolean {
  return (file.mimeType?.startsWith('image/') ?? false) || Boolean(file.previewUrl)
}

function OverlayAction({
  label,
  onClick,
  tone = 'neutral',
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  tone?: 'neutral' | 'primary' | 'destructive'
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid size-7 place-items-center rounded-sm bg-surface-primary/95 shadow-sm outline-none transition-colors',
        'hover:bg-surface-primary focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none',
        tone === 'neutral' && 'text-foreground',
        tone === 'primary' && 'text-primary',
        tone === 'destructive' && 'text-destructive',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Uploaded tile (spec 5518:2854 image / 5520:2690 mixed grid). `size="lg"`
 * (default) is the original ~200px tile; `size="sm"` is an 80px tile matching
 * `ImageGallery`'s `md` thumbnail — for uploaders that sit alongside plain
 * galleries and must not dwarf them (FRMS Reported Details).
 */
export function FileUploaderPanelTile({
  file,
  actions,
  size = 'lg',
}: {
  file: UploadedFile
  actions: FileItemActions
  size?: 'sm' | 'lg'
}) {
  const image = isImage(file) && file.previewUrl
  return (
    <div
      data-slot="file-uploader-panel-tile"
      className={cn(
        'relative shrink-0 overflow-hidden rounded-sm border border-border bg-surface-primary',
        size === 'sm' ? 'size-20' : 'size-48',
        file.status === 'error' && 'border-destructive',
      )}
    >
      {image && actions.onPreview ? (
        <button
          type="button"
          aria-label={`View ${file.name ?? 'photo'}`}
          onClick={() => actions.onPreview?.(file.id)}
          disabled={actions.disabled}
          className="block size-full cursor-zoom-in outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img src={file.previewUrl} alt={file.name ?? ''} className="size-full object-cover" />
        </button>
      ) : image ? (
        <img src={file.previewUrl} alt={file.name ?? ''} className="size-full object-cover" />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-2 p-3 text-center">
          <FileTypeIcon filename={file.name} size="lg" />
          <span className="w-full truncate text-caption text-muted-foreground">{file.name ?? 'File'}</span>
        </div>
      )}

      {/* Overlay actions per spec: re-upload top-start; delete then edit top-end. */}
      {actions.onReupload ? (
        <div className="absolute start-1.5 top-1.5">
          <OverlayAction label={`Re-upload ${file.name ?? 'file'}`} onClick={() => actions.onReupload?.(file.id)} disabled={actions.disabled}>
            <RotateCw className="size-4" aria-hidden />
          </OverlayAction>
        </div>
      ) : null}
      <div className="absolute end-1.5 top-1.5 flex flex-col gap-1.5">
        <OverlayAction label={`Delete ${file.name ?? 'file'}`} onClick={() => actions.onRemove(file.id)} tone="destructive" disabled={actions.disabled}>
          <Trash2 className="size-4" aria-hidden />
        </OverlayAction>
        {actions.onFileEdit && image ? (
          <OverlayAction label={`Edit ${file.name ?? 'file'}`} onClick={() => actions.onFileEdit?.(file.id)} tone="primary" disabled={actions.disabled}>
            <Pencil className="size-4" aria-hidden />
          </OverlayAction>
        ) : null}
      </div>

      {file.status === 'uploading' ? (
        <div className="absolute inset-0 grid place-items-center bg-background/50">
          <Loader2 className="size-5 animate-spin text-foreground" data-motion="essential" />
        </div>
      ) : null}
      {file.status === 'error' ? (
        <div
          className="absolute inset-x-0 bottom-0 truncate bg-destructive/90 px-1 py-0.5 text-caption text-destructive-foreground"
          title={file.errorText}
        >
          {file.errorText ?? 'Failed'}
        </div>
      ) : null}
    </div>
  )
}

/** Single non-image uploaded row (spec 5519:1095): icon + name + text actions. */
export function FileUploaderRow({
  file,
  actions,
}: {
  file: UploadedFile
  actions: FileItemActions
}) {
  return (
    <div
      data-slot="file-uploader-row"
      className={cn(
        'flex w-full items-center gap-3 rounded-sm border border-border bg-surface-primary px-4 py-3',
        file.status === 'error' && 'border-destructive',
      )}
    >
      <FileTypeIcon filename={file.name} size="sm" />
      <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-foreground">{file.name ?? 'File'}</span>
      {file.status === 'uploading' ? <Loader2 className="size-4 animate-spin text-muted-foreground" data-motion="essential" aria-hidden /> : null}
      {actions.onReupload ? (
        <button
          type="button"
          onClick={() => actions.onReupload?.(file.id)}
          disabled={actions.disabled}
          className="shrink-0 text-body-sm font-semibold text-primary outline-none hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
        >
          Re-Upload
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => actions.onRemove(file.id)}
        disabled={actions.disabled}
        className="shrink-0 text-body-sm font-semibold text-destructive-emphasis outline-none hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
      >
        Delete
      </button>
    </div>
  )
}

/**
 * Default dropzone illustration (spec 5547:19983): a laptop with an upload
 * arrow, drawn token-only. Swappable via `FileUploaderProps.illustration`.
 */
export function FileUploaderIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 84"
      role="presentation"
      focusable="false"
      aria-hidden
      className={cn('text-muted-foreground', className)}
    >
      {/* plant + cup accents */}
      <path d="M28 62c-3-8-1-14 2-18m-2 18c-5-6-11-8-15-8" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="118" y="58" width="14" height="10" rx="2" fill="currentColor" opacity="0.18" />
      {/* laptop body */}
      <rect x="52" y="18" width="56" height="42" rx="4" fill="none" stroke="currentColor" strokeOpacity="0.5" strokeWidth="2.5" />
      <rect x="40" y="62" width="80" height="6" rx="3" fill="currentColor" opacity="0.25" />
      {/* upload arrow */}
      <path d="M80 44V26m0 0-8 8m8-8 8 8" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="80" cy="52" r="1.8" fill="currentColor" />
    </svg>
  )
}

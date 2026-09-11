import { useEffect, useId, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import { File as FileIcon, ImagePlus, Loader2, Upload, X } from '../icons'
import { cn } from '../lib/cn'
import {
  FileUploaderIllustration,
  FileUploaderPanelTile,
  FileUploaderRow,
} from './FileUploaderItems'

/**
 * A file as the caller/hook is tracking it. The presenter never touches
 * `File`, `FormData`, or an upload request — it renders whatever state the
 * hook (compress → upload → progress → resolve) hands it.
 */
export interface UploadedFile {
  id: string
  /** Data-URL/blob/CDN url. Omit to fall back to the generic file icon. */
  previewUrl?: string
  name?: string
  mimeType?: string
  /** 0-100. Omit when not currently uploading. */
  progress?: number
  status?: 'pending' | 'uploading' | 'done' | 'error'
  errorText?: string
}

export interface FileUploaderProps {
  /** Always caller-supplied — the app-layer `useFileUpload` hook owns compression/upload/progress. */
  files: UploadedFile[]
  /** Fired with the accepted files (filtering by accept/maxFiles/maxFileSizeMB already applied). */
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  /** Native `accept` passed straight to the file input. Default images only, matching the v5 default. */
  accept?: string
  maxFiles?: number
  /** 0 disables the size check. */
  maxFileSizeMB?: number
  multiple?: boolean
  disabled?: boolean
  addMoreText?: string
  /**
   * 'grid' (default): a square dropzone tile appended at the end of the file
   * thumbnails, unchanged behavior for existing consumers (e.g. the image
   * gallery upload flow).
   * 'bar': a full-width dashed dropzone bar rendered ABOVE the file list —
   * figma-spec-detail.md §4.4's attachments block (a full-bleed drop target
   * with a centered upload-cloud icon + CTA text, separate from the
   * individual uploaded-file rows/tiles below it).
   */
  layout?: 'grid' | 'bar' | 'panel'
  /**
   * Density of the `panel` dropzone (file-upload spec): 'default' is the tall
   * illustrated panel, 'compact' the tighter row (the "Pipelines" usage
   * context). Ignored by the legacy 'grid'/'bar' layouts.
   */
  variant?: 'default' | 'compact'
  /**
   * Size of the `panel` layout's uploaded tiles and "Upload More" dropzone
   * tile: 'lg' (default) is the spec's ~200px tile; 'sm' is an 80px tile
   * matching `ImageGallery`'s `md` thumbnail, for uploaders rendered next to
   * plain galleries. The empty-state panel dropzone is unaffected.
   */
  tileSize?: 'sm' | 'lg'
  /** Replaces the default dropzone illustration in the `panel` layout. */
  illustration?: ReactNode
  /** CTA line inside the `panel` dropzone. */
  ctaText?: string
  /** Centered text shown while dragging over the `panel` dropzone. */
  dropText?: string
  /**
   * Labeled square-tile mode for the empty `panel` dropzone — the named-group
   * usage ("Front Side" / "Back Side"): render one labeled FileUploader per
   * group app-side (composition stays app config, root rule 11).
   */
  label?: ReactNode
  /** Re-upload action (overlay / text button) — rendered only when provided. */
  onReupload?: (id: string) => void
  /** Edit action on image tiles — rendered only when provided. */
  onFileEdit?: (id: string) => void
  /** Click-to-view on `panel` image tiles (host-owned lightbox) — the tile image becomes a preview button when provided. */
  onPreview?: (id: string) => void
  hint?: string
  /** Custom per-file tile content — the doc-icon / carousel-preview variants hook in here instead of a new prop each. */
  renderPreview?: (file: UploadedFile) => ReactNode
  /** Files rejected locally (wrong type / too large / over the cap) before onAdd ever fires. */
  onRejected?: (rejected: { file: File; reason: string }[]) => void
  /**
   * Substrings of `addMoreText` to render in the primary (link) color —
   * generalizes the single-word `'upload'` highlight to any number of
   * phrases, e.g. `['Drag & drop', 'Choose files']` for figma-spec-create-
   * sheet.md §2.13's "**Drag & drop** here, or **Choose files**". Case-
   * insensitive match against `addMoreText`; unmatched phrases are ignored.
   * Defaults to `['upload']` (unchanged behavior for existing consumers).
   */
  ctaHighlight?: string[]
  className?: string
}

/**
 * Highlights every occurrence (first match per phrase, left to right) of
 * `words` inside `text` in the primary (link) color — figma-spec-detail.md
 * §4.4's single-phrase "Click here to **upload** your files", generalized
 * to figma-spec-create-sheet.md §2.13's two-phrase "**Drag & drop** here, or
 * **Choose files**". Phrases that overlap the same span or aren't found are
 * skipped, so any caller-supplied `addMoreText`/`words` combination stays safe.
 */
function highlightCta(text: string, words: string[] = ['upload']) {
  type Match = { start: number; end: number }
  const matches: Match[] = []
  for (const word of words) {
    if (!word) continue
    const idx = text.toLowerCase().indexOf(word.toLowerCase())
    if (idx === -1) continue
    const start = idx
    const end = idx + word.length
    if (matches.some((m) => start < m.end && end > m.start)) continue
    matches.push({ start, end })
  }
  if (!matches.length) return text
  matches.sort((a, b) => a.start - b.start)

  const parts: ReactNode[] = []
  let cursor = 0
  matches.forEach((m, i) => {
    if (m.start > cursor) parts.push(text.slice(cursor, m.start))
    parts.push(
      <span key={i} className="font-semibold text-primary">
        {text.slice(m.start, m.end)}
      </span>,
    )
    cursor = m.end
  })
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <>{parts}</>
}

function defaultPreview(file: UploadedFile) {
  const isImage = file.mimeType?.startsWith('image/') ?? Boolean(file.previewUrl)
  if (isImage && file.previewUrl) {
    return <img src={file.previewUrl} alt={file.name ?? ''} className="size-full object-cover" />
  }
  return (
    <div className="flex size-full flex-col items-center justify-center gap-1 p-2 text-center">
      <FileIcon className="size-6 text-muted-foreground" />
      <span className="w-full truncate text-[11px] text-muted-foreground">{file.name ?? 'File'}</span>
    </div>
  )
}

/**
 * FileUploader — drag-and-drop / click-to-browse file picker. Ported from the
 * v5 codebase's `MediaUploader.vue` (the cleanest of ~10 forked upload
 * components — `ImageUpload`, `FileUpload`, two tenant-forked `ImageUploader`s,
 * `UploadWithDelete`, `SignUploader`, `FileAttachments`…), all of which
 * re-implement FormData construction, progress tracking, and file-vs-image
 * detection ad hoc. Here that's the caller's `useFileUpload` hook; this
 * presenter only ever receives `files` and reports intent via `onAdd`/`onRemove`.
 */
export function FileUploader({
  files,
  onAdd,
  onRemove,
  accept = 'image/png,image/jpeg,image/jpg',
  maxFiles = 5,
  maxFileSizeMB = 10,
  multiple = true,
  disabled = false,
  addMoreText = 'Upload more',
  layout = 'grid',
  variant = 'default',
  tileSize = 'lg',
  illustration,
  ctaText = 'Drag & drop here, or Choose files',
  dropText = 'Drop here',
  label,
  onReupload,
  onFileEdit,
  onPreview,
  hint,
  renderPreview,
  onRejected,
  ctaHighlight = ['upload'],
  className,
}: FileUploaderProps) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null)

  const atLimit = files.length >= maxFiles
  const remaining = Math.max(0, maxFiles - files.length)

  // The dropzone (the element that actually tracks hover) unmounts the
  // instant `atLimit` flips true — but `dragging` lives up here in the
  // parent, so it would otherwise stick at `true` with nothing left to fire
  // a dragleave and clear it. Reset it the moment the dropzone would
  // disappear out from under an in-progress drag.
  useEffect(() => {
    if (atLimit) setDragging(false)
  }, [atLimit])

  const acceptTypes = accept.split(',').map((t) => t.trim())
  const matchesAccept = (file: File) =>
    acceptTypes.some((t) => (t.endsWith('/*') ? file.type.startsWith(t.slice(0, -1)) : file.type === t))

  function processFileList(list: FileList) {
    const incoming = Array.from(list)
    const accepted: File[] = []
    const rejected: { file: File; reason: string }[] = []

    for (const file of incoming) {
      if (accepted.length + files.length >= maxFiles) {
        // `remaining` reflects slots open before this batch — tells the user
        // how many more they could have added, not the (often irrelevant) cap.
        rejected.push({
          file,
          reason: remaining === 0 ? 'No more files allowed' : `Only ${remaining} more file${remaining === 1 ? '' : 's'} allowed`,
        })
        continue
      }
      if (!matchesAccept(file)) {
        rejected.push({ file, reason: 'Unsupported file type' })
        continue
      }
      if (maxFileSizeMB > 0 && file.size > maxFileSizeMB * 1024 * 1024) {
        rejected.push({ file, reason: `Exceeds ${maxFileSizeMB}MB` })
        continue
      }
      accepted.push(file)
    }

    if (rejected.length > 0) {
      onRejected?.(rejected)
      setRejectionMessage(
        rejected.length === 1 ? `1 file skipped — ${rejected[0].reason}` : `${rejected.length} files skipped`,
      )
    } else {
      setRejectionMessage(null)
    }

    if (accepted.length > 0) onAdd(accepted)
  }

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFileList(e.target.files)
    e.target.value = ''
  }

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setDragging(false)
    if (disabled || atLimit) return
    if (e.dataTransfer.files.length > 0) processFileList(e.dataTransfer.files)
  }

  // The dropzone has child elements (input, icon, label text) — without this
  // check, dragging across them fires dragleave-on-parent/dragenter-on-child
  // in quick succession and `dragging` flickers false→true. `relatedTarget`
  // is where the pointer is headed; if it's still inside the dropzone, this
  // isn't a real exit.
  const onDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    const next = e.relatedTarget as Node | null
    if (next && e.currentTarget.contains(next)) return
    setDragging(false)
  }

  const panel = layout === 'panel'
  const panelActions = { onRemove, onReupload, onFileEdit, onPreview, disabled }
  const fileIsImage = (f: UploadedFile) => (f.mimeType?.startsWith('image/') ?? false) || Boolean(f.previewUrl)
  // Spec: the big illustrated panel shows only while EMPTY; once files exist
  // the affordance moves into the grid's "Upload More" tile (5520:2690).
  const showPanelDropzone = panel && !atLimit && files.length === 0

  const dropzoneHandlers = {
    onDragEnter: (e: DragEvent<HTMLLabelElement>) => {
      e.preventDefault()
      if (!disabled) setDragging(true)
    },
    onDragOver: (e: DragEvent<HTMLLabelElement>) => e.preventDefault(),
    onDragLeave,
    onDrop,
  }

  const fileInput = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      accept={accept}
      multiple={multiple}
      disabled={disabled}
      onChange={onInputChange}
      className="sr-only"
    />
  )

  return (
    <div data-slot="file-uploader" className={cn('flex flex-col gap-field', className)}>
      {showPanelDropzone ? (
        <label
          htmlFor={inputId}
          data-slot="file-uploader-dropzone"
          data-variant={variant}
          {...dropzoneHandlers}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface-minimal text-center outline-none transition-colors hover:border-foreground/30',
            'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
            label ? 'size-36 p-3' : variant === 'compact' ? 'w-full px-6 py-4' : 'w-full px-6 py-10',
            dragging && 'border-primary bg-primary/10',
            disabled && 'pointer-events-none cursor-not-allowed opacity-50',
          )}
        >
          {fileInput}
          {dragging ? (
            <span data-slot="file-uploader-drop-text" className="text-body font-semibold text-primary">
              {dropText}
            </span>
          ) : label ? (
            <>
              <ImagePlus className="size-6 text-primary" aria-hidden />
              <span className="text-body-sm font-semibold text-primary">{label}</span>
            </>
          ) : (
            <>
              {illustration ?? (
                <FileUploaderIllustration className={variant === 'compact' ? 'h-10 w-auto' : 'h-20 w-auto'} />
              )}
              <span className="text-body-sm text-foreground">{highlightCta(ctaText, ['Drag & drop', 'Choose files'])}</span>
              {hint ? <span className="text-caption text-muted-foreground">{hint}</span> : null}
            </>
          )}
        </label>
      ) : null}

      {panel && files.length > 0 ? (
        !multiple && !fileIsImage(files[0]) ? (
          <FileUploaderRow file={files[0]} actions={panelActions} />
        ) : (
          <div className="flex flex-wrap gap-field">
            {multiple && !atLimit ? (
              <label
                htmlFor={inputId}
                data-slot="file-uploader-dropzone"
                {...dropzoneHandlers}
                className={cn(
                  'flex shrink-0 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-primary/60 text-center outline-none transition-colors hover:border-primary',
                  tileSize === 'sm' ? 'size-20 gap-1 p-1' : 'size-48 gap-2',
                  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                  dragging && 'border-primary bg-primary/10',
                  disabled && 'pointer-events-none cursor-not-allowed opacity-50',
                )}
              >
                {fileInput}
                {dragging ? (
                  <span
                    data-slot="file-uploader-drop-text"
                    className={cn('font-semibold text-primary', tileSize === 'sm' ? 'text-caption' : 'text-body-sm')}
                  >
                    {dropText}
                  </span>
                ) : (
                  <>
                    <Upload className={cn('text-primary', tileSize === 'sm' ? 'size-4' : 'size-6')} aria-hidden />
                    <span
                      className={cn(
                        'font-semibold text-primary',
                        tileSize === 'sm' ? 'text-caption leading-tight' : 'text-body-sm',
                      )}
                    >
                      {addMoreText}
                    </span>
                  </>
                )}
              </label>
            ) : null}
            {files.map((file) => (
              <FileUploaderPanelTile key={file.id} file={file} actions={panelActions} size={tileSize} />
            ))}
          </div>
        )
      ) : null}

      {layout === 'bar' && !atLimit ? (
        <label
          htmlFor={inputId}
          data-slot="file-uploader-dropzone"
          onDragEnter={(e) => {
            e.preventDefault()
            if (!disabled) setDragging(true)
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            'flex w-full cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-border py-4 text-center text-muted-foreground outline-none transition-colors hover:border-foreground/30 hover:text-foreground',
            'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
            dragging && 'border-primary bg-primary/5 text-primary',
            disabled && 'pointer-events-none cursor-not-allowed opacity-50',
          )}
        >
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            multiple={multiple}
            disabled={disabled}
            onChange={onInputChange}
            className="sr-only"
          />
          <Upload className="size-6 shrink-0" aria-hidden />
          <span className="text-body-sm">{highlightCta(addMoreText, ctaHighlight)}</span>
        </label>
      ) : null}

      {panel ? null : (
      <div className="flex flex-wrap gap-field">
        {files.map((file) => (
          <div
            key={file.id}
            data-slot="file-uploader-tile"
            className={cn(
              'relative size-24 shrink-0 overflow-hidden rounded-sm border border-border bg-muted',
              file.status === 'error' && 'border-destructive',
            )}
          >
            {renderPreview ? renderPreview(file) : defaultPreview(file)}

            {file.status === 'uploading' ? (
              <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${file.progress ?? 0}%` }}
                />
              </div>
            ) : null}

            {file.status === 'uploading' ? (
              <div className="absolute inset-0 grid place-items-center bg-background/50">
                <Loader2 className="size-5 animate-spin text-foreground" data-motion="essential" />
              </div>
            ) : null}

            {file.status === 'error' ? (
              <div
                className="absolute inset-x-0 bottom-0 truncate bg-destructive/90 px-1 py-0.5 text-[10px] text-destructive-foreground"
                title={file.errorText}
              >
                {file.errorText ?? 'Failed'}
              </div>
            ) : null}

            <button
              type="button"
              aria-label={`Remove ${file.name ?? 'file'}`}
              onClick={() => onRemove(file.id)}
              disabled={disabled}
              className="absolute end-1 top-1 grid size-5 place-items-center rounded-full bg-background/80 text-foreground outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}

        {layout === 'grid' && !atLimit ? (
          <label
            htmlFor={inputId}
            data-slot="file-uploader-dropzone"
            onDragEnter={(e) => {
              e.preventDefault()
              if (!disabled) setDragging(true)
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
              'flex size-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border text-center text-muted-foreground outline-none transition-colors hover:border-foreground/30 hover:text-foreground',
              'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
              dragging && 'border-primary bg-primary/5 text-primary',
              disabled && 'pointer-events-none cursor-not-allowed opacity-50',
            )}
          >
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={accept}
              multiple={multiple}
              disabled={disabled}
              onChange={onInputChange}
              className="sr-only"
            />
            <Upload className="size-5" />
            {/* Always shows the real call-to-action text (never just a bare
                "+N" chip once tiles exist) — finding M6: the dropzone must
                stay a clearly-labeled affordance alongside existing tiles,
                not shrink to an easy-to-miss counter. */}
            <span className="px-1 text-[11px] leading-tight">{addMoreText}</span>
            {files.length > 0 ? (
              <span className="text-[10px] leading-tight text-muted-foreground/80">{`+${remaining} more`}</span>
            ) : null}
          </label>
        ) : null}
      </div>
      )}

      {rejectionMessage ? <p className="text-xs text-destructive-emphasis">{rejectionMessage}</p> : null}
      {/* In the panel layout the hint lives INSIDE the empty dropzone. */}
      {hint && !rejectionMessage && !showPanelDropzone ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

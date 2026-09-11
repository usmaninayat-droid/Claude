import { forwardRef, type HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  FileArchive,
  FileCode,
  FileImage,
  FileMusic,
  FilePlay,
  FileQuestionMark,
  FileSpreadsheet,
  FileText,
  type LucideIcon,
} from '../icons'
import { cn } from '../lib/cn'

/**
 * FileTypeIcon — filename/extension → icon + accent tile. [L1 primitive]
 *
 * Non-interactive presenter: pass a `filename` (or a bare extension), it resolves the
 * extension, looks up its accent category + glyph, and renders a `role="img"` tile with
 * an `aria-label` (no visible text, so it never needs badge-width math for long labels).
 * Sizes: sm (size-8 tile) / md (size-10, default) / lg (size-12). Unmapped extensions and
 * empty input both fall back to a neutral question-mark glyph rather than rendering blank.
 *
 * @usage-v5
 *   Replaces the extension→SVG lookup duplicated across v5 (`file.name.split('.').at(-1)`
 *   → `/images/icons/files/<ext>.svg`, only 12 extensions covered, rest fall through):
 *   - shared/components/fileUpload/{FileAttachments,FileUpload,WorkforceDocuments}.vue
 *   - shared/components/common/ImagePreview.vue
 *   - iwmp/components/fileUpload/UploadWithDelete.vue, drawers/DocumentUploadDrawer.vue
 *   - {iwmp,fams,ead}/components/tabs/panels/asset/vehicle/AssetDocuments.vue (3x fork,
 *     hardcoded `q-icon name="fams:file-05"` per upload-type button)
 *   Forms needed: filename (or bare extension) in, size sm|md|lg, graceful unknown fallback.
 * @usage-index file-type-icon
 */

/** Accent category — mirrors the design reference's 9-way accent grouping. */
type FileTypeCategory =
  | 'error'
  | 'info'
  | 'success'
  | 'flame'
  | 'plum'
  | 'lavender'
  | 'pink'
  | 'cyan'
  | 'neutral'

/**
 * Category → tile classes. Tint background + darker foreground, token-only.
 * `error` / `info` / `success` / `flame` map onto real status tokens (flame ≈ warning,
 * same orange; -50/-700 tint pairing matches `Badge`'s status variants). `plum` /
 * `lavender` / `pink` / `cyan` have no matching hue anywhere in the token set — nearest
 * available is the `--color-chart-1..5` categorical palette (distinct hues, not the
 * `chart-series` sequential blue ramp), following the same `chart-N` + `/10`
 * opacity-modifier fallback `Badge` already uses for its `colorIndex` prop (see
 * `deviationsFlagged`). `neutral` uses the plain muted surface pair.
 */
const CATEGORY_CLASSES: Record<FileTypeCategory, string> = {
  error: 'bg-error-50 text-error-700',
  info: 'bg-info-scale-50 text-info-scale-700',
  success: 'bg-success-scale-50 text-success-scale-700',
  flame: 'bg-warning-scale-50 text-warning-scale-700',
  plum: 'bg-chart-3/10 text-chart-3',
  lavender: 'bg-chart-4/10 text-chart-4',
  pink: 'bg-chart-5/10 text-chart-5',
  cyan: 'bg-chart-2/10 text-chart-2',
  neutral: 'bg-muted text-muted-foreground',
}

/** Extension → { accent category, glyph }. Keep this table as the source of truth. */
const FILE_TYPE_MAP: Record<string, { category: FileTypeCategory; icon: LucideIcon }> = {
  PDF: { category: 'error', icon: FileText },
  AI: { category: 'error', icon: FileImage },
  DOC: { category: 'info', icon: FileText },
  DOCX: { category: 'info', icon: FileText },
  JPG: { category: 'info', icon: FileImage },
  JPEG: { category: 'info', icon: FileImage },
  PNG: { category: 'info', icon: FileImage },
  GIF: { category: 'info', icon: FileImage },
  SVG: { category: 'info', icon: FileImage },
  WEBP: { category: 'info', icon: FileImage },
  TIFF: { category: 'info', icon: FileImage },
  IMG: { category: 'info', icon: FileImage },
  MP4: { category: 'info', icon: FilePlay },
  MKV: { category: 'info', icon: FilePlay },
  AVI: { category: 'info', icon: FilePlay },
  MPEG: { category: 'info', icon: FilePlay },
  PSD: { category: 'info', icon: FileImage },
  FIG: { category: 'info', icon: FileImage },
  EPS: { category: 'info', icon: FileImage },
  XLS: { category: 'success', icon: FileSpreadsheet },
  XLSX: { category: 'success', icon: FileSpreadsheet },
  CSV: { category: 'success', icon: FileSpreadsheet },
  PPT: { category: 'flame', icon: FileText },
  PPTX: { category: 'flame', icon: FileText },
  MP3: { category: 'plum', icon: FileMusic },
  WAV: { category: 'plum', icon: FileMusic },
  AEP: { category: 'lavender', icon: FilePlay },
  KML: { category: 'lavender', icon: FileCode },
  INDD: { category: 'pink', icon: FileImage },
  HTML: { category: 'cyan', icon: FileCode },
  CSS: { category: 'cyan', icon: FileCode },
  JS: { category: 'cyan', icon: FileCode },
  JSON: { category: 'cyan', icon: FileCode },
  XML: { category: 'cyan', icon: FileCode },
  JAVA: { category: 'cyan', icon: FileCode },
  SQL: { category: 'cyan', icon: FileCode },
  RSS: { category: 'cyan', icon: FileCode },
  EXE: { category: 'cyan', icon: FileArchive },
  DMG: { category: 'cyan', icon: FileArchive },
  TXT: { category: 'neutral', icon: FileText },
  ZIP: { category: 'neutral', icon: FileArchive },
  RAR: { category: 'neutral', icon: FileArchive },
}

const fileTypeIconVariants = cva('inline-flex shrink-0 items-center justify-center rounded-sm', {
  variants: {
    size: {
      sm: 'size-8 [&_svg]:size-4',
      md: 'size-10 [&_svg]:size-5',
      lg: 'size-12 [&_svg]:size-6',
    },
  },
  defaultVariants: { size: 'md' },
})

export interface FileTypeIconProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof fileTypeIconVariants> {
  /** Filename (`"invoice.pdf"`) or a bare extension (`"pdf"` / `".pdf"`). Case-insensitive. */
  filename?: string | null
}

function getExtension(filename?: string | null): string {
  const trimmed = filename?.trim()
  if (!trimmed) return ''
  const parts = trimmed.split('.').filter(Boolean)
  if (parts.length === 0) return ''
  return parts[parts.length - 1].toUpperCase()
}

export const FileTypeIcon = forwardRef<HTMLSpanElement, FileTypeIconProps>(
  ({ className, filename, size, ...props }, ref) => {
    const extension = getExtension(filename)
    const entry = extension ? FILE_TYPE_MAP[extension] : undefined
    const category = entry?.category ?? 'neutral'
    const Icon = entry?.icon ?? FileQuestionMark

    return (
      <span
        ref={ref}
        data-slot="file-type-icon"
        role="img"
        aria-label={extension ? `${extension} file` : 'unknown file type'}
        className={cn(fileTypeIconVariants({ size }), CATEGORY_CLASSES[category], className)}
        {...props}
      >
        <Icon aria-hidden="true" />
      </span>
    )
  },
)

FileTypeIcon.displayName = 'FileTypeIcon'

export { fileTypeIconVariants, type FileTypeCategory }

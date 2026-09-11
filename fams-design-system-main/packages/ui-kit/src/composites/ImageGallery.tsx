import { useCallback, useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { Calendar, ChevronLeft, ChevronRight, ImageOff, MapPin, X } from '../icons'
import { cn } from '../lib/cn'
import { Button } from '../primitives/Button'
import { Dialog, DialogContent, DialogTitle } from '../primitives/Dialog'

/**
 * A single gallery image.
 */
export interface ImageGalleryImage {
  /** Image URL. */
  src: string
  /** Accessible alt text — required, never inferred from the filename. */
  alt: string
  /** Optional caption shown under the image in the lightbox. */
  caption?: string
  /** ISO datetime the photo was taken — rendered as a date/time stamp overlay in the lightbox. */
  takenAt?: string
  /** Where the photo was taken — rendered as a location stamp overlay in the lightbox. */
  location?: string
}

// "31 Aug, 2026 · 3:40 am" — the lightbox stamp's date/time format.
const STAMP_DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const STAMP_TIME = new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })

function formatStamp(takenAt: string): string | null {
  const date = new Date(takenAt)
  if (Number.isNaN(date.getTime())) return null
  return `${STAMP_DATE.format(date)} · ${STAMP_TIME.format(date)}`
}

/**
 * ImageGallery — thumbnail strip + fullscreen lightbox for reviewing a set
 * of images (evidence photos, attachments, inspection shots). [L3 composite]
 *
 * Thumbnails scroll via `embla-carousel-react`; clicking one opens a
 * fullscreen `Dialog` lightbox with Previous/Next controls, a counter, and
 * arrow-key navigation. Left/Right key handling respects the nearest `dir`
 * ancestor (including through the lightbox's portal into `document.body`):
 * under `dir="rtl"` the physical meaning of ArrowLeft/ArrowRight mirrors, so
 * the key that visually points toward Previous always advances backward.
 *
 * State-agnostic (Rule 8): renders exactly the `images` it is given. Which
 * image is active is internal transient UI state, mirrored out via
 * `onIndexChange` for callers that want to sync it (e.g. a caption panel).
 *
 * @usage-v5
 *   Consolidates the "thumbnail grid + q-dialog(maximized) + q-carousel"
 *   fullscreen-preview pattern used for waste-management evidence photos:
 *   - shared/components/common/ImagePreview.vue — thumbnail grid, edit mode
 *     with per-thumb delete, `q-dialog maximized` wrapping a `q-carousel`
 *     (`swipeable animated arrows navigation infinite`) over `q-img fit=contain`
 *   - iwmp/components/inspector/common/DisplayImage.vue,
 *     iwmp/components/inspector/WOEvidenceSection.vue,
 *     iwmp/components/charts/BinWashingDetailDrawer.vue,
 *     iwmp/components/charts/BinInspectionDetailDrawer.vue,
 *     iwmp/components/fileUpload/UploadWithDelete.vue — near-duplicate
 *     thumbnail-grid-to-fullscreen flows layered on the same q-carousel shape
 *   None of the six wire keyboard arrow navigation or an RTL-aware key
 *   mapping — both are net-new here, not a regression risk.
 * @usage-index image-gallery
 */
export interface ImageGalleryProps {
  /** Images to display. Click any thumbnail to open the fullscreen lightbox on it. */
  images: ImageGalleryImage[]
  /** Index the lightbox opens on the first time it is triggered. Clamped to the images range. */
  initialIndex?: number
  /** Fires whenever the active image changes — thumbnail click, Previous/Next, or arrow keys. */
  onIndexChange?: (index: number) => void
  /** Thumbnail size. */
  size?: 'sm' | 'md' | 'lg'
  /** Shows skeleton placeholders instead of thumbnails while the caller is still loading `images`. */
  loading?: boolean
  /**
   * Renders the thumbnail strip. Pass `false` for LIGHTBOX-ONLY mode — the
   * caller supplies its own clickable previews (e.g. `FileUploader` tiles)
   * and drives the lightbox via the controlled `open`/`onOpenChange` pair,
   * so every gallery in the product opens the SAME lightbox rather than a
   * second implementation. @default true
   */
  thumbnails?: boolean
  /** Controlled lightbox visibility — omit for the default self-managed open-on-thumbnail-click behavior. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

const THUMB_SIZE: Record<NonNullable<ImageGalleryProps['size']>, string> = {
  sm: 'size-14',
  md: 'size-20',
  lg: 'size-28',
}

const SKELETON_COUNT = 4

/** Walks up from `el` to find the nearest explicit `dir`, defaulting to `ltr`. */
function directionOf(el: Element | null): 'ltr' | 'rtl' {
  let node: Element | null = el
  while (node) {
    const dir = node.getAttribute('dir')
    if (dir === 'rtl' || dir === 'ltr') return dir
    node = node.parentElement
  }
  return 'ltr'
}

export function ImageGallery({
  images,
  initialIndex = 0,
  onIndexChange,
  size = 'md',
  loading = false,
  thumbnails = true,
  open: openProp,
  onOpenChange,
  className,
}: ImageGalleryProps) {
  const clampIndex = useCallback(
    (next: number) => Math.min(Math.max(next, 0), Math.max(images.length - 1, 0)),
    [images.length],
  )
  const [index, setIndex] = useState(() => clampIndex(initialIndex))
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setInternalOpen(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange],
  )
  const [emblaRef, emblaApi] = useEmblaCarousel({ dragFree: true, containScroll: 'trimSnaps' })

  useEffect(() => {
    setIndex((current) => clampIndex(current))
  }, [clampIndex])

  const goTo = useCallback(
    (next: number) => {
      const clamped = clampIndex(next)
      setIndex(clamped)
      onIndexChange?.(clamped)
      emblaApi?.scrollTo(clamped)
    },
    [clampIndex, emblaApi, onIndexChange],
  )

  const openAt = (i: number) => {
    goTo(i)
    setOpen(true)
  }

  const goNext = useCallback(
    () => goTo(index + 1 >= images.length ? 0 : index + 1),
    [goTo, index, images.length],
  )
  const goPrev = useCallback(
    () => goTo(index - 1 < 0 ? images.length - 1 : index - 1),
    [goTo, index, images.length],
  )

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const isRtl = directionOf(event.currentTarget) === 'rtl'
    const isNext = isRtl ? event.key === 'ArrowLeft' : event.key === 'ArrowRight'
    if (isNext) goNext()
    else goPrev()
  }

  const current = images[index]

  if (loading && !thumbnails) return null
  if (loading) {
    return (
      <div data-slot="image-gallery" className={cn('flex gap-2', className)}>
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <div key={i} className={cn('shrink-0 animate-pulse rounded-sm bg-muted', THUMB_SIZE[size])} />
        ))}
      </div>
    )
  }

  if (images.length === 0 && !thumbnails) return null
  if (images.length === 0) {
    return (
      <div
        data-slot="image-gallery"
        className={cn(
          'flex min-h-24 items-center justify-center gap-2 rounded-sm border border-dashed border-border text-body-sm text-muted-foreground',
          className,
        )}
      >
        <ImageOff className="size-4" aria-hidden="true" />
        No images
      </div>
    )
  }

  return (
    <div data-slot="image-gallery" className={cn(thumbnails && 'overflow-hidden', className)}>
      {thumbnails ? (
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex gap-2">
          {images.map((image, i) => (
            <button
              key={image.src + i}
              type="button"
              onClick={() => openAt(i)}
              aria-label={`Open image ${i + 1} of ${images.length}: ${image.alt}`}
              className={cn(
                'shrink-0 overflow-hidden rounded-sm border outline-none transition-shadow',
                'focus-visible:ring-2 focus-visible:ring-ring',
                i === index ? 'border-primary ring-2 ring-primary' : 'border-border hover:opacity-90',
                THUMB_SIZE[size],
              )}
            >
              <img src={image.src} alt={image.alt} className="size-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      </div>
      ) : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          hideClose
          onKeyDown={handleKeyDown}
          className={cn(
            'inset-0 top-0 start-0 flex h-screen w-screen max-w-none translate-x-0 translate-y-0',
            'flex-col items-center justify-center gap-0 rounded-none border-0 bg-black/90 p-0 text-white shadow-none outline-none',
          )}
        >
          <DialogTitle className="sr-only">{current?.alt ?? 'Image preview'}</DialogTitle>

          <Button
            type="button"
            variant="ghost"
            size="iconRound"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute end-4 top-4 text-white hover:bg-white/10 hover:text-white"
          >
            <X />
          </Button>

          {images.length > 1 ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="iconRound"
                aria-label="Previous image"
                onClick={goPrev}
                className="absolute start-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="rtl:-scale-x-100" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="iconRound"
                aria-label="Next image"
                onClick={goNext}
                className="absolute end-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/10 hover:text-white"
              >
                <ChevronRight className="rtl:-scale-x-100" />
              </Button>
            </>
          ) : null}

          {current ? (
            <div className="relative">
              <img src={current.src} alt={current.alt} className="max-h-[85vh] max-w-[90vw] object-contain" />
              {/* Camera-style geo/time stamp over the photo's bottom-start corner. */}
              {current.takenAt || current.location ? (
                <div
                  data-slot="image-gallery-stamp"
                  className="absolute bottom-3 start-3 flex max-w-[85%] flex-col gap-1 rounded-sm bg-black/70 px-2.5 py-1.5 text-body-xs text-white"
                >
                  {current.takenAt && formatStamp(current.takenAt) ? (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
                      {formatStamp(current.takenAt)}
                    </span>
                  ) : null}
                  {current.location ? (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{current.location}</span>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {current?.caption ? (
            <p className="mt-3 max-w-[80vw] text-center text-body-sm text-white/80">{current.caption}</p>
          ) : null}

          {images.length > 1 ? (
            <div
              aria-live="polite"
              // token-exempt: symmetric centering needs a physical `left-1/2` —
              // `start-1/2` flips to the far edge under RTL while `-translate-x-1/2`
              // stays physical, landing the counter a full width off-center (see F3).
              className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-body-xs text-white"
            >
              {index + 1} / {images.length}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

ImageGallery.displayName = 'ImageGallery'

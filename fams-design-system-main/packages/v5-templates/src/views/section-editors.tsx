/**
 * `NotesProofsSection`'s always-on in-place editors (product direction
 * 2026-09-02: the controls themselves convey editability — no pencil
 * toggles). Split out of `section-renderers.tsx` to keep that file inside the
 * ~300-line component budget (root CLAUDE.md rule 12); both editors are
 * private to the notes/proofs section and are never exported from the
 * package barrel.
 */
import { useState } from 'react'
import { FileUploader, ImageGallery, Textarea, type ImageGalleryImage, type UploadedFile } from '@fams/ui-kit'

/**
 * Always-editable notes (V2 node 8753:19364, the plain description text
 * area) — the field's own anatomy conveys editability, so there is no pencil
 * and no explicit Save: the draft commits on blur, only when the text
 * actually changed.
 */
export function EditableNotes({
  initial,
  label,
  onCommit,
}: {
  initial: string
  label: string
  onCommit: (text: string) => void
}) {
  const [text, setText] = useState(initial)
  return (
    <Textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text.trim() !== initial.trim()) onCommit(text)
      }}
      rows={4}
      aria-label={label}
      placeholder="Description..."
      // Same type size as the read-only notes card (`DescriptionCard`'s
      // `text-body-xs`) so this section's text matches its neighbors.
      className="text-body-xs"
    />
  )
}

/**
 * Always-editable photo list — the DS `FileUploader` in its panel anatomy
 * (V2 5518:1777 empty dropzone / 8760:2761 "Upload More" tile + image tiles
 * with overlay actions), which itself conveys editability — no pencil
 * toggle. Committed record shape stays `ImageGalleryImage[]`; picked files
 * are inlined as data URLs (a demo environment has no asset host — a real
 * product swaps the reader for its upload hook without touching the section
 * contract).
 */
export function EditableImageList({
  images,
  onChange,
}: {
  images: ImageGalleryImage[]
  onChange: (next: ImageGalleryImage[]) => void
}) {
  // Lightbox index; null = closed. The keyed remount below re-seeds `initialIndex`.
  const [preview, setPreview] = useState<number | null>(null)
  const files: UploadedFile[] = images.map((img, index) => ({
    id: `${index}:${img.src}`,
    previewUrl: img.src,
    name: img.alt,
    mimeType: 'image/*',
    status: 'done',
  }))
  return (
    <>
      <FileUploader
        files={files}
        layout="panel"
        variant="compact"
        // Match `ImageGallery`'s thumbnails so this section's tiles line up
        // with the read-only galleries in the sections around it.
        tileSize="sm"
        maxFiles={6}
        addMoreText="Upload More"
        onAdd={(picked) => {
          void Promise.all(
            picked.map(
              (file) =>
                new Promise<ImageGalleryImage>((resolve, reject) => {
                  const reader = new FileReader()
                  reader.onload = () => resolve({ src: String(reader.result), alt: file.name })
                  reader.onerror = () => reject(reader.error)
                  reader.readAsDataURL(file)
                }),
            ),
          ).then((added) => onChange([...images, ...added]))
        }}
        onRemove={(id) => onChange(images.filter((_, index) => `${index}:${images[index].src}` !== id))}
        onPreview={(id) => {
          const index = files.findIndex((f) => f.id === id)
          if (index >= 0) setPreview(index)
        }}
      />
      {/* The SAME lightbox every read-only gallery opens (`ImageGallery` in
          lightbox-only mode) — the uploader tiles are the thumbnails here. */}
      <ImageGallery
        key={preview ?? 'closed'}
        images={images}
        thumbnails={false}
        initialIndex={preview ?? 0}
        open={preview != null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
      />
    </>
  )
}

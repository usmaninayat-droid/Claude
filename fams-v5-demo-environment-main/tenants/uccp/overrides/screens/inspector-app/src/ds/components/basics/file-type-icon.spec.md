# FileTypeIcon — behavioral spec

## Source of truth

- Artwork: `assets/vectors/file type/File Type/*.svg` (Figma "Icons → File
  Type" set — one illustrated document-page SVG per extension + a `Default`
  fallback glyph).
- Registry/loader: `basics/file-type-icons/index.ts`.
- Ticket: T-089 (upgraded from a plain code-drawn page+badge reproduction to
  the shipped artwork itself, client-requested — "real per-type file icons").

## Purpose

The per-file-type glyph used anywhere a document/attachment row needs an
at-a-glance file-kind cue:

- Worker profile **Documents** tab + **Document Renewals** tab rows
  (`modules/worker-detail.tsx`, product).
- Zone/site profile **Documents** tab rows (`modules/zone-detail.tsx`, product).
- `FileUpload`'s uploaded-file rows (`basics/file-upload.tsx`).
- Icons showcase page (`showcase/pages/Icons.tsx`).

## How it works

`file-type-icons/index.ts` globs the real SVGs as URLs (`import.meta.glob`,
`eager` + `query: '?url'` — the SAME loader shape as `icons/asset-vectors.tsx`
and `icons/event-icons.tsx`, the POI-pin precedent) and exposes:

- `FILE_TYPE_ICON_KEYS` — every known extension slug on disk (sorted, excludes
  `Default`).
- `fileTypeIconUrl(ext?)` — resolves an extension (case-insensitive, leading
  dot optional) to its artwork URL; unmapped/omitted → the `Default` glyph
  (never a broken image).

`FileTypeIcon` itself is a thin `<img>` wrapper over `fileTypeIconUrl`.

## Props

```ts
interface FileTypeIconProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  ext?: string;   // e.g. "PDF", "docx", ".jpg" — case/dot insensitive
  size?: number;  // square px, default 40
}
```

## Hard constraints

1. **Never fork/inline a second copy of the artwork** — always resolve
   through `fileTypeIconUrl`/`FileTypeIcon`, so a future asset update (new
   extension, re-exported SVG) only needs the registry touched once.
2. **Unknown/missing `ext` renders the `Default` glyph, never an empty/broken
   image** — don't add a bespoke empty state around it.
3. **The registry lives under `src/`** (not a bare `assets/`-only reference)
   so the vendor mirror step carries the source SVGs — mirroring `asset-
   vectors.tsx`'s pattern exactly.
4. Extension matching is **case-insensitive with an optional leading dot**
   (`ext="pdf"`, `"PDF"`, `".pdf"` all resolve the same) — callers should pass
   the raw stored extension/filename suffix without pre-normalizing.

## Known alias

The source asset ships the `.zip` glyph under a non-standard filename
(`ZP.svg`) — `fileTypeIconUrl('ZIP')` resolves it via an internal alias map.
`FILE_TYPE_ICON_KEYS` reflects the raw on-disk slugs only (so an enumeration
— e.g. the Icons showcase grid — doesn't render a duplicate "ZIP"/"ZP" card).

## Anti-patterns

- ❌ Re-deriving a colour/shape from the extension string instead of using the
  registry (the old `FILE_TYPE_COLOR`/hand-drawn-page approach this replaced).
- ❌ Passing a MIME type (`"application/pdf"`) — `ext` expects a short
  extension/label, not a MIME string.
- ❌ Hardcoding one extension (e.g. always `ext="pdf"`) for every row in a
  list regardless of the row's real document/file type — defeats the point of
  a per-type registry (this was T-089's actual bug in `worker-detail.tsx`).

## Cross-references

- Used by: `FileUpload`, worker profile Documents/Renewals (product), zone
  profile Documents (product).
- Related loaders: `icons/asset-vectors.tsx`, `icons/event-icons.tsx`.

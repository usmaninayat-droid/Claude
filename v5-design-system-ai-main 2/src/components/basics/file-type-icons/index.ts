/// <reference types="vite/client" />

/**
 * File-type icon registry — the REAL Figma "File Type" artwork (illustrated
 * page + colour-coded extension corner, one SVG per extension incl. a
 * `Default` fallback), not a code reproduction.
 *
 * Loaded as URLs via a relative glob into the DS's own `assets/` tree — the
 * SAME loader shape as `icons/asset-vectors.tsx` (vehicle/bin/workforce map
 * glyphs) and `icons/event-icons.tsx` (POI-pin precedent, T-027): `eager` +
 * `query: '?url'` resolves through the `@ds` alias too, and keeping the
 * source SVGs under `src/` (via this relative import) is what makes the
 * vendor-mirror step carry them — a bare `assets/`-only reference with no
 * `src/` importer risks going stale/unmirrored (T-089).
 */
const modules = import.meta.glob(
  '../../../../assets/vectors/file type/File Type/*.svg',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

const REGISTRY: Record<string, string> = {};
for (const [path, url] of Object.entries(modules)) {
  const name = (path.split('/').pop() ?? '').replace(/\.svg$/i, '');
  REGISTRY[name.toUpperCase()] = url;
}

/** All known extension slugs on disk (sorted, excludes the `Default` fallback). */
export const FILE_TYPE_ICON_KEYS = Object.keys(REGISTRY)
  .filter((k) => k !== 'DEFAULT')
  .sort();

const DEFAULT_URL = REGISTRY.DEFAULT;

/** Extension aliases — the source asset ships one file under a non-obvious
 *  name (`ZP.svg` covers the `.zip` extension); resolved at LOOKUP time only,
 *  so it doesn't duplicate a card in an enumeration of `FILE_TYPE_ICON_KEYS`. */
const ALIAS: Record<string, string> = { ZIP: 'ZP' };

/** Resolve a file extension (case-insensitive, leading dot optional) to its
 *  artwork URL — falls back to the generic "Default" page glyph for anything
 *  unmapped (unknown/missing extension), never a broken image. */
export function fileTypeIconUrl(ext?: string): string {
  const key = ext?.toUpperCase().replace(/^\./, '');
  const resolved = key ? (REGISTRY[key] ?? REGISTRY[ALIAS[key]]) : undefined;
  return resolved ?? DEFAULT_URL;
}

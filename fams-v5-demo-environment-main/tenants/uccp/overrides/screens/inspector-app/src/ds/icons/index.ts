/**
 * @fams/design-system icons — the REAL V5 icon set.
 *
 * 1,231 icons generated from the design kit's SVG assets
 * (`V5 Design System - Ai/assets/icons`, 20 Untitled-UI-style categories)
 * by `scripts/generate-icons.mjs`. Filled 24×24 glyphs normalised to
 * `currentColor`, exposed as components with a lucide-compatible API:
 *
 *   import { Icons } from '@fams/design-system';
 *   <Icons.SearchMd size={16} className="text-muted-foreground" />
 *
 * Naming is PascalCase of the asset filename (search-md.svg → SearchMd,
 * bell-01.svg → Bell01). Re-generate with `node scripts/generate-icons.mjs`
 * after the asset folder changes — files under ./v5 are auto-generated.
 *
 * NOTE: low-level component INTERNALS still use lucide-react for a handful
 * of structural glyphs (select chevrons, dialog ×). The public icon system
 * is this V5 set.
 */
export * from './v5';

// Event glyph library (line + map variants) — see event-icons.tsx.
export {
  EventIcon,
  eventIconUrl,
  slugifyEvent,
  EVENT_ICON_KEYS,
  EVENT_ICONS,
} from './event-icons';
export type { EventIconVariant, EventIconEntry, EventIconProps } from './event-icons';

// Asset glyph library (vehicle / bin / workforce; map + list) — the dynamic
// inner icon of a live-monitoring AssetMarker. See asset-vectors.tsx.
export {
  AssetGlyph,
  assetVectorUrl,
  slugifyAsset,
  ASSET_VECTOR_KEYS,
  ASSET_VECTORS,
} from './asset-vectors';
export type { AssetVectorVariant, AssetKind, AssetVectorEntry, AssetGlyphProps } from './asset-vectors';

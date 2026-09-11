/// <reference types="vite/client" />
import * as React from 'react';

/**
 * Asset vectors — the FAMS asset glyph library (Figma DS V2 "Asset Icons").
 *
 * The dynamic inner glyph for a live-monitoring map pin (and asset lists):
 * vehicles (car, bus, tanker, excavator, …), workforce, and bins. Each ships in
 * two variants:
 *   • **map**  — 32×32 square glyph, used INSIDE the AssetMarker pin on the map.
 *   • **list** — 58×32 landscape glyph, used in asset list rows.
 *
 * Loaded as URLs via a relative glob (resolves into the DS assets folder whether
 * the kit runs directly or via the `@ds` alias). Keyed by a slug of the asset
 * name (e.g. "Cement Bulker" → `cement-bulker`).
 */

export type AssetVectorVariant = 'map' | 'list';
export type AssetKind = 'vehicle' | 'bin' | 'workforce';

const modules = import.meta.glob(
  [
    '../../assets/vectors/vehicle/Asset Icons/{List,Map}/*.svg',
    '../../assets/vectors/bin/**/{List,Map}/*.svg',
    '../../assets/vectors/workforce/*.svg',
  ],
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

export function slugifyAsset(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface AssetVectorEntry {
  kind: AssetKind;
  label: string;
  map?: string;
  list?: string;
}

const REGISTRY: Record<string, AssetVectorEntry> = {};
for (const [path, url] of Object.entries(modules)) {
  const kindM = /\/vectors\/(vehicle|bin|workforce)\//i.exec(path);
  if (!kindM) continue;
  const kind = kindM[1].toLowerCase() as AssetKind;
  const label = (path.split('/').pop() ?? '').replace(/\.svg$/i, '');
  const slug = slugifyAsset(label);
  const variant: AssetVectorVariant | null = /\/Map\//i.test(path)
    ? 'map'
    : /\/List\//i.test(path)
      ? 'list'
      : null; // e.g. flat workforce file → fill both
  const entry = (REGISTRY[slug] ??= { kind, label });
  if (variant) entry[variant] = url;
  else {
    entry.map ??= url;
    entry.list ??= url;
  }
}

/** All known asset slugs (sorted). */
export const ASSET_VECTOR_KEYS = Object.keys(REGISTRY).sort();
/** Full registry (slug → entry). */
export const ASSET_VECTORS: Readonly<Record<string, AssetVectorEntry>> = REGISTRY;

/** Resolve an asset glyph URL by name/slug + variant (default `map`). */
export function assetVectorUrl(name: string, variant: AssetVectorVariant = 'map'): string | undefined {
  const entry = REGISTRY[slugifyAsset(name)];
  if (!entry) return undefined;
  return entry[variant] ?? entry.map ?? entry.list;
}

export interface AssetGlyphProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Asset name or slug (e.g. "Tanker" / "tanker", "workforce", "bin"). */
  name: string;
  /** `map` (default — inside the pin) or `list` (asset list rows). */
  variant?: AssetVectorVariant;
  /** Square pixel size for the map variant (default 24). */
  size?: number;
}

/**
 * `<AssetGlyph name="Tanker" />` renders the asset's map glyph — the dynamic
 * inner icon of an `<AssetMarker>`. Returns `null` for an unknown asset.
 */
export function AssetGlyph({ name, variant = 'map', size = 24, alt, style, ...rest }: AssetGlyphProps) {
  const url = assetVectorUrl(name, variant);
  if (!url) return null;
  // List glyphs are landscape (58×32); map glyphs are square (32×32).
  const dims = variant === 'list' ? { height: size } : { width: size, height: size };
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img src={url} alt={alt ?? name} style={{ ...dims, objectFit: 'contain', ...style }} {...rest} />;
}

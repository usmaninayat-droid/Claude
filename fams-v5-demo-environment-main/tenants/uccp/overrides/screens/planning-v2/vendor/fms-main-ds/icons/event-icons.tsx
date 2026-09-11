/// <reference types="vite/client" />
import * as React from 'react';

/**
 * Event icons — the FAMS event glyph library (Figma DS V2 "Event Icons").
 *
 * Each event ships in three Figma variants — Line, Filled, Map — but the
 * platform only uses two:
 *   • **line** — the default everywhere (cards, detail views, lists, all UI).
 *   • **map**  — only on the live map (marker badges, 32×32 circular).
 *   • filled   — exists in Figma but is NOT used, so it is intentionally not
 *                bundled here.
 *
 * SVGs live in `assets/vectors/events/<Set>/<Variant>/<Event>.svg`. They're
 * loaded as URLs via a relative glob so the path resolves into the DS assets
 * folder whether the kit runs directly or is consumed through the `@ds` alias.
 * Keyed by a slug of the event name (e.g. "ADAS Speed Down" → `adas-speed-down`),
 * which is unique across all four sets (DMS-ADAS, General, Green Driving, Waste).
 */

export type EventIconVariant = 'line' | 'map';

// Only the used variants are bundled (Line + Map); Filled is excluded by design.
const modules = import.meta.glob(
  '../../assets/vectors/events/**/{Line,Map}/*.svg',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;

export function slugifyEvent(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface EventIconEntry {
  /** Originating Figma set (e.g. "General Event Icons"). */
  set: string;
  /** Human label as authored in Figma (e.g. "ADAS Speed Down"). */
  label: string;
  line?: string;
  map?: string;
}

const REGISTRY: Record<string, EventIconEntry> = {};
for (const [path, url] of Object.entries(modules)) {
  const m = /\/events\/(.+?)\/(Line|Map)\/([^/]+)\.svg$/i.exec(path);
  if (!m) continue;
  const [, set, variantRaw, label] = m;
  const slug = slugifyEvent(label);
  const entry = (REGISTRY[slug] ??= { set, label });
  entry[variantRaw.toLowerCase() as EventIconVariant] = url;
}

/** All known event slugs (sorted). */
export const EVENT_ICON_KEYS = Object.keys(REGISTRY).sort();

/** Full registry (slug → entry), e.g. for building pickers. */
export const EVENT_ICONS: Readonly<Record<string, EventIconEntry>> = REGISTRY;

/** Resolve an event icon URL by name/slug + variant (default `line`). */
export function eventIconUrl(name: string, variant: EventIconVariant = 'line'): string | undefined {
  const entry = REGISTRY[slugifyEvent(name)];
  if (!entry) return undefined;
  return entry[variant] ?? entry.line ?? entry.map;
}

export interface EventIconProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Event name or slug (e.g. "Overspeed" / "overspeed"). */
  name: string;
  /** `line` (default — cards/detail/all UI) or `map` (map markers). */
  variant?: EventIconVariant;
  /** Square pixel size (default 16). */
  size?: number;
}

/**
 * `<EventIcon name="Overspeed" />` renders the Line glyph (default), or
 * `<EventIcon name="Overspeed" variant="map" />` the 32×32 map badge. Returns
 * `null` for an unknown event so callers can fall back.
 */
export function EventIcon({ name, variant = 'line', size = 16, alt, ...rest }: EventIconProps) {
  const url = eventIconUrl(name, variant);
  if (!url) return null;
  // eslint-disable-next-line jsx-a11y/alt-text
  return <img src={url} width={size} height={size} alt={alt ?? name} {...rest} />;
}

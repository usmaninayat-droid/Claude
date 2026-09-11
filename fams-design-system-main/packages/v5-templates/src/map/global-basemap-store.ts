import { useSyncExternalStore } from 'react'
import { BRIGHT_MAP_STYLE, MUTED_MAP_STYLE } from './constants'

/**
 * global-basemap-store — the app-wide "which basemap style is selected"
 * store (map-layer-switcher spec, point 5).
 *
 * Every map surface in the app (Live Monitoring, dashboard map widgets,
 * record-detail maps, the standalone `MapContainer`) shares ONE selected
 * basemap id: picking a style in any one of them must replicate to all the
 * others, including across browser tabs.
 *
 * This is deliberately a v5-templates (tier-2) module, not ui-kit: rule 8 of
 * `fams-design-system/CLAUDE.md` forbids a global store inside ui-kit's
 * state-agnostic presenters, but v5-templates' product-pattern tier is
 * explicitly allowed to compose state. `MapLayersSwitcher`/`MapLayersControl`
 * in ui-kit stay pure controlled presenters (`activeStyleId`/`onStyleChange`
 * props only, no import of this module); every v5-templates view calls
 * `useGlobalBasemapId` itself and passes the value/setter down as ordinary
 * props.
 *
 * Persistence + cross-tab sync uses `localStorage` + its `storage` event,
 * guarded the same defensive way as `useMutedBasemapStyle`
 * (`./muted-basemap.ts`) — safe under SSR, jsdom, and private-mode storage
 * exceptions.
 */

const STORAGE_KEY = 'fams:map:global-basemap-id'

/**
 * The shared basemap-id vocabulary every map surface cycles/selects over —
 * the SAME ids `LiveMapTools`' `LIVE_MAP_BASEMAP_STYLES` offers (asserted by
 * `global-basemap-store.test.ts`). Lives here, not in `chrome/LiveMapTools`,
 * so light-barrel views can import it without pulling the live chrome in.
 */
export const GLOBAL_BASEMAP_IDS = ['muted', 'streets', 'bright', 'satellite', 'terrain', 'hybrid'] as const
export type GlobalBasemapId = (typeof GLOBAL_BASEMAP_IDS)[number]
export const DEFAULT_GLOBAL_BASEMAP_ID: GlobalBasemapId = 'muted'

/**
 * Legacy ids the switcher used to persist BEFORE the map-layer-switcher spec
 * renamed it to the canonical six (Grayscale/OSM/Roadmap/Satellite/Terrain/
 * Hybrid) — `dark` was `terrain`'s id pre-rename (see
 * `LIVE_MAP_DARK_STYLE_ID` in `chrome/LiveMapTools.tsx`). A browser that
 * persisted one of these before the rename otherwise carries it forever:
 * `localStorage` is durable and nothing here used to validate what came back
 * out of it.
 */
const LEGACY_BASEMAP_ID_MIGRATIONS: Record<string, GlobalBasemapId> = {
  dark: 'terrain',
}

/**
 * Migrates/validates a basemap id read from (or about to be written to)
 * storage. An unrecognized id — a legacy pre-rename value with no migration
 * entry, a value from a future build, or plain corruption — resolves to
 * `null` so callers fall back to their own default rather than resolving a
 * style for an id nothing in the current vocabulary recognizes (round-run
 * fix: an unvalidated id used to sail straight through to
 * `resolveGlobalBasemapStyleUrl`, silently landing on the bright style with
 * no visible indication in the switcher that anything had been coerced).
 */
export function sanitizeGlobalBasemapId(id: string | null | undefined): GlobalBasemapId | null {
  if (!id) return null
  if ((GLOBAL_BASEMAP_IDS as readonly string[]).includes(id)) return id as GlobalBasemapId
  return LEGACY_BASEMAP_ID_MIGRATIONS[id] ?? null
}

/**
 * Resolves a basemap id to the MapLibre style URL `MapPanel` loads. Only
 * `muted` and `bright` are real, distinct free styles (repo rule 1 forbids
 * paid tile providers); every other id is a CSS-swatch-only treatment and
 * resolves to the bright style — see `resolveGlobalBasemapCanvasFilter` for
 * the CSS-filter half that makes those four legible and distinct from
 * plain `bright`. Callers that patch the muted style's paint
 * (`useMutedBasemapStyle`) substitute their patched URL for the `muted` case.
 * Unrecognized ids resolve as `bright` (the neutral default), never as
 * `muted` — an unknown id should never SILENTLY inherit the "resting" tint.
 */
export function resolveGlobalBasemapStyleUrl(id: string, mutedUrl: string = MUTED_MAP_STYLE): string {
  return sanitizeGlobalBasemapId(id) === 'muted' ? mutedUrl : BRIGHT_MAP_STYLE
}

/**
 * CSS filter applied to the MapLibre canvas itself for the four ids that
 * have no distinct tile style (repo rule 1 forbids a paid tile provider, so
 * there is no real satellite/terrain/hybrid source to fetch). Round-run fix
 * (map-layer-switcher spec point 3): these used to resolve to NO filter at
 * all, so every one of Satellite/Terrain/Hybrid/OSM rendered pixel-identical
 * to Roadmap — a designer clicking through the switcher saw the same map six
 * times, which read as a broken/placeholder basemap rather than six
 * distinct styles. Every filter here keeps `filter-none`-equivalent contrast
 * on roads (never below ~0.5 brightness) so the network is legible against
 * land/water at any zoom — see the module doc-comment for the exact
 * per-variant intent (dark-ish for Satellite/Hybrid, warm for Terrain,
 * neutral for Grayscale/OSM/Roadmap).
 */
const GLOBAL_BASEMAP_CANVAS_FILTERS: Partial<Record<GlobalBasemapId, string>> = {
  // Real tile styles — no filter, the style URL alone carries the look.
  muted: '',
  bright: '',
  // OSM reads as a plain, slightly warmer vector map — a gentle push, not a
  // wash.
  streets: 'saturate(1.15) contrast(1.03)',
  // Dark-ish with roads still legible (WCAG-adjacent floor: never darker
  // than this against the bright style's white road casings).
  satellite: 'brightness(0.62) contrast(1.2) saturate(1.5) sepia(0.35)',
  // Warm, sun-baked terrain tint.
  terrain: 'sepia(0.55) saturate(1.35) brightness(1.05) hue-rotate(-8deg)',
  // Dark like Satellite, with a cooler/greener push so the two read as
  // siblings, not duplicates.
  hybrid: 'brightness(0.55) contrast(1.25) saturate(1.6) hue-rotate(-12deg) sepia(0.3)',
}

/** Resolves a basemap id to the CSS filter its canvas should carry (empty
 *  string for the two real tile styles and any unrecognized id). */
export function resolveGlobalBasemapCanvasFilter(id: string): string {
  const sanitized = sanitizeGlobalBasemapId(id)
  return (sanitized && GLOBAL_BASEMAP_CANVAS_FILTERS[sanitized]) || ''
}

type Listener = () => void
const listeners = new Set<Listener>()

/** In-memory value — the source of truth within a single tab/session. */
let currentId: string | null = null
let initialized = false

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

function readPersisted(): string | null {
  if (!hasLocalStorage()) return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writePersisted(id: string): void {
  if (!hasLocalStorage()) return
  try {
    window.localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* private-mode / quota — in-memory value still updates below */
  }
}

function ensureInitialized(): void {
  if (initialized) return
  initialized = true
  currentId = readPersisted()
  if (hasLocalStorage()) {
    try {
      window.addEventListener('storage', (event) => {
        if (event.key !== STORAGE_KEY) return
        currentId = event.newValue
        listeners.forEach((listener) => listener())
      })
    } catch {
      /* addEventListener unavailable (non-DOM env) — same-tab sync still works */
    }
  }
}

/** Sets the app-wide basemap id; replicates to every subscribed component and every other tab. */
export function setGlobalBasemapId(id: string): void {
  ensureInitialized()
  if (currentId === id) return
  currentId = id
  writePersisted(id)
  listeners.forEach((listener) => listener())
}

function subscribe(listener: Listener): () => void {
  ensureInitialized()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): string | null {
  ensureInitialized()
  return currentId
}

function getServerSnapshot(): string | null {
  return null
}

/**
 * useGlobalBasemapId — subscribes to the app-wide basemap selection.
 *
 * @param defaultId returned when nothing has been selected/persisted yet.
 * @returns `[id, setId]`, mirroring `useState`'s shape so call sites are a
 * drop-in replacement for the local `useState` each map surface used to keep.
 */
export function useGlobalBasemapId(defaultId: string): [string, (id: string) => void] {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  // Sanitize on the way OUT: a legacy/unrecognized id living in storage (or
  // replicated in from another, differently-versioned tab) must not reach a
  // caller as though it were still valid — see `sanitizeGlobalBasemapId`.
  return [sanitizeGlobalBasemapId(stored) ?? defaultId, setGlobalBasemapId]
}

/** The globally selected basemap resolved straight to a style URL (read-only surfaces). */
export function useGlobalBasemapStyleUrl(): string {
  const [id] = useGlobalBasemapId(DEFAULT_GLOBAL_BASEMAP_ID)
  return resolveGlobalBasemapStyleUrl(id)
}

import { useMemo, useState } from 'react'
import iconsManifest from '../../../../assets/icons.json'
import { AssetStatusIcon, type MobilityStatus } from '@fams/ui-kit'
import { AssetVariantTable, type VariantAsset } from './AssetVariantTable'

// Pull every curated SVG straight from the repo-root authoring folder (fams-design-system/assets).
// Vite serves these via ?url; the fs.allow in vite.config.ts already permits the repo root.
const MODULES = import.meta.glob('../../../../assets/**/*.svg', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>

// Raw SVG source too, so we can detect which icons are genuinely monochrome
// (fill="currentColor"). ONLY those are safe to tenant-tint via CSS mask —
// masking a multi-color icon (file badges, colored pins) paints a solid block.
const RAW = import.meta.glob('../../../../assets/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

type ManifestEntry = { key: string; variant: string; tier: string; path: string; tag?: string }

// The manifest is the source of truth for grouping (key/variant) — legacy keys or
// broken SVGs are removed there by a concurrent agent and simply disappear from here.
const MANIFEST = iconsManifest as ManifestEntry[]

function urlFor(path: string): string | undefined {
  const match = Object.keys(MODULES).find((k) => k.endsWith('/assets/' + path))
  return match ? MODULES[match] : undefined
}

// Standard asset "list" icon used as the swappable icon inside the Asset
// Mobility Status table's dynamic Example cell (AssetStatusIcon) — any asset
// list icon works since the badge anchor is fixed regardless of icon, this
// is just a representative one for the gallery.
const EXAMPLE_ASSET_ICON = urlFor('illustrations/vehicle/car.svg')

/**
 * Dynamic renderer for the "Asset Mobility Status" family's Example column
 * (designer refinement of the original 6 static per-status composites,
 * commit a4c8b6b): resolves the row's status from its manifest key
 * (`asset-mobility-status/<status>`) and renders the live AssetStatusIcon
 * over a standard asset list icon, so every row's badge floats at the exact
 * same anchor. `undefined` for any other variant column (falls back to the
 * default `<img>` rendering in AssetVariantTable).
 */
function renderMobilityStatusExample(asset: VariantAsset) {
  if (asset.variant !== 'example') return undefined
  const status = asset.key.split('/').pop() as MobilityStatus
  if (!EXAMPLE_ASSET_ICON) return undefined
  return <AssetStatusIcon status={status} icon={EXAMPLE_ASSET_ICON} />
}

type Asset = { path: string; category: string; name: string; url: string; tier: string; mono: boolean }

const ASSETS: Asset[] = Object.entries(MODULES)
  .map(([key, url]) => {
    const rel = key.replace(/^.*\/assets\//, '') // e.g. icons/event/overspeed.svg
    const parts = rel.split('/')
    const name = parts.pop()!.replace(/\.svg$/, '')
    const category = parts.join('/') // e.g. icons/event
    const mono = (RAW[key] ?? '').includes('currentColor')
    return { path: rel, category, name, url, tier: parts[0] ?? 'other', mono }
  })
  .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

// Families presented as a variant matrix (concept name + one column per variant)
// instead of a flat grid — the manifest's top-level key segment names the family
// (e.g. "event/overspeed" -> family "event"). Only families whose duplicated-per-
// variant grid was the actual complaint are opted in here; everything else keeps
// the existing grid below until it's converted the same trivial way.
const MATRIX_FAMILIES: Record<string, string> = {
  event: 'Event',
  asset: 'Assets',
  'asset-tadweer': 'Assets / Tadweer',
  'asset-ead': 'Assets / EAD',
  'asset-mobility-status': 'Asset Mobility Status',
}

// Per-family column-label overrides for AssetVariantTable, keyed by family id then
// variant id. Only needed where the generic VARIANT_ORDER label ("Line" for
// "default") would be misleading — a family with a single "default" variant and no
// line/map duality reads better as "Icon".
const FAMILY_VARIANT_LABELS: Record<string, Record<string, string>> = {
  'asset-mobility-status': { default: 'Icon', example: 'Example' },
}

// Families completely hidden from the showcase (not shown in matrix or flat grid)
const EXCLUDED_FAMILIES = new Set(['vehicle'])

function familyOf(key: string) {
  return key.split('/')[0]
}

const CATEGORIES = Array.from(new Set(ASSETS.map((a) => a.category))).sort()
const TIER_COUNT = ASSETS.reduce<Record<string, number>>((acc, a) => {
  acc[a.tier] = (acc[a.tier] ?? 0) + 1
  return acc
}, {})

function sectionId(cat: string) {
  return 'assets-' + cat.replace(/[^a-z0-9]+/gi, '-')
}

export function AssetLibrary() {
  const [q, setQ] = useState('')
  const [dark, setDark] = useState(false)

  const query = q.trim().toLowerCase()

  // Variant-matrix families: grouped by manifest `key` (variant suffix already
  // separate), one row per concept, one column per variant. Categories that feed
  // a matrix family (e.g. icons/event, illustrations/event) are excluded from the
  // flat grid below so each concept shows once, not once per variant.
  const matrixFamilies = useMemo(() => {
    return Object.entries(MATRIX_FAMILIES)
      .map(([family, label]) => {
        const manifestAssets = MANIFEST.filter((e) => familyOf(e.key) === family)
          .filter((e) => !query || e.key.toLowerCase().includes(query) || e.path.toLowerCase().includes(query))
          .map((e) => ({ key: e.key, variant: e.variant, path: e.path, tag: e.tag, url: urlFor(e.path) }))
          .filter(
            (e): e is { key: string; variant: string; path: string; tag: string | undefined; url: string } =>
              !!e.url,
          )
        // "asset-mobility-status" no longer ships a static per-status "example"
        // manifest entry (removed — see renderMobilityStatusExample) — synthesize
        // one virtual "example" row per concept so the column still renders and
        // AssetVariantTable's renderCell can swap in the live AssetStatusIcon.
        // `url` is unused (renderCell always supplies the cell), kept only to
        // satisfy VariantAsset's shape.
        const assets =
          family === 'asset-mobility-status'
            ? [
                ...manifestAssets,
                ...manifestAssets
                  .filter((e) => e.variant === 'default')
                  .map((e) => ({ ...e, variant: 'example', url: e.url })),
              ]
            : manifestAssets
        return { family, label, assets }
      })
      .filter((f) => f.assets.length > 0)
  }, [query])

  // Exact paths covered by a matrix family — excluded from the flat grid below by
  // path, not by whole category, because a family's assets can share a physical
  // folder with other, genuinely distinct concepts kept in the flat grid (e.g.
  // "asset-mobility-status/*" and legacy "status/*" both live under icons/status/).
  const matrixPaths = new Set(MANIFEST.filter((e) => familyOf(e.key) in MATRIX_FAMILIES).map((e) => e.path))

  const excludedCategories = new Set(
    MANIFEST.filter((e) => EXCLUDED_FAMILIES.has(familyOf(e.key))).map(
      (e) => e.path.split('/').slice(0, -1).join('/'), // e.g. "illustrations/vehicle"
    ),
  )

  const groups = useMemo(() => {
    return CATEGORIES.filter((cat) => !excludedCategories.has(cat)).map((cat) => ({
      cat,
      items: ASSETS.filter(
        (a) =>
          a.category === cat &&
          !matrixPaths.has(a.path) &&
          (!query || a.name.toLowerCase().includes(query) || a.path.toLowerCase().includes(query)),
      ),
    })).filter((g) => g.items.length > 0)
    // matrixPaths and excludedCategories are derived from the static MANIFEST — stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const shown =
    groups.reduce((n, g) => n + g.items.length, 0) + matrixFamilies.reduce((n, f) => n + f.assets.length, 0)

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-heading-lg font-bold tracking-tight text-foreground">Asset library</h1>
        <p className="mt-2 text-body-md text-muted-foreground">
          {ASSETS.length} curated SVGs, salvaged from the v5 platform and refactored into two tiers.
          Sourced from <code className="text-body-sm">fams-design-system/assets/</code>. These are the raw
          authoring files — the <code className="text-body-sm">@fams/icons</code> package will build from here.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {Object.entries(TIER_COUNT).map(([t, n]) => (
            <span
              key={t}
              className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-body-sm text-muted-foreground"
            >
              {t}: <span className="font-medium text-foreground">{n}</span>
            </span>
          ))}
        </div>
      </header>

      <div className="mb-6 rounded-md border border-border bg-muted/40 p-4 text-body-sm text-muted-foreground">
        <span className="font-medium text-foreground">How tenancy works:</span> icons are{' '}
        <span className="font-medium text-foreground">shared across all tenants</span> — one set, not forked
        per tenant. Monochrome (<code className="text-[0.8em]">currentColor</code>) glyphs are tinted to the{' '}
        <span className="font-medium text-foreground">active tenant's primary color</span> (switch tenant top-right
        to see them re-theme); multi-color icons show their real palette. Only{' '}
        <span className="font-medium text-foreground">logos</span> and brand{' '}
        <span className="font-medium text-foreground">illustrations</span> (auth-hero, not-found) are per-tenant;
        detailed illustrations keep their own palette.
      </div>

      <div className="sticky top-14 z-10 mb-8 flex flex-wrap items-center gap-3 border-b border-border bg-background/90 py-3 backdrop-blur">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter assets…"
          className="w-64 rounded-sm border border-border bg-background px-3 py-1.5 text-body-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <label className="flex items-center gap-2 text-body-sm text-muted-foreground">
          <input type="checkbox" checked={dark} onChange={(e) => setDark(e.target.checked)} />
          Dark tiles (check white/on-dark assets)
        </label>
        <span className="ms-auto text-body-sm text-muted-foreground">{shown} shown</span>
      </div>

      {matrixFamilies.map((f) => {
        const conceptCount = new Set(f.assets.map((a) => a.key)).size
        return (
          <section key={f.family} id={sectionId(f.family)} className="mb-12 scroll-mt-24">
            <h2 className="mb-1 text-heading-sm font-semibold text-foreground">{f.label}</h2>
            <p className="mb-4 text-body-sm text-muted-foreground">
              {conceptCount} concepts · {f.assets.length} variants
            </p>
            <AssetVariantTable
              assets={f.assets}
              familyLabel={f.label}
              variantLabels={FAMILY_VARIANT_LABELS[f.family]}
              renderCell={f.family === 'asset-mobility-status' ? renderMobilityStatusExample : undefined}
            />
          </section>
        )
      })}

      {groups.map((g) => (
        <section key={g.cat} id={sectionId(g.cat)} className="mb-12 scroll-mt-24">
          <h2 className="mb-1 text-heading-sm font-semibold text-foreground">{g.cat}</h2>
          <p className="mb-4 text-body-sm text-muted-foreground">{g.items.length} assets</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {g.items.map((a) => {
              // Only genuinely monochrome (fill="currentColor") icons are safe to tint: their
              // silhouette IS the icon, so masking them to the tenant primary re-themes cleanly.
              // Everything else (multi-color icons, illustrations, logos) renders true-color.
              const tintable = a.mono
              return (
                <figure
                  key={a.path}
                  title={a.path}
                  className={
                    'flex flex-col items-center gap-2 rounded-md border border-border p-3 transition-colors ' +
                    (dark ? 'bg-neutral-900' : 'bg-card')
                  }
                >
                  <div className="flex h-16 w-16 items-center justify-center">
                    {tintable ? (
                      <span
                        role="img"
                        aria-label={a.name}
                        className="inline-block h-16 w-16"
                        style={{
                          backgroundColor: 'var(--color-primary, #0072d6)',
                          WebkitMaskImage: `url(${a.url})`,
                          maskImage: `url(${a.url})`,
                          WebkitMaskRepeat: 'no-repeat',
                          maskRepeat: 'no-repeat',
                          WebkitMaskPosition: 'center',
                          maskPosition: 'center',
                          WebkitMaskSize: 'contain',
                          maskSize: 'contain',
                        }}
                      />
                    ) : (
                      <img src={a.url} alt={a.name} loading="lazy" className="max-h-16 max-w-16" />
                    )}
                  </div>
                  <figcaption
                    className={
                      'w-full truncate text-center text-[0.6875rem] ' +
                      (dark ? 'text-neutral-300' : 'text-muted-foreground')
                    }
                  >
                    {a.name}
                  </figcaption>
                </figure>
              )
            })}
          </div>
        </section>
      ))}

      {shown === 0 && <p className="text-body-md text-muted-foreground">No assets match “{q}”.</p>}
    </div>
  )
}

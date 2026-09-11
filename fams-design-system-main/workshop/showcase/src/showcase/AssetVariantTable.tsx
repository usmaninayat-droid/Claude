import type { ReactNode } from 'react'

// Reusable variant-matrix presentation for the Asset library page.
//
// Design intent (verbatim designer request): "show all states of one icon with its
// name in a single card/row... on the left the event name, then columns with headers
// for each state." The grouping is entirely data-driven off the assets/icons.json
// manifest's `key` + `variant` fields — no hardcoded icon lists. As the manifest
// changes (icons fixed, legacy keys removed), this table's rows/columns follow.

export type VariantAsset = {
  /** Concept key with the variant suffix already stripped, e.g. "event/overspeed". */
  key: string
  /** Manifest variant id, e.g. "default" | "solid" | "marker". */
  variant: string
  url: string
  path: string
  /** Optional reference tag for the concept's group (e.g. "DMS-ADAS", "General", "Green Driving"). */
  tag?: string
}

/** Canonical column order + display label for the variant ids we know about. */
const VARIANT_ORDER: { id: string; label: string }[] = [
  { id: 'default', label: 'Line' },
  { id: 'solid', label: 'Solid' },
  { id: 'list', label: 'List' },
  { id: 'marker', label: 'Map' },
  { id: 'profile', label: 'Profile' },
]

function conceptName(key: string) {
  const name = key.split('/').pop() ?? key
  return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Groups a flat list of manifest-backed assets by concept (`key`) and renders a
 * list view: concept name on the left, one column per variant present anywhere in
 * the family. Cells are empty (subtle dash) where a concept lacks that variant —
 * families are heterogeneous (e.g. some events only ship Line + Solid, no marker).
 */
export function AssetVariantTable({
  assets,
  familyLabel,
  variantLabels,
  renderCell,
}: {
  assets: VariantAsset[]
  familyLabel: string
  /**
   * Per-family override for a variant id's column label — e.g. a family with only
   * a "default" variant (no line/map duality) wants "Icon" instead of the generic
   * "Line" label. Falls back to VARIANT_ORDER, then the raw variant id.
   */
  variantLabels?: Record<string, string>
  /**
   * Per-cell override, e.g. to render a live component (AssetStatusIcon) instead
   * of the manifest's static `<img>` for a given concept/variant — used by the
   * "Asset Mobility Status" family's Example column so every row renders the
   * dynamic status-badge-over-icon composite instead of a hand-drawn SVG.
   * Return `undefined` to fall back to the default `<img>` rendering.
   */
  renderCell?: (asset: VariantAsset) => ReactNode | undefined
}) {
  const byKey = new Map<string, Map<string, VariantAsset>>()
  for (const a of assets) {
    if (!byKey.has(a.key)) byKey.set(a.key, new Map())
    byKey.get(a.key)!.set(a.variant, a)
  }

  const labelFor = (id: string) => variantLabels?.[id] ?? VARIANT_ORDER.find((v) => v.id === id)?.label ?? id

  const variantsPresent = new Set(assets.map((a) => a.variant))
  const columns = Array.from(variantsPresent)
    .sort((a, b) => {
      const ai = VARIANT_ORDER.findIndex((v) => v.id === a)
      const bi = VARIANT_ORDER.findIndex((v) => v.id === b)
      return (ai === -1 ? VARIANT_ORDER.length : ai) - (bi === -1 ? VARIANT_ORDER.length : bi)
    })
    .map((id) => ({ id, label: labelFor(id) }))

  const rows = Array.from(byKey.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-body-sm">
        <caption className="sr-only">
          {familyLabel} icons, one row per concept, one column per variant
        </caption>
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th scope="col" className="p-3 text-start font-medium text-muted-foreground">
              {familyLabel}
            </th>
            {columns.map((c) => (
              <th key={c.id} scope="col" className="p-3 text-start font-medium text-muted-foreground">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, variants]) => {
            const tag = Array.from(variants.values()).find((a) => a.tag)?.tag
            return (
            <tr key={key} className="border-b border-border last:border-b-0 odd:bg-transparent even:bg-muted/20">
              <th scope="row" className="p-3 text-start font-normal text-foreground">
                <span className="inline-flex items-center gap-2">
                  {conceptName(key)}
                  {tag && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>
                  )}
                </span>
              </th>
              {columns.map((c) => {
                const asset = variants.get(c.id)
                const isLarge = c.id === 'marker' || c.id === 'example'
                const custom = asset ? renderCell?.(asset) : undefined
                return (
                  <td key={c.id} className="p-3 align-middle">
                    {custom ??
                      (asset ? (
                        <img
                          src={asset.url}
                          alt={`${conceptName(key)} — ${c.label}`}
                          loading="lazy"
                          title={asset.path}
                          className={isLarge ? 'h-10 w-10' : 'h-6 w-6'}
                        />
                      ) : (
                        <span aria-hidden className="text-muted-foreground">
                          —
                        </span>
                      ))}
                  </td>
                )
              })}
            </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

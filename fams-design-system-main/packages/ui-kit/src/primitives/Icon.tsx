import type { ReactElement, SVGProps } from 'react'
import { ICON_ALIASES, ICON_REGISTRY, type IconGlyph, type IconName } from '../icons/registry'
import { cn } from '../lib/cn'

/**
 * Icon — the ONE generic glyph component for V5.
 * [ui-kit/primitives]
 *
 * Every UI glyph in V5 comes from the canonical FAMS V5 icon library (the
 * Untitled-UI-named set plus the custom FAMS glyphs: POI, POI-kpi, Alarm,
 * Text…). The SVGs used by the design system are vendored into
 * `src/icons/svg/` as tiny generated React components by
 * `plan/run-2026-08-25-pipelines-entities/specs/icons/copy-icons.mjs`
 * (re-runnable with `--all` to pull the full 1,247-glyph set later), and
 * indexed by `src/icons/registry.ts`.
 *
 * WHY A STATIC REGISTRY, not a dynamic `import()` by name: the same reason the
 * old `resolveWidgetIcon`/`FIELD_ICONS` maps rejected `lucide-react/dynamic` —
 * a lazily-loaded glyph neither tree-shakes nor renders synchronously, so a
 * table cell or a KPI tile would flash an empty slot on first paint. The
 * registry is a plain object literal of statically imported components; a call
 * site that only needs three glyphs can instead import them by name from the
 * `@fams/ui-kit/icons` subpath and never pull the registry in at all.
 *
 * COLOUR: the library's glyphs are filled paths whose hard-coded `#101828` is
 * rewritten to `currentColor` at generation time, so colour is driven entirely
 * by the `text-*` token class on (or above) the icon — exactly as it was under
 * the previous stroke set. Nothing here sets a colour of its own.
 *
 * ACCESSIBILITY: decorative by default (`aria-hidden`, `focusable="false"`).
 * Passing `title` (or `aria-label`) promotes it to `role="img"` with an
 * accessible name — the same contract the ui-kit's other glyph surfaces use.
 */
export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name' | 'ref'> {
  /**
   * Canonical library filename (`alert-triangle`, `speedometer-04`, `POI`), or
   * one of the legacy/metadata-authored aliases the registry understands
   * (`map-pin`, `gauge`, `status`, `truck`…).
   */
  name: string
  /** Square px size. Default 20 — the V5 body-row glyph size. */
  size?: number
  /** Accessible name. Omit for decorative glyphs (the default). */
  title?: string
}

/** Resolve a name (canonical or alias) to its glyph, or `undefined`. */
export function getIcon(name: string | undefined): IconGlyph | undefined {
  if (!name) return undefined
  const canonical = (ICON_ALIASES[name] ?? name) as IconName
  return ICON_REGISTRY[canonical]
}

/** Every name `Icon` accepts — canonical filenames plus aliases. */
export const iconNames: string[] = [...Object.keys(ICON_REGISTRY), ...Object.keys(ICON_ALIASES)]

const warned = new Set<string>()

/** DEV-only warning gate, read off globalThis so this file needs no Node types. */
const DEV =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NODE_ENV !==
  'production'

export function Icon({ name, size = 20, title, className, ...rest }: IconProps): ReactElement | null {
  const Glyph = getIcon(name)
  if (!Glyph) {
    if (DEV && !warned.has(name)) {
      warned.add(name)
      console.warn(
        `[Icon] unknown icon "${name}". Add its SVG to the vendored set (copy-icons.mjs) ` +
          `or author one of the ${iconNames.length} known names.`,
      )
    }
    return null
  }
  const labelled = title !== undefined || rest['aria-label'] !== undefined
  return (
    <Glyph
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      focusable="false"
      {...(labelled ? { role: 'img', 'aria-label': title ?? rest['aria-label'] } : { 'aria-hidden': true })}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
    </Glyph>
  )
}

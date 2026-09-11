/**
 * `@fams/ui-kit/icons` — the canonical FAMS V5 glyph set as React components.
 *
 * Two ways in, both backed by the same vendored SVGs (`./svg/*`, generated from
 * the canonical library by `specs/icons/copy-icons.mjs`):
 *
 *  1. `<Icon name="alert-triangle" />` — the ONE generic component, for a glyph
 *     chosen at runtime (tenant metadata: module cards, nav, filter chips,
 *     KPI tiles, status lists, map markers).
 *  2. Named imports (`import { AlertTriangle } from '@fams/ui-kit/icons'`) —
 *     for a glyph fixed at authoring time. These tree-shake per glyph and keep
 *     the PascalCase names the DS used before the migration off `lucide-react`.
 *
 * This is deliberately NOT re-exported from the `@fams/ui-kit` barrel: names
 * like `Map`, `List`, `File`, `Image` and `Gauge` would collide with real
 * ui-kit components.
 */
export { Icon, getIcon, iconNames, type IconProps } from '../primitives/Icon'
export { ICON_REGISTRY, ICON_ALIASES, type IconGlyph, type IconName } from './registry'
/**
 * The shape every glyph satisfies. Named `LucideIcon` as well for the call
 * sites that typed an icon-valued prop or map against the old library — the
 * signature is identical (`(props: SVGProps<SVGSVGElement>) => ReactElement`).
 */
export type { IconGlyph as LucideIcon } from './registry'
export * from './named'

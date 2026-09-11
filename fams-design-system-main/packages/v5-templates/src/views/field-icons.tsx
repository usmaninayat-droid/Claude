import {
  Building2,
  CalendarDays,
  Car,
  CircleDot,
  Filter,
  Flag,
  Hash,
  Layers,
  ListFilter,
  MapPin,
  Shapes,
  Tag,
  Truck,
  User,
  Users,
  Wrench,
  type LucideIcon,
} from '@fams/ui-kit/icons'

/**
 * field-icons — the shared closed glyph vocabulary for AUTHORED field icons.
 * [v5-templates]
 *
 * Originated as `filter-icons.tsx` for R-06/DN-04's leading filter-field
 * glyph ("All dropdown filters have icons on the left side. Like for lot,
 * organisation, driver, tags etc."), then grew a second consumer: group-by
 * headers (`views/group-by.ts`) resolve the same authored icon NAME against
 * this map. It has since moved here, under `views/`, because the vocabulary
 * is cross-cutting — filter fields, group headers, and any future
 * authored-glyph surface (a kanban swimlane header, a tab icon) all share it
 * — rather than living behind a file/directory named for its first consumer.
 * `views/filters/filter-icons.tsx` re-exports everything from here unchanged
 * so existing filter call sites are untouched.
 *
 * The VOCABULARY of which glyph suits which field is tenant metadata
 * (`FilterDef.icon`/`groupByOptions[].icon`, authored per field in the
 * blueprint) — this file only owns the closed set of glyph NAMES the design
 * system is willing to draw, exactly the "opt in by name" contract
 * `resolveWidgetIcon` (dashboard-widget-shell) and `IconTextView.props.icon`
 * already use. No module, entity or status noun appears here.
 *
 * WHY A NAMED MAP AND NOT `lucide-react/dynamic`: same reason as
 * `resolveWidgetIcon` — `DynamicIcon` is a lazy `name`-prop component, not a
 * `LucideIcon`, so it neither tree-shakes nor renders synchronously.
 */
const FIELD_ICONS: Record<string, LucideIcon> = {
  building: Building2,
  calendar: CalendarDays,
  // `Asset Icons/List/Car` — the vehicle glyph Figma `29535:4487` puts on the
  // Preventive Maintenance grouped list's group-header row. Same "opt in by
  // name" vocabulary; nothing here knows what a vehicle IS to any module.
  car: Car,
  filter: Filter,
  flag: Flag,
  hash: Hash,
  layers: Layers,
  list: ListFilter,
  'map-pin': MapPin,
  shapes: Shapes,
  status: CircleDot,
  tag: Tag,
  truck: Truck,
  user: User,
  users: Users,
  wrench: Wrench,
}

/** Names already warned about, so a re-render does not re-log (see below). */
const warned = new Set<string>()

/**
 * The field's 24px leading glyph. An unauthored icon falls back to `filter`
 * (the composer already defaults `FilterFacet.icon` to it, so this is the
 * belt-and-braces half); an UNKNOWN authored name also falls back to `filter`
 * rather than rendering a hole in the field's anatomy, and warns once in DEV
 * so a typo in a blueprint is visible rather than silent.
 */
export function resolveFilterFieldIcon(name: string | undefined): LucideIcon {
  if (!name) return Filter
  const icon = FIELD_ICONS[name]
  if (icon) return icon
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production' && !warned.has(name)) {
    warned.add(name)
    console.warn(
      `[filters] unknown field icon "${name}" — falling back to "filter". Add it to FIELD_ICONS in field-icons.tsx, or use one of: ${Object.keys(FIELD_ICONS).join(', ')}.`,
    )
  }
  return Filter
}

/**
 * The same closed vocabulary WITHOUT the filter field's `Filter` fallback —
 * `undefined` for an unauthored or unknown name, so a surface that shows a
 * glyph only when one is authored (a grouped list's group header) renders
 * nothing rather than a stray funnel. `resolveFilterFieldIcon` above is
 * unchanged and still owns the filter field's own fallback + DEV warning.
 */
export function lookupFieldIcon(name: string | undefined): LucideIcon | undefined {
  return name ? FIELD_ICONS[name] : undefined
}

/** The glyph names a blueprint may author — exported for tests and docs. */
export const filterFieldIconNames = Object.keys(FIELD_ICONS)

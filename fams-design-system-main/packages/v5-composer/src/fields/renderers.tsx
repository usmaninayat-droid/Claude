/**
 * Read renderers — ui-kit-based presenters for a field's stored value.
 *
 * These cover Shaheer's common `renderCellValue()` cell set (text, number +
 * append, date, boolean chip, enum/status chip, tags, assignee, link/reference)
 * but as DATA in the registry: each is referenced by `FieldType`, never hardcoded
 * in a switch, so a tenant can swap one via `registerFieldType`. Pure presenters
 * (Rule 8) — no fetching, no store.
 */
import type { ComponentType, ReactElement, SVGProps } from 'react'
import {
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  Car,
  CircleGauge,
  Clock,
  Copy,
  CreditCard,
  Package,
  Droplet,
  FileText,
  Key,
  CalendarDays,
  ExternalLink,
  Flag,
  Fuel,
  Gauge,
  Hash,
  Heart,
  Image as ImageIcon,
  Inbox,
  Link2,
  List,
  LocateFixed,
  MapPin,
  Milestone,
  OctagonAlert,
  Paintbrush,
  Palette,
  Phone,
  Plus,
  Radio,
  RotateCcw,
  Route,
  ShieldCheck,
  Siren,
  SquareCheck,
  Tag as TagIcon,
  Truck,
  User,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from '@fams/ui-kit/icons'
import type { FieldType } from '../types'
import {
  Avatar,
  Badge,
  CountChip,
  IdChip,
  PriorityChip,
  StatusPill,
  TableCell,
  TimeRemainingChip,
  TagChipList,
  VehicleIcon3D,
  ColorsIcon,
  Thermometer03Icon,
  MarkerPin05Icon,
  Pin01Icon,
  SearchRefractionIcon,
  TrafficLightsIcon,
  ZonesIcon,
  type AvatarTone,
  type BadgeVariant,
  type PriorityChipVariant,
  type StatBarTone,
  type StatusPillVariant,
  type TagOption,
  type VehicleStatusTone,
} from '@fams/ui-kit'
import type { ReadRenderer, ReadRendererProps } from './types'
import { useDisplayName } from './display-names'

const EMPTY = '—'

function asText(value: unknown): string {
  if (value == null || value === '') return EMPTY
  return String(value)
}

/** Plain text. */
export const ReadText: ReadRenderer = ({ value }) => (
  <span className="text-body-sm text-foreground">{asText(value)}</span>
)

/** Number, with an optional appended unit (e.g. "1200 AED"). */
export const ReadNumber: ReadRenderer = ({ descriptor, value }) => {
  if (value == null || value === '') return <span className="text-body-sm text-muted-foreground">{EMPTY}</span>
  const num = typeof value === 'number' ? value : Number(value)
  const shown = Number.isFinite(num) ? num.toLocaleString() : String(value)
  return (
    <span className="text-body-sm tabular-nums text-foreground">
      {shown}
      {descriptor.unit ? <span className="ms-1 text-muted-foreground">{descriptor.unit}</span> : null}
    </span>
  )
}

/**
 * The shared semantic tone-name vocabulary — `danger`/`warning`/`success`/
 * `neutral`/`default` — and this is the FILL/icon-safe class for each: safe
 * to apply to a small glyph (WCAG non-text contrast, 3:1) but `danger`
 * (`text-destructive`, error.500 `#f04438`, 3.76:1 on white) and `warning`
 * (`text-warning`, `#f79009`, 2.35:1) both fail AA 4.5:1 for running TEXT at
 * this package's 14px/400 body size.
 *
 * **A renderer that colours TEXT must use {@link TEXT_SAFE_TONE_CLASS}
 * below, never this map directly** — that was fix7's job-orders gate finding
 * (`ReadSignedNumber`'s "Days Overdue"/"Due Today" cells, `ReadFlagToneDate`'s
 * due-date text, both found live rendering `danger`/`warning` straight off
 * this map onto body text). This map's own remaining consumer,
 * `ReadActivityOverview`'s `ACTIVITY_TONE_CLASS` alias, is exactly the
 * legitimate case: it colours a 12px icon GLYPH, not text, so the fill
 * values are correct there and must stay put — verified by a repo-wide
 * `grep TONE_TEXT_CLASS` before this docblock was written (fix8, 2026-09-06
 * review F4: an earlier pass at this map assumed it had zero consumers left
 * and nearly deleted a still-live one).
 */
const TONE_TEXT_CLASS: Record<string, string> = {
  danger: 'text-destructive',
  warning: 'text-warning',
  success: 'text-success',
  neutral: 'text-muted-foreground',
  default: 'text-foreground',
}

/**
 * The single AA-safe tone-TEXT map — collapses what used to be two
 * byte-identical overrides (`SIGNED_NUMBER_TONE_TEXT_CLASS` for
 * `ReadSignedNumber`, `FLAG_TONE_TEXT_CLASS` for `ReadFlagToneDate`; merged
 * fix8, 2026-09-06 review F4: "one rule implemented twice" — they agreed
 * today, but nothing stopped them drifting apart on the next edit to either
 * renderer). Any renderer that paints a tone onto running TEXT reads through
 * THIS map, never {@link TONE_TEXT_CLASS} directly.
 *
 * `danger` → `text-destructive-emphasis` (error.600 `#d92d20`) — measured
 * 4.83:1 on `color.card` (#ffffff), 4.62:1 on `color.background` (#f9fafb).
 * Found live on the Preventive Maintenance list's "Days Overdue"
 * (`negativeTone: "danger"`) cell and the kanban card's Overdue due-date
 * text — a UX-gate Critical blocker.
 *
 * `warning` → the `text-warning-text` alias (`@fams/tokens`'
 * `color.warning-text`, warning-scale.700 `#b54708` in light /
 * warning-scale.400 `#fdb022` in dark — `warning`/`warning-scale` carry no
 * dark override, so this token is what keeps the dark theme legible too):
 * measured 5.43:1 on `color.card`, 5.19:1 on `color.background` (light);
 * 7.99:1 on `color.dark.card`, 9.64:1 on `color.dark.background` (dark). No
 * equivalent existed before fix7 — `error-text`/`success-text` had a warning
 * counterpart added alongside them rather than reusing a scale step ad hoc,
 * so future consumers reach for a named token instead of guessing
 * `warning-scale-700` again. Found live on the "Due Today" (`zeroTone:
 * "warning"`) cell.
 *
 * `success`/`neutral`/`default` are UNCHANGED (spread from `TONE_TEXT_CLASS`)
 * — no current caller exercises them as text, so that band is left for a
 * future audit rather than re-measured here on spec.
 */
const TEXT_SAFE_TONE_CLASS: Record<string, string> = {
  ...TONE_TEXT_CLASS,
  danger: 'text-destructive-emphasis',
  warning: 'text-warning-text',
}

/**
 * Named-component override: a number whose PRESENTATION is driven by its own
 * SIGN — a unit word, an extra suffix, and a semantic tone chosen per band
 * (negative / zero / positive).
 *
 * Exists because a bare signed integer conveys its meaning through a single
 * hyphen-minus glyph: `-10` and `172` render identically in weight and colour,
 * so the reader has to notice one character to tell "ten days late" from "five
 * months of headroom". This renderer restores the two channels a signed
 * quantity needs — a WORD and a TONE — and never a tone alone (every band that
 * carries a tone also carries text), which is the accessibility half of the
 * rule.
 *
 * Entirely generic: it holds no domain concept, only three configurable bands.
 * Opt in per field/placement with
 * `component: {name: "SignedNumberView", props: {...}}`:
 *
 * | prop | effect |
 * |---|---|
 * | `unit` | word appended after the number (`"Days"` → `18 Days`); falls back to `descriptor.unit` |
 * | `absolute` | render the MAGNITUDE for negatives, letting the suffix carry the sign (`-10` → `10 Days Overdue`) |
 * | `negativeSuffix` / `zeroSuffix` / `positiveSuffix` | trailing word for that band (`"Overdue"`) |
 * | `negativeLabel` / `zeroLabel` / `positiveLabel` | replaces the WHOLE rendering for that band (`"Due Today"`) |
 * | `negativeTone` / `zeroTone` / `positiveTone` | a {@link TONE_TEXT_CLASS} name; omitted = plain body colour |
 *
 * A non-numeric or absent value degrades to the same em dash `ReadNumber`
 * renders, and an unrecognised tone name degrades to the default colour rather
 * than throwing — same "degrade gracefully on a miss" contract as the icon maps.
 *
 * `danger`/`warning` resolve through {@link TEXT_SAFE_TONE_CLASS}, NOT the
 * shared `TONE_TEXT_CLASS`, for the same reason `ReadFlagToneDate` below
 * does too: this renderer draws its tone directly onto body text on the
 * card's white surface, and `text-destructive`/`text-warning` are FILL/icon
 * tokens there (3.76:1 / 2.35:1 — both fail WCAG 4.5:1). Found live on the
 * Preventive Maintenance list's "Days Overdue"/"Due Today" cells
 * (`negativeTone: "danger"`, `zeroTone: "warning"`) — a UX-gate Critical
 * blocker. See {@link TEXT_SAFE_TONE_CLASS}'s own docblock for the measured
 * ratios.
 */
export const ReadSignedNumber: ReadRenderer = ({ descriptor, value }) => {
  if (value == null || value === '') return <span className="text-body-sm text-muted-foreground">{EMPTY}</span>
  const num = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(num)) return <span className="text-body-sm text-foreground">{String(value)}</span>

  const props = descriptor.component?.props ?? {}
  const str = (key: string): string | undefined => (typeof props[key] === 'string' ? (props[key] as string) : undefined)
  const band = num < 0 ? 'negative' : num > 0 ? 'positive' : 'zero'

  const label = str(`${band}Label`)
  const tone = str(`${band}Tone`)
  const toneClass = (tone ? TEXT_SAFE_TONE_CLASS[tone] : undefined) ?? TEXT_SAFE_TONE_CLASS.default

  if (label) {
    return <span className={`text-body-sm ${toneClass}`}>{label}</span>
  }

  const shown = (props.absolute === true && num < 0 ? Math.abs(num) : num).toLocaleString()
  const unit = str('unit') ?? descriptor.unit
  const suffix = str(`${band}Suffix`)
  return (
    <span className={`text-body-sm tabular-nums ${toneClass}`}>
      {[shown, unit, suffix].filter(Boolean).join(' ')}
    </span>
  )
}

/**
 * `20 Feb, 2026 13:00`-style date/date-time — figma-spec-kanban.md §5.3's
 * card due-date format (day, short month, comma, year, 24h `HH:mm`, no
 * seconds) — deliberately NOT `toLocaleString()`, which renders 12h + seconds
 * and varies by the viewer's locale/OS settings (finding: card date format
 * didn't match Figma). `en-US` is fixed for the month abbreviation only (so
 * "Feb" renders consistently regardless of the runtime locale); the day/year
 * are read straight off the `Date`, and the time is hand-formatted 24h.
 */
export function formatFigmaDate(d: Date, withTime: boolean): string {
  const day = d.getDate()
  const month = d.toLocaleString('en-US', { month: 'short' })
  const year = d.getFullYear()
  const datePart = `${day} ${month}, ${year}`
  if (!withTime) return datePart
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${datePart} ${hh}:${mm}`
}

/** Localized date / date-time — a leading calendar icon precedes the text
 *  (Figma "Date & Time" pattern: 14×14 icon + text). */
/**
 * The icon/avatar-prefixed value shape, made truncatable (2026-09-06, fix10,
 * round-11 UX gate P1-11a).
 *
 * `truncate` (`text-overflow: ellipsis`) has NO effect on a box whose overflow
 * comes out of a nested flex ITEM, and a flex item's default `min-width: auto`
 * refuses to shrink below its content. So these renderers' `<icon/avatar> +
 * text` spans were cropped mid-glyph by an ancestor's `overflow: hidden` with
 * no ellipsis at all: at 1280 the job-order sheet's Asset Details cards read
 * `6 Jun, 202` and `Layla Darwis`, which is worse than a truncation because
 * nothing on screen says anything is missing — a reader takes `202` for the
 * year. The plain-text VIN in the same card truncated correctly WITH an
 * ellipsis, which is what localised the bug to the nested-flex shape rather
 * than to the card.
 *
 * Three classes, and all three are load-bearing — verified by walking the live
 * layout chain at 1280 rather than by reasoning about it:
 *   - `min-w-0` lets the container shrink below its content (a flex item
 *     defaults to `min-width: auto` and refuses).
 *   - **`max-w-full` is what actually makes it shrink.** The host value cell
 *     (`FieldGrid`'s `truncate text-end` span) is `display: block`, and a
 *     block container does NOT shrink an inline child — so this span sized
 *     itself to its content (114px inside a 107px cell) and simply hung out
 *     of the cell, whose own `text-overflow` could not help because the
 *     overflow came from a nested inline-flex. `min-w-0` alone left the
 *     glyphs still cropped; the cap is what hands the shrink to the inner
 *     text span so the ellipsis can finally paint.
 *   - `truncate` on the TEXT's own span (not the wrapper) is where that
 *     ellipsis renders, and `title` keeps the full value reachable once it
 *     is abbreviated.
 *
 * Same idiom `ReadVehicle3D` (`vehicle-3d-cell`) already established in this
 * file — reused rather than re-invented, so the platform has one answer to
 * "a clipped value must say so".
 */
const ICON_VALUE_CLASS = 'inline-flex min-w-0 max-w-full items-center'

export const ReadDate: ReadRenderer = ({ descriptor, value }) => {
  if (value == null || value === '') return <span className="text-body-sm text-muted-foreground">{EMPTY}</span>
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) {
    return (
      <span className={`${ICON_VALUE_CLASS} gap-1 text-body-sm text-foreground`}>
        <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate" title={String(value)}>{String(value)}</span>
      </span>
    )
  }
  const shown = formatFigmaDate(d, descriptor.type === 'DateTime')
  return (
    <span className={`${ICON_VALUE_CLASS} gap-1 text-body-sm text-foreground`}>
      <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate" title={shown}>{shown}</span>
    </span>
  )
}

/**
 * `FlagToneDateView` — a Date/DateTime field whose colour is driven by a
 * SIBLING flag column's value, never by comparing the date itself against
 * "now". A placement opts in via `component: {name:"FlagToneDateView",
 * props:{flagCol:"<col>", flagValue:"<value>", tone:"danger"}}`: `flagCol`'s
 * value on the SAME record (`ReadRendererProps.record`, "the whole record,
 * when a renderer needs sibling values") is compared against `flagValue`
 * (string equality; omit `flagValue` and a boolean-ish `flagCol` — `true` or
 * `"true"` — matches instead). A match applies `tone` to both the date text
 * AND the leading calendar icon — the icon takes no colour prop of its own,
 * it inherits `currentColor` from this span's text class, so one class
 * recolours both. No match falls through to `ReadDate` verbatim.
 *
 * `danger` deliberately does NOT reuse `TONE_TEXT_CLASS.danger`
 * (`text-destructive`, error.500 `#f04438`) — that shade is calibrated for
 * FILLS/icons, not body text directly on the card's white background: it
 * measures 3.76:1 there at this renderer's 14px/400 size, short of 4.5:1.
 * `@fams/tokens`' `color.error-text`/`text-destructive-emphasis` alias
 * (error.600 `#d92d20`) is documented for exactly this job — an accessible
 * TEXT alias for the destructive red — measured 4.83:1 on `color.card`/white.
 * `warning` is overridden the same way (`text-warning-text`, fix7 job-orders
 * gate blocker sweep — `TONE_TEXT_CLASS.warning` measures only 2.35:1 on
 * white). Both resolve through the shared {@link TEXT_SAFE_TONE_CLASS} above
 * (merged fix8, 2026-09-06 review F4 — this renderer and `ReadSignedNumber`
 * used to each carry their own byte-identical override); `success`/`neutral`
 * still resolve through the shared `TONE_TEXT_CLASS` unchanged (no current
 * caller exercises them here, so neither is re-audited).
 *
 * This is the generic seam a kanban card's overdue due-date cell needed
 * (fix7, run-2026-09-05, P1-H: an Overdue-badged card's due date rendered in
 * plain grey, not red) WITHOUT a second "is this overdue" calculation: the
 * run already fixed the card badge and the list to both read one flag column
 * (never deriving lateness from the raw date, which is what let a COMPLETED
 * record read as overdue — UX-NOTES A8, fix1/fix5). Recomputing lateness
 * here from `value` would risk disagreeing with that flag on the exact same
 * record the badge and list already got right; reading the SAME flag column
 * instead means the due-date colour, the badge, and the list can never
 * drift apart. Any module can point `flagCol` at its own "is flagged" column
 * — nothing here is job-order vocabulary.
 */
export const ReadFlagToneDate: ReadRenderer = (props) => {
  const { descriptor, value, record } = props
  const compProps = descriptor.component?.props
  const flagCol = typeof compProps?.flagCol === 'string' ? compProps.flagCol : undefined
  const flagValue = typeof compProps?.flagValue === 'string' ? compProps.flagValue : undefined
  const tone = typeof compProps?.tone === 'string' ? compProps.tone : 'danger'
  const rawFlag = flagCol ? record?.[flagCol] : undefined
  const flagged = flagCol != null && (flagValue != null ? rawFlag === flagValue : rawFlag === true || rawFlag === 'true')
  if (!flagged) return <ReadDate {...props} />
  if (value == null || value === '') return <span className="text-body-sm text-muted-foreground">{EMPTY}</span>
  const toneClass = TEXT_SAFE_TONE_CLASS[tone] ?? TEXT_SAFE_TONE_CLASS.default
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) {
    return (
      <span className={`${ICON_VALUE_CLASS} gap-1 text-body-sm ${toneClass}`}>
        <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate" title={String(value)}>{String(value)}</span>
      </span>
    )
  }
  const shown = formatFigmaDate(d, descriptor.type === 'DateTime')
  return (
    <span className={`${ICON_VALUE_CLASS} gap-1 text-body-sm ${toneClass}`}>
      <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="truncate" title={shown}>{shown}</span>
    </span>
  )
}

/** Boolean chip. */
export const ReadBoolean: ReadRenderer = ({ value }) => {
  const truthy = value === true || value === 'true'
  return (
    <Badge variant={truthy ? 'success' : 'muted'} dot>
      {truthy ? 'Yes' : 'No'}
    </Badge>
  )
}

/**
 * Severity → `PriorityChip` variant, for a `SingleSelect` field the composer
 * can tell is a PRIORITY (label matches `PRIORITY_LABEL_RE`). The color
 * mapping itself is centralized in `@fams/ui-kit`'s `PriorityChip` — this
 * map only resolves a blueprint's stored text (which varies: "Critical" vs
 * "High" name the SAME top-severity tier across different screens per
 * figma-spec-kanban.md §3 vs figma-spec-list.md §3; "Low" is a synonym for
 * "Minor" seen in real fixture data, `config-render.test.ts`) onto one of
 * `PriorityChip`'s four canonical variants, so the visual itself lives in
 * exactly one place. Deliberately narrow (value + label match) so a generic
 * enum (a deal "Type", a pipeline "Stage", …) never gets recolored by
 * accident — only fields the blueprint itself names as a priority/severity.
 */
const PRIORITY_LABEL_RE = /priority|severity/i
const PRIORITY_VARIANT: Record<string, PriorityChipVariant> = {
  critical: 'critical',
  urgent: 'critical',
  high: 'high',
  medium: 'medium',
  minor: 'minor',
  low: 'minor',
}

/**
 * Same narrow-match idea as `PRIORITY_LABEL_RE`/`PRIORITY_VARIANT` above, for
 * a `SingleSelect` field the composer can tell is a STATUS (label matches
 * `STATUS_LABEL_RE`) — Figma's "Vehicle Status" field: a solid, uppercase
 * pill (`Badge solid uppercase`), not the neutral tint/dot chip. Deliberately
 * narrow (label match, not "any enum") so an unrelated `SingleSelect` (a
 * deal "Stage", a company "Industry", …) never gets recolored by accident.
 */
const STATUS_LABEL_RE = /status/i
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  active: 'success',
  available: 'success',
  operational: 'success',
  online: 'success',
  maintenance: 'warning',
  pending: 'warning',
  review: 'warning',
  suspended: 'destructive',
  blocked: 'destructive',
  expired: 'destructive',
  inactive: 'muted',
  retired: 'muted',
  decommissioned: 'muted',
}

/**
 * Machine enum token → human label, for DISPLAY only.
 *
 * A blueprint's `listValues` are storage keys, and a pipeline's are the same
 * keys its `uiConfig.statusList` gives labels to — but a read renderer is
 * handed the descriptor, not the pipeline config, so it cannot look that
 * label up. Round 5's visual gate caught the result: the Preventive
 * Maintenance detail sheet printed `jobOrderCreated` where its own header
 * pill (which DOES see `statusList`) read "Job Order Created". The same leak
 * is live today on every kebab-keyed pipeline status (`in-progress`,
 * `reported-issues`, `under-inspection`, …).
 *
 * Deliberately narrow, so an already-human value is never rewritten: it fires
 * only on a token that is unambiguously machine-authored — no whitespace, and
 * either camelCase or `-`/`_` separated, with no uppercase of its own outside
 * a camel hump. `CNG`, `hazmat`, `Brake Inspection` and `Non-Compliant` all
 * fall through untouched.
 */
const MACHINE_TOKEN_RE = /^[a-z0-9]+(?:(?:[-_][a-z0-9]+)+|(?:[A-Z][a-z0-9]*)+)$/
export function humanizeEnumValue(raw: string): string {
  if (!MACHINE_TOKEN_RE.test(raw)) return raw
  return raw
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

/** Enum / status chip. A priority/severity-labeled field gets severity
 *  color-coding, a leading flag icon, and uppercase text (Figma's
 *  priority-chip treatment); a status-labeled field with a recognized value
 *  gets a solid, uppercase status pill (Figma's "Vehicle Status" treatment) —
 *  any other `SingleSelect` keeps the original neutral `secondary` dot chip
 *  unchanged. */
export const ReadEnum: ReadRenderer = ({ descriptor, value }) => {
  if (value == null || value === '') return <span className="text-body-sm text-muted-foreground">{EMPTY}</span>
  const stored = String(value)
  // Variant lookups keep using the STORED key; only the rendered label is humanized.
  // A `status` column's compiled `statusLabels` (from the module's own
  // `uiConfig.statusList` — see `FieldDescriptor.statusLabels`) wins over
  // `humanizeEnumValue` when present: it is an exact authored label lookup,
  // not a heuristic, and it is the only thing that can repair a single
  // lowercase storage word (`scheduled`) that `humanizeEnumValue` must
  // leave alone to keep `hazmat`/`fired` from being mangled (fix7, P1-d).
  const text = descriptor.statusLabels?.[stored] ?? humanizeEnumValue(stored)
  const priorityVariant = PRIORITY_LABEL_RE.test(descriptor.label) ? PRIORITY_VARIANT[stored.toLowerCase()] : undefined
  if (priorityVariant) {
    return <PriorityChip variant={priorityVariant}>{text}</PriorityChip>
  }
  const statusVariant = STATUS_LABEL_RE.test(descriptor.label) ? STATUS_VARIANT[stored.toLowerCase()] : undefined
  if (statusVariant) {
    return (
      <Badge variant={statusVariant} uppercase solid className="px-2">
        {text}
      </Badge>
    )
  }
  return (
    // fix7 (P1-2/P1-14 gate blocker, UX round 6): this is the generic enum
    // dot chip that renders on every card/list/detail surface — a job
    // order's "Maintenance Type"/"Issue Type" and an asset's "Vehicle Type"
    // are the SAME code path (P1-14 confirmed: fix once, fixes both). The
    // variant's own `text-secondary-foreground` (#0072d6) measures 4.22:1 on
    // `bg-secondary` (#e6f2fc) — short of WCAG AA. `text-secondary-foreground
    // -strong` overrides just the text role (8.14:1) without touching the
    // `secondary` variant's fill/border or its other, unrelated consumers
    // (Button's secondary variant, tabs) — see the token's own docblock.
    <Badge variant="secondary" dot className="text-secondary-foreground-strong">
      {text}
    </Badge>
  )
}

/** Tag chips. */
export const ReadTags: ReadRenderer = ({ value }) => {
  const values = Array.isArray(value) ? (value as unknown[]).map(String) : value ? [String(value)] : []
  if (!values.length) return <span className="text-body-sm text-muted-foreground">{EMPTY}</span>
  const tags: TagOption[] = values.map((v) => ({ value: v, label: v }))
  return <TagChipList tags={tags} size="sm" />
}

/**
 * Reference — renders as plain gray icon+text (Figma's "Text Item" pattern:
 * 14×14 icon, no fill/stroke) rather than a bordered chip.
 *
 * The stored value is a record id (`VEH-01`), resolved to its display title
 * ("Tanker 01") through `useDisplayName` — the SAME directory seam
 * `ReadPersonView`, `LinkView` and `EntityRefMeta` already use, and the seam
 * `DisplayNameProvider` exists to provide (finding A7b-1). This renderer's
 * docblock previously stated that "there is no id→display-name lookup
 * available to a pure presenter"; that was true when it was written and was
 * made obsolete by the provider, but the renderer was never revisited — so
 * every reference surface kept printing raw ids while the person surfaces
 * beside them printed names. Round 5 of the 2026-09-05 PM run caught it on the
 * create wizard's Summary step, which read `Vehicle: VEH-01` next to
 * `Service Type: Oil Change`.
 *
 * Still a pure presenter: it READS a lookup, it never owns one. With no
 * provider, or for an id the app cannot resolve, `useDisplayName` returns the
 * id itself, so unresolvable references (and `tags`, which share this
 * renderer) are byte-identical to the previous behaviour.
 */
export const ReadReference: ReadRenderer = ({ value, record }) => {
  const displayName = useDisplayName()
  const ids = Array.isArray(value) ? (value as unknown[]).map(String) : value ? [String(value)] : []
  if (!ids.length) return <span className="text-body-sm text-muted-foreground">{EMPTY}</span>
  void record
  return (
    <span className="inline-flex flex-wrap gap-2">
      {ids.map((id) => (
        <span key={id} className="inline-flex items-center gap-1 text-body-sm text-muted-foreground">
          <TagIcon className="size-3.5 shrink-0" aria-hidden="true" />
          {displayName(id)}
        </span>
      ))}
    </span>
  )
}

/**
 * Assignee — one or more people, rendered as `Avatar`s (initials derived from
 * the resolved display name by `Avatar` itself) rather than `ReadReference`'s
 * raw-id badge.
 *
 * The stored value is a USER ID (`u_dispatcher`). The app's directory reaches
 * this pure presenter through `DisplayNameProvider`/`useDisplayName` — the one
 * injection seam for id→name (Rule 8: the renderer reads a lookup, it never
 * owns one). Without a provider the id renders verbatim, exactly as before.
 */
export const ReadAssignee: ReadRenderer = ({ value }) => {
  const displayName = useDisplayName()
  const names = Array.isArray(value)
    ? (value as unknown[]).map((v) => displayName(String(v)))
    : value
      ? [displayName(String(value))]
      : []
  if (!names.length) return <span className="text-body-sm text-muted-foreground">{EMPTY}</span>
  return (
    <span className="inline-flex -space-x-2 rtl:space-x-reverse">
      {names.map((name, i) => (
        <Avatar key={`${name}-${i}`} name={name} size="xs" className="ring-2 ring-card" />
      ))}
    </span>
  )
}

/** Link view — an underlined identifier (e.g. `uniqueidentifier`). */
export const ReadLink: ReadRenderer = ({ value }) => (
  <span className="text-body-sm font-medium text-primary underline underline-offset-2">{asText(value)}</span>
)

/** Color swatch — the value is a runtime color from the record (not a token). */
export const ReadColor: ReadRenderer = ({ value }) => {
  const color = value ? String(value) : undefined
  return (
    <span className="inline-flex items-center gap-2 text-body-sm text-foreground">
      <span
        aria-hidden="true"
        className="size-4 rounded-xs border border-border"
        style={color ? { backgroundColor: color } : undefined}
      />
      {color ?? EMPTY}
    </span>
  )
}

/**
 * System-generated (Auto) value — e.g. a ticket/uid id. Figma spec (`5729:
 * 39935` "Badges"; kanban card ID chip, figma-spec-kanban.md §5.3 /
 * figma-spec-list.md §3's table ID cell) renders these inside a filled gray
 * pill with a leading `#`/hash icon, not plain text — `@fams/ui-kit`'s
 * `IdChip` centralizes that exact visual (this renderer used to build it
 * inline from a raw `Badge` override; now both this AND any card template
 * that isn't going through the field registry consume the one component).
 */
export const ReadAuto: ReadRenderer = ({ value }) => {
  if (value == null || value === '') return <span className="text-body-sm text-muted-foreground">{EMPTY}</span>
  return <IdChip>{asText(value)}</IdChip>
}

/**
 * Named-component override alias of `ReadAuto` above, resolved via
 * `component: {name: "IdChip"}` rather than the `Auto` field type. Exists
 * because a HOST surface can override the type-based default for one column
 * (`ListView`'s ID column forces plain Semibold text for `uniqueidentifier`
 * per figma-spec-list.md §3 — see that file's `isIdCol` comment) — a
 * blueprint that wants the chip back for that same column on a DIFFERENT
 * screen (e.g. the asset/Collection-Point list, figma-spec-list.md §3's Hash
 * ID Chip) opts back in per-placement with this explicit name, rather than
 * the host guessing which of its callers wants which look.
 */
export const ReadIdChip: ReadRenderer = ReadAuto

/**
 * THE named-icon vocabulary — one closed map every blueprint-authored icon
 * name in this package resolves through (`IconTextView`'s `props.icon`, the
 * `ActivityOverviewView` pairs, and anything added later), so a name that
 * renders in one cell renders in every other.
 *
 * Figma draws from **untitled-ui**, which has no 1:1 lucide-react
 * counterpart, and adding a second icon package is banned (no new deps), so
 * each untitled-ui name below is a DOCUMENTED substitution onto the closest
 * lucide glyph. Keys are the Figma layer names verbatim (kebab-case, digits
 * included) — blueprints author what the designer sees.
 *
 * Live-monitoring SPEC v2 (run 2026-08-24) vocabulary, popup card 495:4143
 * (P0-2) + the §2.2 Activity Overview triplet:
 *   `user-03`→User · `phone`→Phone · `speedometer-04`→Gauge ·
 *   `speedometer-02`→CircleGauge · `marker-pin-02`→MapPin ·
 *   `signal-01`→Radio · `alert-square`→OctagonAlert (lucide has no
 *   square-alert; `@fams/v5-templates`' popup draws a bespoke inline square
 *   glyph for the same key — this is the generic-cell stand-in) ·
 *   `alert-triangle`→AlertTriangle · `thermometer-03`→`Thermometer03Icon` ·
 *   `image-05`→Image · `colors`→`ColorsIcon` · `tag-03`→Tag · `copy-02`→Copy ·
 *   `share-04`→ExternalLink (open-in-new) · `x-close`→X ·
 *   `mark`→LocateFixed (track/focus) · `route`→Route.
 *
 * `colors` and `thermometer-03` resolve to `@fams/ui-kit`'s REAL Figma glyphs
 * (three overlapping circles / a thermometer with scale marks) — round 1
 * shipped lucide's artist palette and plain thermometer (visual #32). The map
 * tool names (`traffic-lights`, `marker-pin-05`, `zones`, `pin-01`,
 * `search-refraction`) resolve to the same marks the floating map chrome
 * paints, so one vocabulary answers for the card and the map alike.
 *
 * Anything unlisted resolves to `undefined` and the caller renders text with
 * no icon rather than throwing — a typo'd `props.icon` degrades gracefully
 * instead of breaking the card. `component-registry.test.tsx` asserts every
 * key here resolves to a real component, so a dropped mapping fails loudly.
 */
/**
 * A field-icon component: a lucide icon OR one of `@fams/ui-kit`'s real Figma
 * map glyphs (`map-glyphs.tsx`). Both are `currentColor` SVG components taking
 * `className`, so every call site (`createElement(Icon, { className })`,
 * `<Icon aria-hidden />`) is unchanged. Widened from `LucideIcon` on
 * 2026-08-25 (visual #32): `colors` and `thermometer-03` were resolving to
 * lucide near-misses (an artist's palette, a plain thermometer).
 */
export type FieldIconComponent = ComponentType<SVGProps<SVGSVGElement>>

export const FIELD_ICON_VOCABULARY: Record<string, FieldIconComponent> = {
  /* ── untitled-ui names (live-monitoring SPEC v2 P0-2 / §2.2) ────────────── */
  'user-03': User,
  phone: Phone,
  'speedometer-04': Gauge,
  'speedometer-02': CircleGauge,
  'marker-pin-02': MapPin,
  'signal-01': Radio,
  'alert-square': OctagonAlert,
  'alert-triangle': AlertTriangle,
  // The REAL Figma glyphs, not the lucide near-misses (visual #32 / #41).
  'thermometer-03': Thermometer03Icon,
  'image-05': ImageIcon,
  colors: ColorsIcon,
  'tag-03': TagIcon,
  'copy-02': Copy,
  'share-04': ExternalLink,
  'x-close': X,
  mark: LocateFixed,
  route: Route,
  /* ── map tool vocabulary (SPEC §2.3) — the same marks the floating map
     chrome paints, so a blueprint may name them too ─────────────────────── */
  'traffic-lights': TrafficLightsIcon,
  'marker-pin-05': MarkerPin05Icon,
  zones: ZonesIcon,
  'pin-01': Pin01Icon,
  'search-refraction': SearchRefractionIcon,
  /* ── earlier placements (figma-spec-kanban.md §5.3 meta rows, round-2 design
     QA #12's source/type/service glyphs, and the event names the Activity
     Overview column shipped with) — kept working ─────────────────────────── */
  skew: Milestone,
  'file-shield-02': ShieldCheck,
  inbox: Inbox,
  tag: TagIcon,
  wrench: Wrench,
  siren: Siren,
  gauge: Gauge,
  clock: Clock,
  bell: Bell,
  fuel: Fuel,
  zap: Zap,
  /* ── column-catalog vocabulary (live-monitoring SPEC §2.6 / 495:19004) ──
     The Columns chooser gives each field its OWN semantic mark; round 4
     measured six of twelve visible rows falling through to the generic tag
     (visual N3). There is no `SystemColumn.icon` key — that was RATIFIED — so
     the derivation resolves through these names, exactly like every other
     field glyph, rather than through per-column blueprint metadata. */
  car: Car,
  truck: Truck,
  heart: Heart,
  hash: Hash,
  'credit-card': CreditCard,
  /* ── 2026-08-30 popup board (16:22894) glyph names. Untitled-UI marks the
     canonical set does not carry 1:1, each a DOCUMENTED substitution onto the
     closest vendored glyph (the same rule the rest of this table follows):
       `database-01` (the rotated tank/cylinder Fill Level + Last Collection
       use) → Package · `droplets-03` → Drop · `key-01` → Key ·
       `mail-01` → Inbox · `calendar-plus-01` → CalendarDays. */
  'database-01': Package,
  'droplets-03': Droplet,
  'key-01': Key,
  'mail-01': Inbox,
  'calendar-plus-01': CalendarDays,
  brush: Paintbrush,
  'check-square': SquareCheck,
  /* ── task-detail-29-42895 SPEC §1.3/§1.4 glyphs (QA round 2, P2-3/P2-4) ──
     Untitled-UI names the FAMS vendored icon set (`~/Desktop/Icons`, single
     source for V5) doesn't carry 1:1 — same documented-substitution rule as
     `database-01`/`droplets-03` above, closest existing glyph, never a raw
     lucide import outside the vendored set:
       `truck-02` → the set's only truck glyph (`truck-01`/`Truck`, already
       vendored) · `monitor-02` → no monitor/screen glyph exists at all; the
       closest semantic match for a call-center/dispatch "Source" field is
       the same broadcast/signal glyph already aliased as `broadcast` →
       `signal-01` (`Radio`) in the icon registry. */
  'truck-02': Truck,
  'monitor-02': Radio,
  /* ── incidents card footer address-ref (SPEC §3) — no prior building glyph
     was named in this vocabulary; `Building2` is already vendored (used
     elsewhere for facility rows) so this documents the first blueprint-
     authored name for it rather than inlining a bespoke icon. */
  'building-06': Building2,
  /* ── incidents kanban/hybrid card body Zone/Area row (card layout parity
     fix 2026-09-01) — the blueprint's `fld_inc_area_chip` placement
     (`IconTextView`, `props.icon: "flag-01"`) named a glyph this table never
     carried, so `resolveFieldIcon` silently returned `undefined` and the row
     rendered as a bare, unlabeled raw value (the orphan "90" line — `addr_area`
     IS a numeric zone code in the seed data, not prose). `Flag` is already
     vendored (used inline by `ReadPriorityFlag` above) and is the closest
     semantic match for a zone/area marker — same documented-substitution rule
     as `monitor-02`/`building-06`. */
  'flag-01': Flag,
}

/** Every name `resolveFieldIcon` answers to (table-driven tests iterate this). */
export const FIELD_ICON_NAMES: readonly string[] = Object.keys(FIELD_ICON_VOCABULARY)

/**
 * Resolve a blueprint-authored icon name to its component; `undefined` for an
 * unknown name (callers render no icon rather than throwing).
 */
export function resolveFieldIcon(name: string | undefined): FieldIconComponent | undefined {
  return name ? FIELD_ICON_VOCABULARY[name] : undefined
}

/**
 * The EDIT-side counterpart to `FIELD_ICON_VOCABULARY` above: the platform
 * field-states spec's "leading icon is dynamic — varies by field/data type"
 * requirement (person for people, calendar for dates, a link mark for
 * references, …), used by every inset-chrome edit widget (`widgets.tsx`'s
 * `insetWrap`) as the fallback when a field carries no explicit
 * `component.props.icon` override. Keyed by `FieldType`, not by name — this
 * is a SECOND, orthogonal map from `FIELD_ICON_VOCABULARY` (which resolves a
 * blueprint-AUTHORED name to a glyph); this one resolves a field's data
 * SHAPE to a glyph when no name was authored at all. A type with no obvious
 * universal glyph (Boolean's own switch, Color's own swatch) is left
 * unmapped — those controls already carry their own visual identity, so a
 * generic leading mark would be redundant, not missing.
 */
const DEFAULT_TYPE_ICON: Partial<Record<FieldType, FieldIconComponent>> = {
  Auto: Hash,
  SmallText: FileText,
  BigText: FileText,
  LongText: FileText,
  Email: Inbox, // documented substitution — see `mail-01` → Inbox above.
  Phone: Phone,
  Numeric: Hash,
  Number: Hash,
  Currency: CreditCard,
  SingleSelect: List,
  MultiSelect: List,
  SingleReference: Link2,
  MultiReference: Link2,
  Date: Calendar,
  DateTime: Calendar,
  tags: TagIcon,
  Color: Palette,
  Assignee: User,
}

/**
 * Resolve the leading icon a field/edit widget should show when the blueprint
 * hasn't authored one explicitly: an authored `component.props.icon` name
 * wins (resolved through `FIELD_ICON_VOCABULARY`, same as every other named
 * icon in this package); otherwise a `Users`-domain reference/assignee gets
 * the person glyph regardless of its underlying type (a "Reported By" single
 * reference is a person field even though its `FieldType` is
 * `SingleReference`, not `Assignee`); otherwise the type-keyed default above.
 * `undefined` for a type with no default and no override — the widget shell
 * renders no leading icon rather than a wrong one.
 */
export function resolveDefaultFieldIcon(descriptor: {
  type: FieldType
  refModule?: string
  component?: { props?: Record<string, unknown> }
}): FieldIconComponent | undefined {
  const explicitName = typeof descriptor.component?.props?.icon === 'string' ? descriptor.component.props.icon : undefined
  const named = resolveFieldIcon(explicitName)
  if (named) return named
  if (descriptor.refModule === 'Users') return User
  return DEFAULT_TYPE_ICON[descriptor.type]
}

/**
 * Icon-prefixed plain text row — the generic "leading icon + text" reader
 * for a body cell whose blueprint field placement carries `component:
 * {name:"IconTextView", props:{icon: "<name>"}}` (figma-spec-kanban.md §5.3's
 * `skew`/`marker-pin-02` meta rows — the lot/location field-renderer plumbing
 * WP8's blueprint additions depend on; `descriptor.component` already exists
 * on `FieldDescriptor`, this just gives it somewhere to route to). The icon
 * name is resolved through `FIELD_ICON_VOCABULARY` above.
 */
export const ReadIconText: ReadRenderer = ({ descriptor, value }) => {
  if (value == null || value === '') return <span className="text-body-xs text-muted-foreground">{EMPTY}</span>
  const iconName =
    typeof descriptor.component?.props?.icon === 'string' ? descriptor.component.props.icon : undefined
  const Icon = resolveFieldIcon(iconName)
  return (
    <span className="inline-flex items-center gap-1 text-body-xs text-muted-foreground">
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      {asText(value)}
    </span>
  )
}

/**
 * `IconNumberView` — `IconTextView`'s icon + value pairing, applied to a
 * NUMERIC value instead of plain text: a placement opts in via `component:
 * {name:"IconNumberView", props:{icon:"<name>"}}`, the exact same `icon`
 * contract (resolved through `FIELD_ICON_VOCABULARY`) every other named icon
 * renderer in this file uses.
 *
 * A generic card-cell row cannot get a leading icon by reusing `IconTextView`
 * for a numeric field, because that renderer's `asText` is a bare
 * `String(value)` — it has no notion of `ReadNumber`'s locale-grouped digits
 * or `descriptor.unit` suffix, so a kanban card's odometer cell (e.g. "45,210
 * km") would regress to an unformatted "45210" the moment it gained an icon.
 * This renderer keeps `ReadNumber`'s exact formatting (`toLocaleString` +
 * `descriptor.unit`) and only adds the leading glyph — a card-cell row can
 * now express "icon + value inline" for ANY field type without a per-type
 * renderer duplicating its type's own formatting (kanban card meta-row parity
 * fix, run-2026-09-05 fix7, P1-G: the odometer meta cell needed a speedometer
 * icon without losing its comma/`km` formatting).
 */
export const ReadIconNumber: ReadRenderer = ({ descriptor, value }) => {
  if (value == null || value === '')
    return <span className="inline-flex items-center gap-1 text-body-xs text-muted-foreground">{EMPTY}</span>
  const iconName =
    typeof descriptor.component?.props?.icon === 'string' ? descriptor.component.props.icon : undefined
  const Icon = resolveFieldIcon(iconName)
  const num = typeof value === 'number' ? value : Number(value)
  const shown = Number.isFinite(num) ? num.toLocaleString() : String(value)
  return (
    <span className="inline-flex items-center gap-1 text-body-xs text-muted-foreground">
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      <span className="tabular-nums">
        {shown}
        {descriptor.unit ? <span className="ms-1">{descriptor.unit}</span> : null}
      </span>
    </span>
  )
}

/**
 * Named-component override: a single stored value rendered as a small
 * colored `Badge` pill — task-detail-29-42895 SPEC §1.3's "VIP chip" reading
 * for a record's Tags field (`bg #fef0c7`/`text #f79009`, rounded, 10px
 * semibold — this component's closest token-driven match is `Badge`'s own
 * `warning` variant, `bg-warning-scale-50`/`text-warning-scale-700`; the
 * exact `-100`/`-500` shades the mock samples aren't a distinct Badge
 * variant, so this stays a documented near-match rather than a new raw-hex
 * variant, per the "no raw color prop" rule `Badge`'s own doc comment
 * states). Spec's "10px semibold" is likewise kept at `text-caption` (12px)
 * rather than the literal 10px — the platform's accessibility-minimum font
 * size (Shaheer T-072 decision #2), same call as the stacked-tab overline
 * fix. A GENERIC single-value label chip — no "VIP"/"tags" concept lives
 * here, so any field wanting this treatment opts in via `component:
 * {name: "TagBadgeView", props: {variant?: "<BadgeVariant>"}}` (default
 * `warning`); an array value (a real multi-tag field) renders its first
 * entry only — a field wanting the full multi-chip treatment should use the
 * `tags`/`MultiSelect` field type's own `ReadTags` renderer instead, not
 * this one.
 */
export const ReadTagBadge: ReadRenderer = ({ descriptor, value }) => {
  if (value == null || value === '') return <span className="text-body-sm text-muted-foreground">{EMPTY}</span>
  const text = Array.isArray(value) ? String(value[0] ?? '') : String(value)
  const variant =
    typeof descriptor.component?.props?.variant === 'string'
      ? (descriptor.component.props.variant as BadgeVariant)
      : 'warning'
  return (
    <Badge variant={variant} className="rounded-xs text-caption font-semibold">
      {text}
    </Badge>
  )
}

/**
 * Named-component override: a solid-fill status pill for a card-level flag
 * (figma-spec-kanban.md §6's "Reopened" badge: white text + white leading
 * icon on a solid accent fill, top-row-adjacent to the ID/priority chips —
 * distinct from `PriorityChip`'s light-bg treatment). Opt in per field
 * placement via `component: {name: "StatusPill", props: {color?: "<hex>",
 * variant?: "<StatusPillVariant>", icon?: "<name>"}}` — `color`/`variant` are
 * the SAME blueprint-driven escape hatch `StatusPill` itself documents
 * (never a hardcoded value here); this renderer carries no "reopened"
 * concept, only a generic label+color+icon slot, so any status text works
 * ("Escalated", "Breach", …). The rendered VALUE is the pill's own label
 * text — empty/absent renders nothing (no pill shown), so an unflagged
 * record's badge row simply omits this cell.
 */
const STATUS_PILL_ICON_MAP: Record<string, LucideIcon> = {
  refresh: RotateCcw,
}

export const ReadStatusPill: ReadRenderer = ({ descriptor, value }) => {
  if (value == null || value === '') return null
  const props = descriptor.component?.props ?? {}
  const color = typeof props.color === 'string' ? props.color : undefined
  const variant = typeof props.variant === 'string' ? (props.variant as StatusPillVariant) : undefined
  const iconName = typeof props.icon === 'string' ? props.icon : undefined
  const Icon = iconName ? STATUS_PILL_ICON_MAP[iconName] : undefined
  return (
    <StatusPill variant={variant} color={color} icon={Icon ? <Icon aria-hidden="true" /> : undefined}>
      {String(value)}
    </StatusPill>
  )
}

/**
 * Named-component override: the compact icon+count "Activity Overview" cell
 * (figma live-monitoring spec §2 — the hybrid/list-only vehicle table's
 * second column: small event icons each followed by a count, danger events
 * red, the rest muted). The stored value is an array of
 * `{ icon?, count, tone?, label? }` pairs — `icon` a kebab-case name from
 * `FIELD_ICON_VOCABULARY`, `tone` one of `danger`/`warning`/`success`/
 * `neutral`, and `label` the metric's NAME ("Critical events", "Trips today",
 * "Current speed"). A labelled pair gets a native tooltip and a screen-reader
 * text alternative, so the glyph triplet is never icon-only — the counts read
 * identically to a mouse user, a keyboard user and a screen reader. Opt in per field via `component: { name: "ActivityOverviewView"
 * }`. Non-array or empty values render the em-dash like `ReadText`.
 *
 * SPEC v2 §2.2 authors the live-monitoring triplet as
 * `alert-triangle` + count · `route` + count · `speedometer-04` + distance.
 */
// Deliberately the full shared tone map, including `default` (5 keys) — one
// more than the 4 the original activity-only map carried (`danger`/`warning`/
// `success`/`neutral`). `tone: 'default'` is accepted on purpose and renders
// `text-foreground`, same as everywhere else `TONE_TEXT_CLASS` is used; pinned
// by the `renders text-foreground for tone: 'default'` case below. This IS
// the legitimate FILL use `TONE_TEXT_CLASS`'s own docblock calls out: the
// class colours a 12px icon glyph (`<Icon className=...>` below), never
// running text, so `text-destructive`/`text-warning`'s sub-AA text contrast
// does not apply here — do not "fix" this by switching to
// `TEXT_SAFE_TONE_CLASS`, which would just be a different arbitrary shade
// for a glyph that was never a text-contrast problem.
const ACTIVITY_TONE_CLASS = TONE_TEXT_CLASS
export const ReadActivityOverview: ReadRenderer = ({ value }) => {
  if (!Array.isArray(value) || value.length === 0) {
    return <span className="text-body-sm text-foreground">{EMPTY}</span>
  }
  const pairs = value as { icon?: string; count?: number | string; tone?: string; label?: string }[]
  return (
    // Figma 11:7359 anatomy: 4px between the icon+count groups, 2px inside
    // one group, a 12px glyph, and the count at 12px medium in base black.
    <span data-slot="activity-overview" className="flex flex-wrap items-center gap-1">
      {pairs.map((pair, i) => {
        const Icon = resolveFieldIcon(pair.icon)
        return (
          <span key={i} className="flex items-center gap-0.5" title={pair.label || undefined}>
            {Icon ? (
              <Icon aria-hidden="true" className={`size-3 shrink-0 ${ACTIVITY_TONE_CLASS[pair.tone ?? 'neutral'] ?? ACTIVITY_TONE_CLASS.neutral}`} />
            ) : null}
            {/* The metric's name for assistive tech — the glyph carries it
                visually, `title` carries it on hover, this carries it to a
                screen reader (a bare number is meaningless alone). */}
            {pair.label ? <span className="sr-only">{pair.label}: </span> : null}
            <span className="text-caption font-medium text-foreground">{pair.count ?? EMPTY}</span>
          </span>
        )
      })}
    </span>
  )
}

/**
 * Named-component override: the 3D isometric vehicle thumb + the field's
 * text value (live-monitoring list rows, figma SPEC v2 §2.2/P0-1.1 — 39×29
 * `VehicleIcon3D` box with the 15px status-dot badge overlapping its
 * bottom-start, then the vehicle id at 12px near-black). GENERIC: nothing
 * module-specific is read — the blueprint placement opts in per field and
 * names its own sibling status column:
 *
 *   `component: { name: "Vehicle3DView",
 *                 props: { statusCol: "status", textCol?: "uniqueidentifier",
 *                          badge?: "start"|"end"|false, size?: "sm"|"md" } }`
 *
 * - `statusCol` — the record column whose value is matched (case-
 *   insensitively) against `moving`/`idling`/`stopped` for the badge tone
 *   (success/warning/error); anything else — or no binding — reads as the
 *   muted non-reporting grey. Same closed vocabulary the map markers parse.
 * - `textCol` — sibling record column rendered as the cell text INSTEAD of
 *   the field's own value (SPEC v2 §2.2: the VEHICLE cell shows the record's
 *   short id, `uniqueidentifier` "Z-7764", while the field itself may be the
 *   Make-Model title). Omit to render the field value.
 * - `badge` — dot position; defaults to `"start"` (the list-row anatomy).
 * - `size` — `VehicleIcon3D` preset; defaults to `"sm"` (39×29 list thumb).
 */
const VEHICLE_STATUS_TONE: Record<string, VehicleStatusTone> = {
  moving: 'success',
  idling: 'warning',
  stopped: 'error',
}

export const ReadVehicle3D: ReadRenderer = ({ descriptor, value, record }) => {
  const displayName = useDisplayName()
  const props = descriptor.component?.props ?? {}
  const statusCol = typeof props.statusCol === 'string' ? props.statusCol : undefined
  const textCol = typeof props.textCol === 'string' ? props.textCol : undefined
  const rawStatus = statusCol && record ? record[statusCol] : undefined
  const tone = VEHICLE_STATUS_TONE[String(rawStatus ?? '').trim().toLowerCase()] ?? 'muted'
  const badge = props.badge === false ? false : props.badge === 'end' ? 'end' : 'start'
  const size = props.size === 'md' ? 'md' : 'sm'
  // `art` — the same generic illustration switch `uiConfig.map.vehicleArt`
  // drives on the markers and the hybrid list cell, so a fleet of tankers
  // reads as tankers on every surface (A24: 'weather-station' too, for
  // stationary-sensor modules and reference cells like Incidents' related
  // station). Unknown/absent → the master car art.
  const art =
    props.art === 'tanker' ? 'tanker' : props.art === 'weather-station' ? 'weather-station' : 'car'
  // A `SingleReference` placement (e.g. Incidents' Assigned Tanker column)
  // stores the linked record's id, not its label — resolve it through the
  // same `useDisplayName` directory seam `LinkView`/`EntityRefMeta` use, so
  // the cell shows the vehicle's identity instead of a raw id. A non-
  // reference placement (already-resolved text, or `textCol`) is unaffected.
  const shown = textCol && record ? record[textCol] : value
  const resolved = descriptor.refModule === 'Entity' && shown != null && shown !== '' ? displayName(String(shown)) : shown
  const text = asText(resolved ?? value)
  return (
    <span data-slot="vehicle-3d-cell" className="flex min-w-0 items-center gap-2.5">
      <VehicleIcon3D size={size} art={art} tone={tone} badge={badge} className="shrink-0" />
      <span className="truncate text-caption font-medium text-foreground" title={text}>
        {text}
      </span>
    </span>
  )
}

/**
 * Named-component override: avatar + name, inline — the "Supervisor"/
 * "Reported By"/"Area Manager" field pattern (figma-spec-detail.md §3's
 * 18×18 circular avatar + name at +26px). Opt in per field placement via
 * `component: {name: "PersonView", props: {tone: "danger"|"success"|
 * "warning"|"info"|"primary"}}` — `tone` is OPTIONAL: omit it for the
 * default deterministic per-person hash color (`Avatar`'s own palette);
 * supply it when the blueprint wants every avatar in that ROLE to read the
 * same semantic color regardless of who is currently assigned (the spec's
 * red-Supervisor/green-Reported-By/blue-Area-Manager convention). Resolves
 * through `Avatar`'s own closed tone set — never a raw hex here either.
 */
const PERSON_VIEW_TONES: ReadonlySet<AvatarTone> = new Set(['primary', 'success', 'warning', 'danger', 'info'])

/**
 * A multi-Assignee `value` (e.g. a ticket's "Supervisor" field with more
 * than one person) used to render `String(value)` — for an ARRAY that's
 * JS's own `Array.prototype.toString()`, i.e. every name comma-joined with
 * no space ("Vikram Singh,Zayd Al-Farsi", 4-deep for an over-seeded record)
 * — never an intentional design, just what a bare `String()` call does to
 * an array. Figma's kanban-card assignee row (figma-spec-kanban.md) and the
 * list SUPERVISOR cell both show exactly ONE person (avatar + name) plus a
 * small muted counter chip for "and N more" when the field holds more than
 * one — this mirrors that: first person gets the usual avatar+name
 * treatment, a `CountChip` (the same neutral pill used for column/group
 * counts) reports the total headcount whenever there's more than one,
 * separated by a bare "|" glyph. A single-person value is unaffected byte-
 * for-byte (still just avatar + name, no chip, no separator).
 *
 * The stored value is an ID (a user id for an `Assignee` placement, a
 * reference id for a `SingleReference` one), resolved through
 * `useDisplayName` — the app's directory seam. That is what makes names
 * appear on EVERY surface this renderer lands on (list column, detail row,
 * kanban card footer) rather than only where a template happened to thread a
 * resolver prop (finding A7b-1). An already-resolved name passes through
 * unchanged, so a template that pre-resolves the cell value (see
 * `EntityProfile`'s `resolvePersonName`) still works.
 */
export const ReadPersonView: ReadRenderer = ({ descriptor, value }) => {
  const displayName = useDisplayName()
  if (value == null || value === '') return <span className="text-body-sm text-muted-foreground">{EMPTY}</span>
  const names = Array.isArray(value)
    ? (value as unknown[]).map((v) => displayName(String(v)))
    : [displayName(String(value))]
  if (!names.length) return <span className="text-body-sm text-muted-foreground">{EMPTY}</span>
  const [first, ...rest] = names
  const toneProp = descriptor.component?.props?.tone
  const tone = typeof toneProp === 'string' && PERSON_VIEW_TONES.has(toneProp as AvatarTone) ? (toneProp as AvatarTone) : undefined
  return (
    <span className={`${ICON_VALUE_CLASS} gap-1.5 text-body-sm text-foreground`}>
      <Avatar name={first} tone={tone} size="xs" className="size-[1.125rem] shrink-0" />
      <span className="truncate" title={first}>{first}</span>
      {rest.length ? (
        <>
          <span aria-hidden="true" className="shrink-0 text-muted-foreground">
            |
          </span>
          <CountChip>{names.length}</CountChip>
        </>
      ) : null}
    </span>
  )
}

/**
 * Severity → Tailwind text-color token, reusing `PriorityChip`'s own variant
 * palette (`bg-error-50 text-error-500` etc. — same tokens, just the TEXT
 * color alone, no background) so the two presentations never drift apart.
 */
const PRIORITY_FLAG_TONE: Record<PriorityChipVariant, string> = {
  critical: 'text-error-500',
  high: 'text-error-500',
  medium: 'text-warning-scale-500',
  minor: 'text-success-scale-500',
}

/**
 * Named-component override: a BARE colored flag icon + plain Title-Case text
 * — the Ticket/Lease Detail page's own Priority Level presentation
 * (figma-spec-detail.md §3: "bare 12×12 [flag] icon, text at +18px [...]
 * Title-Case dark text 'Critical' (no pill, no bg)"), deliberately NOT
 * `PriorityChip`'s light-bg/uppercase pill treatment — that one is correct
 * for Kanban/List (figma-spec-kanban.md §3, figma-spec-list.md §3) and stays
 * unchanged; this is a SEPARATE renderer for the surface that wants the
 * plainer look. Opt in per field placement via `component: {name:
 * "PriorityFlagView"}` — without it, `ReadEnum`'s own priority/severity
 * label-match still upgrades a "Priority Level"-labeled field to the solid
 * `PriorityChip` pill by default (finding: Detail's Priority Level rendered
 * as a light-red ALL-CAPS pill instead of the Figma's plain flag+text), so a
 * surface that wants the bare look must name this renderer explicitly.
 * Falls back to a muted flag + the raw text for a value this component
 * doesn't recognize as a known severity tier, rather than guessing a color.
 */
export const ReadPriorityFlag: ReadRenderer = ({ value }) => {
  if (value == null || value === '') return <span className="text-body-sm text-muted-foreground">{EMPTY}</span>
  const text = String(value)
  const variant = PRIORITY_VARIANT[text.toLowerCase()]
  return (
    <span className="inline-flex items-center gap-1.5 text-body-sm text-foreground">
      <Flag aria-hidden="true" className={`size-3 shrink-0 ${variant ? PRIORITY_FLAG_TONE[variant] : 'text-muted-foreground'}`} />
      {text}
    </span>
  )
}

/**
 * Formats a millisecond duration as `Xd Yh Zm` (days/hours/minutes, largest
 * two-or-three non-zero units), clamped at zero — `Clock`-prefixed "Time
 * Remaining" reading (figma-spec-detail.md §3's `clock-stopwatch` field).
 * Never renders a negative duration; a past deadline reads `0m` rather than
 * "-2h" (a countdown, not a signed offset).
 */
function formatRemaining(ms: number): string {
  const clamped = Math.max(0, ms)
  const totalMinutes = Math.floor(clamped / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (days || hours) parts.push(`${hours}h`)
  parts.push(`${minutes}m`)
  return parts.join(' ')
}

/**
 * Named-component override: a clock icon + countdown text — "Time
 * Remaining" (figma-spec-detail.md §3, figma-spec-kanban.md §3, e.g.
 * `2d 5h left` / overdue `+45m`). Centralized in `@fams/ui-kit`'s
 * `TimeRemainingChip` (this renderer used to build the icon+text row
 * inline). A stored value that parses as a date/timestamp is treated as the
 * DEADLINE and the remaining duration is computed from "now" — past the
 * deadline, it renders the spec's overdue convention (`+`-prefixed
 * duration, `Accent/Flame/Normal` tint, e.g. `+3h 24m`); any other stored
 * value (a seed that already pre-formatted the string, e.g. an app
 * snapshotting the countdown at write time) renders verbatim, still through
 * the chip for a consistent icon/tint, with the SAME leading-`+` convention
 * deciding its overdue state — this renderer never guesses a business shape
 * it wasn't given beyond that one documented convention (Rule 8).
 */
export const ReadTimeRemaining: ReadRenderer = ({ value }) => {
  if (value == null || value === '') return <span className="text-body-sm text-muted-foreground">{EMPTY}</span>
  const asMs = typeof value === 'number' ? value : Date.parse(String(value))
  const isDeadline = Number.isFinite(asMs) && (typeof value === 'number' || /\d{4}-\d{2}-\d{2}/.test(String(value)))
  if (!isDeadline) {
    const text = String(value)
    return <TimeRemainingChip overdue={text.startsWith('+')}>{text}</TimeRemainingChip>
  }
  const delta = asMs - Date.now()
  const overdue = delta < 0
  const duration = formatRemaining(Math.abs(delta))
  return <TimeRemainingChip overdue={overdue}>{overdue ? `+${duration}` : `${duration} left`}</TimeRemainingChip>
}

/**
 * Named-component override: a small dashed "+" affordance in place of the
 * usual em-dash when a field is unassigned — the Assigned Driver
 * "Name"/"Assigned Vehicle" empty state (figma-spec-detail.md §8's 24×24
 * add-affordance). Renders the value as plain text once it IS set (the
 * empty-state visual only applies while there is nothing to show). Purely
 * visual — a pure read presenter has no callback to wire an "add" action to
 * (Rule 8); the app's edit surface owns what clicking through to assign
 * actually does.
 */
export const ReadAddAffordance: ReadRenderer = ({ value }) => {
  if (value == null || value === '') {
    return (
      <span
        aria-hidden="true"
        className="inline-flex size-6 items-center justify-center rounded-sm border border-dashed border-border text-muted-foreground"
      >
        <Plus className="size-3" aria-hidden="true" />
      </span>
    )
  }
  return <span className="text-body-sm text-foreground">{String(value)}</span>
}

/** Coerces a record value that may arrive as a number OR a numeric string (raw seed/API data) into a finite number; anything else (absent, `null`, `""`, non-numeric text) becomes `undefined` so the caller reaches the empty state rather than a false `0`. */
function toFiniteNumber(raw: unknown): number | undefined {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : undefined
  if (typeof raw === 'string' && raw.trim() !== '') {
    const n = Number(raw)
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

/**
 * The sanctioned alternative to a fixed per-column tone (`qa/UX-NOTES.md`
 * D1, ruled on again 2026-09-06 for the job-orders PM list P1-M finding): a
 * fill colour derived from how close THIS reading sits to THIS row's own
 * target, never from which column the cell happens to be in. Every
 * `ProgressMeterView` cell — odometer, interval, engine-hours alike — runs
 * the identical two thresholds, so a 100%-of-target odometer reads exactly
 * as urgent as a 100%-of-target interval on the SAME row; nothing here
 * ever branches on `targetCol`'s name or the field's identity. Without a
 * `target` the raw `value` is itself read as the 0-100 proximity (the
 * `TableCell` bare-percentage contract) so the thresholds still mean
 * something instead of silently going neutral.
 *
 * Bands: `>= 100%` (at/over target — the overdue case the visual gate
 * flagged) → `danger`; `>= 80%` (closing in) → `warning`; below → `success`.
 * All three map to existing sanctioned `StatBarTone` fills (`bg-destructive`/
 * `bg-warning`/`bg-success`, already contrast-checked elsewhere in this
 * design system) — no new colour is introduced.
 *
 * Exported (fix7 wave 6, P1) so a consumer outside the field registry —
 * `v5-templates`' `RecordTable`, which renders `TableCell kind="progress"`
 * directly rather than through `ReadProgressMeter` — computes the SAME
 * tone instead of leaving its own progress column defaulted to
 * `TableCell`'s fixed `primary` fill. Two implementations that agree today
 * drift tomorrow; this is the one and only threshold computation.
 */
export function computeThresholdTone(value: number | undefined, target: number | undefined): StatBarTone {
  if (value == null) return 'primary'
  const pct = target != null && target > 0 ? (value / target) * 100 : value
  if (pct >= 100) return 'danger'
  if (pct >= 80) return 'warning'
  return 'success'
}

/**
 * Named-component override: a sibling-column-aware progress meter cell —
 * composes `TableCell kind="progress"` (see its doc in `TableCell.types.ts`
 * for the value/target/caption/empty-state contract this delegates to
 * entirely; no bar-drawing lives here). Opt in per field placement via:
 *
 *   `component: { name: "ProgressMeterView",
 *                 props: { targetCol?: string, unit?: string, tone?: StatBarTone } }`
 *
 * - `targetCol` — sibling record column holding the target the field's own
 *   value is measured against (spec's `3,800 / 5,000 km` caption). Omit to
 *   render the field's value as a bare 0-100 percentage with no caption —
 *   same as `TableCell kind="progress"` without `target`.
 * - `unit` — caption unit suffix (`"km"` / `"days"` / `"hrs"`); `TableCell`
 *   itself ignores it when there's no `target`.
 * - `tone` — EXPLICIT override, still honored when a blueprint passes one
 *   (rule 8/10: this renderer never forbids the caller stating its own
 *   tone). Omitted (the sanctioned default — no blueprint placement should
 *   set a fixed one), the tone is computed by `computeThresholdTone` above:
 *   never a distinct fixed colour per column, per `qa/UX-NOTES.md` D1.
 *
 * `value` and the sibling `target` may arrive as a number OR a numeric
 * string (raw record data) — both are coerced defensively; absent or
 * non-numeric reaches `TableCell` as `undefined`, i.e. its explicit empty
 * state, never a false `0`.
 */
export const ReadProgressMeter: ReadRenderer = ({ descriptor, value, record }) => {
  const props = descriptor.component?.props ?? {}
  const targetCol = typeof props.targetCol === 'string' ? props.targetCol : undefined
  const unit = typeof props.unit === 'string' ? props.unit : undefined
  const explicitTone = typeof props.tone === 'string' ? (props.tone as StatBarTone) : undefined
  const target = targetCol && record ? toFiniteNumber(record[targetCol]) : undefined
  const numericValue = toFiniteNumber(value)
  const tone = explicitTone ?? computeThresholdTone(numericValue, target)
  return <TableCell kind="progress" value={numericValue} target={target} unit={unit} tone={tone} />
}

/** Fallback for unknown/extension types. */
export const ReadFallback = (props: ReadRendererProps): ReactElement => ReadText(props) as ReactElement

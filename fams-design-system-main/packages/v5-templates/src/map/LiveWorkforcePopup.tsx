import { useState, type ReactNode } from 'react'
import { CreditCard, MapPin, Phone } from '@fams/ui-kit/icons'
import {
  Calendar,
  VehiclePopupCard,
  VehicleEventsList,
  VehicleTripsPanel,
  type VehiclePopupField,
  type VehiclePopupTabItem,
} from '@fams/ui-kit'
import type { LiveVehiclePopupData } from './LiveVehiclePopup'
import type { LiveWorkforceDatum, LiveWorkforceStatus } from './live-types'
import { LIVE_WORKFORCE_STATUS_LABEL, LIVE_WORKFORCE_STATUS_TONE, resolveWorkforceArtStatus } from './live-types'
import { WORKFORCE_AVATAR_ART, WORKFORCE_AVATAR_ART_H, WORKFORCE_AVATAR_ART_W } from './workforce-icon-art'

/**
 * LiveWorkforcePopup — the live-monitoring WORKFORCE marker's click detail
 * (2026-08-31 workforce-popup task; pixel reference: FAMS Workforce
 * Management App, Figma 6Twj2L7KPGP5y8unBP9KS6 nodes 3439:4860/6849/9590).
 * Replaces the earlier simple `WorkforceMarkerCard`: the SAME tabbed
 * `VehiclePopupCard` pattern the vehicle popup rides, adapted (not forked)
 * via the card's additive header slots —
 *
 * - header tile: the vendored avatar art (`artNode`) sits on the SAME
 *   status-tinted 68×70 tile AND carries the SAME 16×16 corner badge coin
 *   the vehicle header paints (`statusTone`, `LIVE_WORKFORCE_STATUS_TONE`)
 *   — tile + avatar + one status coin, per the reference design (2026-09-01
 *   fix); the badge sits on top of the art, so it covers rather than
 *   doubles the avatar's own baked-in dot;
 * - meta row: briefcase + designation (Figma 3439:6849), plus the employee
 *   id chip when bound;
 * - status line: In Transit (green, moving), Clocked In (BLUE — outside the
 *   shared 4-tone vocabulary, hence `statusClassName`), Not Clocked In /
 *   legacy statuses per their conventions.
 *
 * Tabs (all three ALWAYS render, UX D28 — empty data → in-card empty state):
 * Overview (fields grid) · Critical Events (`VehicleEventsList`) · Shifts —
 * the workforce analogue of the vehicle Trips tab (`VehicleTripsPanel` with
 * the Shifts vocabulary): moving members carry `kind: 'trip'` rows (start/
 * end location + time, distance/duration per Trips conventions), static
 * members carry `kind: 'stay'` rows (location, clock-in, clock-out, total
 * time spent).
 */

/** Status word colour: the popup echoes the marker art's accent — green for
 *  the mover, blue for the stationary clocked-in member, grey for the rest.
 *  (`text-info` is the same `--color-info` hex the vendored blue art bakes.) */
// fix7 wave 6, P2 sweep: `on-duty`/`on-break`/`in-transit` were bare FILL
// tokens (2.35-2.62:1 on the popup's card surface, failing AA as readable
// text) — moved to the accessible TEXT aliases. `clocked-in` (`text-info`,
// #0072d6) and `not-clocked-in` (`text-gray-400`, #98a2b3) are left as-is:
// both are the SAME pre-existing, out-of-scope findings already logged
// elsewhere this cycle (the `text-primary`/`text-info` dark-theme-only
// failure wave 5 deferred; `gray-400`'s Figma-vs-accessibility ruling from
// the core `asset` module wave) rather than a fresh call here.
const STATUS_TEXT_CLASS: Record<LiveWorkforceStatus, string> = {
  'on-duty': 'text-success-text',
  'on-break': 'text-warning-text',
  'in-transit': 'text-success-text',
  'clocked-in': 'text-info',
  'not-clocked-in': 'text-gray-400',
}

export interface LiveWorkforcePopupProps {
  member: LiveWorkforceDatum
  /** Tab bodies + Overview grid — `deriveLiveWorkforcePopupData`'s shape
   *  (the vehicle popup's data contract, with Shifts riding the trip keys). */
  data?: LiveVehiclePopupData
  onClose?: () => void
  /** Header open-in-new — navigate to the member's profile. */
  onExpand?: () => void
  /** Header track/focus — recenter the map on the member. */
  onLocate?: () => void
  footer?: ReactNode
  overflow?: ReactNode
  className?: string
  /** See `LiveVehiclePopupProps.pointer` — the map surface passes `false`. */
  pointer?: boolean
  focusOnMount?: boolean
  closeOnOutsideClick?: boolean
}

/** Default Overview grid when the blueprint authors no workforce popup
 *  fields — identity + location, all read off the datum itself. */
function defaultFields(member: LiveWorkforceDatum): VehiclePopupField[] {
  const fields: VehiclePopupField[] = []
  if (member.employeeId)
    fields.push({ icon: <CreditCard aria-hidden="true" />, label: 'Employee ID', value: member.employeeId })
  if (member.locationLabel)
    fields.push({ icon: <MapPin aria-hidden="true" />, label: 'Location', value: member.locationLabel })
  if (fields.length === 0)
    fields.push({ icon: <Phone aria-hidden="true" />, label: 'Name', value: member.name })
  return fields
}

/** Inline briefcase glyph (Figma 3439:6849's designation lead) — kept local,
 *  same zero-ceremony approach as the header's own tag/pin glyphs. */
function BriefcaseGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export function LiveWorkforcePopup({
  member,
  data,
  onClose,
  onExpand,
  onLocate,
  footer,
  overflow,
  className,
  pointer = true,
  focusOnMount = true,
  closeOnOutsideClick = false,
}: LiveWorkforcePopupProps) {
  const [activeTab, setActiveTab] = useState('overview')
  /* Shifts date-strip selection — same model as `LiveVehiclePopup`'s Trips
     tab (round-1 interaction 16a/16d): the calendar chip is the default
     selection, `null` means untouched, clearing selects nothing. */
  const defaultDateId =
    data?.tripDates?.find((d) => d.calendar)?.id ??
    data?.tripDates?.find((d) => d.today)?.id ??
    data?.tripDates?.[0]?.id
  const [dateSelection, setDateSelection] = useState<{ id?: string } | null>(null)
  const selectedDateId = dateSelection ? dateSelection.id : defaultDateId
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>([])
  const [showLatest, setShowLatest] = useState(true)

  const tabs: VehiclePopupTabItem[] = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'events',
      label: 'Critical Events',
      content: <VehicleEventsList events={data?.events ?? []} emptyLabel="No critical events" />,
    },
    {
      id: 'shifts',
      label: 'Shifts',
      content: (
        <VehicleTripsPanel
          dates={data?.tripDates ?? []}
          selectedDateId={selectedDateId}
          onDateChange={(id) => setDateSelection({ id })}
          onClearDate={() => setDateSelection({ id: undefined })}
          datePicker={
            <Calendar
              mode="single"
              onSelect={() => {
                const calendarId = data?.tripDates?.find((d) => d.calendar)?.id
                if (calendarId) setDateSelection({ id: calendarId })
              }}
            />
          }
          summary={data?.tripSummary}
          summaryCountLabel="Shifts"
          showLatest={showLatest}
          onShowLatestChange={setShowLatest}
          showLatestLabel="Show latest shift (up till)"
          trips={data?.trips ?? []}
          selectedTripIds={selectedShiftIds}
          onTripSelectionChange={setSelectedShiftIds}
          emptyLabel="No shifts for this date"
        />
      ),
    },
  ]

  return (
    <VehiclePopupCard
      model={member.name}
      plate={member.employeeId ?? '—'}
      location={member.locationLabel ?? '—'}
      status={LIVE_WORKFORCE_STATUS_LABEL[member.status]}
      statusSince={member.statusSince}
      statusClassName={STATUS_TEXT_CLASS[member.status]}
      /* Same status-tinted tile + corner badge coin the vehicle header
         paints (2026-09-01 fix — the avatar was floating with no tile, and
         an earlier pass wrongly dropped the badge too). Reference design:
         tile + avatar + one status coin. */
      statusTone={LIVE_WORKFORCE_STATUS_TONE[member.status]}
      artNode={
        <img
          src={WORKFORCE_AVATAR_ART[resolveWorkforceArtStatus(member.status, member.designation)]}
          width={WORKFORCE_AVATAR_ART_W}
          height={WORKFORCE_AVATAR_ART_H}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="block"
        />
      }
      meta={
        <span className="flex items-center gap-0.5 text-sm font-semibold text-gray-400">
          <span className="grid size-3.5 shrink-0 place-items-center [&_svg]:size-3.5">
            <BriefcaseGlyph />
          </span>
          <span className="truncate">{member.designation ?? '—'}</span>
        </span>
      }
      fields={data?.fields ?? defaultFields(member)}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onClose={onClose}
      onExpand={onExpand}
      onLocate={onLocate}
      footer={footer}
      overflow={overflow}
      className={className}
      visibleTabs={data?.visibleTabs ?? ['overview', 'events', 'shifts']}
      maxVisibleTabs={data?.maxVisibleTabs}
      pointer={pointer}
      focusOnMount={focusOnMount}
      closeOnOutsideClick={closeOnOutsideClick}
    />
  )
}

LiveWorkforcePopup.displayName = 'LiveWorkforcePopup'

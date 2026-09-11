import { useState } from 'react'
import {
  VehiclePopupCard,
  ColorsIcon,
  Thermometer03Icon,
  VehicleEventsList,
  VehicleTripsPanel,
  VehicleDevicesTable,
  VehicleWorkforceCard,
  DefaultWorkforceArt,
  MapDeviceIcon,
  type VehiclePopupTabItem,
  type VehicleStatusTone,
} from '@fams/ui-kit'
import {
  Gauge,
  Navigation,
  Clock,
  Fuel,
  Route,
  Timer,
  User,
  Phone,
  MapPin,
  RadioTower,
  Droplet,
  Inbox,
  CalendarDays,
  Tag,
  Package,
  Key,
} from '@fams/ui-kit/icons'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const FIELDS = [
  { icon: <Gauge />, label: 'Speed', value: '38 km/h' },
  { icon: <Navigation />, label: 'Heading', value: 'North-east' },
  { icon: <Clock />, label: 'On trip', value: '1h 42m' },
  { icon: <Route />, label: 'Route', value: 'Lot 1 · R-04', onCopy: () => {} },
  { icon: <Fuel />, label: 'Fuel', value: '64%' },
  { icon: <Timer />, label: 'Bins done', value: '117 / 140' },
  // `thermometer-03` and `colors` are the Figma's Untitled-UI marks — lucide's
  // Thermometer has no scale marks and its Palette is an artist's palette, so
  // the map domain ships the real glyphs (round-1 visual finding #32).
  { icon: <Thermometer03Icon />, label: 'Temperature', value: '20°C' },
  { icon: <ColorsIcon />, label: 'Vehicle Color', value: 'White' },
]

/**
 * The Figma card's Overview body, field-for-field (495:4143 / SPEC P0-2) — the
 * exact contract the live-monitoring popup-data mapper must produce, in
 * row-major order across the 3 columns. Note "Last Record Recieved": Figma's
 * text node 495:4264 is misspelled and the card reproduces it verbatim (the
 * Columns popover spells it correctly — only the card body misspells it).
 */
const LIVE_FIELDS = [
  { icon: <Gauge />, label: 'Vehicle Speed', value: '0 km/h' },
  { icon: <Gauge />, label: 'Odometer', value: '53,077' },
  // Progress cells: the bar is decorative, the percentage beside it is the
  // reading (board 16:21739 / 16:21888).
  { icon: <Package />, label: 'Fill Level', value: '93%', percent: 93 },
  { icon: <Package />, label: 'Last Collection On', value: '23 mins ago' },
  { icon: <Droplet />, label: 'Fuel Level', value: '12%', percent: 12, percentTone: 'error' as const },
  { icon: <Clock />, label: 'Last Refuel', value: '6 hours ago' },
  { icon: <MapPin />, label: 'Coordinates', value: '25.286 , 51.535', onCopy: () => {} },
  { icon: <Key />, label: 'Ignition', value: 'Off' },
  { icon: <RadioTower />, label: 'Last Record Recieved', value: '2 mins ago' },
  // Chip cell (board 16:22771).
  {
    icon: <Tag />,
    label: 'Tags',
    value: 'Night Shift, Hazmat',
    chips: [
      { label: 'Night Shift', tone: 'success' as const },
      { label: 'Hazmat', tone: 'warning' as const },
    ],
  },
]

const STATUS_TONES: { status: string; tone: VehicleStatusTone; since: string }[] = [
  { status: 'Moving', tone: 'success', since: 'since 12 minutes' },
  { status: 'Idle', tone: 'warning', since: 'since 4 minutes' },
  { status: 'Stopped', tone: 'error', since: 'since 26 minutes' },
  { status: 'Offline', tone: 'muted', since: 'since 2 hours' },
]

function TabbedCard() {
  const [tab, setTab] = useState('Trip')
  return (
    <VehiclePopupCard
      model="Isuzu FVR — Compactor"
      plate="QA 45213"
      driver="Rashid Al-Kuwari"
      location="Al Wakrah — Depot"
      status="Moving"
      statusTone="success"
      statusSince="since 12 minutes"
      activeTab={tab}
      onTabChange={setTab}
      tabs={['Trip', 'Telemetry', 'Compliance', 'Incidents']}
      fields={FIELDS}
    />
  )
}

/** The live-monitoring 5-tab anatomy (Figma board 16:22894) — the
 *  three content tabs carry their own bodies via `VehiclePopupTabItem.content`:
 *  `VehicleEventsList`, `VehicleTripsPanel`, `VehicleDevicesTable`. */
function LiveTabsCard() {
  const [tab, setTab] = useState('overview')
  const [dateId, setDateId] = useState<string | undefined>('today')
  const [showLatest, setShowLatest] = useState(false)
  const tabs: VehiclePopupTabItem[] = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'events',
      label: 'Critical Events',
      content: (
        <VehicleEventsList
          events={[
            { id: 'e1', name: 'Black Spot', subtype: 'Camera obstructed', location: 'West Bay, Doha', time: '07 Oct, 24 | 02:49 PM' },
            { id: 'e2', name: 'Harsh Braking', location: 'Al Rayyan Rd', time: '07 Oct, 24 | 01:12 PM' },
            { id: 'e3', name: 'Overspeeding', subtype: '132 km/h in 100 zone', location: 'Al Shamal Rd', time: '06 Oct, 24 | 09:14 AM' },
          ]}
        />
      ),
    },
    {
      id: 'trips',
      label: 'Trips',
      content: (
        <VehicleTripsPanel
          // A chip may carry its OWN trips + summary, so picking a day swaps
          // the body with no caller state at all. `calendar` marks the solid
          // picked-date chip (the Figma's `15 Oct 2024`); `today` is the
          // OUTLINED blue chip, never a solid fill.
          dates={[
            {
              id: 'd10',
              label: '10 Oct',
              trips: [
                { id: 't10', startTime: '08:05', endTime: '09:40', origin: 'Industrial Area Depot', destination: 'Lusail Marina', events: 0, distance: '11 KM', duration: '1h 35m' },
              ],
              summary: { distance: '11 km', trips: 1, duration: '1h35m' },
            },
            { id: 'd11', label: '11 Oct' },
            { id: 'today', label: 'Today', today: true },
            { id: 'd15', label: '15 Oct 2024', calendar: true },
          ]}
          selectedDateId={dateId}
          onDateChange={setDateId}
          onClearDate={() => setDateId(undefined)}
          summary={{ distance: '43 km', trips: 30, duration: '2h43m' }}
          showLatest={showLatest}
          onShowLatestChange={setShowLatest}
          trips={[
            { id: 't1', startTime: '15:30', endTime: '11:21', origin: 'Lusail Marina', destination: 'Industrial Area Depot', events: 2, distance: '30 KM', duration: '2h 43m' },
            { id: 't2', startTime: '09:12', endTime: '08:03', origin: 'Industrial Area Depot', destination: 'Lusail Marina', events: 0, distance: '12 KM', duration: '1h 09m' },
          ]}
        />
      ),
    },
    {
      id: 'workforce',
      label: 'Workforce',
      content: (
        <VehicleWorkforceCard
          photo={<DefaultWorkforceArt className="size-25" />}
          entries={[
            { icon: <User />, label: 'Workforce', value: 'Khalid Al-Marri' },
            { icon: <Phone />, label: 'Contact', value: '+974 5512 8890' },
            { icon: <Inbox />, label: 'Email', value: 'k.almarri@uccp.qa' },
            { icon: <CalendarDays />, label: 'Assigned On', value: '12 Feb, 2025' },
          ]}
        />
      ),
    },
    {
      id: 'devices',
      label: 'Devices',
      content: (
        <VehicleDevicesTable
          devices={[
            { id: 'dv1', name: 'Temp Sensor', imei: '356938035643809', dataRec: '12:32', value: '54°C', valueTone: 'error', trend: true },
            { id: 'dv2', name: 'Door Lock', imei: '356938035643810', dataRec: '12:30', value: 'All Secure', valueTone: 'success' },
            // Every row gets the device glyph by default; `icon` overrides it.
            { id: 'dv3', name: 'GPS Tracker', imei: '356938035643811', dataRec: '12:33', value: 'OK', valueTone: 'muted', icon: <MapDeviceIcon /> },
          ]}
        />
      ),
    },
  ]
  return (
    <VehiclePopupCard
      model="Mitsubishi X6734"
      plate="GFU47893"
      driver="Khalid Al-Marri"
      location="West Bay, Doha"
      status="Stopped"
      statusTone="error"
      statusSince="since 2 minutes"
      activeTab={tab}
      onTabChange={setTab}
      tabs={tabs}
      // Three pinned segments; Trips and Devices live in the bar's ⋯ menu.
      visibleTabs={['overview', 'events', 'workforce']}
      fields={LIVE_FIELDS}
      pointer
    />
  )
}

/**
 * VehiclePopupCardDemo — standalone showcase for the VehiclePopupCard domain component.
 * Belongs under the "Map" showcase page (`showcase/MapKit.tsx`) once wired by the orchestrator.
 */
export default function VehiclePopupCardDemo() {
  return (
    <DocPage
      title="VehiclePopupCard"
      badge="stable"
      summary="Live-monitoring vehicle infowindow card (Figma 495:4143) — header (status-tinted 3D-vehicle tile, title, plate/driver/location meta, octagon status line, track/open/close actions) + a 3-column field grid + a segmented tab strip, at a stable 448px height with an internally scrolling body. Pure presentational; the map layer positions it (optionally via the bottom pointer triangle) and supplies field data + tab state."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          The segmented tab strip at the foot of the card is fully controlled — <Code>activeTab</Code>{' '}
          and <Code>onTabChange</Code> are wired locally in this demo. Click a tab to switch it.
        </Prose>
        <TabbedCard />
      </DocSection>

      <DocSection id="status" title="Status tones">
        <Prose>
          <Code>statusTone</Code> tints the status word + octagon glyph, the 3D-vehicle tile
          (status-100 scale), and the tile&apos;s badge coin. Idling reads warning-600 per the
          Figma status palette.
        </Prose>
        <Gallery
          minColRem={32}
          items={STATUS_TONES.map(({ status, tone, since }) => ({
            label: tone,
            node: (
              <VehiclePopupCard
                model="Isuzu FVR — Compactor"
                plate="QA 45213"
                driver="Rashid Al-Kuwari"
                location="Al Wakrah — Depot"
                status={status}
                statusTone={tone}
                statusSince={since}
                fields={FIELDS}
              />
            ),
          }))}
        />
      </DocSection>

      <DocSection id="live-tabs" title="Content tabs (live-monitoring anatomy)">
        <Prose>
          Tabs given as objects (<Code>VehiclePopupTabItem</Code>) may carry their own{' '}
          <Code>content</Code> body, which replaces the fields grid while active — the
          live-monitoring card's Critical Events (<Code>VehicleEventsList</Code>), Trips (
          <Code>VehicleTripsPanel</Code>) and Devices (<Code>VehicleDevicesTable</Code>) tabs. Plain
          string tabs keep the Overview grid.
        </Prose>
        <LiveTabsCard />
      </DocSection>

      <DocSection id="composition" title="Without tabs · with the anchor pointer">
        <Prose>
          <Code>tabs</Code> is optional — omit it (as here) to hide the segmented strip entirely.{' '}
          <Code>onClose</Code>, <Code>onLocate</Code>, and <Code>onExpand</Code> still render their
          header buttons even when unset; wire them or they're inert. <Code>pointer</Code> adds the
          20×20 bottom triangle the map layer anchors on the marker (shown here).
        </Prose>
        <VehiclePopupCard
          model="Isuzu FVR — Compactor"
          plate="AUH 30188"
          driver="Hamdan Al Kaabi"
          location="Al Rayyan — Education City"
          status="Idle"
          statusTone="warning"
          fields={FIELDS.slice(0, 3)}
          pointer
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <div className="text-body-sm font-semibold text-foreground">VehiclePopupCard</div>
        <PropsTable
          rows={[
            { prop: 'model', type: 'string', required: true, description: 'Vehicle model / display name — the card title.' },
            { prop: 'plate', type: 'string', required: true, description: 'Plate / registration string.' },
            { prop: 'driver', type: 'string', required: true, description: 'Driver name shown in the meta row.' },
            { prop: 'location', type: 'string', required: true, description: 'Current location label shown in the meta row.' },
            { prop: 'status', type: 'string', required: true, description: 'Status word, e.g. "Stopped" / "Moving" / "Idle".' },
            {
              prop: 'statusTone',
              type: "'success' | 'warning' | 'error' | 'muted'",
              default: "'muted'",
              description: 'Tints the status word + thumbnail badge.',
            },
            { prop: 'statusSince', type: 'string', description: 'Trailing status detail, e.g. "since 2 minutes".' },
            {
              prop: 'thumbnail',
              type: 'ReactNode',
              description: 'DEPRECATED — accepted for API compatibility but never rendered; the 3D vehicle art (VehicleIcon3D) on the status-tinted tile is the rendered truth (P0-1: zero vehicle photos).',
            },
            {
              prop: 'pointer',
              type: 'boolean',
              default: 'false',
              description: 'Renders the 20×20 down-pointing anchor triangle under the card (the map layer’s marker pointer).',
            },
            {
              prop: 'focusOnMount',
              type: 'boolean',
              default: 'false',
              description: 'Move focus into the card on mount — the role="dialog" open behavior for on-map use.',
            },
            {
              prop: 'closeOnOutsideClick',
              type: 'boolean',
              default: 'false',
              description: 'Call onClose on a pointer-down outside the card (the “click empty map to dismiss” path). Opt-in so inline/docked cards don’t self-close.',
            },
            {
              prop: 'fields',
              type: 'VehiclePopupField[]',
              required: true,
              description: 'Fields in row-major order (col1row1, col2row1, col3row1, col1row2, …). Shape below.',
            },
            {
              prop: 'tabs',
              type: 'Array<string | VehiclePopupTabItem>',
              description: 'Segmented tabs at the foot of the card. Strings keep the fields-grid body; object items ({ id?, label, content? }) may swap in their own body while active. Omit to hide the strip.',
            },
            {
              prop: 'visibleTabs',
              type: 'string[]',
              description: 'Ordered keys of the tabs pinned to the bar; the rest go to its \u22ef overflow menu. Omitted, the first maxVisibleTabs are pinned.',
            },
            {
              prop: 'maxVisibleTabs',
              type: 'number',
              description: 'Segments the bar shows before its adaptive slot. Default 3 — the card is a fixed 558px box, so the bar never grows or wraps.',
            },
            { prop: 'activeTab', type: 'string', description: 'Currently active tab — fully controlled by the caller.' },
            { prop: 'onTabChange', type: '(tab: string) => void', description: 'Fires when a tab is clicked.' },
            {
              prop: 'onClose',
              type: '() => void',
              description: 'Close button handler — the header button itself always renders.',
            },
            {
              prop: 'onLocate',
              type: '() => void',
              description: '"Center on vehicle" button handler — the header button itself always renders.',
            },
            {
              prop: 'onExpand',
              type: '() => void',
              description: '"Expand details" button handler — the header button itself always renders.',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLDivElement>, 'title'>",
              description: 'className and any div attribute (except title, reserved internally) pass through.',
            },
          ]}
        />

        <div className="text-body-sm font-semibold text-foreground">VehiclePopupField</div>
        <PropsTable
          rows={[
            { prop: 'icon', type: 'ReactNode', required: true, description: '16px leading icon for the field.' },
            { prop: 'label', type: 'string', required: true, description: 'Field label, e.g. "Speed".' },
            { prop: 'value', type: 'ReactNode', required: true, description: 'Field value, e.g. "38 km/h".' },
            { prop: 'onCopy', type: '() => void', description: 'Renders a trailing copy affordance after the value.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Keep fields to 3 or 6 so the 3-column grid ends on a full row.',
            'Use statusTone consistently with the marker tone for the same vehicle.',
            'Control activeTab from the caller — the card holds no tab state of its own.',
            'Wire onClose/onLocate/onExpand — the header buttons always render, so an unwired one is a dead click.',
          ]}
          donts={[
            'Don’t exceed ~6 fields — the card is a summary, not a full detail view.',
            'Don’t put interactive content inside a field value beyond the built-in copy affordance.',
            'Don’t reposition the card with margins — the map/overlay layer owns placement.',
            'Don’t use it for anything that isn’t a live map selection — this is a map overlay, not a general-purpose detail card.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The card is a labelled role="dialog" (named by the vehicle title); focusOnMount moves focus in on open, and all three close paths call onClose — Escape, the ✕ action, and (opt-in) closeOnOutsideClick.',
            'Header actions (locate, expand, close) render as native ≥24px buttons with descriptive aria-labels regardless of whether a handler is wired.',
            'The footer strip is a real WAI-ARIA tablist — arrow keys rove and select, aria-selected/aria-controls wired to the body tabpanel.',
            'Each stringable field pairs its 10px label and value into one accessible name ("Driver: Khalid Al-Marri"); the copy affordance sits on a 24×24 hit area and announces through a polite live region.',
            'Status is carried by the status word as text, not colour alone; the tile badge glyph (arrow / pause / square) reinforces it and is aria-hidden so the word is announced once.',
            'Layout is fully logical-flow (no left/right assumptions), so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

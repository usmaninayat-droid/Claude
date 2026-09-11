import { Radio, Camera, Satellite } from '@fams/ui-kit/icons'
import {
  ConnectionStatusCard,
  type ConnectionStatus,
} from '../../../../packages/ui-kit/src/composites/ConnectionStatusCard'
import type { IconBadgeTone } from '../../../../packages/ui-kit/src/primitives/IconBadge'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const STATUSES: ConnectionStatus[] = ['online', 'offline', 'pending']
const ICON_TONES: IconBadgeTone[] = ['primary', 'success', 'warning', 'danger', 'info', 'neutral']

type ConnectionStatusCardControls = {
  status: ConnectionStatus
  iconTone: IconBadgeTone
  label: string
  subtitle: string
  timestamp: string
  clickable: boolean
}

export default function ConnectionStatusCardDemo() {
  return (
    <DocPage
      title="ConnectionStatusCard"
      badge="stable"
      summary="Compact device/connection status readout. Generalizes the reference design's telematics-specific 'Reporting / Not Reporting' card into a domain-neutral online | offline | pending status — the caller supplies the label and statusLabel, this component owns only the dot, its pulse-on-pending affordance, and the layout."
    >
      <DocSection id="playground" title="Playground">
        <Playground<ConnectionStatusCardControls>
          controls={[
            { name: 'status', type: 'select', default: 'online', options: STATUSES },
            { name: 'iconTone', type: 'select', default: 'neutral', options: ICON_TONES },
            { name: 'label', type: 'text', default: 'GPS' },
            { name: 'subtitle', type: 'text', default: '' },
            { name: 'timestamp', type: 'text', default: 'Last 5 min ago' },
            { name: 'clickable', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <div className="w-80">
              <ConnectionStatusCard
                status={v.status}
                iconTone={v.iconTone}
                icon={Satellite}
                label={v.label || undefined}
                subtitle={v.subtitle || undefined}
                timestamp={v.timestamp || undefined}
                onClick={v.clickable ? () => {} : undefined}
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="status" title="Status states">
        <Prose>
          <Code>pending</Code> pulses the dot. <Code>statusLabel</Code> defaults to a generic word
          derived from <Code>status</Code> when omitted.
        </Prose>
        <Gallery
          minColRem={16}
          items={STATUSES.map((status) => ({
            label: status,
            node: (
              <div className="w-72">
                <ConnectionStatusCard
                  status={status}
                  label="GPS"
                  icon={Satellite}
                  timestamp={status === 'pending' ? 'Connecting…' : 'Last 5 min ago'}
                />
              </div>
            ),
          }))}
        />
      </DocSection>

      <DocSection id="content" title="Content options">
        <Gallery
          minColRem={27}
          maxCols={2}
          items={[
            {
              label: 'Caller-supplied statusLabel + subtitle',
              node: (
                <div className="w-96">
                  <ConnectionStatusCard
                    status="online"
                    label="Device"
                    icon={Radio}
                    statusLabel="Connected"
                    subtitle="IMEI 861234056781"
                    timestamp="just now"
                  />
                </div>
              ),
            },
            {
              label: 'Minimal',
              caption: 'no icon, no label',
              node: (
                <div className="w-64">
                  <ConnectionStatusCard status="offline" />
                </div>
              ),
            },
            {
              label: 'Clickable',
              caption: 'role="button", Enter/Space',
              node: (
                <div className="w-96">
                  <ConnectionStatusCard
                    status="pending"
                    label="Camera"
                    icon={Camera}
                    subtitle="Truck AUH-2210 — front-facing"
                    onClick={() => {}}
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'status',
              type: "'online' | 'offline' | 'pending'",
              required: true,
              description: 'Connection state. Drives the dot colour and, on pending, its pulse.',
            },
            {
              prop: 'statusLabel',
              type: 'ReactNode',
              description: "Visible status text. Defaults to a generic label derived from status — override with anything more specific (\"Connected\", \"Last seen 3m ago\").",
            },
            {
              prop: 'label',
              type: 'ReactNode',
              description: 'Caption identifying what is being monitored (e.g. "GPS", "Camera", "Device"). Omit to hide the caption row.',
            },
            {
              prop: 'icon',
              type: 'LucideIcon',
              description: 'Leading icon, rendered inside an IconBadge. Omit for a card with no icon.',
            },
            {
              prop: 'iconTone',
              type: "'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'",
              default: "'neutral'",
              description: "Tint passed to the IconBadge. Independent of status — tints the subject's icon, not the status itself.",
            },
            {
              prop: 'subtitle',
              type: 'ReactNode',
              description: 'Secondary line below the status (e.g. device ID, coordinates).',
            },
            {
              prop: 'timestamp',
              type: 'ReactNode',
              description: 'Right-aligned, pre-formatted timestamp/metadata (e.g. "Last 5 min ago").',
            },
            {
              prop: 'onClick',
              type: '() => void',
              description: 'Makes the whole card a keyboard-operable button (role="button", Enter/Space).',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLDivElement>, 'onClick'>",
              description: 'className and any div attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use status for the connection state and iconTone independently for the subject icon\'s tint.',
            'Supply a pre-formatted, relative timestamp ("Last 5 min ago") — the component does no time math.',
            'Add onClick only when there is a real detail view to open (device drawer, asset profile).',
            'Override statusLabel with a specific phrase ("Connected", "Last seen 3m ago") when the generic label is too vague.',
          ]}
          donts={[
            "Don't poll or fetch inside this component — status is a controlled prop the caller re-renders on change.",
            "Don't use pending for a state that never resolves; it exists for genuinely transient connecting states.",
            "Don't omit label and subtitle both unless the surrounding layout already identifies the subject.",
            "Don't rely on the dot colour alone — statusLabel's text always carries the state.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Clickable cards render role="button" with tabIndex and Enter/Space keyboard activation.',
            'The status dot is decorative (aria-hidden); the status text always carries the state for assistive tech.',
            'pending\'s pulse is a purely visual affordance layered on top of the text label, not a substitute for it.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

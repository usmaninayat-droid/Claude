import { Users, Truck, User, ClipboardCheck, CalendarClock, AlertTriangle } from '@fams/ui-kit/icons'
import { StatTile, type StatTileTone } from '../../../../packages/ui-kit/src/composites/StatTile'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const KPIS = [
  { label: 'Total Manpower', value: '788', caption: 'Employee master · all statuses', tone: 'info' as const, icon: Users },
  { label: 'Drivers', value: '294', caption: 'HDD 265 · LDD 29', tone: 'success' as const, icon: Truck },
  { label: 'Helpers', value: '470', caption: 'Route · supervisor · extra', tone: 'lavender' as const, icon: User },
  { label: 'Operational Staff', value: '785', caption: 'Excludes Area Manager and above', tone: 'info' as const, icon: ClipboardCheck },
  { label: 'Pending Rostering', value: '136', caption: 'Active, no duty in week 2', tone: 'danger' as const, icon: CalendarClock },
  { label: 'Training Pending / Expired', value: '228', caption: '9 blocked from rostering', tone: 'warning' as const, icon: AlertTriangle },
]

const HEADCOUNT = [
  { label: 'Total Head Count', value: '764', caption: 'Active + on leave + training', tone: 'dark' as const },
  { label: 'Planned Head Count', value: '470', caption: 'Rostered to route / reliever', tone: 'info' as const },
  { label: 'Reported Head Count', value: '459', caption: 'Punched in (attendance machine)', tone: 'success' as const },
  { label: 'Absenteeism', value: '35', caption: '7% of planned', tone: 'danger' as const },
  { label: 'Weekly Off', value: '105', caption: 'Contracted rest day', tone: 'neutral' as const },
  { label: 'Vacation', value: '42', caption: 'Annual + emergency leave', tone: 'yellow' as const },
  { label: 'Available Head Count', value: '158', caption: 'Not deployed, not off', tone: 'lavender' as const },
]

const TONES: StatTileTone[] = ['primary', 'success', 'warning', 'danger', 'info', 'lavender', 'yellow', 'neutral', 'dark']

type Controls = { tone: StatTileTone; withIcon: boolean; withCaption: boolean }

export default function StatTileDemo() {
  return (
    <DocPage
      title="StatTile"
      badge="stable"
      summary="A stat card with a coloured top accent border, an uppercase label with an optional trailing icon chip, a large value, and a muted caption. The Tadweer Deployment Dashboard KPI / headcount tile — icon-bearing on the KPI strip, icon-less in the headcount panel."
    >
      <DocSection id="playground" title="Playground">
        <Playground<Controls>
          controls={[
            { name: 'tone', type: 'select', default: 'info', options: TONES },
            { name: 'withIcon', type: 'boolean', default: true },
            { name: 'withCaption', type: 'boolean', default: true },
          ]}
        >
          {(v) => (
            <div className="w-full max-w-xs">
              <StatTile
                label="Total Manpower"
                value="788"
                caption={v.withCaption ? 'Employee master · all statuses' : undefined}
                icon={v.withIcon ? Users : undefined}
                tone={v.tone}
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="kpi-strip" title="KPI strip (icon-bearing)">
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(13.75rem,1fr))]">
          {KPIS.map((k) => (
            <StatTile key={k.label} {...k} />
          ))}
        </div>
      </DocSection>

      <DocSection id="headcount" title="Headcount panel (icon-less)">
        <div className="rounded-md border border-border bg-muted/40 p-4">
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(12.5rem,1fr))]">
            {HEADCOUNT.map((h) => (
              <StatTile key={h.label} {...h} />
            ))}
          </div>
        </div>
      </DocSection>

      <DocSection id="tones" title="Tones">
        <Gallery
          minColRem={11}
          items={TONES.map((tone) => ({ label: tone, node: <StatTile label={tone} value="128" caption="sample" tone={tone} className="w-full" /> }))}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'label', type: 'ReactNode', required: true, description: 'Small uppercase label above the value.' },
            { prop: 'value', type: 'ReactNode', required: true, description: 'The big value, pre-formatted by the caller.' },
            { prop: 'caption', type: 'ReactNode', description: 'Muted supporting line under the value.' },
            { prop: 'icon', type: 'LucideIcon', description: 'Trailing icon in a tone-tinted rounded-square chip. Omit for the icon-less form.' },
            { prop: 'tone', type: 'StatTileTone', default: "'neutral'", description: "'primary' | 'success' | 'warning' | 'danger' | 'info' | 'lavender' | 'yellow' | 'neutral' | 'dark'." },
            { prop: '…props', type: 'HTMLAttributes<HTMLDivElement>', description: 'className and any native div attribute pass through.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Prose>
          Use <Code>KpiTile</Code> for the general dashboard stat (icon disc on the left, no accent border); use this when the
          design draws the accent-topped card — the deployment KPI strip and headcount breakdown.
        </Prose>
        <Guidelines
          dos={['Keep the tone consistent for the same concept across the KPI strip and the breakdown panel.', 'Pre-format the value and pad small counts in the caller when the design pads them.']}
          donts={['Do not pass raw colours — tones are the closed, token-backed set.', 'Do not omit the label — the accent colour is decoration, never the tile’s identity.']}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The value and label render as text; the accent bar and icon chip are aria-hidden decoration.',
            'Colour never carries meaning alone — every tile is named by its label and read by its value.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

import { useState } from 'react'
import { AlertTriangle, Copy, Eye, Gauge, MapPin, Pencil, Route, Trash2, X, Check } from '@fams/ui-kit/icons'
import { TableCell, VehicleIcon3D } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * TableCellDemo — kind-dispatch cell content renderer for DataTable. Belongs
 * under the "Data display" showcase page, next to DataTable — this is the
 * cell-content vocabulary DataTable's `column.render` reaches for instead of
 * a bespoke per-column template.
 */
export default function TableCellDemo() {
  const [checked, setChecked] = useState(true)
  const [toggled, setToggled] = useState(false)

  return (
    <DocPage
      title="TableCell"
      badge="stable"
      summary="Kind-dispatch cell content renderer for DataTable — a vocabulary of common cell shapes (badge, toggle, gauge, avatar, actions…) so callers stop hand-rolling the same status pill or icon-button row per screen. Renders CONTENT for a DataTable <td>, not the <td> itself: column.render={(row) => <TableCell kind='badge' .../>}."
    >
      <DocSection id="kinds" title="Every kind">
        <Prose>
          Each row shows one <Code>kind</Code> — this is the full vocabulary. Every kind composes an
          existing primitive (Badge, Checkbox, Switch, Avatar, StatBar/Progress, TrendIndicator, RadialProgress)
          — TableCell adds only the dispatch and cell-specific density defaults, never a parallel
          implementation of status color or a11y.
        </Prose>
        <Gallery
          minColRem={10}
          items={[
            { label: 'text', node: <TableCell kind="text" value="TAJ-1042" /> },
            { label: 'text (empty)', node: <TableCell kind="text" /> },
            { label: 'empty', node: <TableCell kind="empty" /> },
            {
              label: 'checkbox',
              node: (
                <TableCell kind="checkbox" checked={checked} onCheckedChange={setChecked} ariaLabel="Select TAJ-1042" />
              ),
            },
            { label: 'badge', node: <TableCell kind="badge" label="Compliant" variant="success" dot /> },
            {
              label: 'badges',
              node: (
                <TableCell
                  kind="badges"
                  badges={[
                    { id: 'lot', label: 'Lot 1', variant: 'info' },
                    { id: 'esp', label: 'Lavajet', variant: 'secondary' },
                  ]}
                />
              ),
            },
            {
              label: 'tags',
              caption: 'figma 4868:2062 Tags column — TagChipList under the hood, "+N" overflow beyond max',
              node: (
                <TableCell
                  kind="tags"
                  max={2}
                  tags={[
                    { value: 'a', label: 'Recurring' },
                    { value: 'b', label: 'Priority' },
                    { value: 'c', label: 'Overdue' },
                  ]}
                />
              ),
            },
            {
              label: 'toggle',
              node: <TableCell kind="toggle" checked={toggled} onCheckedChange={setToggled} ariaLabel="Active" />,
            },
            { label: 'gauge', node: <TableCell kind="gauge" value={82} /> },
            { label: 'progress', node: <TableCell kind="progress" value={64} /> },
            {
              label: 'progress (target caption, tone)',
              caption:
                'figma grouped-list §1.2 — fill derived from value/target, "value / target unit" caption below, tone is the caller\'s call per column',
              node: (
                <div className="flex w-40 flex-col gap-3">
                  <TableCell kind="progress" value={3800} target={5000} unit="km" tone="warning" />
                  <TableCell kind="progress" value={81} target={90} unit="days" tone="danger" />
                  <TableCell kind="progress" value={2800} target={5000} unit="hrs" tone="success" />
                </div>
              ),
            },
            {
              label: 'progress (empty state)',
              caption: 'no value tracked for this row — a grey track and a dash, never a false "0% complete"',
              node: <TableCell kind="progress" target={5000} unit="hrs" />,
            },
            { label: 'trend', node: <TableCell kind="trend" direction="up" value="12%" note="vs last month" /> },
            { label: 'avatar', node: <TableCell kind="avatar" name="Kashish Bindrani" label="Kashish Bindrani" /> },
            {
              label: 'avatar (secondary)',
              caption: 'figma 4864:9366 "User Info" — name + secondary line (email, role, code…)',
              node: (
                <TableCell
                  kind="avatar"
                  name="Jane Doe"
                  label="Jane Doe"
                  secondary="jane.doe@example.com"
                />
              ),
            },
            {
              label: 'avatar-stack',
              node: (
                <TableCell
                  kind="avatar-stack"
                  max={3}
                  avatars={[
                    { id: '1', name: 'Ali Rizwan' },
                    { id: '2', name: 'Usama Ejaz' },
                    { id: '3', name: 'Emmad Ahmad' },
                    { id: '4', name: 'Saed Salah' },
                  ]}
                />
              ),
            },
            {
              label: 'actions',
              node: (
                <TableCell
                  kind="actions"
                  actions={[
                    { id: 'view', icon: <Eye className="size-4" />, label: 'View' },
                    { id: 'edit', icon: <Pencil className="size-4" />, label: 'Edit' },
                    { id: 'copy', icon: <Copy className="size-4" />, label: 'Duplicate' },
                    { id: 'delete', icon: <Trash2 className="size-4" />, label: 'Delete', isDestructive: true },
                  ]}
                />
              ),
            },
            {
              label: 'actions (outline)',
              caption: 'figma 4868:2062 — paired accept/reject row controls, tinted circular icon buttons',
              node: (
                <TableCell
                  kind="actions"
                  appearance="outline"
                  actions={[
                    { id: 'reject', icon: <X className="size-4" />, label: 'Reject', tone: 'destructive' },
                    { id: 'accept', icon: <Check className="size-4" />, label: 'Accept', tone: 'primary' },
                  ]}
                />
              ),
            },
            { label: 'group-title', node: <TableCell kind="group-title" label="Lot 1 — Lavajet" /> },
            { label: 'group-divider', node: <TableCell kind="group-divider" /> },
            { label: 'activity', node: <TableCell kind="activity" label="Online" tone="success" /> },
            { label: 'start-end-time', node: <TableCell kind="start-end-time" start="08:00" end="16:00" /> },
            {
              label: 'tab-actions',
              node: (
                <TableCell
                  kind="tab-actions"
                  tabs={[
                    { id: 'overview', label: 'Overview', isActive: true },
                    { id: 'history', label: 'History' },
                    { id: 'notes', label: 'Notes' },
                  ]}
                />
              ),
            },
            {
              label: 'entity',
              caption: 'the identity cell every list row leads with — an opaque media slot, the name, an optional second line',
              node: (
                <TableCell
                  kind="entity"
                  media={<VehicleIcon3D size="sm" art="tanker" tone="success" badge="start" />}
                  label="Tanker 01"
                  secondary="VEH-01"
                />
              ),
            },
            {
              label: 'icon-value',
              caption: 'a value behind a small decorative glyph — iconLabel names the glyph for screen readers',
              node: (
                <TableCell
                  kind="icon-value"
                  icon={<MapPin />}
                  iconLabel="Address"
                  value="Hamad International Airport, Qatar"
                />
              ),
            },
            {
              label: 'metrics',
              caption: 'an icon+count strip (a row\'s "activity overview") — closed tones, every count named',
              node: (
                <TableCell
                  kind="metrics"
                  metrics={[
                    { id: 'events', icon: <AlertTriangle />, value: 4, label: 'Critical events', tone: 'danger' },
                    { id: 'trips', icon: <Route />, value: 6, label: 'Trips today' },
                    { id: 'speed', icon: <Gauge />, value: '74 km/h', label: 'Current speed' },
                  ]}
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'kind',
              type: "'text' | 'empty' | 'checkbox' | 'badge' | 'badges' | 'tags' | 'toggle' | 'gauge' | 'actions' | 'avatar' | 'avatar-stack' | 'progress' | 'trend' | 'group-title' | 'group-divider' | 'activity' | 'start-end-time' | 'tab-actions' | 'entity' | 'icon-value' | 'metrics'",
              required: true,
              description: 'Discriminant — selects which shape the remaining props must satisfy.',
            },
            { prop: 'value', type: 'ReactNode', description: 'kind="text": the raw cell value. Empty/undefined renders the em-dash fallback.' },
            {
              prop: 'checked',
              type: "boolean | 'indeterminate'",
              description: 'kind="checkbox"/"toggle": current checked state.',
            },
            { prop: 'onCheckedChange', type: '(checked: boolean) => void', description: 'kind="checkbox"/"toggle": change handler.' },
            { prop: 'label', type: 'ReactNode', description: 'kind="badge"/"avatar"/"activity"/"group-title": primary label text.' },
            {
              prop: 'variant',
              type: "BadgeVariant",
              description: 'kind="badge": status tint, same enum as Badge.',
            },
            { prop: 'dot', type: 'boolean', description: 'kind="badge": leading status dot.' },
            { prop: 'colorIndex', type: '1 – 10', description: 'kind="badge": categorical tag color, same as Badge.' },
            { prop: 'badges', type: 'TableCellBadgeItem[]', description: 'kind="badges": list of { id, label, variant?, dot?, colorIndex? }.' },
            { prop: 'tags', type: 'TagOption[]', description: 'kind="tags": already-resolved tags — { value, label, color?, group? }, rendered via TagChipList.' },
            { prop: 'max', type: 'number', description: 'kind="tags": visible chips before the "+N" overflow chip. Omit to show all.' },
            { prop: 'value', type: 'number', description: 'kind="gauge": 0-100 value.' },
            {
              prop: 'value',
              type: 'number',
              description:
                'kind="progress": current reading. With target, the raw current value (fill = value/target); without it, a 0-100 percentage directly. Absent or non-numeric renders the empty state (grey track + dash), never a false "0%".',
            },
            {
              prop: 'target',
              type: 'number',
              description: 'kind="progress": target the reading is measured against — given with unit, renders the "value / target unit" caption and derives the fill percentage.',
            },
            { prop: 'unit', type: 'string', description: 'kind="progress": caption unit suffix, e.g. "km" / "days" / "hrs". Ignored without target.' },
            { prop: 'tone', type: 'RadialProgressTone', description: 'kind="gauge": ring color tone.' },
            {
              prop: 'tone',
              type: "StatBarTone ('primary' | 'success' | 'warning' | 'danger')",
              default: "'primary'",
              description: 'kind="progress": bar fill tone — the caller\'s call which value counts as good; three adjacent progress cells may each carry a different tone.',
            },
            {
              prop: 'actions',
              type: 'TableCellAction[]',
              description:
                'kind="actions": trailing icon buttons — { id, icon, label, onClick?, disabled?, tone?: "neutral"|"primary"|"destructive" }.',
            },
            {
              prop: 'appearance',
              type: "'ghost' | 'outline'",
              default: "'ghost'",
              description: 'kind="actions": "outline" renders circular bordered icon buttons tinted per action tone (figma 4868:2062).',
            },
            {
              prop: 'secondary',
              type: 'ReactNode',
              description: 'kind="avatar": second line under label (email, role, code…). Additive — omit for the original single-line cell.',
            },
            {
              prop: 'icon',
              type: 'ReactNode',
              description: 'kind="avatar": small leading glyph before the avatar image.',
            },
            { prop: 'src / name', type: 'string', description: 'kind="avatar": image source and fallback-initials name.' },
            { prop: 'avatars', type: 'TableCellAvatarItem[]', description: 'kind="avatar-stack": { id, src?, name? } list, capped by max.' },
            { prop: 'max', type: 'number', default: '3', description: 'kind="avatar-stack": visible avatars before the "+N" overflow badge.' },
            { prop: 'direction / value / note', type: "TrendIndicatorProps['direction'] / value / string", description: 'kind="trend": passthrough to TrendIndicator.' },
            {
              prop: 'tone',
              type: "'neutral' | 'success' | 'warning' | 'danger' | 'info'",
              default: "'neutral'",
              description: 'kind="activity": status dot color.',
            },
            { prop: 'pulse', type: 'boolean', default: 'true', description: 'kind="activity": animate the status dot.' },
            {
              prop: 'media',
              type: 'ReactNode',
              description:
                'kind="entity": the leading media box — a VehicleIcon3D, an Avatar, a thumbnail img, a logo. An opaque slot: the cell never learns what kind of record it is showing.',
            },
            {
              prop: 'label',
              type: 'ReactNode',
              description: 'kind="entity"/"badge"/"group-title": the primary line / chip label.',
            },
            {
              prop: 'secondary',
              type: 'ReactNode',
              description: 'kind="entity"/"avatar": the muted second line under the label (a code, an email, a role).',
            },
            {
              prop: 'icon',
              type: 'ReactNode',
              description: 'kind="icon-value": the decorative leading glyph (rendered at 14px, aria-hidden).',
            },
            {
              prop: 'iconLabel',
              type: 'string',
              description:
                'kind="icon-value": what the glyph MEANS ("Address", "Due date") — prefixed to the value in the accessibility tree only. Without it the glyph is silent to a screen reader.',
            },
            {
              prop: 'metrics',
              type: 'TableCellMetric[]',
              description:
                'kind="metrics": { id, icon?, value?, label?, tone? } per metric. `tone` colours the GLYPH only (neutral | success | warning | danger | info); `label` is both the hover tooltip and the screen-reader name, so a strip of numbers is never unlabelled.',
            },
            { prop: 'start / end', type: 'ReactNode', description: 'kind="start-end-time": two stacked timestamp lines.' },
            { prop: 'tabs', type: 'TableCellTabAction[]', description: 'kind="tab-actions": { id, label, isActive?, onClick?, isDisabled? } list.' },
            {
              prop: 'align',
              type: "'start' | 'center' | 'end'",
              default: "'start' ('end' for kind=\"actions\")",
              description: 'Horizontal alignment of the cell content.',
            },
            { prop: '…props', type: 'HTMLAttributes<HTMLDivElement>', description: 'className and any div attribute pass through.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use inside DataTable column.render — TableCell renders cell content, not the <td>.',
            'Pick gauge vs progress by layout (ring vs bar), not by business meaning.',
            'Map your own status string to the closed tone/variant enum before calling.',
            'Reach for badges (plural) when a cell needs more than one tag.',
          ]}
          donts={[
            "Don't hand-roll a status pill or icon-button row — check the kind vocabulary first.",
            "Don't pass a raw hex through style — every kind resolves color via tokens.",
            "Don't invent a new kind for a one-off screen; compose existing primitives directly instead.",
            "Don't rely on kind=\"actions\" default align for non-trailing content — set align explicitly.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Each kind delegates to its underlying primitive for keyboard support and ARIA — checkbox/toggle expose native roles via Checkbox/Switch.',
            'actions requires a label per action, used as both aria-label and the native title tooltip.',
            'checkbox/toggle require ariaLabel since the cell rarely has a visible <label>.',
            'entity/icon-value/metrics keep their media and glyphs aria-hidden and carry the meaning in text instead: icon-value takes iconLabel ("Address: …"), and every metrics entry takes a label that becomes both its hover tooltip and its screen-reader name — a bare count is meaningless read aloud.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

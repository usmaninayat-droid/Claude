import { useState } from 'react'
import { Button } from '@fams/ui-kit'
import { EntityProfileShell, type EntityProfileRecord } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/**
 * EntityProfileShellDemo — standalone showcase for the v5-templates tier's
 * second exemplar. DRAFT — for design-team review, not yet wired into nav.ts
 * or the shared showcase registry (orchestrator serializes that centrally).
 *
 * Demonstrates the whole point of the pattern: `EntityProfileShell` owns the
 * pinned-tab strip, the drawer chrome, and the per-record section tabs; THIS
 * demo — not the shell — owns the "which records are open" array and the
 * active record. A real app would back that with a page-level "open records"
 * store or a data hook; the shell's contract is identical either way.
 */

const INITIAL_RECORDS: EntityProfileRecord[] = [
  {
    id: 'vehicle-1',
    title: 'Truck AUH-4021',
    subtitle: 'Lot 1 · Lavajet',
    status: { label: 'On route', tone: 'success' },
    tabs: [
      {
        id: 'overview',
        label: 'Overview',
        content: (
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-body-sm">
            <div>
              <dt className="text-muted-foreground">Odometer</dt>
              <dd className="font-medium">84,210 km</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Driver</dt>
              <dd className="font-medium">Sara Ahmed</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fuel</dt>
              <dd className="font-medium">62%</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Last ping</dt>
              <dd className="font-medium">2 min ago</dd>
            </div>
          </dl>
        ),
      },
      { id: 'trips', label: 'Trips', content: <p className="text-body-sm">12 trips completed today.</p> },
      { id: 'events', label: 'Events', content: <p className="text-body-sm">No open events.</p> },
    ],
  },
  {
    id: 'driver-1',
    title: 'Sara Ahmed',
    subtitle: 'Driver · Northern district',
    status: { label: 'On break', tone: 'warning' },
    tabs: [
      { id: 'overview', label: 'Overview', content: <p className="text-body-sm">Shift 06:00–14:00 · Lot 1.</p> },
      { id: 'scorecard', label: 'Scorecard', content: <p className="text-body-sm">Safety score 92 / 100.</p> },
    ],
  },
  {
    id: 'bin-1',
    title: 'Bin RFID-77104',
    subtitle: 'Al Ain · General waste',
    status: { label: 'Overflow', tone: 'destructive' },
    tabs: [
      { id: 'overview', label: 'Overview', content: <p className="text-body-sm">Fill level 96% · last emptied 3 days ago.</p> },
      { id: 'history', label: 'History', content: <p className="text-body-sm">14 collections this month.</p> },
    ],
  },
]

export default function EntityProfileShellDemo() {
  const [open, setOpen] = useState(false)
  const [records, setRecords] = useState<EntityProfileRecord[]>(INITIAL_RECORDS)
  const [activeRecordId, setActiveRecordId] = useState('vehicle-1')
  const [log, setLog] = useState<string[]>([])

  const pushLog = (line: string) => setLog((l) => [line, ...l].slice(0, 4))

  const resetAndOpen = () => {
    setRecords(INITIAL_RECORDS)
    setActiveRecordId('vehicle-1')
    setLog([])
    setOpen(true)
  }

  const handleCloseRecord = (id: string) => {
    const remaining = records.filter((r) => r.id !== id)
    setRecords(remaining)
    // The app — not the shell — picks the next active record and decides when
    // closing the last record should close the whole drawer.
    if (activeRecordId === id) {
      if (remaining.length === 0) {
        setOpen(false)
      } else {
        setActiveRecordId(remaining[0].id)
      }
    }
    pushLog(`onCloseRecord("${id}") → app removed it and re-picked activeRecordId`)
  }

  return (
    <DocPage
      title="EntityProfileShell"
      badge="wip"
      summary="Draft exemplar for design-team review — the v5-signature multi-tab pinned profile drawer. Holds several entity records open at once, browser-tab style, each with its own section tabs. Presentational: the shell never opens, closes, reorders, or fetches records — that's the app's job."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Open the drawer, switch between pinned records via the tab strip (arrow keys move focus,
          Enter activates), and close one with its <Code>✕</Code> or the <Code>Delete</Code> key.
          Each record remembers its own last-viewed section. Every open/close/activate below is
          logged from this demo's callbacks — <Code>EntityProfileShell</Code> itself holds no state
          about which records are open.
        </Prose>
        <div className="flex flex-col gap-3">
          <Button onClick={resetAndOpen} className="self-start">
            Open profile drawer
          </Button>
          <EntityProfileShell
            open={open}
            onOpenChange={setOpen}
            records={records}
            activeRecordId={activeRecordId}
            onActivateRecord={(id) => {
              setActiveRecordId(id)
              pushLog(`onActivateRecord("${id}")`)
            }}
            onCloseRecord={handleCloseRecord}
            onTabChange={(tabId) => pushLog(`onTabChange("${tabId}")`)}
          />
        </div>
        {log.length > 0 ? (
          <DevNote title="Callback log (most recent first)">
            <ul className="flex flex-col gap-1 font-mono text-caption">
              {log.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </DevNote>
        ) : null}
      </DocSection>

      <DocSection id="boundary" title="The DS/app boundary this exemplar demonstrates">
        <Prose>
          <Code>EntityProfileShell</Code> owns the pinned-tab strip, the drawer chrome (overlay,
          focus trap, Esc, RTL-correct slide), and each record's OWN section tabs. It never fetches
          a record, never decides which records are open, and never picks the next active tab when
          one closes. That state — the "open records" array and the active record — lives in the
          app, here faked with <Code>useState</Code>. Swap it for a page-level store or data hook
          and the shell's contract doesn't change.
        </Prose>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'open', type: 'boolean', required: true, description: 'Controlled drawer visibility.' },
            {
              prop: 'onOpenChange',
              type: '(open: boolean) => void',
              required: true,
              description: 'Fires on overlay/Esc close. The app owns the open state.',
            },
            {
              prop: 'records',
              type: 'EntityProfileRecord[]',
              required: true,
              description: 'The open/pinned records, rendered as closeable tabs in this exact order.',
            },
            {
              prop: 'activeRecordId',
              type: 'string',
              required: true,
              description: 'Which record shows in the body. Should match a records[].id.',
            },
            {
              prop: 'onActivateRecord',
              type: '(id: string) => void',
              required: true,
              description: 'Fires when a pinned tab is clicked or activated via Enter/Space.',
            },
            {
              prop: 'onCloseRecord',
              type: '(id: string) => void',
              required: true,
              description:
                'Fires from the ✕ or the Delete key. The app removes it from `records` and picks the next active record.',
            },
            {
              prop: 'activeTabId / onTabChange',
              type: 'string / (id) => void',
              description:
                "Controlled section tab for the active record. Omit activeTabId to let the shell remember each record's last section.",
            },
            {
              prop: 'width',
              type: "'md' | 'lg' | 'xl'",
              default: "'lg'",
              description: 'Panel width preset — wider than a single-record DetailSheet.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Own the "open records" array in a page-level store or data hook; pass it straight through as `records`.',
            'Decide the next `activeRecordId` in onCloseRecord — the neighboring tab is the usual choice.',
            "Keep each record's section content swappable — the shell treats every tab body as an opaque slot.",
          ]}
          donts={[
            "Don't expect the shell to fetch a record or persist which tabs are open — that's the app's job.",
            'Don\'t rebuild this from the core Tabs primitive — its trigger is a <button> and can\'t hold a close control (see this file\'s source).',
            "Don't encode rules like \"closing the last record closes the drawer\" in the shell — the app decides that in onCloseRecord.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The pinned strip is a WAI-ARIA tablist of single role="tab" elements — arrow keys move focus (roving tabindex), Enter/Space activates (manual activation, since swapping the profile body is expensive).',
            'Close is dual-path: Delete/Backspace on the focused tab (aria-keyshortcuts="Delete") and clicking the decorative ✕ — which is aria-hidden and non-focusable, so the tablist stays free of nested-interactive / aria-required-children violations.',
            'Drawer chrome (overlay, focus trap, Esc-to-close) is inherited from core Sheet; the record body uses core Tabs for full keyboard + SR support.',
            'RTL-safe: every layout class is logical (ps/pe, border-e) — no physical-direction utilities; verified with a dir="rtl" render test.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

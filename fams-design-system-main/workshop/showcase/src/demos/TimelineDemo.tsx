import { AlertTriangle, CheckCircle2, FilePlus2, Info, PencilLine, Trash2 } from '@fams/ui-kit/icons'
import { Timeline, type TimelineItem } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const AUDIT_TRAIL: TimelineItem[] = [
  {
    id: '1',
    title: 'Contract CNT-1042 created',
    subtitle: 'Kashish Bindrani',
    timestamp: '09:12',
    tone: 'success',
    icon: <FilePlus2 />,
  },
  {
    id: '2',
    title: 'Compliance status updated',
    subtitle: 'auto — nightly sync',
    timestamp: '09:41',
    tone: 'info',
    icon: <Info />,
  },
  {
    id: '3',
    title: 'Field "sector" changed',
    subtitle: 'Emmad Ahmad — Lot 1 → Lot 2',
    timestamp: '11:03',
    tone: 'neutral',
    icon: <PencilLine />,
  },
  {
    id: '4',
    title: 'SLA breach flagged',
    subtitle: 'collection window missed',
    timestamp: '13:27',
    tone: 'warning',
    icon: <AlertTriangle />,
  },
  {
    id: '5',
    title: 'Contract rejected',
    subtitle: 'Saed Salah — compliance breach',
    timestamp: '15:58',
    tone: 'danger',
    icon: <Trash2 />,
  },
]

const MINIMAL: TimelineItem[] = [
  { id: '1', title: 'Ticket opened' },
  { id: '2', title: 'Assigned to inspector' },
  { id: '3', title: 'Resolved', tone: 'success', icon: <CheckCircle2 /> },
]

/**
 * TimelineDemo — vertical activity/audit feed. Consolidates the v5
 * q-timeline audit-trail pattern (shared across 8 entity audit-trail
 * wrappers) and the hand-rolled ActivityLogCard feed, which used a literal
 * border-left-color hex per entry. tone replaces both with a closed enum
 * resolved through IconBadge's token map.
 */
export default function TimelineDemo() {
  return (
    <DocPage
      title="Timeline"
      badge="stable"
      summary="Vertical activity/audit feed — a connector line through a sequence of tinted-icon nodes. Consolidates the v5 q-timeline audit-trail pattern (shared across 8 entity audit-trail wrappers) and the hand-rolled ActivityLogCard feed, which used a literal border-left-color hex per entry. tone replaces both with a closed enum resolved through IconBadge's token map."
    >
      <DocSection id="examples" title="Examples">
        <Prose>
          <Code>tone</Code> is <Code>neutral | info | success | warning | danger</Code>, each
          token-resolved via <Code>IconBadge</Code>. An item needs only a <Code>title</Code> — the
          node falls back to a plain tinted disc when <Code>icon</Code> is omitted, and{' '}
          <Code>subtitle</Code>/<Code>timestamp</Code> are both optional.
        </Prose>
        <Gallery
          minColRem={20}
          items={[
            { label: 'Audit trail', caption: 'every tone + icon + timestamp', node: <Timeline items={AUDIT_TRAIL} className="w-full max-w-sm" /> },
            { label: 'Minimal', caption: 'no icon, no subtitle, no timestamp', node: <Timeline items={MINIMAL} className="w-full max-w-xs" /> },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'items',
              type: 'TimelineItem[]',
              required: true,
              description: 'Ordered feed entries — { id, title, subtitle?, timestamp?, icon?, tone? }.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLOListElement>',
              description: 'className and any ordered-list attribute pass through.',
            },
          ]}
        />
        <Prose>
          <Code>TimelineItem.tone</Code> is <Code>'neutral' | 'info' | 'success' | 'warning' |
          'danger'</Code>, defaulting to <Code>'neutral'</Code> — resolved to tokens via{' '}
          <Code>IconBadge</Code>, never a raw color.
        </Prose>
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Map action types to tone once (add=success, update=info, remove=danger) and reuse it.',
            'Omit icon for low-signal entries — the plain tinted disc is a valid, lighter state.',
            'Keep title short; put the actor/detail in subtitle.',
            'Let the caller own pagination/"load more" — Timeline only renders what it is given.',
          ]}
          donts={[
            "Don't pass a raw hex or border-left-color — tone is the only color input.",
            "Don't use Timeline for a horizontal stepper — see Stepper for that shape.",
            "Don't overload subtitle with multiple facts; add a second item instead.",
            "Don't rely on tone alone to convey meaning — pair it with a clear title.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a semantic <ol> — the feed is announced as an ordered list by assistive tech.',
            'The connector line and tinted disc are decorative (aria-hidden); title/subtitle/timestamp text carries all meaning.',
            'Meets WCAG 2.2 AA contrast in every tone via the shared IconBadge token map.',
            'The connector + node column is plain flex-row, so it mirrors correctly under RTL (switch the header language) with no per-item overrides.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

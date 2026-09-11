import { ActivityFeed, type ActivityFeedEntry, type ActivityFeedTone } from '../../../../packages/ui-kit/src/composites/ActivityFeed'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

const MIXED_ENTRIES: ActivityFeedEntry[] = [
  {
    id: '1',
    kind: 'system',
    author: 'Kashish Bindrani',
    text: 'created contract CNT-1042',
    timestamp: '09:12',
    tone: 'success',
    dateGroup: 'Today',
  },
  {
    id: '2',
    kind: 'comment',
    author: 'Emmad Ahmad',
    text: 'Reviewed the ESP lot assignment — looks correct, approving from my side.',
    timestamp: '09:20',
    dateGroup: 'Today',
  },
  {
    id: '3',
    kind: 'system',
    author: 'auto — nightly sync',
    text: 'flagged an SLA breach on collection window',
    timestamp: '13:27',
    tone: 'warning',
    dateGroup: 'Today',
  },
  {
    id: '4',
    kind: 'comment',
    author: 'Saed Salah',
    text: 'Confirmed with Tadweer — this is fine to proceed, attaching the sign-off.',
    timestamp: '14:03',
    dateGroup: 'Today',
    attachments: [{ name: 'sign-off.pdf', size: '184 KB' }],
  },
  {
    id: '5',
    kind: 'system',
    author: 'Saed Salah',
    text: 'moved status to Approved',
    timestamp: '08:45',
    tone: 'info',
    dateGroup: 'Yesterday',
  },
]

const READ_ONLY_ENTRIES: ActivityFeedEntry[] = [
  { id: '1', kind: 'system', text: 'ticket opened', tone: 'neutral', dateGroup: 'Today' },
  {
    id: '2',
    kind: 'comment',
    author: 'Inspector Zayed',
    text: 'Bin B-1042 inspected, no violations found.',
    timestamp: '11:10',
    dateGroup: 'Today',
  },
  { id: '3', kind: 'system', text: 'ticket resolved', tone: 'success', timestamp: '11:12', dateGroup: 'Today' },
]

const TONES: ActivityFeedTone[] = ['neutral', 'info', 'success', 'warning', 'danger']

export default function ActivityFeedDemo() {
  return (
    <DocPage
      title="ActivityFeed"
      badge="stable"
      summary="Interleaved system events + user comments, grouped by day, with an optional composer. Consolidates the v5 PipelineTimeline.vue + CommentInput.vue pattern (task detail audit log + comment thread) into one state-agnostic presenter — tone resolves to status tokens only, never a raw hex."
    >
      <DocSection id="feed-types" title="Feed types">
        <Prose>
          Omit <Code>onSubmit</Code> to render a read-only feed — e.g. a closed ticket's history. An
          empty <Code>entries</Code> array falls back to <Code>emptyLabel</Code> instead of a blank area.
        </Prose>
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Mixed feed with composer',
              caption: 'system entries + comments, day-grouped',
              node: (
                <ActivityFeed
                  entries={MIXED_ENTRIES}
                  onSubmit={(text) => {
                    // eslint-disable-next-line no-console -- showcase-only demo affordance.
                    console.log('ActivityFeed submit:', text)
                  }}
                  className="w-full"
                />
              ),
            },
            {
              label: 'Read-only',
              caption: 'no onSubmit — no composer',
              node: <ActivityFeed entries={READ_ONLY_ENTRIES} className="w-full" />,
            },
            {
              label: 'Empty state',
              caption: 'no entries, no composer',
              node: <ActivityFeed entries={[]} className="w-full" />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="system-tones" title="System event tones">
        <Prose>
          <Code>tone</Code> on a <Code>system</Code> entry resolves to the closed status-token set —
          <Code>neutral</Code>, <Code>info</Code>, <Code>success</Code>, <Code>warning</Code>,{' '}
          <Code>danger</Code> — rendered as a leading tone dot.
        </Prose>
        <Gallery
          minColRem={14}
          items={TONES.map((tone) => ({
            label: tone,
            node: (
              <ActivityFeed
                entries={[{ id: tone, kind: 'system', text: `example ${tone} event`, tone }]}
                className="w-full"
              />
            ),
          }))}
        />
      </DocSection>

      <DocSection id="entry-kinds" title="Entry kinds">
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'system',
              caption: 'tone-dot + inline text',
              node: (
                <ActivityFeed
                  entries={[{ id: '1', kind: 'system', text: 'moved status to Approved', tone: 'info' }]}
                  className="w-full"
                />
              ),
            },
            {
              label: 'comment',
              caption: 'avatar + bubble',
              node: (
                <ActivityFeed
                  entries={[
                    { id: '1', kind: 'comment', author: 'Kashish Bindrani', text: 'Looks good to me.', timestamp: '08:51' },
                  ]}
                  className="w-full"
                />
              ),
            },
            {
              label: 'comment + attachment',
              caption: 'attachment chip below the bubble',
              node: (
                <ActivityFeed
                  entries={[
                    {
                      id: '1',
                      kind: 'comment',
                      author: 'Saed Salah',
                      text: 'Attaching the sign-off.',
                      timestamp: '14:03',
                      attachments: [{ name: 'sign-off.pdf', size: '184 KB' }],
                    },
                  ]}
                  className="w-full"
                />
              ),
            },
            {
              label: 'system actor',
              caption: 'fix7: author = { kind: "system", label } — a rule automation, never a person',
              node: (
                <ActivityFeed
                  entries={[
                    {
                      id: '1',
                      kind: 'system',
                      author: { kind: 'system', label: 'Automation' },
                      text: 'created this job order',
                      tone: 'info',
                      timestamp: 'Just now',
                    },
                  ]}
                  className="w-full"
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
              prop: 'entries',
              type: 'ActivityFeedEntry[]',
              required: true,
              description:
                'Feed items to render, in order. Each entry is { id, kind: "system" | "comment", author?: string | { kind: "system", label }, avatar?, text, timestamp?, tone?, attachments?, dateGroup? }. A system actor (fix7) renders a lightning-bolt glyph instead of a tone dot / person avatar.',
            },
            {
              prop: 'onSubmit',
              type: '(text: string) => void',
              description: 'Fired when the composer is submitted (Enter, no Shift). Omit to render a read-only feed with no composer.',
            },
            {
              prop: 'placeholder',
              type: 'string',
              default: "'Write a comment…'",
              description: 'Composer textarea placeholder and aria-label.',
            },
            {
              prop: 'emptyLabel',
              type: 'string',
              default: "'No activity yet.'",
              description: 'Shown in place of the list when entries is empty.',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLDivElement>, 'onSubmit'>",
              description: 'className and any other div attribute pass through to the root element.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Set dateGroup on every entry when the feed spans more than one day — the separator only appears on a value change.',
            'Use tone on system entries to flag SLA breaches or approvals at a glance.',
            'Omit onSubmit for closed/historical records — a read-only feed communicates that at a glance.',
            'Keep system entry text terse — it reads inline next to the author name and timestamp.',
            'Attribute an automated write to author: { kind: "system", label: "…" } instead of borrowing a human display name — a system actor must read as the system.',
          ]}
          donts={[
            "Don't fetch, persist, or reorder entries inside the component — it renders exactly what it's given.",
            "Don't use ActivityFeed for a flat notification list — that's NotificationCard.",
            "Don't put long-form content in a comment bubble; link out to the full record instead.",
            "Don't rely on tone colour alone — pair it with the entry text for colour-blind-safe status.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Entries render as an ordered list (<ol>/<li>), preserving reading order for assistive tech.',
            'The composer textarea carries an aria-label matching its placeholder; Enter submits, Shift+Enter inserts a newline.',
            'The send button is disabled (and non-interactive) until the draft has non-whitespace content.',
            'Tone dots and attachment icons are aria-hidden — the entry text is always the accessible content.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

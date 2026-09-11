import { useState } from 'react'
import {
  NotificationCard,
  type NotificationMetaChip,
} from '../../../../packages/ui-kit/src/composites/NotificationCard'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * Standalone showcase demo for NotificationCard — not wired into nav.ts or
 * any shared showcase page yet (orchestrator serializes that). Belongs under
 * the "Data & Composites" section (`showcase/Data.tsx`), next to Alert/Timeline.
 */

const SEVERITIES = ['info', 'success', 'warning', 'error'] as const

const META: NotificationMetaChip[] = [
  { label: 'FM-882' },
  { label: 'Critical', tone: 'error' },
  { label: 'Today', tone: 'warning' },
]

type NotificationCardControls = {
  severity: 'none' | (typeof SEVERITIES)[number]
  unread: boolean
  avatar: boolean
  source: boolean
}

export default function NotificationCardDemo() {
  const [clicked, setClicked] = useState(0)

  return (
    <DocPage
      title="NotificationCard"
      badge="beta"
      summary="One notification in a feed, drawer, or dropdown list. Merges the reference design system's plain list-row variant and its Figma bell+chips variant into one self-contained card — severity is a small dot, unread drives tint + weight + a dot (backed by an sr-only label), and the optional meta-chip row folds in the Figma variant's tagging."
    >
      <DocSection id="playground" title="Playground">
        <Playground<NotificationCardControls>
          controls={[
            { name: 'severity', type: 'select', default: 'none', options: ['none', ...SEVERITIES] },
            { name: 'unread', type: 'boolean', default: true },
            { name: 'avatar', type: 'boolean', default: false },
            { name: 'source', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <div className="w-full max-w-md">
              <NotificationCard
                title="Plan approved"
                description="Lot 1 collection plan approved by Admin."
                timestamp="2h ago"
                severity={v.severity === 'none' ? undefined : v.severity}
                unread={v.unread}
                avatarName={v.avatar ? 'Kashish Bindrani' : undefined}
                source={v.source ? 'CCMS' : undefined}
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="read-state" title="Read vs. unread">
        <Prose>
          <Code>unread</Code> renders a bold title, a tinted surface, and a small dot beside the
          timestamp — never colour alone; an sr-only "Unread" label backs it for assistive tech.
        </Prose>
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Unread',
              node: (
                <NotificationCard
                  title="Plan approved"
                  description="Lot 1 collection plan approved by Admin."
                  timestamp="2h ago"
                  unread
                />
              ),
            },
            {
              label: 'Read',
              node: (
                <NotificationCard
                  title="Driver checklist submitted"
                  description="Vehicle AUH-4471 — pre-trip checklist complete."
                  timestamp="Yesterday"
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="severity" title="Severity">
        <Prose>
          <Code>severity</Code> renders a small leading dot only — <Code>info</Code>,{' '}
          <Code>success</Code>, <Code>warning</Code>, <Code>error</Code>.
        </Prose>
        <Gallery
          minColRem={22}
          items={[
            { label: 'info', node: <NotificationCard title="Heads up" severity="info" timestamp="1h ago" /> },
            {
              label: 'success',
              node: <NotificationCard title="Plan published" severity="success" timestamp="2h ago" />,
            },
            {
              label: 'warning',
              node: <NotificationCard title="GPS signal weak" severity="warning" timestamp="4h ago" />,
            },
            { label: 'error', node: <NotificationCard title="Sync failed" severity="error" timestamp="6h ago" /> },
          ]}
        />
      </DocSection>

      <DocSection id="avatar-source-meta" title="Avatar, source & meta">
        <Prose>
          <Code>avatarName</Code>/<Code>avatarSrc</Code> render the leading Avatar; <Code>source</Code>{' '}
          is a single badge naming where it came from; <Code>meta</Code> folds in the Figma variant's
          tagged-chip row (ticket key, priority, module…).
        </Prose>
        <Gallery
          minColRem={26}
          maxCols={2}
          items={[
            {
              label: 'With avatar',
              node: (
                <NotificationCard
                  title="Kashish Bindrani commented"
                  description={'"Can we confirm the ESP lot before Thursday?"'}
                  timestamp="10m ago"
                  avatarName="Kashish Bindrani"
                  unread
                />
              ),
            },
            {
              label: 'Source + meta chips',
              node: (
                <NotificationCard
                  title="Overspeeding alert"
                  description="Vehicle AUH-2210 exceeded 90 km/h on Route 12."
                  timestamp="just now"
                  source="CCMS"
                  meta={META}
                  unread
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="actions-interaction" title="Actions & interaction">
        <Prose>
          <Code>actions</Code> renders below <Code>meta</Code> — the caller wires the handlers.{' '}
          <Code>onClick</Code> makes the whole card a keyboard-operable button.
        </Prose>
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Actions',
              node: (
                <NotificationCard
                  title="AMC contract pending"
                  description="Tadweer confirmation still required."
                  timestamp="3d ago"
                  actions={
                    <>
                      <button className="rounded-sm border border-border px-2.5 py-1 text-body-xs font-medium text-foreground hover:bg-muted/40">
                        Snooze
                      </button>
                      <button className="rounded-sm bg-primary px-2.5 py-1 text-body-xs font-medium text-primary-foreground hover:bg-primary/90">
                        Review
                      </button>
                    </>
                  }
                />
              ),
            },
            {
              label: 'Clickable',
              caption: `clicked ${clicked}×`,
              node: (
                <NotificationCard
                  title="Inspection scheduled"
                  description="Bin B-1042 — tap to open the inspection record."
                  timestamp="30m ago"
                  onClick={() => setClicked((n) => n + 1)}
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'title', type: 'ReactNode', required: true, description: 'Primary line.' },
            { prop: 'description', type: 'ReactNode', description: 'Secondary line below the title.' },
            {
              prop: 'timestamp',
              type: 'ReactNode',
              description:
                'Pre-formatted by the caller (e.g. "2h ago", "Jun 3, 14:05") — no relative-time computation happens inside.',
            },
            {
              prop: 'severity',
              type: "'info' | 'success' | 'warning' | 'error'",
              description: 'Renders a small leading status dot only — no icon swap.',
            },
            {
              prop: 'unread',
              type: 'boolean',
              default: 'false',
              description:
                'Bold title, tinted surface, and a small dot beside the timestamp. Backed by an sr-only "Unread" label.',
            },
            {
              prop: 'avatarSrc',
              type: 'string',
              description: 'Leading Avatar image source. Omit both avatarSrc and avatarName for no avatar.',
            },
            {
              prop: 'avatarName',
              type: 'string',
              description: 'Leading Avatar display name — also derives the initials fallback.',
            },
            {
              prop: 'source',
              type: 'ReactNode',
              description: 'Single badge identifying where the notification came from (module, sender).',
            },
            {
              prop: 'meta',
              type: 'NotificationMetaChip[]',
              description: 'Optional row of tagged chips (ticket key, priority, module…), rendered next to source.',
            },
            { prop: 'actions', type: 'ReactNode', description: 'Buttons/links rendered below meta.' },
            {
              prop: 'onClick',
              type: '() => void',
              description: 'Makes the whole card a keyboard-operable button (role="button", Enter/Space).',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLDivElement>, 'title' | 'onClick'>",
              description: 'Native div attributes (className, etc.) pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Pass a pre-formatted timestamp — the component never computes relative time itself.',
            'Use meta for ticket keys/priority tags, and source for the single originating module badge.',
            'Wire onClick when the card should open a detail view; keep actions for inline choices instead.',
            'Let the caller’s Stack supply spacing between cards — the card owns only its own border.',
          ]}
          donts={[
            'Don’t rely on severity colour alone — pair it with a clear title.',
            'Don’t mix onClick and actions with overlapping click targets without stopping propagation.',
            'Don’t persist read/unread state inside the component — it is fully caller-controlled.',
            'Don’t use a bell-icon severity swap — severity is a dot, not an icon change.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'unread is backed by an sr-only "Unread." label — never conveyed by tint or weight alone.',
            'The severity dot is decorative; the title and description carry the meaning for assistive tech.',
            'When onClick is set, the card gets role="button", tabIndex={0}, and responds to Enter/Space, not just pointer clicks.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

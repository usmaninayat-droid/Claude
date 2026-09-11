import { useState } from 'react'
import { ShieldAlert } from '@fams/ui-kit/icons'
import { Alert, type AlertSeverity } from '../../../../packages/ui-kit/src/composites/Alert'
import { Button } from '../../../../packages/ui-kit/src/primitives/Button'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

const SEVERITIES: AlertSeverity[] = ['info', 'success', 'warning', 'error']

type AlertControls = {
  severity: AlertSeverity
  title: string
  description: string
  dismissible: boolean
}

function DismissibleDemo() {
  const [visible, setVisible] = useState(true)
  if (!visible) {
    return (
      <Button variant="tertiary" size="sm" onClick={() => setVisible(true)}>
        Restore alert
      </Button>
    )
  }
  return (
    <Alert
      severity="warning"
      title="AMC contract pending"
      description="Tadweer confirmation still required — hardware reliability risk unmanaged until signed."
      onDismiss={() => setVisible(false)}
      className="w-full"
    />
  )
}

export default function AlertDemo() {
  return (
    <DocPage
      title="Alert"
      badge="stable"
      summary="Inline severity banner surfaced at the top of a section, form, or panel. Consolidates ad-hoc q-banner strips hand-rolled per screen with different Quasar color classes (iwmp/components/tabs/panels/asset/vehicle/AssetOverview.vue, WorkforceActivity.vue, WorkforceInspectorDetails.vue) — none of which shared the same title/actions/dismiss combination."
    >
      <DocSection id="playground" title="Playground">
        <Playground<AlertControls>
          controls={[
            { name: 'severity', type: 'select', default: 'warning', options: SEVERITIES },
            { name: 'title', type: 'text', default: 'GPS signal weak' },
            { name: 'description', type: 'text', default: 'Vehicle AUH-4471 last reported 22 minutes ago.' },
            { name: 'dismissible', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <Alert
              severity={v.severity}
              title={v.title}
              description={v.description}
              onDismiss={v.dismissible ? () => {} : undefined}
              className="w-full max-w-lg"
            />
          )}
        </Playground>
      </DocSection>

      <DocSection id="severities" title="Severities">
        <Prose>
          <Code>severity</Code> drives the default icon and tint — <Code>info</Code>,{' '}
          <Code>success</Code>, <Code>warning</Code>, <Code>error</Code> — resolved through semantic
          tokens only, never a raw hex.
        </Prose>
        <Gallery
          minColRem={20}
          items={SEVERITIES.map((severity) => ({
            label: severity,
            node: (
              <Alert
                severity={severity}
                title={severity === 'error' ? 'Sync failed' : 'Plan published'}
                description={
                  severity === 'error'
                    ? 'Could not reach the Oracle GRN endpoint.'
                    : 'Collection plan for Lot 1 is now live.'
                }
                className="w-full"
              />
            ),
          }))}
        />
      </DocSection>

      <DocSection id="options" title="Options">
        <Gallery
          minColRem={20}
          items={[
            {
              label: 'Without a title',
              caption: 'description (or children) stands alone',
              node: (
                <Alert severity="info" className="w-full">
                  Contract compliance data refreshes every 15 minutes.
                </Alert>
              ),
            },
            {
              label: 'Custom icon',
              caption: 'icon overrides the severity default',
              node: (
                <Alert
                  severity="error"
                  icon={<ShieldAlert className="size-5" />}
                  title="Compliance breach"
                  description="Contract CNT-1042 flagged for review by Saed Salah."
                  className="w-full"
                />
              ),
            },
            {
              label: 'With actions',
              caption: 'buttons row below the description',
              node: (
                <Alert
                  severity="warning"
                  title="Shift timing conflict"
                  description="This shift spans midnight (20:00–02:00) — review before publishing."
                  actions={
                    <>
                      <Button size="sm" variant="secondary">
                        Dismiss
                      </Button>
                      <Button size="sm">Review shift</Button>
                    </>
                  }
                  className="w-full"
                />
              ),
            },
            {
              label: 'Dismissible',
              caption: 'onDismiss renders a trailing close button',
              node: <DismissibleDemo />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'severity',
              type: "'info' | 'success' | 'warning' | 'error'",
              default: "'info'",
              description: 'Drives the default icon and tint.',
            },
            {
              prop: 'title',
              type: 'ReactNode',
              description: 'Optional heading, rendered bold above the description.',
            },
            {
              prop: 'description',
              type: 'ReactNode',
              description: 'Body copy. children is used as a fallback description slot when description is omitted.',
            },
            {
              prop: 'icon',
              type: 'ReactNode',
              description: 'Leading icon element, overriding the severity default. Pass null to omit it entirely.',
            },
            {
              prop: 'actions',
              type: 'ReactNode',
              description: 'Buttons/links rendered below the description.',
            },
            {
              prop: 'onDismiss',
              type: '() => void',
              description: 'Shows a trailing dismiss (×) button when provided. The alert is state-agnostic — the caller owns visibility.',
            },
            {
              prop: 'dismissLabel',
              type: 'string',
              default: "'Dismiss'",
              description: 'Accessible label for the dismiss button.',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLDivElement>, 'title'>",
              description: 'className and any other div attribute (including role override) pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use error/warning for conditions that need attention, info/success for situational updates.',
            'Keep title to a few words and put the specifics in description.',
            'Pair actions with the alert that caused them — e.g. "Review shift" next to a scheduling conflict.',
            'Let the caller own dismiss state; only pass onDismiss when the alert should be dismissible.',
          ]}
          donts={[
            "Don't use Alert for form field errors — use the field's own validation message.",
            "Don't stack more than one or two alerts in the same view; it becomes noise.",
            "Don't hardcode a colour — severity already carries the token.",
            "Don't bury a destructive consequence in description text; use actions with a clear destructive button instead.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'role is "alert" for warning/error (assertive) and "status" for info/success (polite), matching the severity\'s urgency.',
            'The dismiss button has an accessible name via dismissLabel (default "Dismiss").',
            'Meets WCAG 2.2 AA contrast in every severity across all tenants — never relies on colour alone, the title/description text always carries the meaning.',
            'Focus is not moved automatically on mount; the caller decides whether an alert warrants moving focus to it.',
            'The dismiss button uses logical spacing (-me-1/-mt-1), so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

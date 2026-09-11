import { NoPermission, Button } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * NoPermissionDemo — standalone showcase for the NoPermission composite.
 * Belongs under the "Data states" showcase page (`showcase/DataStates.tsx`) once wired by the orchestrator.
 */
export default function NoPermissionDemo() {
  return (
    <DocPage
      title="NoPermission"
      badge="stable"
      summary="Wraps a single control that should stay VISIBLE but disabled, with a tooltip explaining why. For gating a whole tab/page instead of one control, use StatusView(kind='no-permission') — that full-page placeholder used to be this component's block variant."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          The gated control stays visible and inert; the reason surfaces in a <Code>Tooltip</Code>{' '}
          on hover or keyboard focus.
        </Prose>
        <div className="flex items-center justify-center rounded-md border border-border p-6">
          <NoPermission reason="Requires the Admin role">
            <Button disabled>Delete contract</Button>
          </NoPermission>
        </div>
      </DocSection>

      <DocSection id="custom-reason" title="Custom reason">
        <Prose>
          <Code>reason</Code> always overrides the default — name the specific role or system
          that's gating the control.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'TESS access only',
              node: (
                <div className="flex items-center justify-center rounded-md border border-border p-6">
                  <NoPermission reason="Contract compliance data is restricted to the TESS role.">
                    <Button disabled>Edit compliance rule</Button>
                  </NoPermission>
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
              prop: 'reason',
              type: 'ReactNode',
              default: "'You don’t have permission to view this.'",
              description: 'Explanation shown in the tooltip on hover/focus.',
            },
            {
              prop: 'children',
              type: 'ReactNode',
              description: 'Required — the control being gated, rendered inert and wrapped in the tooltip trigger.',
            },
            {
              prop: 'className',
              type: 'string',
              description: 'Passed to the wrapper span.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use NoPermission to keep a control discoverable but disabled, with a reason on hover/focus.',
            'Always give a specific reason ("Ask your admin for the Finance role") over the generic default.',
            'Decide inline-vs-StatusView(no-permission) from the app’s manifest-driven privilege check, not ad hoc per screen.',
            'Use StatusView(kind="no-permission") instead when the entire surface, not one control, is inaccessible.',
          ]}
          donts={[
            'Don’t use NoPermission without children — it exists to wrap a gated control.',
            'Don’t hide a control silently instead of using NoPermission — users should know why it’s missing.',
            'Don’t duplicate the reason text in a separate tooltip — NoPermission already supplies one.',
            'Don’t use NoPermission to gate an entire tab/page — that’s StatusView’s job.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Sets aria-disabled="true" on the wrapping span and exposes the reason via a Tooltip, reachable on keyboard focus, not just hover.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

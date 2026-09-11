import { Progress } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

type ProgressControls = {
  value: string
  size: 'sm' | 'md'
}

export default function ProgressDemo() {
  return (
    <DocPage
      title="Progress"
      badge="stable"
      summary="Determinate linear progress bar. Radix Root/Indicator supplies role=progressbar plus aria-valuenow/min/max; the fill is width-based and anchored at the logical start edge, so it grows toward the end in both LTR and RTL with no transform math. Retires ~11 ad-hoc q-linear-progress usages across iwmp/shared chart and card components."
    >
      <DocSection id="playground" title="Playground">
        <Playground<ProgressControls>
          controls={[
            { name: 'value', type: 'text', default: '65' },
            { name: 'size', type: 'select', default: 'md', options: ['sm', 'md'] },
          ]}
        >
          {(v) => (
            <div className="w-full max-w-sm">
              <Progress value={Number(v.value) || 0} size={v.size} aria-label="upload" />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="values" title="Values">
        <Prose>
          <Code>value</Code> 0-100 — empty, partial, complete.
        </Prose>
        <div className="flex w-full max-w-sm flex-col gap-4 rounded-md border border-border bg-card p-6">
          <Progress value={0} aria-label="upload" />
          <Progress value={40} aria-label="upload" />
          <Progress value={100} aria-label="upload" />
        </div>
      </DocSection>

      <DocSection id="sizes" title="Sizes">
        <Gallery
          minColRem={16}
          items={[
            { label: 'sm', node: <div className="w-48"><Progress value={65} size="sm" aria-label="upload" /></div> },
            { label: 'md', caption: 'default', node: <div className="w-48"><Progress value={65} size="md" aria-label="upload" /></div> },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'value',
              type: 'number',
              default: '0',
              description: '0-100. Clamped to range; drives both the fill width and aria-valuenow.',
            },
            {
              prop: 'size',
              type: "'sm' | 'md'",
              default: "'md'",
              description: 'Track height — sm is 1.5, md is 2 (Tailwind spacing units).',
            },
            {
              prop: '…props',
              type: 'ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>',
              description: 'className, aria-label, and every Radix Progress Root attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Always pass an aria-label describing what is progressing (e.g. "upload", "sync").',
            'Use sm inside dense rows (table cells, cards); md for standalone status blocks.',
            'Pair with a numeric label nearby when the exact percentage matters to the user.',
            'Drive value from real progress data — avoid animating a fake indeterminate fill.',
          ]}
          donts={[
            'Don’t hardcode a colour for the fill — bg-primary is the only token, by design.',
            'Don’t use Progress for an unknown-duration wait — there is no indeterminate mode; use a spinner.',
            'Don’t nest interactive controls inside the bar.',
            'Don’t pass a value outside 0-100 expecting it to visually overflow — it clamps.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Radix Root/Indicator supplies role="progressbar" with aria-valuenow/min/max automatically.',
            'aria-label is required on every instance — the bar has no visible text of its own.',
            'Meets WCAG 2.2 AA contrast for the fill against the track in every tenant theme.',
            'Fill is anchored at the logical start edge (start-0), so it mirrors correctly under RTL (switch the header language) with no transform math.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

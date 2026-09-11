import { TimeRemainingChip } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

type TimeRemainingChipControls = {
  overdue: boolean
  label: string
}

/**
 * TimeRemainingChipDemo — the countdown/overdue text indicator. Deliberately
 * NOT a filled pill (unlike PriorityChip/StatusPill) — a clock glyph + text
 * that swaps to the flame tint when overdue.
 */
export default function TimeRemainingChipDemo() {
  return (
    <DocPage
      title="TimeRemainingChip"
      badge="stable"
      summary="Clock icon + text countdown indicator — neutral gray in the normal state, Accent/Flame/Normal text+icon when overdue. This component only renders whatever string it's given; formatting the +/left copy stays the caller's concern."
    >
      <DocSection id="playground" title="Playground">
        <Playground<TimeRemainingChipControls>
          controls={[
            { name: 'overdue', type: 'boolean', default: false },
            { name: 'label', type: 'text', default: '2d 5h left' },
          ]}
        >
          {(v) => <TimeRemainingChip overdue={v.overdue}>{v.label}</TimeRemainingChip>}
        </Playground>
      </DocSection>

      <DocSection id="states" title="States">
        <Prose>
          <Code>overdue</Code> is also the caller's cue to format the string with the spec's leading{' '}
          <Code>+</Code> (e.g. <Code>"+4h"</Code> vs <Code>"2d 5h left"</Code>).
        </Prose>
        <Gallery
          minColRem={9}
          items={[
            { label: 'normal', node: <TimeRemainingChip>2d 5h left</TimeRemainingChip> },
            { label: 'overdue', caption: 'flame tint', node: <TimeRemainingChip overdue>+45m</TimeRemainingChip> },
            {
              label: 'overdue',
              caption: 'longer duration',
              node: <TimeRemainingChip overdue>+3h 24m</TimeRemainingChip>,
            },
            {
              label: 'icon={null}',
              caption: 'terminal state dash',
              node: <TimeRemainingChip icon={null}>–</TimeRemainingChip>,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'overdue',
              type: 'boolean',
              default: 'false',
              description: "Past-due state — swaps text/icon to the Accent/Flame/Normal tint.",
            },
            {
              prop: 'icon',
              type: 'ReactNode | null',
              default: '<Clock />',
              description: 'Leading icon override. Pass null to omit (e.g. a terminal-state dash).',
            },
            { prop: 'children', type: 'ReactNode', description: 'The formatted duration string.' },
            { prop: '…props', type: 'HTMLAttributes<HTMLSpanElement>', description: 'className, and any span attribute pass through.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Format the duration string (including the leading "+" when overdue) before passing it in — the component renders exactly what it is given.',
            'Pair overdue with a visibly different string shape ("+4h") so the state reads even without color.',
          ]}
          donts={[
            "Don't wrap TimeRemainingChip in a filled pill background — it's deliberately a plain colored-text treatment.",
            "Don't rely on color alone to signal overdue — always change the string format too.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a non-interactive <span> with a data-state attribute reflecting normal/overdue.',
            'The clock icon is decorative (aria-hidden); the text string carries the state for assistive tech.',
            'Layout uses logical properties, so it mirrors correctly under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

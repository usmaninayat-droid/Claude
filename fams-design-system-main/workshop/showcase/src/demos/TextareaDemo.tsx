import { Textarea } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

const ROWS_OPTIONS = ['2', '4', '7'] as const

type TextareaControls = {
  label: string
  hint: string
  rows: (typeof ROWS_OPTIONS)[number]
  disabled: boolean
}

export default function TextareaDemo() {
  return (
    <DocPage
      title="Textarea"
      badge="stable"
      summary="Multi-line field mirroring the plain Input styling (bg-input-background, outlined), with an optional label-above, hint and error subtext row. No leading/trailing icon slots — text-only content."
    >
      <DocSection id="playground" title="Playground">
        <Playground<TextareaControls>
          controls={[
            { name: 'label', type: 'text', default: 'Inspection notes' },
            { name: 'hint', type: 'text', default: 'Visible to the compliance team' },
            { name: 'rows', type: 'select', default: '4', options: ROWS_OPTIONS },
            { name: 'disabled', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <div className="w-full max-w-md">
              <Textarea
                label={v.label}
                placeholder="Describe the violation…"
                hint={v.hint}
                rows={Number(v.rows)}
                disabled={v.disabled}
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="sizes" title="Sizes">
        <Prose>
          No dedicated size prop — height is controlled via the native <Code>rows</Code> attribute.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'rows=2',
              node: <Textarea label="Quick note" placeholder="One-liner…" rows={2} />,
            },
            {
              label: 'rows=4',
              caption: 'default',
              node: (
                <Textarea label="Inspection notes" placeholder="Describe the violation…" rows={4} />
              ),
            },
            {
              label: 'rows=7',
              node: (
                <Textarea label="Incident report" placeholder="Full account of the incident…" rows={7} />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="states" title="States">
        <Prose>
          <Code>readOnly</Code> falls back to the native attribute — no dedicated visual treatment
          beyond the browser default.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'default',
              node: <Textarea label="Inspection notes" placeholder="Describe the violation…" rows={3} />,
            },
            {
              label: 'filled',
              node: (
                <Textarea
                  label="Inspection notes"
                  defaultValue="Bin overflowing — missed collection window."
                  rows={3}
                />
              ),
            },
            {
              label: 'error',
              node: (
                <Textarea
                  label="Rejection reason"
                  defaultValue="Bin overflowing — missed collection window."
                  error="Reason must reference a penalty code"
                  rows={3}
                />
              ),
            },
            {
              label: 'disabled',
              node: (
                <Textarea label="Contract terms" defaultValue="Locked for this cycle." disabled rows={3} />
              ),
            },
            {
              label: 'readonly',
              node: (
                <Textarea
                  label="Audit trail"
                  defaultValue="Submitted 2026-06-30 by inspector #114."
                  readOnly
                  rows={3}
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="content" title="Content variations">
        <Prose>Omit label for inline filter panels — same padding/border as the plain Input.</Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'label + hint',
              node: (
                <Textarea
                  label="Inspection notes"
                  placeholder="Describe the violation…"
                  hint="Visible to the compliance team"
                  rows={3}
                />
              ),
            },
            {
              label: 'bare',
              caption: 'no label',
              node: <Textarea placeholder="Add a comment…" rows={2} />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="float-label" title="Floating label (fields spec)">
        <Prose>
          <Code>floatLabel</Code> switches to the Figma V2 field anatomy — label inside the box floating
          up on focus/fill, 160px minimum height, vertical resize, hint/error under the field.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'default',
              node: <Textarea label="Input Label Text" floatLabel required hint="This is a hint text to help user." />,
            },
            {
              label: 'filled',
              node: <Textarea label="Input Label Text" floatLabel required defaultValue="Input/Placeholder Text" hint="This is a hint text to help user." />,
            },
            {
              label: 'error',
              node: <Textarea label="Input Label Text" floatLabel required error="This is a hint text to help user." defaultValue="Input/Placeholder Text" />,
            },
            {
              label: 'disabled',
              node: <Textarea label="Input Label Text" floatLabel required disabled defaultValue="Input/Placeholder Text" hint="This is a hint text to help user." />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'label',
              type: 'string',
              description: 'Optional label rendered above the field via the shared Label component.',
            },
            {
              prop: 'hint',
              type: 'string',
              description: 'Muted helper text below the field. Hidden when error is set.',
            },
            {
              prop: 'error',
              type: 'string',
              description: 'Destructive-tinted message below the field; sets aria-invalid and overrides hint.',
            },
            {
              prop: 'containerClassName',
              type: 'string',
              description: 'Classes for the outer wrapping div (label + textarea + subtext), separate from className.',
            },
            {
              prop: 'rows',
              type: 'number',
              description: 'Native rows attribute — the only way to control visible height; no dedicated size prop.',
            },
            {
              prop: 'disabled',
              type: 'boolean',
              default: 'false',
              description: 'Native disabled state.',
            },
            {
              prop: 'readOnly',
              type: 'boolean',
              default: 'false',
              description: 'Native readonly — no dedicated visual treatment.',
            },
            {
              prop: '…props',
              type: 'TextareaHTMLAttributes<HTMLTextAreaElement>',
              description: 'All native textarea attributes (placeholder, value, defaultValue, onChange, maxLength…) pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use for free-text content longer than a single line — notes, descriptions, reports.',
            'Set rows to the expected content length so the field doesn’t force early scrolling.',
            'Pair error with a specific, actionable message, not a generic "invalid" string.',
            'Omit label only in dense inline filter panels; keep it everywhere else.',
          ]}
          donts={[
            'Don’t use Textarea for single-line values — use Input.',
            'Don’t show both hint and error at once — error replaces hint.',
            'Don’t add a leading/trailing icon — this component has no icon slots.',
            'Don’t hardcode a fixed pixel height via className; use rows instead.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Label is linked to the field via htmlFor/id, generated with useId when no id is passed.',
            'error sets aria-invalid={true} on the textarea for assistive tech.',
            'Renders a native <textarea> — full keyboard support (including Tab out of multi-line content).',
            'Focus-visible ring via the ring token; the border also shifts to destructive when error is set.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          The hint/error subtext is only visually adjacent to the field — it is not wired via{' '}
          <Code>aria-describedby</Code>. If a stricter accessibility requirement comes up, pass{' '}
          <Code>aria-describedby</Code> manually pointing at your own id for that text.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}

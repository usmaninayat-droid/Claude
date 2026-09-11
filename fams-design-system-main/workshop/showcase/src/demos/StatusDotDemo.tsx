import type { ComponentProps } from 'react'
import { StatusDot } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

type StatusDotControls = {
  token: string
  size: string
  shape: 'circle' | 'squircle'
}

const TOKENS = ['muted-foreground', 'primary', 'success-text', 'error-text', 'warning', 'info']

/** A label always rides with the dot — the dot never carries meaning alone. */
function DotLabel({ children, ...dot }: { children: string } & ComponentProps<typeof StatusDot>) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-foreground">
      <StatusDot {...dot} />
      {children}
    </span>
  )
}

/**
 * StatusDotDemo — the tiny colour dot in front of a status/option label.
 * Vocabulary-free by design: it takes a token NAME or a raw runtime colour
 * threaded from blueprint metadata, and never knows a tenant's status list.
 */
export default function StatusDotDemo() {
  return (
    <DocPage
      title="StatusDot"
      badge="stable"
      summary="8px colour dot for status and filter-option rows. Coloured from a semantic token name or a raw runtime colour carried on metadata. Always aria-hidden, always beside a text label."
    >
      <DocSection id="playground" title="Playground">
        <Playground<StatusDotControls>
          controls={[
            { name: 'token', type: 'select', default: 'success-text', options: TOKENS },
            { name: 'size', type: 'select', default: '8', options: ['6', '8', '10', '14', '18'] },
            { name: 'shape', type: 'select', default: 'circle', options: ['circle', 'squircle'] },
          ]}
        >
          {(v) => (
            <DotLabel token={v.token} size={Number(v.size)} shape={v.shape}>
              In Progress
            </DotLabel>
          )}
        </Playground>
      </DocSection>

      <DocSection id="tokens" title="Token colours">
        <Prose>
          Pass <Code>token</Code> — a semantic role token NAME, resolved as{' '}
          <Code>var(--color-&lt;token&gt;)</Code> — so a tenant theme re-colours every dot for free.
          This is the form to reach for whenever the meaning is one the design system already names.
        </Prose>
        <Gallery
          minColRem={10}
          items={TOKENS.map((token) => ({
            label: token,
            node: <DotLabel token={token}>Label</DotLabel>,
          }))}
        />
      </DocSection>

      <DocSection id="runtime-colour" title="Runtime colour from metadata">
        <Prose>
          <Code>color</Code> is the metadata escape hatch: a raw colour string threaded from a
          blueprint's own <Code>statusList[].chipColor ?? .color</Code> at render time — never a hex
          literal written into component source. It wins over <Code>token</Code>. The filter
          dropdown's option row uses the 14px <Code>squircle</Code> flavour.
        </Prose>
        <Gallery
          minColRem={11}
          items={[
            { label: 'color="#7a5af8"', node: <DotLabel color="#7a5af8">On hold</DotLabel> },
            { label: 'color + size 14', node: <DotLabel color="#f79009" size={14}>Overdue</DotLabel> },
            {
              label: 'squircle 14 (filter row)',
              node: (
                <DotLabel color="#12b76a" size={14} shape="squircle">
                  Completed
                </DotLabel>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'color', type: 'string', description: 'Raw runtime colour from metadata. Wins over token.' },
            {
              prop: 'token',
              type: 'string',
              description: "Semantic token name, resolved as var(--color-<token>). Default 'muted-foreground'.",
            },
            { prop: 'size', type: 'number', description: 'Edge length in px. Default 8; the filter option row uses 14.' },
            { prop: 'shape', type: "'circle' | 'squircle'", description: "Round (default) or a 4px-radius square." },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLSpanElement>',
              description: 'className and any span attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Always render a text label next to the dot — the dot is decoration, the label is the meaning.',
            'Prefer a token name; reserve color for genuine per-tenant metadata.',
            'Keep one size per surface — 8px in dense lists, 14px in the filter dropdown rows.',
          ]}
          donts={[
            "Don't encode a status with the dot alone — colour is never the only signal.",
            "Don't hardcode a hex in application code; thread the blueprint's own colour through.",
            "Don't use StatusDot as a bullet or a decorative separator — that's not a status.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The dot is aria-hidden="true" — screen readers announce the sibling label, not a second object.',
            'Carries data-status-dot so a gate can assert every dot has non-empty adjacent text.',
            'Purely presentational: no focus, no role, no interaction.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

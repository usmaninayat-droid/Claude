import { useState } from 'react'
import { FieldError, FieldErrorSlot, Input, Button } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

type FieldErrorControls = {
  message: string
  truncate: boolean
}

export default function FieldErrorDemo() {
  const [serverError, setServerError] = useState<string | null>(null)

  return (
    <DocPage
      title="FieldError"
      badge="stable"
      summary="The design-system-wide field error message row: alert-circle icon + 4px gap + 14px SemiBold error text. One primitive for per-field validation messages and form-level (server) errors — replaces ad-hoc red <p> tags under fields."
    >
      <DocSection id="playground" title="Playground">
        <Playground<FieldErrorControls>
          controls={[
            { name: 'message', type: 'text', default: 'Invalid Email or Password!' },
            { name: 'truncate', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <div className="w-72">
              <FieldError truncate={v.truncate}>{v.message}</FieldError>
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="with-field" title="With a field">
        <Prose>
          The errored field sets <Code>hasError</Code> (border in error.500, floating label in
          error.600) plus <Code>aria-invalid</Code>, and references the message via{' '}
          <Code>aria-describedby</Code>. A shared server error may be referenced by several fields at
          once.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'field-level',
              caption: 'specific message under its own field',
              node: (
                <div className="flex w-72 flex-col gap-1">
                  <Input label="Email" defaultValue="not-an-email" hasError aria-describedby="demo-email-error" />
                  <FieldError id="demo-email-error">Enter a valid email address</FieldError>
                </div>
              ),
            },
            {
              label: 'form-level',
              caption: 'one shared message, both fields errored',
              node: (
                <div className="flex w-72 flex-col gap-4">
                  <Input label="Email" defaultValue="avery@fams.ae" hasError aria-describedby="demo-login-error" />
                  <Input
                    label="Password"
                    type="password"
                    revealable
                    defaultValue="hunter2"
                    hasError
                    aria-describedby="demo-login-error"
                  />
                  <FieldError id="demo-login-error" truncate>
                    Invalid Email or Password!
                  </FieldError>
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="reserved-slot" title="Reserved row slot">
        <Prose>
          Mounting an error row shifts everything below it. When the design demands zero shift (the
          login button must not jump), wrap the conditional <Code>FieldError</Code> in a{' '}
          <Code>FieldErrorSlot</Code> — it reserves the row&apos;s block size whether or not a message
          is present.
        </Prose>
        <div className="flex w-72 flex-col gap-4">
          <FieldErrorSlot>
            {serverError ? <FieldError id="demo-slot-error">{serverError}</FieldError> : null}
          </FieldErrorSlot>
          <Button onClick={() => setServerError((e) => (e ? null : 'Invalid Email or Password!'))}>
            {serverError ? 'Clear error' : 'Fail sign-in'}
          </Button>
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'children',
              type: 'ReactNode',
              description: 'The error message.',
            },
            {
              prop: 'id',
              type: 'string',
              description: 'Referenced by the errored control(s) via aria-describedby.',
            },
            {
              prop: 'truncate',
              type: 'boolean',
              default: 'false',
              description:
                'Single-line ellipsis — for shared rows where a sibling (e.g. a "Forgot password?" link) must never be pushed off.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLParagraphElement>',
              description: 'className and any paragraph attribute pass through. FieldErrorSlot takes div attributes.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Pair with hasError on the field and wire aria-invalid + aria-describedby.',
            'Render field-level messages directly under the offending field.',
            'Use one shared FieldError for a server error that cannot name the field — reference it from every affected field.',
            'Wrap in FieldErrorSlot when the layout below must not jump.',
          ]}
          donts={[
            'Don’t hand-roll a red <p> under a field — this row is the DS error pattern.',
            'Don’t put non-error helper text in it; it is announced assertively.',
            'Don’t hide the message behind a tooltip — it must be visible in place.',
            'Don’t disable the submit button as a substitute for showing the error.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'role="alert" — the message is announced by assistive tech when it appears.',
            'The alert-circle icon is aria-hidden; the text carries the meaning.',
            'Give it an id and reference it via aria-describedby from the errored control(s), alongside aria-invalid.',
            'Layout uses logical properties and a flex row, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

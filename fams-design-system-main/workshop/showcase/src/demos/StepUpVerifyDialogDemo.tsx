import { useState } from 'react'
import { Button } from '@fams/ui-kit'
import { StepUpVerifyDialog, StagedSaveBar, VerificationCodeInput } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code, DevNote } from '../docs'

/**
 * StepUpVerifyDialogDemo — step-up verification for a critical save, plus a
 * section for its `VerificationCodeInput` part (covered here, not as its own
 * registry member).
 */
export default function StepUpVerifyDialogDemo() {
  const [open, setOpen] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const [committed, setCommitted] = useState(false)

  const [errOpen, setErrOpen] = useState(false)
  const [cells, setCells] = useState<string[]>(() => ['1', '2', '3', '', '', ''])

  // Stand-in for the host's real endpoint call: any code ending in 0 fails.
  const verify = (code: string) => {
    setError(undefined)
    setVerifying(true)
    setTimeout(() => {
      setVerifying(false)
      if (code.endsWith('0')) {
        setError('That code is incorrect or has expired.')
        return
      }
      setOpen(false)
      setCommitted(true)
    }, 500)
  }

  return (
    <DocPage
      title="StepUpVerifyDialog"
      badge="beta"
      summary="Step-up verification for a critical save: the user re-proves it's them with an emailed code before a consequential setting is committed. The staged-save half of the pattern is StagedSaveBar."
    >
      <DocSection id="preview" title="The full staged + step-up flow">
        <Prose>
          A setting that grants a physically consequential capability (remote immobilization, say)
          stages its edits, then <Code>Save changes</Code> raises this dialog. In this demo any
          code verifies except one ending in <Code>0</Code>, which returns a host error.
        </Prose>
        <div className="flex w-full max-w-2xl flex-col gap-3">
          <StagedSaveBar
            pendingCount={committed ? 0 : 2}
            onDiscard={() => setCommitted(true)}
            onSave={() => {
              setError(undefined)
              setOpen(true)
            }}
          />
          {committed ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">Committed — nothing pending.</p>
              <Button size="sm" variant="tertiary" onClick={() => setCommitted(false)}>
                Stage 2 changes again
              </Button>
            </div>
          ) : null}
          <StepUpVerifyDialog
            open={open}
            onClose={() => setOpen(false)}
            onVerified={verify}
            onResend={() => {}}
            verifying={verifying}
            error={error}
            email="ops.admin@tadweer.ae"
          />
        </div>
      </DocSection>

      <DocSection id="states" title="States">
        <Gallery
          layout="rows"
          items={[
            {
              label: 'rejected code',
              caption: 'host error replaces the resend line',
              node: (
                <>
                  <Button size="sm" variant="tertiary" onClick={() => setErrOpen(true)}>
                    Open with an error
                  </Button>
                  <StepUpVerifyDialog
                    open={errOpen}
                    onClose={() => setErrOpen(false)}
                    onVerified={() => {}}
                    onResend={() => {}}
                    error="That code is incorrect or has expired."
                    email="ops.admin@tadweer.ae"
                  />
                </>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="verification-code-input" title="VerificationCodeInput (the digit cells)">
        <Prose>
          The cells are their own part, exported for reuse but deliberately NOT a core{' '}
          <Code>PinInput</Code> primitive — step-up verification is its only use today, and the core
          admits a primitive on its third real use. One <Code>input</Code> per digit keeps the caret
          on the digit the user sees; paste and type-over spill across the row, Backspace on an empty
          cell steps back, and arrows are logical so they mirror under RTL.
        </Prose>
        <VerificationCodeInput digits={cells} onChange={setCells} />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'open', type: 'boolean', required: true, description: 'Controlled visibility.' },
            { prop: 'onClose', type: '() => void', required: true, description: 'Cancel / scrim / Escape.' },
            { prop: 'onVerified', type: '(code: string) => void', required: true, description: 'Fired with the complete code — the host verifies it and commits the staged changes.' },
            { prop: 'email', type: 'string', required: true, description: 'Where the code was sent; shown in full so a wrong inbox is obvious.' },
            { prop: 'codeLength', type: 'number', description: 'Digit count. Defaults to 6.' },
            { prop: 'resendSeconds', type: 'number', description: 'Resend cooldown in seconds. Defaults to 30.' },
            { prop: 'onResend', type: '() => void', description: 'Fired by "Resend code". Omit to hide the resend line.' },
            { prop: 'verifying', type: 'boolean', description: 'Host round trip in flight — cells disabled, Verify spinning.' },
            { prop: 'error', type: 'ReactNode', description: 'Rejection message; marks the cells invalid and replaces the resend line.' },
            { prop: 'title', type: 'ReactNode', description: 'Defaults to "To continue, verify it’s you".' },
            { prop: 'description', type: 'ReactNode', description: 'Overrides the default "we sent a code to <email>" line.' },
            { prop: 'className', type: 'string', description: 'Passes through to DialogContent.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Raise it from a StagedSaveBar save, never on a plain field blur — it guards a commit, not an edit.',
            'Reserve it for capabilities with physical consequences (immobilize a vehicle, revoke access, delete a fleet).',
            'Own the round trip in the host: onVerified calls the endpoint, verifying and error reflect it.',
            'Show the destination email in full so the user can spot a wrong inbox before waiting for a code.',
          ]}
          donts={[
            'Don’t treat it as authentication — it is a step-up re-confirmation on top of an existing session.',
            'Don’t verify inside the dialog; it is a presenter and holds no secret.',
            'Don’t stack it over another modal — the staged save bar is the only entry point.',
            'Don’t promote the digit cells into a core primitive until a third real use appears (rule of three).',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on the DS Dialog, so focus is trapped while open and returns to the trigger on close.',
            'The cells are one role="group" labelled "6-digit verification code"; each cell adds its ordinal ("Digit 3").',
            'The first cell opts into autocomplete="one-time-code", so mobile keyboards offer the delivered code.',
            'A host error renders role="alert" and sets aria-invalid on every cell.',
            'Arrow keys are resolved logically, so cell order and navigation both mirror correctly under RTL.',
          ]}
        />
      </DocSection>

      <DevNote>
        The dialog holds no verification logic at all — only the digit cells and the resend
        cooldown, both pure UI. Wire <Code>onVerified</Code> to the real endpoint and commit the
        staged working copy in its success path.
      </DevNote>
    </DocPage>
  )
}

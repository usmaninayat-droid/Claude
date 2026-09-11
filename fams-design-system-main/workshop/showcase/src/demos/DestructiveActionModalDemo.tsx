import { useState } from 'react'
import { Button } from '../../../../packages/ui-kit/src/primitives/Button'
import { DestructiveActionModal } from '../../../../packages/ui-kit/src/composites/DestructiveActionModal'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/**
 * DestructiveActionModalDemo — standard component-page template for the
 * DestructiveActionModal composite. Overlay component: shown via a Preview
 * with a live trigger, plus a Gallery of the independently-toggleable
 * confirmation steps (consequences / typed keyword / required reason / loading).
 */

function MinimalDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete geozone
      </Button>
      <DestructiveActionModal
        open={open}
        onOpenChange={setOpen}
        title="Delete this geozone?"
        description="This action cannot be undone."
        onConfirm={() => setOpen(false)}
      />
    </>
  )
}

function ConsequencesDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete user
      </Button>
      <DestructiveActionModal
        open={open}
        onOpenChange={setOpen}
        title="Delete Mohamed Zubair Dahri?"
        description="This permanently removes the user from the tenant."
        consequences={[
          'Removes all lot assignments and pending tasks',
          'Revokes portal and mobile app access immediately',
          'Historical audit entries are kept, but reassigned to “Deleted user”',
        ]}
        onConfirm={() => setOpen(false)}
      />
    </>
  )
}

function TypedKeywordDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Deactivate contract
      </Button>
      <DestructiveActionModal
        open={open}
        onOpenChange={setOpen}
        title="Deactivate contract CT-1042?"
        description="Lot 7-8 routes stop dispatching once this contract is deactivated."
        confirmKeyword="CT-1042"
        onConfirm={() => setOpen(false)}
      />
    </>
  )
}

function ReasonRequiredDemo() {
  const [open, setOpen] = useState(false)
  const [lastReason, setLastReason] = useState<string | null>(null)
  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Reject inspection
      </Button>
      {lastReason ? (
        <p className="text-body-sm text-muted-foreground">Last reason recorded: “{lastReason}”</p>
      ) : null}
      <DestructiveActionModal
        open={open}
        onOpenChange={setOpen}
        title="Reject this inspection?"
        description="The inspector will be notified and asked to resubmit."
        reason="required"
        confirmLabel="Reject"
        onConfirm={(reason) => {
          setLastReason(reason ?? null)
          setOpen(false)
        }}
      />
    </div>
  )
}

function LoadingDemo() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Remove bin
      </Button>
      <DestructiveActionModal
        open={open}
        onOpenChange={setOpen}
        title="Remove bin BIN-04821?"
        description="The bin's IoT tag will be unlinked from this route."
        confirmKeyword="REMOVE"
        loading={loading}
        onConfirm={() => {
          setLoading(true)
          window.setTimeout(() => {
            setLoading(false)
            setOpen(false)
          }, 1500)
        }}
      />
    </>
  )
}

export default function DestructiveActionModalDemo() {
  return (
    <DocPage
      title="DestructiveActionModal"
      badge="stable"
      summary="The one confirmation flow for irreversible actions. Built on AlertDialog: no outside-click/Escape dismiss while loading. Consequences, a typed keyword, and a reason field are each independently optional; the caller drives loading and closes the dialog itself once its mutation settles."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Minimal case — no consequences, no typed keyword, no reason. Confirm is enabled immediately.
        </Prose>
        <MinimalDemo />
      </DocSection>

      <DocSection id="states" title="States">
        <Prose>
          Each proof-of-intent step is independently optional and composes with the others — pass any
          combination of <Code>consequences</Code>, <Code>confirmKeyword</Code>, and <Code>reason</Code>.
        </Prose>
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'With consequences',
              caption: 'consequences renders a destructive-tinted bullet list',
              node: <ConsequencesDemo />,
            },
            {
              label: 'Typed-keyword confirmation',
              caption: 'Confirm disabled until the typed value matches exactly',
              node: <TypedKeywordDemo />,
            },
            {
              label: 'Required reason',
              caption: 'Confirm disabled until the Textarea has content',
              node: <ReasonRequiredDemo />,
            },
            {
              label: 'Loading',
              caption: 'caller-driven async — disables Cancel/Confirm, spins Confirm',
              node: <LoadingDemo />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'open', type: 'boolean', required: true, description: 'Controlled open state.' },
            {
              prop: 'onOpenChange',
              type: '(open: boolean) => void',
              required: true,
              description: 'Fired on Cancel, Escape, or outside click. Ignored while loading.',
            },
            { prop: 'title', type: 'ReactNode', required: true, description: 'The AlertDialogTitle content.' },
            {
              prop: 'description',
              type: 'ReactNode',
              required: true,
              description: 'The AlertDialogDescription content.',
            },
            {
              prop: 'consequences',
              type: 'ReactNode[]',
              description: 'Bulleted list of what this action will do. Omit to skip the block entirely.',
            },
            {
              prop: 'confirmKeyword',
              type: 'string',
              description: 'Exact-match keyword the user must type to enable Confirm. Omit to skip this step.',
            },
            {
              prop: 'reason',
              type: "'required' | 'optional'",
              description:
                'Shows a reason Textarea. required blocks Confirm until filled; optional never blocks it. Omit to skip the field.',
            },
            {
              prop: 'loading',
              type: 'boolean',
              default: 'false',
              description:
                'Caller-driven async state: disables Cancel/Confirm, spins Confirm, and suppresses Escape/outside-dismiss.',
            },
            { prop: 'confirmLabel', type: 'string', default: "'Confirm'", description: 'Confirm button label.' },
            { prop: 'cancelLabel', type: 'string', default: "'Cancel'", description: 'Cancel button label.' },
            {
              prop: 'onConfirm',
              type: '(reason?: string) => void',
              required: true,
              description:
                'Fired on Confirm click. The caller owns closing the dialog (via onOpenChange) once its mutation settles.',
            },
            { prop: 'className', type: 'string', description: 'Passed through to AlertDialogContent.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Reserve this for genuinely irreversible actions — delete, deactivate, revoke, hard-remove.',
            'List consequences when the action has a wider blast radius than the title implies.',
            'Use confirmKeyword for the highest-risk actions (deleting a user, deactivating a contract).',
            'Set loading while the mutation is in flight and only set open={false} once it resolves.',
          ]}
          donts={[
            'Don’t use this for reversible actions — a normal AlertDialog or Dialog + Button is enough.',
            'Don’t close the dialog before onConfirm’s mutation settles; let loading gate that.',
            'Don’t stack confirmKeyword and reason="required" unless the action truly warrants both steps.',
            'Don’t reformat or trim the typed keyword yourself — the component does exact-match comparison.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on AlertDialog: role="alertdialog", with a mandatory Title + Description pair for assistive tech.',
            'Confirm is programmatically disabled (not just visually) until the keyword matches and/or the reason is filled.',
            'While loading, Cancel, Escape, and outside-click are all suppressed so an in-flight mutation can’t be abandoned mid-flight.',
            'Focus moves into the dialog on open and returns to the trigger on close, per the underlying AlertDialog primitive.',
            'Layout uses logical properties, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          Built on <Code>AlertDialog</Code>, not <Code>Dialog</Code> — that is what gives the no-outside-
          dismiss-while-busy behavior for free. The component never calls or awaits{' '}
          <Code>onConfirm</Code> itself and never closes on submit, so a failed mutation can leave the
          dialog open with the typed keyword/reason intact instead of forcing the user to redo them.
          Consolidates three near-duplicate v5 confirm dialogs (iwmp <Code>ConfirmationDialog.vue</Code>,
          shared pipeline/cards variants) — none had a typed-keyword step; <Code>confirmKeyword</Code> is
          net-new, not a straight port.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}

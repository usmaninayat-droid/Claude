import { useState } from 'react'
import { Pencil, Link2, Trash2 } from '@fams/ui-kit/icons'
import { Button, DetailSheet, FormSheet, Input } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * DetailSheetDemo — standalone showcase for DetailSheet + FormSheet, the
 * right-slide surface pair for record work. Both are chrome-only L4
 * archetypes with zero content opinions.
 */

function DetailSheetDefaultDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open truck AUH-4021</Button>
      <DetailSheet
        open={open}
        onOpenChange={setOpen}
        title="Truck AUH-4021"
        subtitle="Lot 1 · Lavajet · Compactor"
        actions={
          <>
            <Button variant="tertiary" size="icon" aria-label="Link entity">
              <Link2 className="size-4" />
            </Button>
            <Button variant="tertiary" size="icon" aria-label="Edit">
              <Pencil className="size-4" />
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-body-sm text-muted-foreground">
            The record body is a plain slot — GPS status, trip history, documents, anything the caller renders.
          </p>
          <div className="rounded-md border border-border bg-muted/30 p-4 text-body-sm text-foreground">
            Odometer: 84,210 km · Last ping: 2 min ago
          </div>
        </div>
      </DetailSheet>
    </>
  )
}

function DetailSheetWithFooterDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open contract CT-1042
      </Button>
      <DetailSheet
        open={open}
        onOpenChange={setOpen}
        title="Contract CT-1042"
        subtitle="Alphamed · Lots 7–8"
        width="lg"
        footer={
          <>
            <Button variant="tertiary" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button variant="destructive">
              <Trash2 className="size-4" />
              Deactivate
            </Button>
          </>
        }
      >
        <p className="text-body-sm text-muted-foreground">
          The width preset and the footer are both optional — this variant demos a wider panel with a sticky
          action bar under the scrollable body.
        </p>
      </DetailSheet>
    </>
  )
}

function FormSheetDemo() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [binCode, setBinCode] = useState('')

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        + New bin
      </Button>
      <FormSheet
        open={open}
        onOpenChange={setOpen}
        title="New bin"
        loading={loading}
        saveDisabled={!binCode.trim()}
        onCancel={() => setBinCode('')}
        onSave={() => {
          setLoading(true)
          window.setTimeout(() => {
            setLoading(false)
            setOpen(false)
            setBinCode('')
          }, 1200)
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="detail-sheet-demo-bin-code" className="text-caption font-semibold text-foreground">
              Bin code
            </label>
            <Input
              id="detail-sheet-demo-bin-code"
              value={binCode}
              onChange={(e) => setBinCode(e.target.value)}
              placeholder="BIN-04821"
            />
          </div>
          <p className="text-body-sm text-muted-foreground">
            FormSheet never submits or closes itself — Save only fires onSave; the caller runs the mutation,
            drives loading, and sets open to false once it resolves.
          </p>
        </div>
      </FormSheet>
    </>
  )
}

export default function DetailSheetDemo() {
  return (
    <DocPage
      title="DetailSheet / FormSheet"
      badge="stable"
      summary="The right-slide surface pair for record work. DetailSheet is header (title/subtitle/actions/close) + scrollable body + optional footer, for viewing or inline-editing an existing record. FormSheet is the narrower sibling for a focused create/edit form: title, a body slot for fields, and a sticky Cancel/Save footer that never submits or closes itself. Both are built on the DS Sheet — overlay, focus trap, Esc-to-close, and RTL slide direction come from there."
    >
      <DocSection id="preview" title="Preview">
        <Demo
          title="DetailSheet — default"
          hint="header actions + close, scrollable body, no footer"
          code={`<DetailSheet
  open={open}
  onOpenChange={setOpen}
  title="Truck AUH-4021"
  subtitle="Lot 1 · Lavajet · Compactor"
  actions={<Button variant="tertiary" size="icon" aria-label="Edit"><Pencil /></Button>}
>
  <TruckProfileBody />
</DetailSheet>`}
        >
          <DetailSheetDefaultDemo />
        </Demo>
      </DocSection>

      <DocSection id="detail-sheet-options" title="DetailSheet options">
        <Prose>
          <Code>width</Code> steps from <Code>sm</Code> to <Code>lg</Code>, and <Code>footer</Code> adds a
          sticky action bar under the scrollable body — both optional.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'Default',
              caption: 'width="md", no footer',
              node: <DetailSheetDefaultDemo />,
            },
            {
              label: 'Wide + footer',
              caption: 'width="lg"',
              node: <DetailSheetWithFooterDemo />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="form-sheet" title="FormSheet">
        <Demo
          title="Caller-driven save"
          hint="Save only fires onSave; the sheet never closes itself — loading disables Cancel/Save/close"
          code={`const [loading, setLoading] = useState(false)

<FormSheet
  open={open}
  onOpenChange={setOpen}
  title="New bin"
  loading={loading}
  saveDisabled={!binCode.trim()}
  onSave={async () => {
    setLoading(true)
    await createBin(binCode)
    setLoading(false)
    setOpen(false)
  }}
>
  <Input value={binCode} onChange={(e) => setBinCode(e.target.value)} placeholder="BIN-04821" />
</FormSheet>`}
        >
          <FormSheetDemo />
        </Demo>
      </DocSection>

      <DocSection id="props" title="Props">
        <Prose>
          <Code>DetailSheet</Code>
        </Prose>
        <PropsTable
          rows={[
            {
              prop: 'open',
              type: 'boolean',
              required: true,
              description: 'Controlled open state.',
            },
            {
              prop: 'onOpenChange',
              type: '(open: boolean) => void',
              required: true,
              description: 'Fires when the sheet is dismissed (close button, Esc, overlay click).',
            },
            {
              prop: 'title',
              type: 'ReactNode',
              required: true,
              description: 'Header title.',
            },
            {
              prop: 'subtitle',
              type: 'ReactNode',
              description: 'Secondary line under the title (record subtype, id, status summary, …).',
            },
            {
              prop: 'actions',
              type: 'ReactNode',
              description: 'Header action buttons (edit, link, unlink, …), rendered start of the close control.',
            },
            {
              prop: 'width',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Panel width preset (sm/md/lg map to sm:max-w-3xl/5xl/7xl).',
            },
            {
              prop: 'footer',
              type: 'ReactNode',
              description: 'Optional sticky footer (e.g. a save bar for an inline-editable detail). Omit for a plain scrollable body.',
            },
            {
              prop: 'children',
              type: 'ReactNode',
              required: true,
              description: 'The record body — owned entirely by the caller.',
            },
            {
              prop: 'className',
              type: 'string',
              description: 'Passed to the underlying SheetContent.',
            },
          ]}
        />
        <Prose>
          <Code>FormSheet</Code>
        </Prose>
        <PropsTable
          rows={[
            {
              prop: 'open',
              type: 'boolean',
              required: true,
              description: 'Controlled open state.',
            },
            {
              prop: 'onOpenChange',
              type: '(open: boolean) => void',
              required: true,
              description: 'Fires when the sheet is dismissed. Ignored while loading is true.',
            },
            {
              prop: 'title',
              type: 'ReactNode',
              required: true,
              description: 'Header title.',
            },
            {
              prop: 'children',
              type: 'ReactNode',
              required: true,
              description: 'The form fields — the caller owns all form state and validation.',
            },
            {
              prop: 'onCancel',
              type: '() => void',
              description: 'Fired on Cancel, before the sheet closes. Omit to just close the sheet.',
            },
            {
              prop: 'onSave',
              type: '() => void',
              required: true,
              description:
                'Fired on Save. The component never submits or closes itself — run the mutation, drive loading, and set open={false} once it resolves (same contract as DestructiveActionModal.onConfirm).',
            },
            {
              prop: 'cancelLabel',
              type: 'string',
              default: "'Cancel'",
              description: 'Cancel button label.',
            },
            {
              prop: 'saveLabel',
              type: 'string',
              default: "'Save'",
              description: 'Save button label.',
            },
            {
              prop: 'saveDisabled',
              type: 'boolean',
              default: 'false',
              description: 'Disables Save (e.g. the form is invalid or untouched).',
            },
            {
              prop: 'loading',
              type: 'boolean',
              default: 'false',
              description: 'Caller-driven async state: disables Cancel/Save/close, spins Save, and suppresses Esc/overlay-dismiss.',
            },
            {
              prop: 'width',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Panel width preset (sm/md/lg map to sm:max-w-md/2xl/3xl) — narrower scale than DetailSheet.',
            },
            {
              prop: 'className',
              type: 'string',
              description: 'Passed to the underlying SheetContent.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use DetailSheet for viewing or inline-editing an existing record; use FormSheet for a focused create/edit form.',
            'Keep header actions to a handful of icon buttons (edit, link, unlink) — bulk actions belong in the body or footer.',
            'Drive FormSheet loading from the actual mutation state; never close the sheet before onSave resolves.',
            'Reach for width="lg" only when the body genuinely needs the extra horizontal room (e.g. a wide table).',
          ]}
          donts={[
            'Don’t make FormSheet close or submit itself — it only calls onSave; the caller owns the mutation and the close.',
            'Don’t stack a DetailSheet and a FormSheet open at once — close one before opening the other.',
            'Don’t put primary form fields in DetailSheet — that’s FormSheet’s job; DetailSheet body is a free-form record view.',
            'Don’t omit onOpenChange handling for Esc/overlay dismissal — both sheets rely on the caller to flip open to false.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Built on the DS Sheet (Radix Dialog) — traps focus while open and restores it to the trigger on close.',
            'Escape closes the sheet unless FormSheet is loading, which suppresses Esc/overlay-dismiss so an in-flight save can’t be interrupted.',
            'The close button carries an explicit aria-label ("Close") since it is icon-only.',
            'Title/subtitle wire the same aria-labelledby / aria-describedby wiring as the underlying Sheet primitives.',
            'Both slide from the logical end edge, so the panel and its slide direction mirror correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

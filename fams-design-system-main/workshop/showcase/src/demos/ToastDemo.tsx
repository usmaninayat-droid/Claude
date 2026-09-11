import { Button, Toaster, toast } from '@fams/ui-kit'
import { Demo } from '../showcase/kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * ToastDemo — Sonner-backed notification stack. Mount exactly one Toaster
 * (ideally at the app root) — trigger toasts from anywhere via the
 * re-exported toast() function, no component needed in scope.
 */
export default function ToastDemo() {
  return (
    <DocPage
      title="Toast"
      badge="stable"
      summary="Sonner-backed notification stack. Mount exactly one Toaster at the app root — trigger toasts from anywhere via the re-exported toast() function, no component needed in scope."
    >
      <Toaster />

      <DocSection id="preview" title="Preview">
        <Prose>
          Mount one <Code>{'<Toaster />'}</Code> at the app root; call <Code>toast.success(...)</Code>{' '}
          from anywhere. Click the button to fire it.
        </Prose>
        <Demo
          title="Success toast"
          hint="click to fire"
          code={`// once, at the app root
<Toaster />

// anywhere in the app
toast.success('Vehicle saved')`}
        >
          <Button variant="secondary" onClick={() => toast.success('Vehicle saved')}>
            Success toast
          </Button>
        </Demo>
      </DocSection>

      <DocSection id="variants" title="Variants — types">
        <Prose>
          <Code>success</Code> / <Code>error</Code> / <Code>warning</Code> / <Code>info</Code> /{' '}
          <Code>loading</Code> each carry a distinct tinted border.
        </Prose>
        <Gallery
          minColRem={9}
          items={[
            {
              label: 'success',
              node: (
                <Button variant="secondary" onClick={() => toast.success('Vehicle saved')}>
                  Success
                </Button>
              ),
            },
            {
              label: 'error',
              node: (
                <Button variant="secondary" onClick={() => toast.error('Could not save vehicle')}>
                  Error
                </Button>
              ),
            },
            {
              label: 'warning',
              node: (
                <Button
                  variant="secondary"
                  onClick={() => toast.warning('GPS signal weak on Truck 07')}
                >
                  Warning
                </Button>
              ),
            },
            {
              label: 'info',
              node: (
                <Button variant="secondary" onClick={() => toast.info('New sprint scope published')}>
                  Info
                </Button>
              ),
            },
            {
              label: 'loading',
              node: (
                <Button variant="secondary" onClick={() => toast.loading('Syncing route…')}>
                  Loading
                </Button>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="content" title="Content variations">
        <Prose>
          <Code>description</Code> adds a second, muted line under the title; <Code>action</Code> adds
          an inline button (commonly paired with <Code>toast.dismiss()</Code>).
        </Prose>
        <Gallery
          minColRem={13}
          items={[
            {
              label: 'with description',
              node: (
                <Button
                  variant="secondary"
                  onClick={() =>
                    toast.success('Vehicle saved', {
                      description: 'Truck 07 · Lot 1 · updated just now',
                    })
                  }
                >
                  Trigger
                </Button>
              ),
            },
            {
              label: 'with action',
              node: (
                <Button
                  variant="secondary"
                  onClick={() =>
                    toast('Route reassigned', {
                      description: 'Route 12 moved to Alphamed.',
                      action: { label: 'Undo', onClick: () => toast.dismiss() },
                    })
                  }
                >
                  Trigger
                </Button>
              ),
            },
            {
              label: 'dismiss all',
              node: (
                <Button variant="tertiary" onClick={() => toast.dismiss()}>
                  Dismiss all
                </Button>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <Prose>
          <Code>Toaster</Code> is mounted once and takes stack-level options; <Code>toast()</Code> and
          its variants (<Code>toast.success</Code>, <Code>toast.error</Code>, …) take per-call options.
        </Prose>
        <PropsTable
          rows={[
            {
              prop: 'position',
              type: "'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'",
              default: "'bottom-right'",
              description: 'Toaster. Corner where the stack renders.',
            },
            {
              prop: 'richColors',
              type: 'boolean',
              default: 'false',
              description: 'Toaster. Tints the toast background per type instead of just the border.',
            },
            {
              prop: 'closeButton',
              type: 'boolean',
              default: 'false',
              description: 'Toaster. Shows a manual dismiss (×) on every toast.',
            },
            {
              prop: 'dir',
              type: "'ltr' | 'rtl' | 'auto'",
              default: "'auto'",
              description: 'Toaster. auto reads the ancestor dir attribute — RTL works with no extra wiring.',
            },
            {
              prop: 'duration',
              type: 'number',
              default: '4000',
              description: 'Toaster or per-toast. Auto-dismiss delay in ms.',
            },
            {
              prop: 'description',
              type: 'string',
              description: 'toast() options. Muted second line under the title.',
            },
            {
              prop: 'action',
              type: '{ label: string; onClick: () => void }',
              description: 'toast() options. Renders an inline action button.',
            },
            {
              prop: '…props',
              type: 'ToasterProps (sonner)',
              description: 'Every native Sonner Toaster prop (offset, gap, visibleToasts, theme…) passes through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Mount exactly one Toaster in the real app (ideally at the root) — this page mounts it locally just for the demo.',
            'Use toast.success/error/warning/info for feedback tied to a specific outcome type.',
            'Keep the title to one short sentence; push detail into description.',
            'Use action for a genuinely reversible follow-up (Undo), not a second confirmation.',
          ]}
          donts={[
            'Don’t mount more than one Toaster — stacks duplicate.',
            'Don’t use Toast for anything requiring a decision before the user can proceed — that’s AlertDialog.',
            'Don’t chain multiple toasts for one operation; update or dismiss instead of stacking.',
            'Don’t rely on toast content alone for a critical error the user must act on — surface it inline too.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Sonner announces new toasts via a polite live region, without stealing focus from the page.',
            'Toasts are dismissible from the keyboard and never trap focus.',
            'closeButton can be enabled for users who prefer a persistent manual dismiss over the auto-dismiss timer.',
            'dir="auto" reads the ancestor’s direction, so it mirrors correctly under RTL (switch the header language) with no extra wiring.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

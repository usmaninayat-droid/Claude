import { AppSwitcherPanel } from '@fams/ui-kit'
import { Shield, Truck, FileSearch2, Sparkles, Clapperboard } from '@fams/ui-kit/icons'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

const APPS = [
  { id: 'ccms-esp', label: 'CCMS-ESP', icon: <Shield aria-hidden />, active: true },
  { id: 'telematics', label: 'Telematics', icon: <Truck aria-hidden /> },
  { id: 'iims', label: 'IIMS', icon: <FileSearch2 aria-hidden /> },
  { id: 'edge-ai', label: 'Edge AI', icon: <Sparkles aria-hidden /> },
  { id: 'video', label: 'Video Telematics', icon: <Clapperboard aria-hidden /> },
]

/**
 * AppSwitcherPanelDemo — the 3-column application-switcher tile grid,
 * rendered inside NavRail's switcher popover in the real shell.
 */
export default function AppSwitcherPanelDemo() {
  return (
    <DocPage
      title="AppSwitcherPanel"
      badge="stable"
      summary="Application-switcher tile grid: a Switch Application header with a go-home expand icon over 3-column app tiles; the active app paints a primary chip."
    >
      <DocSection id="examples" title="Examples">
        <Prose>
          Purely presentational content for an anchored surface — <Code>NavRail</Code> hosts it in
          its switcher popover. The host owns open/close; this panel only reports{' '}
          <Code>onSelect</Code>/<Code>onGoHome</Code>.
        </Prose>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Panel</p>
          <div className="w-[340px] rounded-md border border-border bg-popover p-2 shadow-elevation">
            <AppSwitcherPanel apps={APPS} onSelect={() => {}} onGoHome={() => {}} />
          </div>
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'apps', type: 'AppSwitcherApp[]', description: '{ id, label, icon?, active? } — tenant app tiles, active = current app.' },
            { prop: 'onSelect', type: '(id: string) => void', description: 'App tile click.' },
            { prop: 'onGoHome', type: '() => void', description: 'Header expand control — routes to the launch pad AND records "page" as the persisted switcher preference (useAppSwitcherPreference). Omit to hide it.' },
            { prop: 'title', type: 'string', description: 'Header label (default "Switch Application").' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={['Feed apps from tenant metadata (applications[]) — never a hardcoded list.']}
          donts={["Don't render it free-standing in a page — it belongs in an anchored popover."]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Every tile is a labelled button; the active app carries aria-current.',
            'The go-home icon button has an accessible name and tooltip.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

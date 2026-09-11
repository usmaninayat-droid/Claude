import { useState } from 'react'
import { ViewTypePicker, viewTypeOptionsFromKinds } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

const HINT =
  'Instance can be really helpful while comparing the data, you can apply different filters and monitor the data for both with just a switch of a tab.'

/**
 * ViewTypePickerDemo — the "Select Preferred View" new-view takeover
 * (DRAFT, tier-2 pattern, figma new-view spec node 495:25723).
 *
 * Live picker plus the two metadata-variation galleries the UX notes demand:
 * a 2-option module and a 5-option module (with an unknown preview key →
 * generic placeholder), and the hint-less variant.
 */
export default function ViewTypePickerDemo() {
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  const report = (id: string, mode: 'create' | 'customize') => {
    setLastAction(`onCreate("${id}", "${mode}")`)
    // Remount so the demo's one-shot double-create guard re-arms per try.
    window.setTimeout(() => setNonce((n) => n + 1), 600)
  }

  return (
    <DocPage
      title="ViewTypePicker"
      badge="wip"
      summary="DRAFT — the 'Select Preferred View' full-content-area takeover behind the view-tab strip's '+'. NOT a modal: no scrim, no portal — ModuleView swaps it in for the active view body (and shows it as the undismissable initial state of a module with zero views). Options are METADATA-DRIVEN per module: derived from the blueprint's views kinds via viewTypeOptionsFromKinds; the hint line comes from uiConfig.viewPickerHint. Presentational — it only reports intent via onCreate(optionId, mode)."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          A three-option module (Live Monitoring&apos;s hybrid / map / list set). Click a card or
          use Left/Right arrows, then either action. {lastAction ? <Code>{lastAction}</Code> : 'The demo remounts after each create so you can try again.'}
        </Prose>
        <div className="h-[560px] w-full overflow-hidden rounded-md border border-border">
          <ViewTypePicker
            key={nonce}
            options={viewTypeOptionsFromKinds(['hybrid', 'map', 'list'])}
            hint={HINT}
            onCreate={report}
            onCancel={() => setLastAction('onCancel() — Escape')}
          />
        </div>
      </DocSection>

      <DocSection id="metadata" title="Metadata drives the option set">
        <Prose>
          Each module declares its own creatable view kinds — the picker renders N cards from
          whatever it is given (wrapping past 3, per the UX notes). A 2-option module, and a
          5-option module whose last entry uses an unknown <Code>previewKey</Code> and falls back
          to the generic placeholder; neither supplies a hint, so the hint row does not render:
        </Prose>
        <div className="flex flex-col gap-6">
          <div className="h-96 w-full overflow-hidden rounded-md border border-border">
            <ViewTypePicker options={viewTypeOptionsFromKinds(['list', 'kanban'])} onCreate={() => {}} />
          </div>
          <div className="h-[560px] w-full overflow-hidden rounded-md border border-border">
            <ViewTypePicker
              options={[
                ...viewTypeOptionsFromKinds(['list', 'kanban', 'hybrid', 'grid']),
                { id: 'timeline', label: 'Timeline View', previewKey: 'timeline' },
              ]}
              onCreate={() => {}}
            />
          </div>
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'options', type: 'ViewTypeOption[]', required: true, description: 'The module’s available view types — {id, label, previewKey?, preview?}. Derive from blueprint metadata via viewTypeOptionsFromKinds(kinds); never hardcode per module.' },
            { prop: 'onCreate', type: '(optionId, mode: "create" | "customize") => void', required: true, description: 'Fires once per open with the selected option id. Both buttons disable after the first activation (double-click guard).' },
            { prop: 'onCancel', type: '() => void', description: 'Escape handler. Omit for the zero-views initial state — Escape is then a no-op (no dead end).' },
            { prop: 'defaultOptionId', type: 'string', description: 'Pre-selected option; defaults to the first (per Figma).' },
            { prop: 'heading', type: 'string', description: 'Heading and the radiogroup’s accessible name. Default "Select Preferred View".' },
            { prop: 'hint', type: 'ReactNode', description: 'Module-supplied hint sentence (uiConfig.viewPickerHint via ModuleView); the bold "Hint:" prefix is the component’s. Omit to hide the row.' },
            { prop: 'creating', type: 'boolean', description: 'External in-flight flag — disables both actions.' },
            { prop: 'createLabel / customizeLabel', type: 'string', description: 'Button label overrides (i18n). Defaults "Create Only" / "Create & Customize".' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Derive options from the module blueprint’s views kinds (viewTypeOptionsFromKinds) — different modules offer different pickers.',
            'Let ModuleView own the swap: "+" opens it, tab-click / Escape cancel it, creation appends + activates the new tab with a de-duplicated "<Type> View" name.',
            'Keep it a body swap — side nav, top nav, and the existing view tabs stay live around it.',
          ]}
          donts={[
            'Don’t render it in a Dialog/portal — the spec is a content-area takeover, no scrim.',
            'Don’t hardcode a module’s option set or hint in app code — both are blueprint metadata.',
            'Don’t give the zero-views initial state an onCancel — there is nothing to return to.',
          ]}
        />
      </DocSection>

      <DocSection id="a11y" title="Accessibility">
        <A11yList
          items={[
            'The option cards are a real radiogroup (labelled by the heading): one Tab stop, roving tabindex, Left/Right/Up/Down move selection (direction-aware in RTL), Home/End jump, Enter/Space select.',
            'Tab order: card group → Create Only → Create & Customize; :focus-visible ring on cards and buttons.',
            'Preview thumbnails are aria-hidden — each card’s accessible name is its label alone.',
            'Escape fires onCancel when provided; the whole card (thumbnail + label, 288px wide) is one click target.',
            'Both actions disable after the first activation, so a double-click can’t create two views.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

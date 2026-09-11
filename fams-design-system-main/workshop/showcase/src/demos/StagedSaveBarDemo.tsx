import { useState } from 'react'
import { Switch, Label } from '@fams/ui-kit'
import { StagedSaveBar } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * StagedSaveBarDemo — the pending-changes bar of a staged settings save.
 * Interactive demo stages real toggles so the count is live.
 */

type Controls = { pendingCount: '0' | '1' | '3' | '7'; saving: boolean }

const FEATURES = [
  { id: 'immobilize', label: 'Remote immobilization' },
  { id: 'geofence', label: 'Geofence breach alerts' },
  { id: 'harsh', label: 'Harsh-driving detection' },
]

export default function StagedSaveBarDemo() {
  const committed: Record<string, boolean> = { immobilize: false, geofence: true, harsh: false }
  const [draft, setDraft] = useState(committed)
  const pending = FEATURES.filter((f) => draft[f.id] !== committed[f.id]).length

  return (
    <DocPage
      title="StagedSaveBar"
      badge="beta"
      summary="The pending-changes bar of a STAGED settings save: a consequential setting edits a working copy, this bar reports how many changes are waiting, and Save hands off to StepUpVerifyDialog before anything is committed."
    >
      <DocSection id="playground" title="Playground">
        <Playground<Controls>
          controls={[
            { name: 'pendingCount', type: 'select', default: '3', options: ['0', '1', '3', '7'] },
            { name: 'saving', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <div className="w-full max-w-2xl">
              <StagedSaveBar
                pendingCount={Number(v.pendingCount)}
                saving={v.saving}
                onDiscard={() => {}}
                onSave={() => {}}
              />
              {Number(v.pendingCount) <= 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing pending — the bar renders nothing at all.
                </p>
              ) : null}
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="staged-save" title="A real staged save">
        <Prose>
          The host owns the working copy; the bar only reports and acts. Toggle a feature and the
          count follows — <Code>Discard</Code> restores the committed values.
        </Prose>
        <div className="flex w-full max-w-2xl flex-col gap-4 rounded-md border border-border p-4">
          {FEATURES.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-4">
              <Label htmlFor={`sb-${f.id}`}>{f.label}</Label>
              <Switch
                id={`sb-${f.id}`}
                checked={draft[f.id]}
                onCheckedChange={(next) => setDraft((prev) => ({ ...prev, [f.id]: next }))}
              />
            </div>
          ))}
          <StagedSaveBar
            pendingCount={pending}
            onDiscard={() => setDraft(committed)}
            onSave={() => setDraft(committed)}
          />
        </div>
      </DocSection>

      <DocSection id="states" title="States">
        <Gallery
          layout="rows"
          items={[
            {
              label: 'one change',
              node: <StagedSaveBar pendingCount={1} onDiscard={() => {}} onSave={() => {}} />,
            },
            {
              label: 'many changes',
              node: <StagedSaveBar pendingCount={7} onDiscard={() => {}} onSave={() => {}} />,
            },
            {
              label: 'saving',
              caption: 'Discard disabled, Save spinning',
              node: <StagedSaveBar pendingCount={7} saving onDiscard={() => {}} onSave={() => {}} />,
            },
            {
              label: 'custom message',
              node: (
                <StagedSaveBar
                  pendingCount={2}
                  message="2 telematics features staged"
                  onDiscard={() => {}}
                  onSave={() => {}}
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'pendingCount', type: 'number', required: true, description: 'How many staged edits are waiting. 0 renders nothing.' },
            { prop: 'onDiscard', type: '() => void', required: true, description: 'Restores the committed values.' },
            { prop: 'onSave', type: '() => void', required: true, description: 'Starts the commit — conventionally opens StepUpVerifyDialog.' },
            { prop: 'saving', type: 'boolean', description: 'Save is in flight: Discard disabled, Save shows its spinner.' },
            { prop: 'message', type: 'ReactNode', description: 'Overrides the default "N change(s) pending" line.' },
            { prop: 'discardLabel', type: 'string', description: 'Defaults to "Discard".' },
            { prop: 'saveLabel', type: 'string', description: 'Defaults to "Save changes".' },
            { prop: 'className', type: 'string', description: 'Passes through to the bar root.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use it for any setting that grants or revokes a physically consequential capability — the toggle edits a draft, never the live value.',
            'Wire onSave to StepUpVerifyDialog and commit only after the code verifies.',
            'Keep the count derived from draft-vs-committed so it can never drift from the form.',
            'Mount it unconditionally — it renders nothing while nothing is pending.',
          ]}
          donts={[
            'Don’t use it for a saved view’s column/filter edits — that’s UnsavedChangesToast (Revert / Save / Enable Autosave).',
            'Don’t let the bar own the working copy; it is presentational.',
            'Don’t hide the count behind a generic "You have unsaved changes" — the count is the point.',
            'Don’t pair it with per-toggle autosave; staged and immediate saves must not mix on one page.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The bar is role="status", so a change to the pending count is announced politely without stealing focus.',
            'Discard and Save are ordinary Buttons in DOM order — Save last, as the primary action.',
            'saving disables Discard and puts Save in its loading state, so a double-submit is impossible.',
            'Layout uses logical properties only, so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

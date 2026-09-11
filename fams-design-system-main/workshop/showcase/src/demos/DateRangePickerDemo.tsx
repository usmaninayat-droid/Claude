import { useState } from 'react'
import {
  DateRangePicker,
  type DateRangePickerMode,
  type DateRangePickerPreset,
  type DateRangePickerTime,
  type DateRangePickerTriggerVariant,
  type DateRangePickerValue,
} from '../../../../packages/ui-kit/src/composites/DateRangePicker'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, DevNote, Code } from '../docs'

/**
 * DateRangePickerDemo — standard component-page template for the
 * DateRangePicker composite: Calendar (react-day-picker) + a preset list
 * inside a Popover, with an Apply/Cancel footer so a selection only commits
 * when the caller confirms it. Retires the v5 codebase's DatePicker.vue forks
 * (iwmp/fams/ead), including its 8 built-in shortcuts.
 *
 * DataTable/DateRangePicker prioritize a full interactive Preview and a
 * thorough Props reference over many small galleries — the Playground below
 * IS the built-in-shortcuts example (DEFAULT_RANGE_PRESETS renders
 * automatically; nothing is stripped out for the demo).
 */

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
const addDays = (d: Date, n: number) => {
  const next = startOfDay(d)
  next.setDate(next.getDate() + n)
  return next
}
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0)

const today = startOfDay(new Date())

// A deliberately *different* shortcut set from the built-ins — demonstrates
// that a caller-supplied `presets` list overrides DEFAULT_RANGE_PRESETS
// rather than merging with it.
const ROLLING_WINDOW_PRESETS: DateRangePickerPreset[] = [
  { label: 'Last 7 days', range: { from: addDays(today, -6), to: today } },
  { label: 'Last 30 days', range: { from: addDays(today, -29), to: today } },
  { label: 'Last 90 days', range: { from: addDays(today, -89), to: today } },
]

type DateRangePickerControls = {
  mode: DateRangePickerMode
  triggerVariant: DateRangePickerTriggerVariant
  size: 'sm' | 'md' | 'lg'
  withTime: boolean
  hasError: boolean
  disabled: boolean
}

export default function DateRangePickerDemo() {
  const [range, setRange] = useState<DateRangePickerValue | undefined>({ from: today, to: today })
  const [time, setTime] = useState<DateRangePickerTime>({ start: '09:00', end: '17:00' })
  const [single, setSingle] = useState<DateRangePickerValue | undefined>({ from: today })
  const [activePresetRange, setActivePresetRange] = useState<DateRangePickerValue | undefined>({
    from: startOfMonth(today),
    to: endOfMonth(today),
  })
  const [rollingRange, setRollingRange] = useState<DateRangePickerValue | undefined>({
    from: addDays(today, -6),
    to: today,
  })
  const [fieldRange, setFieldRange] = useState<DateRangePickerValue | undefined>({
    from: addDays(today, -6),
    to: today,
  })

  return (
    <DocPage
      title="DateRangePicker"
      badge="stable"
      summary="The one date/date-range popup — Calendar (react-day-picker) + a preset list inside a Popover, with an Apply/Cancel footer so a selection only commits when the caller confirms it. Retires the v5 codebase's DatePicker.vue forks (iwmp/fams/ead), including its 8 built-in shortcuts."
    >
      <DocSection id="playground" title="Playground">
        <Prose>
          No <Code>presets</Code> prop is passed here, so the built-in <Code>DEFAULT_RANGE_PRESETS</Code>{' '}
          render automatically — open it and pick a shortcut, or drag a span on the calendar, then Apply.
        </Prose>
        <Playground<DateRangePickerControls>
          controls={[
            { name: 'mode', type: 'select', default: 'range', options: ['range', 'single'] },
            { name: 'triggerVariant', type: 'select', default: 'button', options: ['button', 'field'] },
            { name: 'size', type: 'select', default: 'md', options: ['sm', 'md', 'lg'] },
            { name: 'withTime', type: 'boolean', default: false },
            { name: 'hasError', type: 'boolean', default: false },
            { name: 'disabled', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <div className="w-72">
              <DateRangePicker
                mode={v.mode}
                value={v.mode === 'single' ? single : range}
                onChange={v.mode === 'single' ? setSingle : setRange}
                withTime={v.withTime}
                time={time}
                onTimeChange={setTime}
                hasError={v.hasError}
                disabled={v.disabled}
                size={v.size}
                triggerVariant={v.triggerVariant}
                fieldLabel={v.triggerVariant === 'field' ? 'Reporting period' : undefined}
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="presets" title="Presets & shortcuts">
        <Prose>
          The platform's 8 built-in quick-picks (Today, Yesterday, This week, Last week, This month, Last
          month, This year, Last year) render whenever no <Code>presets</Code> prop is passed. The preset
          list highlights whichever shortcut matches the current value. In <Code>single</Code> mode, only
          the shortcuts that resolve to one calendar day (Today, Yesterday) are shown. Passing{' '}
          <Code>presets</Code> replaces <Code>DEFAULT_RANGE_PRESETS</Code> entirely rather than merging with
          it — useful when a report or dashboard needs a different vocabulary than the platform default.
        </Prose>
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Active shortcut auto-detected',
              caption: 'value === this month\'s span → "This month" opens already marked active',
              node: (
                <div className="w-72">
                  <DateRangePicker value={activePresetRange} onChange={setActivePresetRange} defaultOpen />
                </div>
              ),
            },
            {
              label: 'Single mode — filtered presets',
              caption: 'range-only shortcuts like "This week" are hidden automatically',
              node: (
                <div className="w-64">
                  <DateRangePicker mode="single" value={single} onChange={setSingle} defaultOpen />
                </div>
              ),
            },
            {
              label: 'Custom presets override',
              caption: 'rolling windows instead of calendar-aligned shortcuts',
              node: (
                <div className="w-72">
                  <DateRangePicker value={rollingRange} onChange={setRollingRange} presets={ROLLING_WINDOW_PRESETS} defaultOpen />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="trigger" title="Trigger styles">
        <Gallery
          layout="rows"
          items={[
            {
              label: 'button (default)',
              caption: 'the standard bordered Button trigger',
              node: (
                <div className="w-64">
                  <DateRangePicker value={range} onChange={setRange} />
                </div>
              ),
            },
            {
              label: 'field',
              caption: 'borderless, label-above-value — for report-builder / filter-panel placements',
              node: (
                <div className="w-64">
                  <DateRangePicker
                    triggerVariant="field"
                    fieldLabel="Reporting period"
                    value={fieldRange}
                    onChange={setFieldRange}
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="states" title="States">
        <Gallery
          layout="rows"
          items={[
            {
              label: 'Error',
              caption: 'hasError — destructive border/ring for validation failures',
              node: (
                <div className="w-64">
                  <DateRangePicker value={undefined} onChange={() => {}} hasError />
                </div>
              ),
            },
            {
              label: 'Disabled',
              caption: 'trigger is inert, popover cannot open',
              node: (
                <div className="w-64">
                  <DateRangePicker value={range} onChange={() => {}} disabled />
                </div>
              ),
            },
            {
              label: 'With time-of-day',
              caption: 'withTime — Start/End inputs commit alongside the range on Apply',
              node: (
                <div className="w-72">
                  <DateRangePicker
                    value={range}
                    onChange={setRange}
                    withTime
                    time={time}
                    onTimeChange={setTime}
                    placeholder="Select date range"
                  />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <Prose>Component props.</Prose>
        <PropsTable
          rows={[
            { prop: 'mode', type: "'range' | 'single'", default: "'range'", description: 'range selects a from/to span; single selects one date.' },
            { prop: 'value', type: 'DateRangePickerValue', description: 'Controlled committed value ({ from, to }). In single mode only from is read.' },
            { prop: 'onChange', type: '(value: DateRangePickerValue | undefined) => void', required: true, description: 'Fires with the staged value when Apply is pressed.' },
            {
              prop: 'presets',
              type: 'DateRangePickerPreset[]',
              default: 'DEFAULT_RANGE_PRESETS',
              description: 'Quick picks shown beside the calendar. Pass [] to hide the list entirely.',
            },
            { prop: 'withTime', type: 'boolean', default: 'false', description: 'Show Start/End time-of-day inputs alongside the calendar.' },
            { prop: 'time', type: 'DateRangePickerTime', description: 'Controlled time-of-day ({ start, end } in 24h HH:mm), only read/emitted when withTime.' },
            { prop: 'onTimeChange', type: '(time: DateRangePickerTime) => void', description: 'Fires alongside onChange on Apply, when withTime.' },
            { prop: 'placeholder', type: 'string', description: 'Trigger text when no value is set. Defaults to a mode-based label.' },
            { prop: 'disabled', type: 'boolean', default: 'false', description: 'Trigger is inert, popover cannot open.' },
            { prop: 'hasError', type: 'boolean', default: 'false', description: 'Destructive border/ring, for validation failures.' },
            { prop: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Trigger height, mirrors Button sizes.' },
            { prop: 'triggerVariant', type: "'button' | 'field'", default: "'button'", description: 'button is the bordered trigger; field is borderless with the label above the value.' },
            { prop: 'fieldLabel', type: 'string', description: 'Label shown above the value when triggerVariant="field". Defaults to a mode-based label. Ignored otherwise.' },
            { prop: 'align', type: "'start' | 'center' | 'end'", default: "'start'", description: 'Popover alignment relative to the trigger.' },
            { prop: 'defaultOpen', type: 'boolean', default: 'false', description: 'Uncontrolled initial open state.' },
            { prop: 'className', type: 'string', description: 'Passed through to the trigger Button.' },
          ]}
        />
        <Prose>
          Each entry in <Code>presets</Code> is a <Code>DateRangePickerPreset</Code>:
        </Prose>
        <PropsTable
          rows={[
            { prop: 'label', type: 'string', required: true, description: 'Shown as a row in the preset list.' },
            {
              prop: 'range',
              type: 'DateRangePickerValue | (() => DateRangePickerValue)',
              required: true,
              description:
                'The value this preset resolves to. A thunk is recomputed on every read (needed for "Today"-style presets); a fixed value is used as-is.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Let the built-in DEFAULT_RANGE_PRESETS render unless the surface has a genuinely different vocabulary (e.g. rolling 7/30/90-day windows for a report).',
            'Use triggerVariant="field" inside filter panels and report builders; keep the default button trigger everywhere else.',
            'Use mode="single" for a single date field — the shortcut list narrows to Today/Yesterday automatically.',
            'Treat the committed value as owned by the caller — read it from value, never from internal popover state.',
          ]}
          donts={[
            'Don’t hand-roll "Today/This week/…" shortcut math — DEFAULT_RANGE_PRESETS already covers it with date-fns.',
            'Don’t mutate value directly on every calendar click; the Apply/Cancel footer is the intentional commit point.',
            'Don’t pass a fixed (non-thunk) range for a relative preset like "Today" — it will freeze to the date the module loaded.',
            'Don’t use this for a bare single input mask; it is a full calendar + preset popover, not a text field.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'The preset list is role="listbox" with role="option" rows and aria-selected on the active match.',
            'The trigger is a real Button, so it gets full keyboard support (Enter/Space to open) for free.',
            'hasError sets aria-invalid on the trigger for assistive tech.',
            'Selection only commits on Apply — Escape/outside-click discards the staged draft, matching visible affordance (Cancel).',
            'Layout uses logical properties (border-e for the preset rail), so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>

      <DocSection id="notes" title="Developer notes">
        <DevNote>
          Selection is staged locally in <Code>draft</Code>/<Code>draftTime</Code> and only reaches the
          caller via <Code>onChange</Code>/<Code>onTimeChange</Code> when Apply is pressed — Cancel discards
          the stage. Week-based presets use <Code>weekStartsOn: 1</Code> (Monday) to match FAMS' regional
          work-week convention rather than date-fns' Sunday default. <Code>DEFAULT_RANGE_PRESETS</Code> is
          exported directly, so a caller can spread it and add one custom entry instead of rebuilding the
          whole list.
        </DevNote>
      </DocSection>
    </DocPage>
  )
}

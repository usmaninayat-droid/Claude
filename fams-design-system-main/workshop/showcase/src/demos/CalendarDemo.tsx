import { useState } from 'react'
import { Calendar } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

/** Structurally matches react-day-picker's `DateRange` without a direct dependency on the package. */
type RangeValue = { from: Date | undefined; to?: Date | undefined }

const today = new Date()
const weekendMatcher = (date: Date) => date.getDay() === 0 || date.getDay() === 6

type CalendarControls = {
  numberOfMonths: '1' | '2'
  disableWeekends: boolean
}

/**
 * CalendarDemo — reference implementation of the standard component-page
 * template (DocPage → Playground → Gallery per dimension → PropsTable →
 * Guidelines → Accessibility). RTL is proven by the global header switcher,
 * not a per-page block.
 *
 * Belongs under a "Data entry" section next to DateRangePicker — this
 * component only owns the grid itself (Rule 8: no fetch/store/route); compose
 * it with Popover + Input for a full date field, see DateRangePicker.
 */
export default function CalendarDemo() {
  const [playgroundDate, setPlaygroundDate] = useState<Date | undefined>(today)
  const [single, setSingle] = useState<Date | undefined>(today)
  const [range, setRange] = useState<RangeValue | undefined>({
    from: today,
    to: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 6),
  })
  const [multiple, setMultiple] = useState<Date[] | undefined>([
    today,
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2),
    new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5),
  ])
  const [withDisabled, setWithDisabled] = useState<Date | undefined>(today)

  return (
    <DocPage
      title="Calendar"
      badge="stable"
      summary="The date-picking grid (react-day-picker, themed). This component only owns the grid itself — composed into a full date input via Popover + Input in feature code, see DateRangePicker. selected/onSelect are fully controlled by the caller, no internal fetch/store/route."
    >
      <DocSection id="playground" title="Playground">
        <Playground<CalendarControls>
          controls={[
            { name: 'numberOfMonths', type: 'select', default: '1', options: ['1', '2'] },
            { name: 'disableWeekends', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <Calendar
              mode="single"
              selected={playgroundDate}
              onSelect={setPlaygroundDate}
              numberOfMonths={Number(v.numberOfMonths)}
              disabled={v.disableWeekends ? weekendMatcher : undefined}
              className="rounded-md border border-border"
            />
          )}
        </Playground>
      </DocSection>

      <DocSection id="modes" title="Modes">
        <Prose>
          <Code>mode</Code> shapes the <Code>selected</Code>/<Code>onSelect</Code> contract: a single{' '}
          <Code>Date</Code>, a <Code>{'{ from, to }'}</Code> range, or an independent <Code>Date[]</Code>.
        </Prose>
        <Gallery
          minColRem={20}
          items={[
            {
              label: 'single',
              node: (
                <Calendar
                  mode="single"
                  selected={single}
                  onSelect={setSingle}
                  className="rounded-md border border-border"
                />
              ),
            },
            {
              label: 'range',
              caption: 'drag or shift-click a span',
              node: (
                <Calendar
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  className="rounded-md border border-border"
                />
              ),
            },
            {
              label: 'multiple',
              caption: 'independent day toggles',
              node: (
                <Calendar
                  mode="multiple"
                  selected={multiple}
                  onSelect={setMultiple}
                  className="rounded-md border border-border"
                />
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
              label: 'disabled dates',
              caption: 'weekends inert, greyed at 30% opacity',
              node: (
                <Calendar
                  mode="single"
                  selected={withDisabled}
                  onSelect={setWithDisabled}
                  disabled={weekendMatcher}
                  className="rounded-md border border-border"
                />
              ),
            },
            {
              label: 'two months',
              caption: 'useful next to a preset list — see DateRangePicker',
              node: (
                <Calendar
                  mode="range"
                  numberOfMonths={2}
                  selected={range}
                  onSelect={setRange}
                  className="rounded-md border border-border"
                />
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'mode',
              type: "'single' | 'multiple' | 'range'",
              description: 'Selection model — determines the shape of selected and onSelect.',
            },
            {
              prop: 'selected',
              type: 'Date | Date[] | { from: Date; to?: Date }',
              description: 'Controlled selection; shape depends on mode.',
            },
            {
              prop: 'onSelect',
              type: '(value) => void',
              description: 'Fires with the new selection, typed to match mode.',
            },
            {
              prop: 'disabled',
              type: 'Matcher | Matcher[]',
              description: "Dates that can't be selected — accepts a predicate, a date, or a range.",
            },
            {
              prop: 'numberOfMonths',
              type: 'number',
              default: '1',
              description: 'Render N months side by side — pair with a preset list, see DateRangePicker.',
            },
            {
              prop: 'showOutsideDays',
              type: 'boolean',
              default: 'true',
              description: 'Show leading/trailing days from adjacent months, dimmed at 50% opacity.',
            },
            {
              prop: 'className / classNames',
              type: 'string / Partial<DayPicker classNames>',
              description: 'className merges into the root; classNames overrides individual themed parts.',
            },
            {
              prop: '…props',
              type: 'DayPickerProps',
              description: 'All react-day-picker props pass through (locale, weekStartsOn, fromDate/toDate, footer, …).',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Compose with Popover + Input for a text-field date picker — Calendar itself is grid-only.',
            'Use numberOfMonths={2} for range pickers so both ends of a span are visible at once.',
            "Disable dates with a matcher rather than filtering them out of the visible grid.",
            'Keep selected fully controlled by the caller — no internal fetch/store/route.',
          ]}
          donts={[
            "Don't fetch data or read routes inside Calendar — it only owns the grid.",
            "Don't use mode=\"multiple\" for a contiguous span — that's what range is for.",
            "Don't hardcode colours for today/selected — the themed classNames already carry the tokens.",
            "Don't disable dates by re-implementing the matcher logic outside disabled.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Each day is a native <button> in a grid — full keyboard navigation (arrow keys, Enter/Space to select) from react-day-picker.',
            'Previous/next month buttons expose accessible labels and are disabled (not hidden) at range boundaries.',
            'Selected, today, and disabled states are conveyed through both color and underlying DOM state, not color alone.',
            'Chevrons flip via rtl:-scale-x-100 and the weekday/day grid mirrors automatically under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

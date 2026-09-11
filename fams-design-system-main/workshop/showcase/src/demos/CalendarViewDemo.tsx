import { useState } from 'react'
import { CalendarView, type CalendarMode } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'
import {
  calendarConfig,
  calendarRecords,
  CALENDAR_TODAY,
} from '../../../../packages/v5-templates/src/views/calendar/fixtures'

/**
 * CalendarViewDemo — the blueprint-driven calendar lens (SPEC §1.4/§1.5):
 * Monthly/Weekly switcher, config-driven `View By` date-field menu, status
 * legend checkboxes acting as filters. Presentational — commits nothing.
 */
export default function CalendarViewDemo() {
  const [mode, setMode] = useState<CalendarMode>('monthly')

  return (
    <DocPage
      title="CalendarView"
      badge="wip"
      summary="The blueprint-driven calendar lens — Monthly/Weekly switcher, period nav, a config-driven `View By` date-field menu, and status legend checkboxes that filter events. Generic and module-agnostic: title/status/date all come from config."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          Switch between <Code>Monthly</Code> and <Code>Weekly</Code> below — both render the same{' '}
          <Code>calendarConfig</Code>/<Code>calendarRecords</Code> fixtures, anchored on the design's own month
          (January 2026) via the injectable <Code>today</Code> prop.
        </Prose>
        <div className="h-[560px] overflow-hidden rounded-md border border-border p-2">
          <CalendarView
            config={calendarConfig}
            records={calendarRecords}
            today={CALENDAR_TODAY}
            mode={mode}
            onModeChange={setMode}
          />
        </div>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            { prop: 'config / records', type: 'EntityConfig / EntityRecord[]', description: 'Statuses from uiConfig.statusList, date fields from systemcolumns.' },
            { prop: 'mode / onModeChange', type: '"monthly" | "weekly" / fn', description: 'Controlled grid shape; omit for uncontrolled (monthly).' },
            { prop: 'dateField / onDateFieldChange', type: 'string / fn', description: 'Controlled active "View By" date column.' },
            { prop: 'visibleStatuses / onVisibleStatusesChange', type: 'string[] / fn', description: 'Controlled legend selection; omit for uncontrolled (all on).' },
            { prop: 'today', type: 'Date', description: 'Injectable "now" for test/SSR determinism. Defaults to new Date().' },
            { prop: 'onOpenRecord', type: '(record) => void', description: 'Fires on an event chip click — opens the record.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Drive statuses/colours from uiConfig.statusList — never hardcode a status name or hue.',
            'Pass today for deterministic tests/SSR instead of letting the component call new Date() implicitly.',
          ]}
          donts={['Don’t fork a calendar per module — this component is config-driven, not domain-specific.']}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Legend statuses are real checkbox filters in a labelled fieldset; unchecking all yields a filtered-empty state.',
            'The day-overflow "N More" popover is focus-trapped and restores focus to its trigger on close.',
            'Weekday header stays sticky; keyboard reachability is unaffected by the Monthly/Weekly switch.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

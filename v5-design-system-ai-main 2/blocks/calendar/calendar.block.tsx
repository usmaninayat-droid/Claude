import type { ModuleConfig } from '@ds/components/app-shell';
import { Calendar } from '@ds/icons';

/**
 * Calendar BLOCK — a reusable month calendar. A `calendar` module is config: a
 * `ModuleConfig` with `type:'calendar'` + a `CalendarModuleData` payload; the
 * shell renders the DS `CalendarView` (month grid, color-coded events). No
 * bespoke screen.
 *
 * ADAPT: set `monthLabel` / `daysInMonth` / `startWeekday` / `today`, then map
 * the app's dated records to `events` (day · label · color). For an entity with
 * a date field, derive `events` from that field. See calendar.block.md.
 */
export const calendarBlock: ModuleConfig = {
  id: 'calendar',
  type: 'calendar',
  label: 'Calendar',
  icon: Calendar,
  data: {
    monthLabel: 'June 2026',
    startWeekday: 1,
    daysInMonth: 30,
    today: 12,
    events: [
      { day: 3, label: 'Kickoff', color: 'var(--primary)' },
      { day: 9, label: 'Inspection', color: 'var(--status-warning)' },
      { day: 12, label: 'Review', color: 'var(--status-success)' },
      { day: 18, label: 'Maintenance', color: 'var(--status-warning)' },
      { day: 24, label: 'Delivery', color: 'var(--primary)' },
      { day: 27, label: 'Audit', color: 'var(--status-error)' },
    ],
  },
};

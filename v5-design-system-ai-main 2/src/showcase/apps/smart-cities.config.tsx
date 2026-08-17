import type { AppConfig } from '../../components/app-shell';
import { Building07 } from '../../icons';

// Every demo we built, composed into ONE working AppShell app from the reusable
// BLOCK library (blocks/*.block.tsx) — nothing bespoke, just the blocks wired in
// module order. Default FAMS brand (primary blue + FAMS logo): NO theme override.
import { dashboardBlock } from '../../../blocks/dashboard/dashboard.block';
import { operationsCenterBlock } from '../../../blocks/operations-center/operations-center.block';
import { contractsBlock } from '../../../blocks/contracts/contracts.block';
import { interactivePlanningBlock } from '../../../blocks/interactive-planning/interactive-planning.block';
import { planMonitoringBlock } from '../../../blocks/plan-monitoring/plan-monitoring.block';
import { zonesBlock } from '../../../blocks/zones/zones.block';
import { liveMonitoringBlock } from '../../../blocks/live-monitoring/live-monitoring.block';
import { tripManagementBlock } from '../../../blocks/trip-management/trip-management.block';
import { eventsBlock } from '../../../blocks/events/events.block';
import { shiftsBlock } from '../../../blocks/shifts/shifts.block';
import { reportsBlock } from '../../../blocks/reports/reports.block';
import { calendarBlock } from '../../../blocks/calendar/calendar.block';
import { formsBlock } from '../../../blocks/forms/forms.block';
import { inboxBlock } from '../../../blocks/inbox/inbox.block';
import { settingsBlock } from '../../../blocks/settings/settings.block';

/**
 * FAMS Smart Cities — the reference app that composes ALL the demos we built into
 * one navigable AppShell: Dashboard · Interactive Planning · Plan Monitoring ·
 * Zones · Live Monitoring · Trip Management · Events · Shifts · Reports · Calendar ·
 * Forms, plus the cross-app Inbox and a Settings experience. Each module IS a
 * block from the library — so this app doubles as the block library's
 * integration test. Trip Management is a `live-monitoring` CONFIG (Law 3 — not
 * a new module type), demonstrating the trip-card list variant.
 */
export const smartCitiesApp: AppConfig = {
  id: 'smart-cities',
  brand: { name: 'FAMS Smart Cities', icon: Building07 },
  user: { name: 'Amina Al-Suwaidi', email: 'amina@fams.gov', role: 'Operations Director', avatarFallback: 'AA' },
  modules: [
    dashboardBlock,
    operationsCenterBlock,
    contractsBlock,
    interactivePlanningBlock,
    planMonitoringBlock,
    zonesBlock,
    liveMonitoringBlock,
    tripManagementBlock,
    eventsBlock,
    shiftsBlock,
    reportsBlock,
    calendarBlock,
    formsBlock,
  ],
  collectiveInbox: inboxBlock,
  settings: settingsBlock,
};

import * as React from 'react';
import type { ModuleConfig } from '@ds/components/app-shell';
import { DispatcherCockpit } from '@ds/components/operations';
import type { KpiMetricCardProps, StatusBreakdownCardProps } from '@ds/components/operations';
import { Dataflow02, Calendar, Truck01, Users01, Grid01, MarkerPin01, Announcement01, Zap, Download01 } from '@ds/icons';

/**
 * Operations Center BLOCK — the dispatcher's command surface. View: Dispatcher
 * Cockpit (from the Tadweer ref, Figma node 2227-76367). Built on the DS
 * `DispatcherCockpit` (config-driven): next-shift alert · filters + actions ·
 * value-first KPI grid · Fleet/Workforce status panels. The Live GIS Map + the 5
 * analytics widgets + side-sheets + Manual Bin Reassignment land in later passes.
 *
 * DYNAMIC: KPIs + status panels + filters are DATA — any ops domain adapts by
 * config. Default FAMS brand (primary blue); status/category colours are tokens.
 */

const KPIS: KpiMetricCardProps[] = [
  { id: 'scheduled', label: 'Scheduled Routes', value: '292', accent: 'success', badge: { text: '+12 vs Yest.', tone: 'up' } },
  { id: 'dispatched', label: 'Dispatched Routes', value: '270/292' },
  { id: 'ongoing', label: 'Ongoing Routes', value: '149' },
  { id: 'delayed', label: 'Delayed Routes', value: '24', accent: 'warning', badge: { text: '+2 vs Yest.', tone: 'down' } },
  { id: 'completed', label: 'Completed Routes', value: '108' },
  { id: 'pending', label: 'Pending Route', value: '02' },
  { id: 'fulfillment', label: 'Bin Fulfillment Rate', value: '90.8%', accent: 'success', badge: { text: '+3% vs Yest.', tone: 'up' } },
  { id: 'scheduled-bins', label: 'Scheduled Bins', value: '26,683' },
  { id: 'collected-bins', label: 'Collected Bins', value: '18,412' },
  { id: 'fleet', label: 'Available Fleet', value: '314', accent: 'success', badge: { text: '92%', tone: 'success' } },
  { id: 'workforce', label: 'Available Workforce', value: '464', accent: 'warning', badge: { text: '76%', tone: 'warning' } },
  { id: 'action', label: 'Action Required', value: '02', accent: 'error', badge: { text: 'View Details', tone: 'link' } },
];

// Category colours = DS tokens (data-viz palette), not raw hex.
const GREEN = 'var(--status-success)', PURPLE = 'var(--chart-3)', BLUE = 'var(--primary)', YELLOW = 'var(--status-warning)', RED = 'var(--status-error)', GREY = 'var(--muted-foreground)';

const STATUS_PANELS: StatusBreakdownCardProps[] = [
  {
    title: 'Fleet Availability', icon: Truck01, filterLabel: 'All Zones',
    stats: [
      { label: 'On Route', value: '271', color: GREEN }, { label: 'Idle', value: '18', color: PURPLE },
      { label: 'Standby', value: '24', color: BLUE }, { label: 'Maintenance', value: '10', color: YELLOW },
      { label: 'Breakdown', value: '03', color: RED }, { label: 'Inactive', value: '01', color: GREY },
    ],
    bars: [{ color: GREEN, width: 63.2 }, { color: PURPLE, width: 71.5 }, { color: BLUE, width: 82.6 }, { color: YELLOW, width: 91.3 }, { color: RED, width: 94.6 }],
  },
  {
    title: 'Workforce Readiness', icon: Users01, filterLabel: 'All Roles',
    stats: [
      { label: 'On Duty', value: '422', color: GREEN }, { label: 'Late', value: '18', color: PURPLE },
      { label: 'Standby', value: '24', color: BLUE }, { label: 'Next Shift', value: '148', color: YELLOW },
      { label: 'On Leave', value: '03', color: RED },
    ],
    bars: [{ color: GREEN, width: 63.2 }, { color: PURPLE, width: 71.5 }, { color: BLUE, width: 82.6 }, { color: YELLOW, width: 91.3 }, { color: RED, width: 96.4 }],
  },
];

const FILTERS = [
  { label: 'Today', icon: Calendar }, { label: 'All Assets', icon: Truck01, placeholder: true },
  { label: 'All Workforce', icon: Users01, placeholder: true }, { label: 'All Zones', icon: Grid01, placeholder: true },
  { label: 'All Locations', icon: MarkerPin01, placeholder: true },
];

function DispatcherCockpitView() {
  return (
    <DispatcherCockpit
      alert={{ text: <span><b className="font-semibold">3 routes</b> scheduled for next shift need your attention to ensure smooth operations.</span>, timeLeft: '2h 30m left', tone: 'error' }}
      filters={FILTERS}
      actions={[
        { id: 'broadcast', label: 'Broadcast', icon: Announcement01 },
        { id: 'quick', label: 'Quick actions', icon: Zap },
        { id: 'export', label: 'Export', icon: Download01, primary: true },
      ]}
      kpis={KPIS}
      statusPanels={STATUS_PANELS}
    />
  );
}

export const operationsCenterBlock: ModuleConfig = {
  id: 'operations-center',
  type: 'dashboard',
  label: 'Operations Center',
  icon: Dataflow02,
  tabKind: 'instance',
  defaultTabId: 'cockpit',
  tabs: [
    { id: 'cockpit', label: 'Dispatcher Cockpit', icon: Dataflow02, render: () => <DispatcherCockpitView /> },
  ],
};

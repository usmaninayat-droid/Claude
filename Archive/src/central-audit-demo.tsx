import * as React from 'react';
import { createRoot } from 'react-dom/client';
import * as Icons from './icons';
import { CentralAuditLog } from './components/audit/central-audit-log';
import type { AuditEntry } from './components/audit/central-audit-log';
import { Toaster } from './components/primitives';
import { SideNav, ModuleRail } from './components/navigation';
import type { SideNavItem, ModuleRailItem } from './components/navigation';
import { Logo } from './components/basics';
import './styles.css';

/**
 * Standalone Central Audit demo (served at `/central-audit.html`) — PD-311.
 * Dummy data only, no backend — read-only reference for the DS component.
 */

// Side navigation — pixel-matched to Figma node 31046:8494. This exact frame
// puts Inbox in the plain footer group (dark/20 tone) alongside Settings/
// Help/User, NOT in SideNav's usual top "bracket" pattern (that's a
// different, newer frame — 7134:2063 — that SideNav's default styling
// already matches). Module rail icons are the DS's own V5 icons, 1:1 name
// matches to the Figma layer names (globe-05 → Globe05, car-01 → Car01, …).
const SIDE_NAV_APPS: SideNavItem[] = [
  { id: 'app-1', label: 'App 1', icon: Icons.Clapperboard },
  { id: 'app-2', label: 'App 2 (current)', icon: Icons.Clapperboard, active: true },
  { id: 'app-3', label: 'App 3', icon: Icons.Clapperboard },
];

const SIDE_NAV_FOOTER: SideNavItem[] = [
  { id: 'inbox', label: 'Inbox', icon: Icons.Inbox01, tone: 'dark' },
  { id: 'settings', label: 'Settings', icon: Icons.Settings02 },
  { id: 'help', label: 'Help Center', icon: Icons.HelpCircle },
  { id: 'user', label: 'User', icon: Icons.User02 },
];

const MODULE_RAIL_ITEMS: ModuleRailItem[] = [
  { id: 'overview', label: 'Overview', icon: Icons.Globe05 },
  { id: 'vehicles', label: 'Vehicles', icon: Icons.Car01, active: true },
  { id: 'live', label: 'Live tracking', icon: Icons.Signal01 },
  { id: 'workforce', label: 'Workforce', icon: Icons.Users01 },
  { id: 'zones', label: 'Zones', icon: Icons.Pin01 },
  { id: 'map', label: 'Map', icon: Icons.Map02 },
  { id: 'routes', label: 'Routes', icon: Icons.Route },
  { id: 'events', label: 'Events', icon: Icons.Announcement02 },
  { id: 'reports', label: 'Reports', icon: Icons.File07 },
  { id: 'devices', label: 'Devices', icon: Icons.Simcard02 },
];

const ORGS = [
  { id: 'org-acme', name: 'ACME Logistics' },
  { id: 'org-globex', name: 'Globex Fleet' },
  { id: 'org-initech', name: 'Initech Transport' },
];

const USERS: { name: string; color: string }[] = [
  { name: 'James Davis', color: 'var(--chart-accent-blue, #0072D6)' },
  { name: 'Sarah Miller', color: 'var(--status-success)' },
  { name: 'Rachel Chen', color: 'var(--status-warning)' },
  { name: 'Michael Johnson', color: 'var(--chart-accent-purple)' },
  { name: 'Lisa Park', color: 'var(--status-error)' },
];

// The only 5 modules that actually exist in the product today — no invented
// "Fleet Admin"/"Compliance"/"Billing". Plan Monitoring and Events don't
// always point at one addressable record (see `entityFor` below), unlike
// Bins/Workforce/Vehicles which almost always do.
const MODULES: { name: string; icon: React.ReactNode }[] = [
  { name: 'Vehicles', icon: <Icons.Truck01 size={13} /> },
  { name: 'Bins', icon: <Icons.BinCollection size={13} /> },
  { name: 'Workforce', icon: <Icons.Users01 size={13} /> },
  { name: 'Plan Monitoring', icon: <Icons.Activity size={13} /> },
  { name: 'Events', icon: <Icons.Calendar size={13} /> },
];

const CHANGE_TYPES = ['added', 'modified', 'deleted'] as const;

const DETAILS_BY_MODULE: Record<string, string[]> = {
  'Vehicles': ['Updated license plate, odometer reading', 'Changed vehicle status to In Shop', 'Uploaded new registration document', 'Reassigned vehicle to Depot 2'],
  'Bins': ['Bin capacity threshold updated', 'Bin marked out of service', 'Reassigned bin to new zone', 'Fill-level sensor recalibrated'],
  'Workforce': ['New employee record created', 'Shift assignment updated', 'Reassigned to night shift', 'Emergency contact updated'],
  'Plan Monitoring': ['Collection plan rescheduled', 'Route sequence updated', 'Recalculated thresholds for all active plans', 'Plan marked complete'],
  'Events': ['Overspeed alert acknowledged', 'Event severity thresholds updated', 'Geofence violation reviewed', 'Event assigned to dispatcher'],
};

/** "Jul 24, 2026, 4:38 AM" — matches the CentralAuditLog's own formatFullTimestamp. */
function fmt(d: Date): string {
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Automated field-diff sentences — the dominant entry type in production
 * (see the real Vehicle Profile → Timeline tab: "SYSTEM UPDATED LAST RFID
 * TIMESTAMP FROM … TO …"). `**…**` marks the before/after values that render
 * bold; CentralAuditLog uppercases the whole sentence via CSS for system
 * rows, so this is authored in normal case.
 */
const SYSTEM_DETAILS_BY_MODULE: Record<string, (t1: Date, t2: Date) => string> = {
  'Vehicles': (t1, t2) => `Updated last RFID timestamp from **${fmt(t1)}** to **${fmt(t2)}** and last weight timestamp from **${fmt(t1)}** to **${fmt(t2)}**.`,
  'Bins': (t1, t2) => `Updated last fill-level reading from **${fmt(t1)}** to **${fmt(t2)}**.`,
  'Workforce': (t1, t2) => `Updated last shift check-in from **${fmt(t1)}** to **${fmt(t2)}**.`,
  'Plan Monitoring': (t1, t2) => `Updated last route sync timestamp from **${fmt(t1)}** to **${fmt(t2)}**.`,
  'Events': (t1, t2) => `Updated last telemetry ping from **${fmt(t1)}** to **${fmt(t2)}**.`,
};

/** Short one-line label for the same event — what Table view shows. The full
 *  FROM/TO sentence above is reserved for Timeline, where a wrapped
 *  multi-line sentence doesn't break a fixed-height table row. */
const SYSTEM_SUMMARY_BY_MODULE: Record<string, string> = {
  'Vehicles': 'RFID & weight timestamp updated',
  'Bins': 'Fill-level reading updated',
  'Workforce': 'Shift check-in timestamp updated',
  'Plan Monitoring': 'Route sync timestamp updated',
  'Events': 'Telemetry ping timestamp updated',
};

/**
 * Not every module change points at one addressable record. Vehicles/Bins/
 * Workforce almost always do (a plate, a bin, an employee) — return
 * `undefined` here for Plan Monitoring / Events roughly a third of the time
 * to demonstrate a schedule-wide or global change with no single entity;
 * CentralAuditLog renders that cleanly (module context only, no dangling
 * blank cell).
 */
function entityFor(module: string, i: number, rand: () => number): { id: string; label: string } | undefined {
  switch (module) {
    case 'Vehicles': return { id: `VH-${2800 + i}`, label: `Vehicle VH-${2800 + i}` };
    case 'Bins': return { id: `BIN-${4400 + i}`, label: `Bin BIN-${4400 + i}` };
    case 'Workforce': return { id: `EMP-${3100 + i}`, label: `Employee record` };
    case 'Plan Monitoring': return rand() < 0.33 ? undefined : { id: `PLAN-${100 + i}`, label: `Collection plan` };
    default: return rand() < 0.33 ? undefined : { id: `EVT-${9900 + i}`, label: `Event log` };
  }
}

// Deterministic PRNG (mulberry32) so org/module/user/changeType are picked
// independently — plain `i % N` cycles collide with each other whenever N
// shares a factor, which silently correlates fields (e.g. every "added" row
// landing in the same org).
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedEntries(): AuditEntry[] {
  const now = new Date('2026-07-24T14:32:01').getTime();
  const rand = mulberry32(42);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const entries: AuditEntry[] = [];
  for (let i = 0; i < 60; i++) {
    const org = pick(ORGS);
    const module = pick(MODULES);
    const entity = entityFor(module.name, i, rand);
    const timestampMs = now - i * 1000 * 60 * 47;
    const timestamp = new Date(timestampMs).toISOString();

    // ~45% of entries are automated System field-diffs — the real product's
    // dominant entry type — never Added/Deleted (a system diff only ever
    // "modifies" a field) and never carrying attachment evidence.
    const isSystem = rand() < 0.45;
    const user = isSystem ? null : pick(USERS);
    const changeType = isSystem ? 'modified' as const : pick(CHANGE_TYPES);
    const details = isSystem
      ? SYSTEM_DETAILS_BY_MODULE[module.name](new Date(timestampMs - 1000 * 60 * 4), new Date(timestampMs))
      : pick(DETAILS_BY_MODULE[module.name]);

    entries.push({
      id: `audit-${1000 + i}`,
      timestamp,
      orgId: org.id,
      orgName: org.name,
      module: module.name,
      moduleIcon: module.icon,
      entityId: entity?.id,
      entityLabel: entity?.label,
      userName: isSystem ? 'System' : user!.name,
      userColor: isSystem ? undefined : user!.color,
      changeType,
      details,
      summary: isSystem ? SYSTEM_SUMMARY_BY_MODULE[module.name] : details,
      // ~1 in 4 human entries on a record that HAS an entity carries evidence
      // photos, mirroring the per-entity timeline (e.g. a Vehicle Checklist
      // event with handover photos) — system field-diffs and entity-less
      // (schedule-wide/global) changes never attach photos.
      attachments: !isSystem && entity && rand() < 0.25
        ? [{ name: `${entity.id}-evidence-1.jpg` }, { name: `${entity.id}-evidence-2.jpg` }]
        : undefined,
    });
  }
  return entries;
}

const ENTRIES = seedEntries();

function Demo() {
  return (
    <div style={{ height: '100vh' }} className="flex bg-background">
      <SideNav
        logo={<Logo brand="fams" variant="icon" tone="white" height={28} />}
        apps={SIDE_NAV_APPS}
        footerItems={SIDE_NAV_FOOTER}
        moduleRail={<ModuleRail items={MODULE_RAIL_ITEMS} compact />}
        logoGap="lg"
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border px-6 py-2.5">
          <span className="text-body font-semibold text-foreground">FAMS · Product Design</span>
          <span className="text-body-sm text-muted-foreground">/ Central Audit (PD-311)</span>
        </div>
        <div className="min-h-0 flex-1">
          <CentralAuditLog entries={ENTRIES} organizations={ORGS} defaultOrgId={ORGS[0].id} />
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');
createRoot(container).render(<><Demo /><Toaster position="bottom-right" richColors /></>);

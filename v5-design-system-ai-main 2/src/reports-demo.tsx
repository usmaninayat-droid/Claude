import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { CustomReportBuilder } from './components/app-shell';
import type { ReportBuilderConfig } from './components/app-shell';
import { Toaster, toast } from './components/primitives';
import './styles.css';

const EVENT_TYPES = [
  { value: 'overspeed', label: 'Over Speeding', severity: 'normal' as const },
  { value: 'blackspot', label: 'Black Spot', severity: 'critical' as const },
  { value: 'eta', label: 'ETA Violation', severity: 'normal' as const },
  { value: 'cessation', label: 'Cessation of Transmission', severity: 'critical' as const },
  { value: 'tamper', label: 'Tracker Tampering', severity: 'critical' as const },
  { value: 'idle', label: 'Idle Warning', severity: 'normal' as const },
];

const CONFIG: ReportBuilderConfig = {
  filters: [
    { kind: 'multiSelect', key: 'events', label: 'Select Event Type', options: EVENT_TYPES },
    { kind: 'date', key: 'date', label: 'Select Date', mode: 'single' },
    { kind: 'numberRange', key: 'distance', label: 'Distance', unit: 'km', defaultValue: '120' },
  ],
  generate: () => ({
    columns: [{ key: 'v', label: 'Vehicle' }, { key: 'e', label: 'Event' }, { key: 't', label: 'Time' }],
    rows: Array.from({ length: 12 }, (_, i) => ({ v: `M ${1200 + i}`, e: EVENT_TYPES[i % EVENT_TYPES.length].label, t: `0${1 + (i % 8)}:0${i % 6} AM` })),
  }),
};

/** Standalone Reports demo (served at `/reports.html`) — verifies the filter
 *  side panel's smart collapse/expand animation + toolbar toggle. */

function Demo() {
  return (
    <div style={{ height: '100vh' }} className="flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-6 py-2.5">
        <span className="text-body font-semibold text-foreground">Reports</span>
      </div>
      <div className="min-h-0 flex-1">
        <CustomReportBuilder config={CONFIG} initialName="Events Report" onSave={(n) => toast.success(`Saved ${n}`)} />
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');
createRoot(container).render(<><Demo /><Toaster position="bottom-right" richColors /></>);

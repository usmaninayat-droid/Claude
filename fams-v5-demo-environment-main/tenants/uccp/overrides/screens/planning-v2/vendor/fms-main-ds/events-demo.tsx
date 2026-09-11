import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { EventsView, EventDetailSheet } from './components/events';
import type { EventItem } from './components/events';
import type { FeedEntry } from './components/widgets';
import { Toaster } from './components/primitives';
import './styles.css';

/** Standalone Events demo (served at `/events.html`). */

const speed = (peak: number): { t: string; speed: number }[] =>
  Array.from({ length: 17 }, (_, i) => ({ t: `11:${String(i).padStart(2, '0')}`, speed: i < 9 ? 55 + i * 3 : i < 15 ? peak - Math.abs(12 - i) * 6 : 70 - (i - 15) * 8 }));

const details = (limit: number, peak: number) => [
  { label: 'Peak Speed', value: `${peak} km/h` },
  { label: 'Speed Limit', value: `${limit} km/h` },
  { label: 'Duration', value: '2m 14s' },
  { label: 'Distance Over Limit', value: '1.2 km' },
  { label: 'Vehicle Type', value: 'Container' },
];

const EVENTS: EventItem[] = [
  { id: 'EV-2323', type: 'Harsh Braking', title: 'Harsh Braking', subtitle: 'Aggressive throttle · driver flag', criticality: 'critical', timeLabel: '15m ago', dateGroup: 'Today, 23-06-2026', vehicle: 'FM-882', person: 'Ahmed Ali', zone: 'Zone A', location: 'Central Tower, Al Seyouh', metric: { value: '−9.4m/s²', tone: 'var(--status-warning)' }, position: [25.20, 55.33], status: 'Open', details: details(100, 118) },
  { id: 'EV-2324', type: 'Idle Warning', title: 'Idle Warning', subtitle: 'Engine on, no movement', criticality: 'warning', timeLabel: '28m ago', dateGroup: 'Today, 23-06-2026', vehicle: 'TU-5983', person: 'Abubakar R.', zone: 'Zone A', location: 'Central Tower, Al Seyouh', position: [25.19, 55.36], status: 'Open', details: details(100, 0) },
  { id: 'EV-2325', type: 'Over Speeding', title: 'Over Speeding', subtitle: 'Speed exceeded the zone limit', criticality: 'critical', timeLabel: '55m ago', dateGroup: 'Today, 23-06-2026', vehicle: 'TU-5983', person: 'Abubakar R.', zone: 'Zone A', location: 'Central Tower, Al Seyouh', metric: { value: '120 km/h', tone: 'var(--status-warning)' }, position: [25.22, 55.31], status: 'Open', details: details(100, 120), speedSeries: speed(112), speedLimit: 100, breach: [9, 15] },
  { id: 'EV-2326', type: 'Engine Off', title: 'Engine Off', subtitle: 'Stopped at Central Tower', criticality: 'info', timeLabel: '12:23 PM', dateGroup: 'Today, 23-06-2026', vehicle: 'TU-5983', person: 'Abubakar R.', zone: 'Zone A', location: 'Central Tower, Al Seyouh', position: [25.17, 55.38], status: 'Open', details: details(100, 0) },
  { id: 'EV-2327', type: 'Black Spot Alarm', title: 'Black Spot Alarm', subtitle: 'Accident-prone area · caution', criticality: 'info', timeLabel: '10:24 AM', dateGroup: 'Today, 23-06-2026', vehicle: 'TU-5983', person: 'Abubakar R.', zone: 'Zone A', location: 'Central Tower, Al Seyouh', position: [25.15, 55.34], status: 'Open', details: details(100, 0) },
  { id: 'EV-2328', type: 'Over Speeding', title: 'Over Speeding', subtitle: 'Speed exceeded the zone limit', criticality: 'critical', timeLabel: '55m ago', dateGroup: 'Yesterday, 22-06-2026', vehicle: 'TU-5983', person: 'Abubakar R.', zone: 'Zone A', location: 'Central Tower, Al Seyouh', metric: { value: '132 km/h', tone: 'var(--status-warning)' }, position: [25.13, 55.40], status: 'Open', details: details(100, 132), speedSeries: speed(124), speedLimit: 100, breach: [9, 15] },
  { id: 'EV-2329', type: 'Harsh Turning', title: 'Harsh Turning', subtitle: 'Sharp turn at speed on MM Alram', criticality: 'warning', timeLabel: '09:24 AM', dateGroup: 'Yesterday, 22-06-2026', vehicle: 'TU-5983', person: 'Abubakar R.', zone: 'Zone A', location: 'Central Tower, Al Seyouh', metric: { value: '0.71 g ↑0.55', tone: 'var(--status-warning)' }, position: [25.11, 55.37], status: 'Open', details: details(100, 0) },
];

const TIMELINE: FeedEntry[] = [
  { kind: 'system', id: 't1', dateGroup: '22 Jun, 2026', author: 'System', text: 'Event Generated', timestamp: '11:20 pm' },
  { kind: 'system', id: 't2', author: 'Khalid Al-Mansoori', text: 'Update Status', timestamp: '01:24 am', chip: { label: 'Open → Under Inspection', tone: 'warning' } },
  { kind: 'comment', id: 't3', author: 'Ali Raza', avatarFallback: 'AR', timestamp: '03:24 am', text: 'Submitted justification: driver reported a false trigger during the lane merge.' },
  { kind: 'system', id: 't4', dateGroup: '23 Jun, 2026', author: 'Khalid Al-Mansoori', text: 'Update Status', timestamp: '04:25 am', chip: { label: 'Under Inspection → Closed', tone: 'success' } },
];

function Demo() {
  const [detail, setDetail] = React.useState<EventItem | null>(null);
  return (
    <div style={{ height: '100vh' }} className="flex flex-col">
      <div className="flex items-center gap-1 border-b border-border px-4">
        <span className="px-4 py-3 text-body font-semibold text-foreground">Events</span>
        {['Hybrid View', 'List View', 'Map View'].map((t, i) => (
          <button key={t} type="button" className={`relative px-3 py-3 text-body-sm font-semibold ${i === 0 ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{t}{i === 0 && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}</button>
        ))}
        <button type="button" aria-label="Add view" className="ml-1 grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted">+</button>
      </div>
      <div className="min-h-0 flex-1">
        <EventsView events={EVENTS} onViewDetails={(e) => setDetail(e)} />
      </div>
      <EventDetailSheet open={!!detail} event={detail} timeline={TIMELINE} onOpenChange={(o) => { if (!o) setDetail(null); }} onComment={() => {}} />
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');
createRoot(container).render(<><Demo /><Toaster position="bottom-right" richColors /></>);

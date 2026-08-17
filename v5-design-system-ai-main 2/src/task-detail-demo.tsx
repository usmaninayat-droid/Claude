import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { TaskDetail } from './components/app-shell';
import type { TaskDetailGroup } from './components/app-shell';
import { ActivityFeed } from './components/widgets';
import { Badge, Toaster } from './components/primitives';
import './styles.css';

/** Standalone TaskDetail demo (served at `/task-detail.html`) — verifies the
 *  stage-adaptive collapsible groups + Timeline-only right panel. */

const GROUPS: TaskDetailGroup[] = [
  {
    id: 'asset', title: 'Asset Details', defaultOpen: true,
    fields: [
      { label: 'Name', value: 'Toyota Innova' }, { label: 'Plate#', value: 'M 25036' },
      { label: 'Odometer', value: '34,076 km' }, { label: 'Category', value: 'Car' },
      { label: 'Color', value: 'Grey' }, { label: 'Year', value: '2023' },
    ],
  },
  {
    id: 'issue', title: 'Issue Details', defaultOpen: true,
    fields: [
      { label: 'Reported On', value: '28 Jan, 2026' }, { label: 'Issue Type', value: 'Engine failure' },
    ],
  },
  {
    id: 'schedule', title: 'Schedule Info', defaultOpen: false,
    fields: [
      { label: 'Service Date', value: '28 Jan, 2026' }, { label: 'ETA', value: '3 hour' },
      { label: 'Garage', value: 'Garage A' },
    ],
  },
];

const FEED = [
  { kind: 'system' as const, id: 's1', dateGroup: '18 May, 2025', author: 'System', text: 'Created a maintenance request.', timestamp: '9:49 am' },
  { kind: 'comment' as const, id: 'c1', dateGroup: 'Today', author: 'Khalid Al-Mansoori', avatarFallback: 'KA', timestamp: '12:01 pm', text: '@ZaydAl-Farsi please confirm the oil change scope.' },
  { kind: 'comment' as const, id: 'c2', author: 'Zayd Al-Farsi', avatarFallback: 'ZA', timestamp: '12:04 pm', text: '@KhalidAl-Mansoori confirmed, proceeding now.' },
];

function Demo() {
  return (
    <div style={{ height: '100vh' }} className="bg-background">
      <TaskDetail
        ticketId="IM-231454"
        moduleLabel="Maintenance"
        title="Engine failure — ASW-2321"
        status={<Badge variant="warning">Under Inspection</Badge>}
        details={{
          left: [
            { label: 'Maintenance Type', value: <Badge variant="success">Corrective</Badge> },
            { label: 'Created By', value: 'Zayd Al-Farsi' },
            { label: 'Creation Date', value: '28 Jan, 2026' },
          ],
          right: [
            { label: 'Service Category', value: 'Oil Change' },
            { label: 'Priority', value: 'High' },
            { label: 'Due Date', value: '28 Jan, 2026' },
          ],
        }}
        groups={GROUPS}
        timelineTitle="Timeline"
        timeline={<ActivityFeed entries={FEED} onSubmit={() => {}} />}
      />
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root not found');
createRoot(container).render(<><Demo /><Toaster position="bottom-right" richColors /></>);

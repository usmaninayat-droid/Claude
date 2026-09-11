import { Section, Demo } from './kit';
import {
  NotificationCard,
  ContextBanner,
  HealthStrip,
  EntityProfileCard,
  TelematicsStatusCard,
  Button,
} from '../components';
import { Radio } from 'lucide-react';

export function Widgets() {
  return (
    <Section
      id="widgets"
      title="Domain Widgets"
      description="Higher-order compositions for FAMS workflows — alerts, health summaries, entity profiles and telematics status."
    >
      <Demo title="Context banner" className="flex-col items-stretch">
        <ContextBanner severity="error" title="Asset offline" description="Mixer 4218 has not reported telemetry for 2h 14m." actions={<Button size="sm" variant="secondary">Investigate</Button>} />
        <ContextBanner severity="warning" title="Service due" description="3 assets are within 200km of their maintenance interval." />
        <ContextBanner severity="success" title="All clear" description="Every active asset reported in the last 15 minutes." />
      </Demo>

      <Demo title="Health strip" className="flex-col items-stretch">
        <HealthStrip
          cells={[
            { label: 'STATUS', value: 'Active', status: 'success' },
            { label: 'FUEL', value: '45%', status: 'warning' },
            { label: 'ENGINE', value: 'OK', status: 'success' },
            { label: 'ALERTS', value: '2', status: 'error' },
            { label: 'MILEAGE', value: '128,400 km', status: 'muted' },
          ]}
        />
      </Demo>

      <Demo title="Notification cards" className="flex-col items-stretch">
        <NotificationCard title="New work order" description="WO-1245 assigned to your team." timestamp="2m ago" source="Maintenance" severity="info" unread avatarFallback="MT" />
        <NotificationCard title="SLA breach imminent" description="WO-1187 due in 30 minutes." timestamp="8m ago" source="System" severity="warning" />
      </Demo>

      <Demo title="Entity profile · Telematics">
        <EntityProfileCard
          avatarFallback="42"
          name="Mixer 4218"
          subtitle="Concrete mixer · MAN TGS"
          tags={[
            { label: 'Active', color: 'var(--status-success)' },
            { label: 'Dubai Yard', color: 'var(--primary)' },
          ]}
          fields={[
            { label: 'Equipment ID', value: 'EQ-4218' },
            { label: 'Plate', value: 'D 48213' },
            { label: 'Year', value: '2022' },
            { label: 'Odometer', value: '128,400 km' },
          ]}
          className="w-80"
        />
        <TelematicsStatusCard label="Telematics" icon={<Radio className="size-4" />} status="reporting" statusLabel="Reporting" timestamp="Updated 3 min ago" subtitle="25.1972° N, 55.2744° E" />
      </Demo>
    </Section>
  );
}

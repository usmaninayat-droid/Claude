import { Section, Demo } from './kit';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  StatePill,
  DowntimeBadge,
  ListRow,
  Timeline,
  DataTable,
  type DataTableColumn,
  Button,
  Badge,
  Avatar,
} from '../components';
import { CheckCircle, Truck, Wrench, FileText } from 'lucide-react';

type AssetRow = {
  id: string;
  name: string;
  status: { label: string; variant: string };
  compliance: { percent: number };
  driver: { fallback: string; label: string };
};

const COLUMNS: DataTableColumn<AssetRow>[] = [
  { id: 'name', header: 'Asset', accessor: (r) => r.name, sortable: true },
  { id: 'status', header: 'Status', accessor: (r) => r.status, kind: 'single-badge' },
  { id: 'compliance', header: 'Compliance', accessor: (r) => r.compliance, kind: 'compliance' },
  { id: 'driver', header: 'Driver', accessor: (r) => r.driver, kind: 'avatar' },
];

const DATA: AssetRow[] = [
  { id: '1', name: 'Mixer 4218', status: { label: 'Active', variant: 'success' }, compliance: { percent: 92 }, driver: { fallback: 'AS', label: 'Ahmed S.' } },
  { id: '2', name: 'Tanker 5301', status: { label: 'Maintenance', variant: 'warning' }, compliance: { percent: 64 }, driver: { fallback: 'MK', label: 'Maria K.' } },
  { id: '3', name: 'Loader 1190', status: { label: 'Offline', variant: 'destructive' }, compliance: { percent: 38 }, driver: { fallback: 'JD', label: 'John D.' } },
];

const TIMELINE = [
  { id: '1', title: 'Work order created', subtitle: 'WO-1245 · Preventive', timestamp: '09:12', icon: <FileText className="size-3.5" />, color: 'var(--status-info)' },
  { id: '2', title: 'Assigned to Ahmed S.', timestamp: '09:40', icon: <Truck className="size-3.5" />, color: 'var(--chart-3)' },
  { id: '3', title: 'Maintenance completed', subtitle: 'Pump assembly replaced', timestamp: '12:05', icon: <CheckCircle className="size-3.5" />, color: 'var(--status-success)' },
];

export function DataDisplay() {
  return (
    <Section
      id="data-display"
      title="Data Display"
      description="The enterprise surface: cards, the sortable selectable DataTable with typed cell kinds, list rows, status pills, downtime badges and timelines."
    >
      <Demo title="Card">
        <Card className="w-80">
          <CardHeader>
            <CardTitle>Fleet utilisation</CardTitle>
            <CardDescription>Rolling 7-day window</CardDescription>
          </CardHeader>
          <CardContent className="text-body-sm text-muted-foreground">
            78% of active assets reported telemetry in the last hour.
          </CardContent>
          <CardFooter>
            <Button variant="secondary" size="sm">
              View report
            </Button>
          </CardFooter>
        </Card>
      </Demo>

      <Demo title="State pill · Downtime badge">
        <StatePill label="IN PROGRESS" bg="var(--status-info)" />
        <StatePill label="ON HOLD" bg="var(--status-warning)" />
        <StatePill label="RESOLVED" bg="var(--status-success)" />
        <StatePill label="CRITICAL" bg="var(--status-error)" />
        <DowntimeBadge start="2026-06-09T08:00:00Z" end="2026-06-09T10:30:00Z" />
      </Demo>

      <Demo title="List rows" className="flex-col items-stretch gap-0 p-0">
        <ListRow
          leading={<Avatar size="sm" fallback="AS" />}
          title="Ahmed Saleh"
          subtitle="Concrete mixer · Dubai Yard"
          trailing={<Badge variant="success">Active</Badge>}
          unread
        />
        <ListRow
          leading={<Avatar size="sm" fallback="MK" />}
          title="Maria Kovac"
          subtitle="Tanker · Abu Dhabi"
          trailing={<Badge variant="warning">Service</Badge>}
        />
        <ListRow
          leading={<Avatar size="sm" fallback="JD" />}
          title="John Doe"
          subtitle="Loader · Sharjah"
          trailing={<Badge variant="muted">Idle</Badge>}
        />
      </Demo>

      <Demo title="Timeline">
        <Timeline items={TIMELINE} className="max-w-md" />
      </Demo>

      <Demo title="DataTable" className="flex-col items-stretch p-0">
        <DataTable<AssetRow>
          columns={COLUMNS}
          data={DATA}
          getRowId={(r) => r.id}
          selectable
          stickyHeader
        />
      </Demo>
    </Section>
  );
}

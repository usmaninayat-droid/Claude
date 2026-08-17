import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { DataTable } from '../components/data-display';
import type { DataTableColumn } from '../components/data-display';
import { Badge } from '../components/primitives';

interface DemoAsset {
  id: string;
  name: string;
  category: string;
  plant: string;
  status: 'Active' | 'Under Maintenance' | 'Inactive';
  hours: number;
}

const ROWS: DemoAsset[] = [
  { id: 'EQ-001', name: 'Boom Pump BP-36Z', category: 'Boom Pump', plant: 'Main Plant 1', status: 'Active', hours: 4120 },
  { id: 'EQ-003', name: 'Batching Plant BP-180', category: 'Batching Plant', plant: 'Main Plant 1', status: 'Active', hours: 8100 },
  { id: 'EQ-005', name: 'Mixer Truck MT-10A', category: 'Mixer Truck', plant: 'Main Plant 1', status: 'Under Maintenance', hours: 6200 },
  { id: 'EQ-008', name: 'Crusher CR-900', category: 'Crusher', plant: 'Main Plant 2', status: 'Active', hours: 11240 },
  { id: 'EQ-011', name: 'Wheel Loader WL-50', category: 'Loader', plant: 'Main Plant 2', status: 'Inactive', hours: 9020 },
];

const statusBadge = (s: DemoAsset['status']) =>
  s === 'Active' ? 'success' : s === 'Under Maintenance' ? 'warning' : 'muted';

// Meta<typeof DataTable> collapses the row generic to `unknown`, so type the
// columns against the default (any) and keep the row param annotations local.
const COLUMNS: DataTableColumn[] = [
  { id: 'name', header: 'Asset', accessor: (r: DemoAsset) => r.name, sortable: true },
  { id: 'category', header: 'Category', accessor: (r: DemoAsset) => r.category },
  { id: 'plant', header: 'Plant', accessor: (r: DemoAsset) => r.plant },
  { id: 'status', header: 'Status', cell: (r: DemoAsset) => <Badge variant={statusBadge(r.status)} size="sm">{r.status}</Badge> },
  { id: 'hours', header: 'Operating Hours', align: 'right', accessor: (r: DemoAsset) => `${r.hours.toLocaleString()} hrs`, sortable: true },
];

const meta = {
  title: 'Data Display/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  args: {
    columns: COLUMNS,
    data: ROWS,
    getRowId: (r) => (r as DemoAsset).id,
  },
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Clickable: Story = { args: { onRowClick: fn() } };
export const Selectable: Story = { args: { selectable: true } };
export const Loading: Story = { args: { loading: true } };
export const Empty: Story = {
  args: {
    data: [],
    emptyState: <div className="py-12 text-center text-body-sm text-muted-foreground">No matching records.</div>,
  },
};

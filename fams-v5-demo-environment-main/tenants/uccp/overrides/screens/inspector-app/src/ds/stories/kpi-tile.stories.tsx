import type { Meta, StoryObj } from '@storybook/react-vite';
import { ClipboardList, AlertTriangle, Banknote } from 'lucide-react';
import { KpiTile } from '../components/data-viz';

const meta = {
  title: 'Data Viz/KpiTile',
  component: KpiTile,
  tags: ['autodocs'],
  args: { label: 'Total Work Orders', value: 22, icon: <ClipboardList size={18} /> },
} satisfies Meta<typeof KpiTile>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const TrendingUp: Story = {
  args: { label: 'Revenue (MTD)', value: 'AED 59.8k', trend: 'up', trendValue: '+9%', description: 'vs last month', icon: <Banknote size={18} /> },
};
export const TrendingDown: Story = {
  args: { label: 'Overdue', value: 3, trend: 'down', trendValue: '-1', icon: <AlertTriangle size={18} />, iconBg: 'rgba(240,68,56,0.1)', iconColor: 'var(--destructive)' },
};
export const WithUnit: Story = {
  args: { label: 'Tonnes Delivered', value: 58, unit: 't', trend: 'up', trendValue: '+12%' },
};
export const KpiRow: Story = {
  render: () => (
    <div className="grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
      <KpiTile label="Manifests" value={8} icon={<ClipboardList size={18} />} />
      <KpiTile label="Delivered" value={5} trend="up" trendValue="+8%" />
      <KpiTile label="Flagged" value={1} icon={<AlertTriangle size={18} />} iconBg="rgba(240,68,56,0.1)" iconColor="var(--destructive)" />
      <KpiTile label="Compliance" value="94%" trend="up" trendValue="+2%" />
    </div>
  ),
};

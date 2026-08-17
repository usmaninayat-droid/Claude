import type { Meta, StoryObj } from '@storybook/react-vite';
import { BarChart } from '../components/data-viz';

const meta = {
  title: 'Data Viz/BarChart',
  component: BarChart,
  tags: ['autodocs'],
  args: {
    data: [
      { stage: 'New', count: 5 },
      { stage: 'Scheduled', count: 4 },
      { stage: 'In Progress', count: 6 },
      { stage: 'Inspection', count: 3 },
      { stage: 'Closed', count: 4 },
    ],
    xKey: 'stage',
    series: [{ dataKey: 'count', name: 'Work Orders' }],
    height: 280,
  },
} satisfies Meta<typeof BarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const CustomSeriesColor: Story = {
  args: { series: [{ dataKey: 'count', name: 'Work Orders', color: 'var(--chart-3)' }] },
};

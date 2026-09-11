import type { Meta, StoryObj } from '@storybook/react-vite';
import { DonutChart } from '../components/data-viz';

const meta = {
  title: 'Data Viz/DonutChart',
  component: DonutChart,
  tags: ['autodocs'],
  args: {
    data: [
      { name: 'Preventive', value: 14, color: 'var(--chart-4)' },
      { name: 'Corrective', value: 8, color: 'var(--chart-1)' },
    ],
    height: 280,
    centerLabel: <span className="text-h6 font-semibold">22</span>,
  },
} satisfies Meta<typeof DonutChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WasteStreams: Story = {
  args: {
    data: [
      { name: 'Construction', value: 2, color: 'var(--chart-1)' },
      { name: 'Organic', value: 2, color: 'var(--chart-4)' },
      { name: 'Hazardous', value: 2, color: '#f04438' },
      { name: 'Inert', value: 2, color: 'var(--chart-3)' },
    ],
    centerLabel: <span className="text-h6 font-semibold">8</span>,
  },
};

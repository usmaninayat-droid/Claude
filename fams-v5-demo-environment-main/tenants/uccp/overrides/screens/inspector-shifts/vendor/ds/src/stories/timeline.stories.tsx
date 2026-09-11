import type { Meta, StoryObj } from '@storybook/react-vite';
import { Timeline } from '../components/data-display';

const meta = {
  title: 'Data Display/Timeline',
  component: Timeline,
  tags: ['autodocs'],
  args: {
    items: [
      { id: '1', title: 'Work order created', subtitle: 'System', timestamp: '17 Feb, 09:00', color: 'var(--primary)' },
      { id: '2', title: 'Technician assigned', subtitle: 'Mushtaq Ali', timestamp: '17 Feb, 09:40', color: '#f79009' },
      { id: '3', title: 'Inspection passed', subtitle: 'QA Team', timestamp: '17 Feb, 14:15', color: '#ab47bc' },
      { id: '4', title: 'Closed — POD issued', subtitle: 'System', timestamp: '17 Feb, 16:02', color: '#12b76a' },
    ],
  },
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActivityFeed: Story = {};
export const SingleEvent: Story = {
  args: { items: [{ id: '1', title: 'Manifest created', subtitle: 'Al Dhafra Constructions', timestamp: '17 Feb, 2026' }] },
};

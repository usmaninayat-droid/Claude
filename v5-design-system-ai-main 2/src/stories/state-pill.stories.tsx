import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatePill } from '../components/data-display';

const meta = {
  title: 'Data Display/StatePill',
  component: StatePill,
  tags: ['autodocs'],
  args: { label: 'In Progress', bg: '#0072d6' },
  argTypes: { bg: { control: 'color' }, text: { control: 'color' } },
} satisfies Meta<typeof StatePill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const InProgress: Story = {};
export const NewRequest: Story = { args: { label: 'New Requests', bg: '#f79009' } };
export const Closed: Story = { args: { label: 'Closed', bg: '#2aaa48' } };
export const Small: Story = { args: { size: 'sm', label: 'Scheduled', bg: '#f12cc6' } };
export const PipelineStages: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <StatePill label="New Requests" bg="#f79009" />
      <StatePill label="Scheduled" bg="#f12cc6" />
      <StatePill label="In Progress" bg="#0072d6" />
      <StatePill label="Under Inspection" bg="#ab47bc" />
      <StatePill label="Closed" bg="#2aaa48" />
    </div>
  ),
};

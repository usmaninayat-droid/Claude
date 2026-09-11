import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from '../components/primitives';

const meta = {
  title: 'Primitives/Badge',
  component: Badge,
  tags: ['autodocs'],
  args: { children: 'Badge', size: 'sm' },
  argTypes: {
    variant: { control: 'select', options: ['secondary', 'success', 'warning', 'destructive', 'info', 'muted'] },
    color: { control: 'color' },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = { args: { variant: 'success', children: 'Active' } };
export const Warning: Story = { args: { variant: 'warning', children: 'Expiring' } };
export const Destructive: Story = { args: { variant: 'destructive', children: 'Flagged' } };
export const Info: Story = { args: { variant: 'info', children: 'In Transit' } };
export const Muted: Story = { args: { variant: 'muted', children: 'Draft' } };
export const CustomColor: Story = {
  args: { color: '#ab47bc', children: 'Under Inspection' },
};
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="secondary" size="sm">Secondary</Badge>
      <Badge variant="success" size="sm">Success</Badge>
      <Badge variant="warning" size="sm">Warning</Badge>
      <Badge variant="destructive" size="sm">Destructive</Badge>
      <Badge variant="info" size="sm">Info</Badge>
      <Badge variant="muted" size="sm">Muted</Badge>
    </div>
  ),
};

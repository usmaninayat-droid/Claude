import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { Plus } from 'lucide-react';
import { Button } from '../components/primitives';

const meta = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  args: { onClick: fn(), children: 'Button' },
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'tertiary', 'ghost', 'destructive'] },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'icon'] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: 'primary' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Destructive: Story = { args: { variant: 'destructive', children: 'Delete record' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Loading: Story = { args: { loading: true, children: 'Saving…' } };
export const Disabled: Story = { args: { disabled: true } };
export const Small: Story = { args: { size: 'sm', children: 'Small button' } };
export const WithIcon: Story = {
  args: { children: undefined },
  render: (args) => (
    <Button {...args}>
      <Plus size={16} /> Create New
    </Button>
  ),
};

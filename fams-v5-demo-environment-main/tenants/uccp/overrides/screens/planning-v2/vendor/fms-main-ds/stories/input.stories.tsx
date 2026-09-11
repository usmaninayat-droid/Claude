import type { Meta, StoryObj } from '@storybook/react-vite';
import { Search, Mail } from 'lucide-react';
import { Input } from '../components/primitives';

const meta = {
  title: 'Primitives/Input',
  component: Input,
  tags: ['autodocs'],
  args: { placeholder: 'Type here…' },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const WithLabel: Story = { args: { label: 'Asset name', placeholder: 'e.g. Boom Pump BP-36Z' } };
export const WithHint: Story = { args: { label: 'Email', hint: 'Work email preferred.', placeholder: 'name@company.ae' } };
export const WithError: Story = { args: { label: 'Tonnage', error: 'Must be between 22 and 30 tonnes.', defaultValue: '45' } };
export const WithLeadingIcon: Story = {
  args: { placeholder: 'Search anything here', leadingIcon: <Search size={16} /> },
};
export const WithTrailingIcon: Story = {
  args: { label: 'Email', placeholder: 'name@company.ae', trailingIcon: <Mail size={16} /> },
};
export const Disabled: Story = { args: { label: 'Locked field', disabled: true, defaultValue: 'Read only' } };

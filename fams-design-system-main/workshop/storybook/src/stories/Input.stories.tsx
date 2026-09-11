import { Input } from '@fams/ui-kit'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Search } from '@fams/ui-kit/icons'

/**
 * `Input` — the representative FORM component for this harness: floating
 * label, `hasError`, and logical-property icon slots (`leadingIcon` /
 * `trailingIcon` are start/end, not left/right — rule 4).
 */
const meta = {
  title: 'Primitives/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { label: 'Plate number', placeholder: ' ' },
  argTypes: {
    hasError: { control: 'boolean' },
    disabled: { control: 'boolean' },
    isDisabled: { table: { disable: true } },
    leadingIcon: { table: { disable: true } },
    trailingIcon: { table: { disable: true } },
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

/** Plain (no `label`) variant with a logical-start icon — the inline filter/search shape. */
export const WithLeadingIcon: Story = {
  args: { label: undefined, placeholder: 'Search vehicles…', leadingIcon: <Search /> },
}

/** `hasError` sets `aria-invalid` and the destructive border/ring tokens. */
export const Invalid: Story = {
  args: { hasError: true, defaultValue: 'AB-123' },
}

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'AB-123' },
}

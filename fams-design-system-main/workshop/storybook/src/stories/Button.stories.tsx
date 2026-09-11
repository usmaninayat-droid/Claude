import { Button } from '@fams/ui-kit'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Plus } from '@fams/ui-kit/icons'

/**
 * `Button` — L1 primitive, imported from the real `@fams/ui-kit` dist (rule:
 * never re-implement a component in a workshop app).
 */
const meta = {
  title: 'Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  args: { children: 'Save changes' },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['primary', 'secondary', 'tertiary', 'ghost', 'destructive', 'link'],
    },
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg', 'icon', 'iconRound'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    isLoading: { table: { disable: true } },
    isDisabled: { table: { disable: true } },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

/** Prop-bearing playground — every variant/size reachable from the controls panel. */
export const Playground: Story = {}

/** One row per `variant`. */
export const Variants: Story = {
  parameters: { layout: 'padded' },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} variant="primary">
        Primary
      </Button>
      <Button {...args} variant="secondary">
        Secondary
      </Button>
      <Button {...args} variant="tertiary">
        Tertiary
      </Button>
      <Button {...args} variant="ghost">
        Ghost
      </Button>
      <Button {...args} variant="destructive">
        Destructive
      </Button>
      <Button {...args} variant="link">
        Link
      </Button>
    </div>
  ),
}

/** One entry per `size`, including the two icon-only shapes. */
export const Sizes: Story = {
  parameters: { layout: 'padded' },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
      <Button {...args} size="icon" aria-label="Add">
        <Plus />
      </Button>
      <Button {...args} size="iconRound" aria-label="Add">
        <Plus />
      </Button>
    </div>
  ),
}

/** `loading` shows the spinner AND disables interaction; `disabled` is the native prop. */
export const States: Story = {
  parameters: { layout: 'padded' },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args}>Default</Button>
      <Button {...args} loading>
        Saving
      </Button>
      <Button {...args} disabled>
        Disabled
      </Button>
    </div>
  ),
}

/**
 * `asChild` merges Button's classes/props onto its single child instead of
 * rendering a `<button>` — the shape a table-row link needs: a link-styled
 * button whose actual DOM element is a real `<a>`, not a button wrapping a
 * link or a link styled by hand outside the DS.
 *
 * `loading`/`isLoading` are not supported in combination with `asChild` (a
 * slotted child must be exactly one element, leaving no room for a sibling
 * spinner) — that combination logs a dev warning and drops the spinner while
 * still applying `aria-busy`/`aria-disabled` to the child.
 */
export const AsChild: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <div className="flex flex-col gap-4">
      <table className="w-full max-w-md border-collapse text-sm">
        <tbody>
          <tr className="border-b border-border">
            <td className="py-2">Invoice #1042</td>
            <td className="py-2 text-right">
              <Button asChild variant="link" size="sm">
                <a href="#invoice-1042">View record</a>
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="secondary">
          <a href="#docs">Secondary as &lt;a&gt;</a>
        </Button>
        <Button asChild variant="destructive" disabled>
          <a href="#disabled" aria-disabled>
            Disabled as &lt;a&gt;
          </a>
        </Button>
      </div>
    </div>
  ),
}

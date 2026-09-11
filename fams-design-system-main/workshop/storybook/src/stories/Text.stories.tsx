import { Text } from '@fams/ui-kit'
import type { Meta, StoryObj } from '@storybook/react-vite'

/**
 * `Text` — L1 primitive, imported from the real `@fams/ui-kit` dist (rule:
 * never re-implement a component in a workshop app). Use it for body copy
 * outside a `Card` instead of `CardDescription` or a hand-rolled
 * `<span className="text-body-sm text-muted-foreground">`.
 */
const meta = {
  title: 'Primitives/Text',
  component: Text,
  tags: ['autodocs'],
  args: { children: 'The quick brown fox jumps over the lazy dog.' },
  argTypes: {
    size: {
      control: 'select',
      options: ['body-xl', 'body-lg', 'body-md', 'body-sm', 'body-xs', 'caption'],
    },
    weight: { control: 'inline-radio', options: ['normal', 'medium', 'semibold', 'bold'] },
    tone: {
      control: 'select',
      options: ['default', 'muted', 'primary', 'destructive', 'success', 'warning', 'info'],
    },
    align: { control: 'inline-radio', options: [undefined, 'start', 'center', 'end'] },
    as: { control: 'inline-radio', options: ['span', 'p', 'div', 'label'] },
    truncate: { control: 'boolean' },
  },
} satisfies Meta<typeof Text>

export default meta
type Story = StoryObj<typeof meta>

/** Prop-bearing playground — every variant reachable from the controls panel. */
export const Playground: Story = {}

/** One row per `size`, from `caption` up to `body-xl`. */
export const Sizes: Story = {
  parameters: { layout: 'padded' },
  render: (args) => (
    <div className="flex flex-col gap-2">
      <Text {...args} size="body-xl">
        body-xl
      </Text>
      <Text {...args} size="body-lg">
        body-lg
      </Text>
      <Text {...args} size="body-md">
        body-md
      </Text>
      <Text {...args} size="body-sm">
        body-sm
      </Text>
      <Text {...args} size="body-xs">
        body-xs
      </Text>
      <Text {...args} size="caption">
        caption
      </Text>
    </div>
  ),
}

/** One entry per `tone`, all on `body-md`. */
export const Tones: Story = {
  parameters: { layout: 'padded' },
  render: (args) => (
    <div className="flex flex-col gap-2">
      <Text {...args} tone="default">
        default
      </Text>
      <Text {...args} tone="muted">
        muted
      </Text>
      <Text {...args} tone="primary">
        primary
      </Text>
      <Text {...args} tone="destructive">
        destructive
      </Text>
      <Text {...args} tone="success">
        success
      </Text>
      <Text {...args} tone="warning">
        warning
      </Text>
      <Text {...args} tone="info">
        info
      </Text>
    </div>
  ),
}

/** `as` swaps the rendered element; `asChild` merges onto a single child via Slot. */
export const AsAndAsChild: Story = {
  parameters: { layout: 'padded' },
  render: (args) => (
    <div className="flex flex-col gap-2">
      <Text {...args} as="p">
        Rendered as a paragraph
      </Text>
      <Text {...args} asChild tone="primary">
        <a href="#">Rendered via asChild onto an anchor</a>
      </Text>
    </div>
  ),
}

import { Heading } from '@fams/ui-kit'
import type { Meta, StoryObj } from '@storybook/react-vite'

/**
 * `Heading` — L1 primitive, imported from the real `@fams/ui-kit` dist (rule:
 * never re-implement a component in a workshop app). `level` controls the
 * rendered element for document structure; `size` is decoupled from it so a
 * structurally-correct heading can carry a different visual size.
 */
const meta = {
  title: 'Primitives/Heading',
  component: Heading,
  tags: ['autodocs'],
  args: { level: 2, children: 'Section heading' },
  argTypes: {
    level: { control: 'inline-radio', options: [1, 2, 3, 4, 5, 6] },
    size: {
      control: 'select',
      options: [undefined, 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    },
    weight: { control: 'inline-radio', options: ['normal', 'medium', 'semibold', 'bold'] },
    tone: {
      control: 'select',
      options: ['default', 'muted', 'primary', 'destructive', 'success', 'warning', 'info'],
    },
    truncate: { control: 'boolean' },
  },
} satisfies Meta<typeof Heading>

export default meta
type Story = StoryObj<typeof meta>

/** Prop-bearing playground — every variant reachable from the controls panel. */
export const Playground: Story = {}

/** One entry per `level` (1–6), each at its own matching default `size`. */
export const Levels: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <div className="flex flex-col gap-2">
      <Heading level={1}>Heading level 1</Heading>
      <Heading level={2}>Heading level 2</Heading>
      <Heading level={3}>Heading level 3</Heading>
      <Heading level={4}>Heading level 4</Heading>
      <Heading level={5}>Heading level 5</Heading>
      <Heading level={6}>Heading level 6</Heading>
    </div>
  ),
}

/** `level` (document structure) decoupled from `size` (visual weight). */
export const DecoupledSize: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <div className="flex flex-col gap-2">
      <Heading level={2} size="h4">
        h2 element, styled as h4 — correct outline, smaller look
      </Heading>
      <Heading level={3} size="h1">
        h3 element, styled as h1 — correct outline, bigger look
      </Heading>
    </div>
  ),
}

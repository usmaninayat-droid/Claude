import { KpiTile } from '@fams/ui-kit'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Truck } from '@fams/ui-kit/icons'

/**
 * `KpiTile` — the representative COMPOSITE for this harness: it composes two
 * L1 primitives (`IconBadge` + `TrendIndicator`) and is fully state-agnostic
 * (rule 8 — `value`/`trend` arrive pre-formatted from the caller).
 */
const meta = {
  title: 'Composites/KpiTile',
  component: KpiTile,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    label: 'Active vehicles',
    value: '1,204',
    icon: Truck,
    tone: 'primary',
    trend: { direction: 'up', value: '+4.2%', note: 'vs last week' },
    description: 'Across all depots',
  },
  argTypes: {
    tone: {
      control: 'inline-radio',
      options: ['primary', 'success', 'warning', 'danger', 'info', 'neutral'],
    },
    clickable: { control: 'boolean' },
    icon: { table: { disable: true } },
    trend: { table: { disable: true } },
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof KpiTile>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

/** Trend directions — `up` / `down` / `flat`. "Good vs bad" stays the caller's call. */
export const Trends: Story = {
  render: (args) => (
    <div className="grid grid-cols-1 gap-4">
      <KpiTile {...args} label="Utilisation" trend={{ direction: 'up', value: '+8%' }} />
      <KpiTile
        {...args}
        label="Fuel spend"
        unit="AED"
        value="42,900"
        tone="warning"
        trend={{ direction: 'down', value: '-3.1%', note: 'vs last month' }}
      />
      <KpiTile
        {...args}
        label="Open work orders"
        value="37"
        tone="neutral"
        trend={{ direction: 'flat', value: '0%' }}
      />
    </div>
  ),
}

/** Minimal shape — no icon, no trend, no description. */
export const Bare: Story = {
  args: { icon: undefined, trend: undefined, description: undefined },
}

/** `clickable` promotes the tile to a keyboard-operable button (Enter/Space). */
export const Clickable: Story = {
  args: { clickable: true, onClick: () => {} },
}

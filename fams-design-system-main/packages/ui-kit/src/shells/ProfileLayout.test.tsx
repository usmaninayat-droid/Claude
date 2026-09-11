import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileLayout, type ProfileTab } from './ProfileLayout'

const TABS: ProfileTab[] = [
  { id: 'overview', label: 'Overview', content: <div>Overview body</div> },
  { id: 'devices', label: 'Devices', content: <div>Devices body</div> },
  { id: 'secret', label: 'Secret', content: <div>Secret body</div>, hidden: true },
  {
    id: 'billing',
    label: 'Billing',
    content: <div>Billing body</div>,
    disabled: true,
    disabledReason: 'Requires the Finance role',
  },
]

describe('ProfileLayout', () => {
  it('renders the title and the first visible tab active', () => {
    render(<ProfileLayout title="Truck 07" tabs={TABS} />)
    expect(screen.getByText('Truck 07')).toBeInTheDocument()
    expect(screen.getByText('Overview body')).toBeVisible()
  })

  it('never renders a hidden tab, even as a trigger', () => {
    render(<ProfileLayout title="Truck 07" tabs={TABS} />)
    expect(screen.queryByText('Secret')).not.toBeInTheDocument()
    expect(screen.queryByText('Secret body')).not.toBeInTheDocument()
  })

  it('renders a disabled tab as inert with its reason', () => {
    render(<ProfileLayout title="Truck 07" tabs={TABS} />)
    const billingTab = screen.getByRole('tab', { name: 'Billing' })
    expect(billingTab).toBeDisabled()
    expect(billingTab.closest('[aria-disabled="true"]')).toBeInTheDocument()
  })

  it('respects a controlled activeTab', () => {
    render(<ProfileLayout title="Truck 07" tabs={TABS} activeTab="devices" onTabChange={vi.fn()} />)
    expect(screen.getByText('Devices body')).toBeVisible()
  })

  it('renders header actions', () => {
    render(
      <ProfileLayout
        title="Truck 07"
        tabs={TABS}
        actions={<button>Edit</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })
})

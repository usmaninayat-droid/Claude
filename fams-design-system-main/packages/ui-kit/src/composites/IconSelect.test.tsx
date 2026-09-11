import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Flag } from '../icons'
import { IconSelect, type IconSelectOption } from './IconSelect'

const OPTIONS: IconSelectOption[] = [
  { value: 'critical', label: 'Critical', icon: <Flag data-testid="flag-critical" /> },
  { value: 'medium', label: 'Medium', icon: <Flag data-testid="flag-medium" /> },
  { value: 'minor', label: 'Minor', icon: <Flag data-testid="flag-minor" /> },
]

describe('IconSelect', () => {
  it('shows the placeholder when nothing is selected', () => {
    render(<IconSelect value={null} onChange={() => {}} options={OPTIONS} placeholder="Select priority" ariaLabel="Priority" />)
    expect(screen.getByText('Select priority')).toBeInTheDocument()
  })

  it('shows the selected option label and its icon in the trigger', () => {
    render(<IconSelect value="critical" onChange={() => {}} options={OPTIONS} ariaLabel="Priority" />)
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByTestId('flag-critical')).toBeInTheDocument()
  })

  it('opens the popover and lists every option with a section label', () => {
    render(<IconSelect value={null} onChange={() => {}} options={OPTIONS} sectionLabel="Priority Level" ariaLabel="Priority" />)
    fireEvent.click(screen.getByRole('button', { name: 'Priority' }))
    expect(screen.getByText('Priority Level')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('commits the clicked option and closes', () => {
    const onChange = vi.fn()
    render(<IconSelect value={null} onChange={onChange} options={OPTIONS} ariaLabel="Priority" />)
    fireEvent.click(screen.getByRole('button', { name: 'Priority' }))
    fireEvent.click(screen.getByRole('option', { name: /Medium/ }))
    expect(onChange).toHaveBeenCalledWith('medium')
  })

  it('does not open when disabled', () => {
    render(<IconSelect value={null} onChange={() => {}} options={OPTIONS} ariaLabel="Priority" disabled />)
    expect(screen.getByRole('button', { name: 'Priority' })).toBeDisabled()
  })
})

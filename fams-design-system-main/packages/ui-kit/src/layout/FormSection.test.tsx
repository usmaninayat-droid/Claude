import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FormSection } from './FormSection'

describe('FormSection', () => {
  it('renders the title and optional description', () => {
    render(
      <FormSection title="Contact details" description="Used for dispatch notifications">
        <input aria-label="Phone" />
      </FormSection>,
    )
    expect(screen.getByText('Contact details')).toBeInTheDocument()
    expect(screen.getByText('Used for dispatch notifications')).toBeInTheDocument()
    expect(screen.getByLabelText('Phone')).toBeInTheDocument()
  })

  it('stacks children with the field gap', () => {
    render(
      <FormSection title="Section">
        <input aria-label="a" />
        <input aria-label="b" />
      </FormSection>,
    )
    expect(screen.getByLabelText('a').parentElement).toHaveClass('gap-field')
  })
})

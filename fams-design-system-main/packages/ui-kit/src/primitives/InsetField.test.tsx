import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InsetField } from './InsetField'
import { Input } from './Input'

describe('InsetField', () => {
  it('renders the label inside the box, above the value', () => {
    render(
      <InsetField label="Title" htmlFor="title-input">
        <Input id="title-input" bare defaultValue="TAMM Issue reported by client" />
      </InsetField>,
    )
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByDisplayValue('TAMM Issue reported by client')).toBeInTheDocument()
  })

  it('binds the visible label to the inner control via htmlFor', () => {
    render(
      <InsetField label="Title" htmlFor="bound-input">
        <Input id="bound-input" bare />
      </InsetField>,
    )
    expect(screen.getByText('Title')).toHaveAttribute('for', 'bound-input')
  })

  it('renders leading/trailing icon slots', () => {
    render(
      <InsetField label="Service Type" leadingIcon={<span data-testid="lead" />} trailingIcon={<span data-testid="trail" />}>
        Waste Container Cleaning
      </InsetField>,
    )
    expect(screen.getByTestId('lead')).toBeInTheDocument()
    expect(screen.getByTestId('trail')).toBeInTheDocument()
  })

  it('applies the filled (readonly/computed) presentation', () => {
    render(
      <InsetField label="Compliance Time" filled data-testid="field">
        4d 12h
      </InsetField>,
    )
    expect(screen.getByTestId('field')).toHaveClass('bg-muted')
  })

  it('marks the label destructive when hasError is set', () => {
    render(
      <InsetField label="Title" hasError>
        value
      </InsetField>,
    )
    expect(screen.getByText('Title')).toHaveClass('text-destructive-emphasis')
  })
})

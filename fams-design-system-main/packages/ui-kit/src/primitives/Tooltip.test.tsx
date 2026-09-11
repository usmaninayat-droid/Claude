import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipSupport } from './Tooltip'

describe('Tooltip', () => {
  it('does not show its content by default', () => {
    render(
      <Tooltip open={false}>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Explanation</TooltipContent>
      </Tooltip>,
    )
    expect(screen.queryByText('Explanation')).not.toBeInTheDocument()
  })

  it('shows its content when open', () => {
    render(
      <Tooltip open>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Explanation</TooltipContent>
      </Tooltip>,
    )
    expect(screen.getByRole('tooltip')).toHaveTextContent('Explanation')
  })

  it('renders a token-filled arrow pointing at the trigger by default', () => {
    render(
      <Tooltip open>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Explanation</TooltipContent>
      </Tooltip>,
    )
    const arrow = document.querySelector('[data-slot="tooltip-arrow"]')
    expect(arrow).toBeInTheDocument()
    expect(arrow).toHaveClass('fill-foreground')
  })

  it('omits the arrow when showArrow is explicitly disabled', () => {
    render(
      <Tooltip open>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent showArrow={false}>Explanation</TooltipContent>
      </Tooltip>,
    )
    expect(document.querySelector('[data-slot="tooltip-arrow"]')).not.toBeInTheDocument()
  })

  it('renders an optional support line for multi-line hints', () => {
    render(
      <Tooltip open>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>
          Explanation
          <TooltipSupport>Additional detail goes here</TooltipSupport>
        </TooltipContent>
      </Tooltip>,
    )
    expect(screen.getByRole('tooltip')).toHaveTextContent('Additional detail goes here')
    const support = document.querySelector('[data-slot="tooltip-support"]')
    expect(support).toBeInTheDocument()
  })
})

import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './Accordion'

function Fixture({ defaultValue }: { defaultValue?: string }) {
  return (
    <Accordion type="single" collapsible defaultValue={defaultValue}>
      <AccordionItem value="a">
        <AccordionTrigger>Section A</AccordionTrigger>
        <AccordionContent>Content A</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>Section B</AccordionTrigger>
        <AccordionContent>Content B</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

describe('Accordion', () => {
  it('renders every item trigger', () => {
    render(<Fixture />)
    expect(screen.getByRole('button', { name: 'Section A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Section B' })).toBeInTheDocument()
  })

  it('shows the default-open item content and keeps the rest unmounted', () => {
    render(<Fixture defaultValue="a" />)
    expect(screen.getByText('Content A')).toBeVisible()
    expect(screen.queryByText('Content B')).not.toBeInTheDocument()
  })

  it('opens a closed item on click and marks it aria-expanded', () => {
    render(<Fixture />)
    const triggerB = screen.getByRole('button', { name: 'Section B' })
    expect(triggerB).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(triggerB)
    expect(triggerB).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Content B')).toBeVisible()
  })

  it('closes the previously open item when a sibling opens (type="single")', () => {
    render(<Fixture defaultValue="a" />)
    fireEvent.click(screen.getByRole('button', { name: 'Section B' }))
    expect(screen.getByRole('button', { name: 'Section A' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Section B' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('exposes data-state so the trigger chevron can rotate on open', () => {
    render(<Fixture defaultValue="a" />)
    expect(screen.getByRole('button', { name: 'Section A' })).toHaveAttribute('data-state', 'open')
    expect(screen.getByRole('button', { name: 'Section B' })).toHaveAttribute('data-state', 'closed')
  })

  it('moves focus to the next trigger on ArrowDown (keyboard nav)', () => {
    render(<Fixture />)
    const triggerA = screen.getByRole('button', { name: 'Section A' })
    const triggerB = screen.getByRole('button', { name: 'Section B' })
    triggerA.focus()
    fireEvent.keyDown(triggerA, { key: 'ArrowDown' })
    expect(triggerB).toHaveFocus()
  })

  it('renders a leading chevron when chevronPosition="start"', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger chevronPosition="start">KPI</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    )
    const trigger = screen.getByRole('button', { name: 'KPI' })
    const svg = trigger.querySelector('svg')
    // The chevron is the trigger's first child when leading.
    expect(trigger.firstElementChild).toBe(svg)
  })

  it('renders `actions` as a sibling of the trigger, not nested inside it', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger actions={<button type="button">More</button>}>KPI</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    )
    const trigger = screen.getByRole('button', { name: 'KPI' })
    const menuButton = screen.getByRole('button', { name: 'More' })
    expect(trigger).not.toContainElement(menuButton)
  })

  it('clicking `actions` does not toggle the accordion item', () => {
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger actions={<button type="button">More</button>}>KPI</AccordionTrigger>
          <AccordionContent>Body</AccordionContent>
        </AccordionItem>
      </Accordion>,
    )
    const trigger = screen.getByRole('button', { name: 'KPI' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'More' }))
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('forwards a ref to the trigger button', () => {
    let node: HTMLButtonElement | null = null
    render(
      <Accordion type="single" collapsible>
        <AccordionItem value="a">
          <AccordionTrigger
            ref={(el) => {
              node = el
            }}
          >
            Section A
          </AccordionTrigger>
          <AccordionContent>Content A</AccordionContent>
        </AccordionItem>
      </Accordion>,
    )
    expect(node).toBeInstanceOf(HTMLButtonElement)
  })
})

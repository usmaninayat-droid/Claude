import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs'

function Fixture({ value }: { value: 'a' | 'b' }) {
  return (
    <Tabs value={value}>
      <TabsList aria-label="Demo tabs">
        <TabsTrigger value="a">Tab A</TabsTrigger>
        <TabsTrigger value="b">Tab B</TabsTrigger>
      </TabsList>
      <TabsContent value="a">Content A</TabsContent>
      <TabsContent value="b">Content B</TabsContent>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('renders the active tab content', () => {
    render(<Fixture value="a" />)
    expect(screen.getByText('Content A')).toBeVisible()
  })

  it('marks the active trigger with aria-selected', () => {
    render(<Fixture value="a" />)
    expect(screen.getByRole('tab', { name: 'Tab A' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Tab B' })).toHaveAttribute('aria-selected', 'false')
  })

  it('re-renders the active panel when the controlled value changes', () => {
    const { rerender } = render(<Fixture value="a" />)
    rerender(<Fixture value="b" />)
    expect(screen.getByRole('tab', { name: 'Tab B' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Content B')).toBeVisible()
  })
})

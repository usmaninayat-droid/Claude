import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Popover, PopoverTrigger, PopoverContent } from './Popover'

describe('Popover', () => {
  it('is closed by default', () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Panel body</PopoverContent>
      </Popover>,
    )
    expect(screen.queryByText('Panel body')).not.toBeInTheDocument()
  })

  it('renders content when defaultOpen is set', () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Panel body</PopoverContent>
      </Popover>,
    )
    expect(screen.getByText('Panel body')).toBeInTheDocument()
  })
})

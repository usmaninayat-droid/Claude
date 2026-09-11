import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Toolbar } from './Toolbar'

describe('Toolbar', () => {
  it('defaults to end-justified with an inline gap', () => {
    render(<Toolbar data-testid="toolbar" />)
    expect(screen.getByTestId('toolbar')).toHaveClass('justify-end', 'gap-inline')
  })

  it('supports the other justify presets', () => {
    const { rerender } = render(<Toolbar data-testid="toolbar" justify="between" />)
    expect(screen.getByTestId('toolbar')).toHaveClass('justify-between')
    rerender(<Toolbar data-testid="toolbar" justify="start" />)
    expect(screen.getByTestId('toolbar')).toHaveClass('justify-start')
  })
})

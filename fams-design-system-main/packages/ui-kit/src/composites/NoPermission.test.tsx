import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NoPermission } from './NoPermission'

describe('NoPermission', () => {
  it('renders content marked aria-disabled, wrapping the child', () => {
    render(
      <NoPermission reason="Requires the Admin role">
        <button>Delete</button>
      </NoPermission>,
    )
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByText('Delete').closest('[aria-disabled]')).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })
})

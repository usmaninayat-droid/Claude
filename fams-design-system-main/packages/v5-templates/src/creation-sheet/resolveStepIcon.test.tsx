import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { resolveStepIcon } from './resolveStepIcon'

describe('resolveStepIcon (W3e)', () => {
  it('passes a non-string ReactNode through unchanged', () => {
    const node = <span data-testid="jsx-icon" />
    expect(resolveStepIcon(node)).toBe(node)
  })

  it('resolves a known icon name to a rendered icon element', () => {
    const resolved = resolveStepIcon('phone')
    expect(resolved).toBeDefined()
    const { container } = render(<>{resolved}</>)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('degrades an unknown icon name to undefined rather than throwing', () => {
    expect(resolveStepIcon('definitely-not-a-real-icon-name')).toBeUndefined()
  })

  it('passes undefined through as undefined', () => {
    expect(resolveStepIcon(undefined)).toBeUndefined()
  })
})

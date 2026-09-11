import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Heading } from './Heading'

describe('Heading', () => {
  it.each([
    [1, 'H1', 'text-h1'],
    [2, 'H2', 'text-h2'],
    [3, 'H3', 'text-h3'],
    [4, 'H4', 'text-h4'],
    [5, 'H5', 'text-h5'],
    [6, 'H6', 'text-h6'],
  ] as const)('maps level=%s to element %s with its matching size class', (level, tag, expectedClass) => {
    render(<Heading level={level}>Heading {level}</Heading>)
    const el = screen.getByText(`Heading ${level}`)
    expect(el.tagName).toBe(tag)
    expect(el).toHaveClass(expectedClass)
  })

  it('defaults weight to bold and tone to default', () => {
    render(<Heading level={1}>Bold default</Heading>)
    const el = screen.getByText('Bold default')
    expect(el).toHaveClass('font-bold', 'text-foreground')
  })

  it('carries no hardcoded style on a bare render', () => {
    render(<Heading level={2}>Bare</Heading>)
    const el = screen.getByText('Bare')
    expect(el.getAttribute('style')).toBeNull()
    for (const cls of Array.from(el.classList)) {
      expect(cls).not.toMatch(/\[#|\[rgb|\[hsl|px\]/)
    }
  })

  it('decouples size from level — an h2 can render at h4 visual size', () => {
    render(
      <Heading level={2} size="h4">
        Decoupled
      </Heading>,
    )
    const el = screen.getByText('Decoupled')
    expect(el.tagName).toBe('H2')
    expect(el).toHaveClass('text-h4')
    expect(el).not.toHaveClass('text-h2')
  })

  it.each([
    ['normal', 'font-normal'],
    ['medium', 'font-medium'],
    ['semibold', 'font-semibold'],
    ['bold', 'font-bold'],
  ] as const)('maps weight=%s to class %s', (weight, expectedClass) => {
    render(
      <Heading level={3} weight={weight}>
        Weighted
      </Heading>,
    )
    expect(screen.getByText('Weighted')).toHaveClass(expectedClass)
  })

  it.each([
    ['default', 'text-foreground'],
    ['muted', 'text-muted-foreground'],
    ['primary', 'text-primary'],
    ['destructive', 'text-destructive-emphasis'],
    ['success', 'text-success-text'],
    ['warning', 'text-warning-text'],
    ['info', 'text-info'],
  ] as const)('maps tone=%s to class %s', (tone, expectedClass) => {
    render(
      <Heading level={3} tone={tone}>
        Toned
      </Heading>,
    )
    expect(screen.getByText('Toned')).toHaveClass(expectedClass)
  })

  it('applies truncate when set', () => {
    render(
      <Heading level={2} truncate>
        Long heading that should be cut off
      </Heading>,
    )
    expect(screen.getByText('Long heading that should be cut off')).toHaveClass('truncate')
  })

  it('renders via Slot and merges classes onto the single child when asChild is set', () => {
    render(
      <Heading level={2} asChild tone="primary">
        <a href="/somewhere">Linked heading</a>
      </Heading>,
    )
    const el = screen.getByText('Linked heading')
    expect(el.tagName).toBe('A')
    expect(el).toHaveAttribute('href', '/somewhere')
    expect(el).toHaveClass('text-primary', 'text-h2')
  })

  it('forwards a ref to the underlying heading element', () => {
    let node: HTMLHeadingElement | null = null
    render(
      <Heading
        level={1}
        ref={(el) => {
          node = el
        }}
      >
        Ref
      </Heading>,
    )
    expect(node).toBeInstanceOf(HTMLHeadingElement)
    expect(node!.tagName).toBe('H1')
  })

  it('merges a caller className without dropping the size class', () => {
    render(
      <Heading level={3} className="italic">
        Merged
      </Heading>,
    )
    const el = screen.getByText('Merged')
    expect(el).toHaveClass('text-h3', 'italic')
  })
})

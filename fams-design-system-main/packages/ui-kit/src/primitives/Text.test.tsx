import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Text } from './Text'

describe('Text', () => {
  it('renders its children in a span by default', () => {
    render(<Text>Hello</Text>)
    const el = screen.getByText('Hello')
    expect(el.tagName).toBe('SPAN')
  })

  it('renders as a <p> when as="p"', () => {
    render(<Text as="p">Paragraph</Text>)
    expect(screen.getByText('Paragraph').tagName).toBe('P')
  })

  it('renders as a <div> when as="div"', () => {
    render(<Text as="div">Block</Text>)
    expect(screen.getByText('Block').tagName).toBe('DIV')
  })

  it('applies the default size/weight/tone with no props set', () => {
    render(<Text>Default</Text>)
    const el = screen.getByText('Default')
    expect(el).toHaveClass('text-body-md', 'font-normal', 'text-foreground')
  })

  it('carries no hardcoded style on a bare render', () => {
    render(<Text>Bare</Text>)
    const el = screen.getByText('Bare')
    expect(el.getAttribute('style')).toBeNull()
    // every class present must be a token-backed utility class, never a raw value
    for (const cls of Array.from(el.classList)) {
      expect(cls).not.toMatch(/\[#|\[rgb|\[hsl|px\]/)
    }
  })

  it.each([
    ['body-xl', 'text-body-xl'],
    ['body-lg', 'text-body-lg'],
    ['body-md', 'text-body-md'],
    ['body-sm', 'text-body-sm'],
    ['body-xs', 'text-body-xs'],
    ['caption', 'text-caption'],
  ] as const)('maps size=%s to class %s', (size, expectedClass) => {
    render(<Text size={size}>Sized</Text>)
    expect(screen.getByText('Sized')).toHaveClass(expectedClass)
  })

  it.each([
    ['normal', 'font-normal'],
    ['medium', 'font-medium'],
    ['semibold', 'font-semibold'],
    ['bold', 'font-bold'],
  ] as const)('maps weight=%s to class %s', (weight, expectedClass) => {
    render(<Text weight={weight}>Weighted</Text>)
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
    render(<Text tone={tone}>Toned</Text>)
    expect(screen.getByText('Toned')).toHaveClass(expectedClass)
  })

  it.each([
    ['start', 'text-start'],
    ['center', 'text-center'],
    ['end', 'text-end'],
  ] as const)('maps align=%s to class %s', (align, expectedClass) => {
    render(<Text align={align}>Aligned</Text>)
    expect(screen.getByText('Aligned')).toHaveClass(expectedClass)
  })

  it('applies truncate when set', () => {
    render(<Text truncate>Long copy that should be cut off</Text>)
    expect(screen.getByText('Long copy that should be cut off')).toHaveClass('truncate')
  })

  it('does not truncate by default', () => {
    render(<Text>Not truncated</Text>)
    expect(screen.getByText('Not truncated')).not.toHaveClass('truncate')
  })

  it('renders via Slot and merges classes onto the single child when asChild is set', () => {
    render(
      <Text asChild tone="muted" data-testid="slotted">
        <a href="/somewhere">Link copy</a>
      </Text>,
    )
    const el = screen.getByText('Link copy')
    expect(el.tagName).toBe('A')
    expect(el).toHaveAttribute('href', '/somewhere')
    expect(el).toHaveClass('text-muted-foreground')
    expect(el).toHaveAttribute('data-testid', 'slotted')
  })

  it('forwards a ref to the underlying element', () => {
    let node: HTMLElement | null = null
    render(
      <Text
        ref={(el) => {
          node = el
        }}
      >
        Ref
      </Text>,
    )
    expect(node).toBeInstanceOf(HTMLSpanElement)
  })

  it('merges a caller className without dropping the size class', () => {
    render(
      <Text size="body-lg" className="italic">
        Merged
      </Text>,
    )
    const el = screen.getByText('Merged')
    expect(el).toHaveClass('text-body-lg', 'italic')
  })
})

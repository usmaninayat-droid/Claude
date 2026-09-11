import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './Card'

describe('Card', () => {
  it('renders the full composition', () => {
    render(
      <Card data-testid="card">
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    )

    expect(screen.getByTestId('card')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 3, name: 'Title' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('renders CardDescription as muted text under CardTitle', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Supporting description</CardDescription>
        </CardHeader>
      </Card>,
    )

    const description = screen.getByText('Supporting description')
    expect(description).toBeInTheDocument()
    expect(description.tagName).toBe('P')
    expect(description).toHaveClass('text-muted-foreground')
  })

  describe('CardTitle', () => {
    it('defaults to an h3 with its existing visual classes, unchanged', () => {
      render(<CardTitle>Title</CardTitle>)
      const el = screen.getByText('Title')
      expect(el.tagName).toBe('H3')
      expect(el).toHaveClass('text-lg', 'font-semibold', 'text-foreground')
      expect(
        screen.getByRole('heading', { level: 3, name: 'Title' }),
      ).toBeInTheDocument()
    })

    it('renders an h1 when level={1}, so a card-only page can have a real top-level heading', () => {
      render(<CardTitle level={1}>Title</CardTitle>)
      const el = screen.getByText('Title')
      expect(el.tagName).toBe('H1')
      expect(
        screen.getByRole('heading', { level: 1, name: 'Title' }),
      ).toBeInTheDocument()
    })

    it.each([
      [1, 'H1'],
      [2, 'H2'],
      [3, 'H3'],
      [4, 'H4'],
      [5, 'H5'],
      [6, 'H6'],
    ] as const)('maps level=%s to element %s', (level, tag) => {
      render(<CardTitle level={level}>Level {level}</CardTitle>)
      expect(screen.getByText(`Level ${level}`).tagName).toBe(tag)
    })

    it('keeps the exact same visual classes regardless of level', () => {
      render(<CardTitle level={1}>Title</CardTitle>)
      const el = screen.getByText('Title')
      expect(el).toHaveClass('text-lg', 'font-semibold', 'text-foreground')
    })

    it('merges a caller className without dropping the default visual classes', () => {
      render(<CardTitle className="italic">Title</CardTitle>)
      const el = screen.getByText('Title')
      expect(el).toHaveClass('text-lg', 'font-semibold', 'text-foreground', 'italic')
    })

    it('forwards a ref to the underlying heading element', () => {
      let node: HTMLHeadingElement | null = null
      render(
        <CardTitle
          ref={(el) => {
            node = el
          }}
        >
          Title
        </CardTitle>,
      )
      expect(node).toBeInstanceOf(HTMLHeadingElement)
      expect(node!.tagName).toBe('H3')
    })

    it('renders via asChild, merging props/className onto the single child instead of the level element', () => {
      render(
        <CardTitle asChild level={1}>
          <a href="/somewhere">Linked title</a>
        </CardTitle>,
      )
      const el = screen.getByText('Linked title')
      expect(el.tagName).toBe('A')
      expect(el).toHaveAttribute('href', '/somewhere')
      expect(el).toHaveClass('text-lg', 'font-semibold', 'text-foreground')
    })
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe 0.1.0's `extend-expect` entry ships empty, and its
// `./matchers` entry re-exports type-only — wire the matcher manually, same
// as `src/a11y.axe.test.tsx`.
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { ImageGallery, type ImageGalleryImage } from './ImageGallery'

expect.extend({ toHaveNoViolations })

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

const axe = configureAxe({
  rules: {
    // jsdom computes no real colors (no stylesheet is even loaded).
    'color-contrast': { enabled: false },
    // Page-level landmark rule — we render fragments, not documents.
    region: { enabled: false },
  },
})

const IMAGES: ImageGalleryImage[] = [
  { src: 'https://example.test/1.jpg', alt: 'Bin overflowing on Main St', caption: 'Lot 1 — 09:12' },
  { src: 'https://example.test/2.jpg', alt: 'Cracked bin lid' },
  { src: 'https://example.test/3.jpg', alt: 'Collection truck arriving' },
]

describe('ImageGallery', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir')
  })

  it('renders a thumbnail per image', () => {
    render(<ImageGallery images={IMAGES} />)
    expect(screen.getByRole('button', { name: /open image 1 of 3: bin overflowing on main st/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open image 2 of 3: cracked bin lid/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open image 3 of 3: collection truck arriving/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the empty state when there are no images', () => {
    render(<ImageGallery images={[]} />)
    expect(screen.getByText('No images')).toBeInTheDocument()
  })

  it('shows skeleton placeholders when loading', () => {
    const { container } = render(<ImageGallery images={[]} loading />)
    expect(screen.queryByText('No images')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4)
  })

  it('opens the lightbox on the clicked image, with a counter and caption', () => {
    render(<ImageGallery images={IMAGES} />)
    fireEvent.click(screen.getByRole('button', { name: /open image 2 of 3/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Cracked bin lid' })).toBeInTheDocument()
  })

  it('shows the caption for images that have one and omits it otherwise', () => {
    render(<ImageGallery images={IMAGES} />)
    fireEvent.click(screen.getByRole('button', { name: /open image 1 of 3/i }))
    expect(screen.getByText('Lot 1 — 09:12')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next image' }))
    expect(screen.queryByText('Lot 1 — 09:12')).not.toBeInTheDocument()
  })

  it('calls onIndexChange when a thumbnail is opened', () => {
    const onIndexChange = vi.fn()
    render(<ImageGallery images={IMAGES} onIndexChange={onIndexChange} />)
    fireEvent.click(screen.getByRole('button', { name: /open image 3 of 3/i }))
    expect(onIndexChange).toHaveBeenCalledWith(2)
  })

  it('Next/Previous buttons wrap around and update the counter', () => {
    render(<ImageGallery images={IMAGES} />)
    fireEvent.click(screen.getByRole('button', { name: /open image 1 of 3/i }))
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Previous image' }))
    expect(screen.getByText('3 / 3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next image' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next image' }))
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('closes on the Close button', () => {
    render(<ImageGallery images={IMAGES} />)
    fireEvent.click(screen.getByRole('button', { name: /open image 1 of 3/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ArrowRight/ArrowLeft keys move to next/previous under LTR', () => {
    render(<ImageGallery images={IMAGES} />)
    fireEvent.click(screen.getByRole('button', { name: /open image 1 of 3/i }))
    const dialog = screen.getByRole('dialog')

    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(screen.getByText('2 / 3')).toBeInTheDocument()

    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('mirrors arrow-key direction under RTL (ArrowRight goes to Previous)', () => {
    // The lightbox portals into document.body, so the RTL ancestor for a
    // component under test must be a real ancestor of the portal, not just
    // a wrapper `div` around the React tree — set it on <html> as any real
    // RTL app would.
    document.documentElement.dir = 'rtl'

    render(<ImageGallery images={IMAGES} />)
    fireEvent.click(screen.getByRole('button', { name: /open image 1 of 3/i }))
    const dialog = screen.getByRole('dialog')
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    fireEvent.keyDown(dialog, { key: 'ArrowRight' })
    expect(screen.getByText('3 / 3')).toBeInTheDocument()

    fireEvent.keyDown(dialog, { key: 'ArrowLeft' })
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
  })

  it('renders under dir="rtl" without error', () => {
    const { container } = render(
      <div dir="rtl">
        <ImageGallery images={IMAGES} />
      </div>,
    )
    expect(container.querySelector('[dir="rtl"]')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open image 1 of 3/i })).toBeInTheDocument()
  })

  it('hides Previous/Next/counter for a single image', () => {
    render(<ImageGallery images={[IMAGES[0]]} />)
    fireEvent.click(screen.getByRole('button', { name: /open image 1 of 1/i }))
    expect(screen.queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous image' })).not.toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(<ImageGallery images={IMAGES} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('has no axe violations with the lightbox open', async () => {
    // The lightbox portals into document.body, outside the render container.
    render(<ImageGallery images={IMAGES} />)
    fireEvent.click(screen.getByRole('button', { name: /open image 1 of 3/i }))
    const results = await axe(document.body)
    expect(results).toHaveNoViolations()
  })
})

import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileTypeIcon } from './FileTypeIcon'

describe('FileTypeIcon', () => {
  it('renders an accessible image role labelled with the extension', () => {
    render(<FileTypeIcon filename="invoice.pdf" />)
    expect(screen.getByRole('img', { name: 'PDF file' })).toBeInTheDocument()
  })

  it('applies the error accent for pdf files', () => {
    render(<FileTypeIcon filename="invoice.pdf" />)
    expect(screen.getByRole('img')).toHaveClass('bg-error-50', 'text-error-700')
  })

  it('applies the success accent for spreadsheet files', () => {
    render(<FileTypeIcon filename="report.xlsx" />)
    expect(screen.getByRole('img')).toHaveClass('bg-success-scale-50', 'text-success-scale-700')
  })

  it('resolves the extension from a bare extension string without a filename', () => {
    render(<FileTypeIcon filename="zip" />)
    expect(screen.getByRole('img', { name: 'ZIP file' })).toBeInTheDocument()
  })

  it('is case-insensitive', () => {
    render(<FileTypeIcon filename="PHOTO.PNG" />)
    expect(screen.getByRole('img', { name: 'PNG file' })).toBeInTheDocument()
  })

  it('uses the neutral accent for an unmapped extension, still labelled by extension', () => {
    render(<FileTypeIcon filename="archive.xyz" />)
    expect(screen.getByRole('img', { name: 'XYZ file' })).toHaveClass(
      'bg-muted',
      'text-muted-foreground',
    )
  })

  it('falls back to the unknown state when no filename is given', () => {
    render(<FileTypeIcon />)
    expect(screen.getByRole('img', { name: 'unknown file type' })).toBeInTheDocument()
  })

  it('applies each size variant', () => {
    const { rerender } = render(<FileTypeIcon filename="a.pdf" size="sm" />)
    expect(screen.getByRole('img')).toHaveClass('size-8')

    rerender(<FileTypeIcon filename="a.pdf" size="md" />)
    expect(screen.getByRole('img')).toHaveClass('size-10')

    rerender(<FileTypeIcon filename="a.pdf" size="lg" />)
    expect(screen.getByRole('img')).toHaveClass('size-12')
  })

  it('forwards a ref', () => {
    let node: HTMLSpanElement | null = null
    render(
      <FileTypeIcon
        filename="a.pdf"
        ref={(el) => {
          node = el
        }}
      />,
    )
    expect(node).toBeInstanceOf(HTMLSpanElement)
  })

  it('merges a custom className', () => {
    render(<FileTypeIcon filename="a.pdf" className="ms-2" />)
    expect(screen.getByRole('img')).toHaveClass('ms-2')
  })
})

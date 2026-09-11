import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TagChipList, type TagOption } from './TagChipList'

const TAGS: TagOption[] = [
  { value: 'lot-1', label: 'Lot 1', color: '#12b76a' },
  { value: 'lot-2', label: 'Lot 2', color: '#f79009' },
  { value: 'lot-7', label: 'Lot 7' },
]

describe('TagChipList', () => {
  it('renders a chip per given tag', () => {
    render(<TagChipList tags={TAGS} />)
    expect(screen.getByText('Lot 1')).toBeInTheDocument()
    expect(screen.getByText('Lot 2')).toBeInTheDocument()
    expect(screen.getByText('Lot 7')).toBeInTheDocument()
  })

  it('caps visible chips and shows an overflow count', () => {
    render(<TagChipList tags={TAGS} max={2} />)
    expect(screen.getByText('Lot 1')).toBeInTheDocument()
    expect(screen.getByText('Lot 2')).toBeInTheDocument()
    expect(screen.queryByText('Lot 7')).not.toBeInTheDocument()
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('renders a remove button per chip when onRemove is given, and calls it with the tag value', () => {
    const onRemove = vi.fn()
    render(<TagChipList tags={TAGS} onRemove={onRemove} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove Lot 2' }))
    expect(onRemove).toHaveBeenCalledWith('lot-2')
  })

  it('renders no remove buttons when onRemove is omitted (pure display)', () => {
    render(<TagChipList tags={TAGS} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

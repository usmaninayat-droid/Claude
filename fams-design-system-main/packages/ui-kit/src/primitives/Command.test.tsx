import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from './Command'

function ListFixture({ onSelect }: { onSelect?: (value: string) => void }) {
  return (
    <Command>
      <CommandInput placeholder="Search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Vehicles">
          <CommandItem value="v1" onSelect={() => onSelect?.('v1')}>
            Vehicle 01
            <CommandShortcut>⌘1</CommandShortcut>
          </CommandItem>
          <CommandItem value="v2" onSelect={() => onSelect?.('v2')}>
            Vehicle 02
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem value="create" onSelect={() => onSelect?.('create')}>
            Create vehicle
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  )
}

describe('Command', () => {
  it('lists every item across groups', () => {
    render(<ListFixture />)
    expect(screen.getByText('Vehicle 01')).toBeInTheDocument()
    expect(screen.getByText('Vehicle 02')).toBeInTheDocument()
    expect(screen.getByText('Create vehicle')).toBeInTheDocument()
    expect(screen.getByText('⌘1')).toBeInTheDocument()
  })

  it('filters items as the query changes', () => {
    render(<ListFixture />)
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'create' } })
    expect(screen.getByText('Create vehicle')).toBeInTheDocument()
    expect(screen.queryByText('Vehicle 01')).not.toBeInTheDocument()
  })

  it('shows CommandEmpty when nothing matches', () => {
    render(<ListFixture />)
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'zzz-no-match' } })
    expect(screen.getByText('No results found.')).toBeInTheDocument()
  })

  it('calls onSelect when an item is chosen', () => {
    const onSelect = vi.fn()
    render(<ListFixture onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Vehicle 02'))
    expect(onSelect).toHaveBeenCalledWith('v2')
  })
})

describe('CommandDialog', () => {
  it('is closed until open', () => {
    render(
      <CommandDialog open={false} onOpenChange={() => {}}>
        <CommandInput placeholder="Type a command…" />
      </CommandDialog>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the command list inside a dialog when open, with an accessible (visually hidden) title', () => {
    render(
      <CommandDialog open onOpenChange={() => {}} title="Jump to…">
        <CommandList>
          <CommandItem value="settings">Open settings</CommandItem>
        </CommandList>
      </CommandDialog>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Open settings')).toBeInTheDocument()
    expect(screen.getByText('Jump to…')).toHaveClass('sr-only')
  })
})

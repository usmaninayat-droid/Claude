import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
// Deep import: vitest-axe's `./matchers` entry re-exports type-only, which
// verbatimModuleSyntax rejects for value use (same pattern as Gauge.test.tsx).
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { DataTablePagination } from './DataTablePagination'

expect.extend({ toHaveNoViolations })

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

const axe = configureAxe({
  rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
})

describe('DataTablePagination', () => {
  it('renders the "X–Y of Z" range label from rowCount', () => {
    render(
      <DataTablePagination page={2} pageCount={5} pageSize={10} rowCount={45} onPageChange={() => {}} />,
    )
    expect(screen.getByText('11–20 of 45')).toBeInTheDocument()
  })

  it('clamps the range label end to rowCount on the last page', () => {
    render(
      <DataTablePagination page={5} pageCount={5} pageSize={10} rowCount={45} onPageChange={() => {}} />,
    )
    expect(screen.getByText('41–45 of 45')).toBeInTheDocument()
  })

  it('omits the range label when rowCount is not provided', () => {
    const { container } = render(
      <DataTablePagination page={1} pageCount={3} pageSize={10} onPageChange={() => {}} />,
    )
    const rangeLabel = container.querySelector('[data-slot="data-table-pagination"] > span')
    expect(rangeLabel).toHaveTextContent('')
  })

  it('shows the current page and total', () => {
    render(<DataTablePagination page={2} pageCount={7} pageSize={10} onPageChange={() => {}} />)
    expect(screen.getByText('Page 2 of 7')).toBeInTheDocument()
  })

  it('calls onPageChange with page - 1 on Previous', () => {
    const onPageChange = vi.fn()
    render(
      <DataTablePagination page={3} pageCount={5} pageSize={10} onPageChange={onPageChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange with page + 1 on Next', () => {
    const onPageChange = vi.fn()
    render(
      <DataTablePagination page={3} pageCount={5} pageSize={10} onPageChange={onPageChange} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('disables Previous on the first page', () => {
    render(<DataTablePagination page={1} pageCount={5} pageSize={10} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).not.toBeDisabled()
  })

  it('disables Next on the last page', () => {
    render(<DataTablePagination page={5} pageCount={5} pageSize={10} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous page' })).not.toBeDisabled()
  })

  it('disables both controls on a single page', () => {
    render(<DataTablePagination page={1} pageCount={1} pageSize={10} onPageChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })

  it('renders under RTL without error', () => {
    render(
      <div dir="rtl">
        <DataTablePagination page={2} pageCount={5} pageSize={10} rowCount={45} onPageChange={() => {}} />
      </div>,
    )
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <DataTablePagination page={2} pageCount={5} pageSize={10} rowCount={45} onPageChange={() => {}} />,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import type { FieldDescriptor } from './types'
import { getComponentRenderer, getReadRenderer } from './registry'
import { DisplayNameProvider } from './display-names'
import { LinkedRecordProvider, type LinkedRecordOpener } from './linked-records'

/**
 * `LinkView` — the generic activatable reference renderer.
 *
 * Two things are pinned here, deliberately with equal weight: that a
 * `LinkView` reference becomes an activatable link that reports its
 * `entityType` + id to the host, AND that every OTHER path through this
 * registry is byte-for-byte what it was before `LinkView` was registered —
 * because reference columns already render across shipped modules and this is
 * a shared seam.
 */
function descriptor(overrides: Partial<FieldDescriptor> = {}): FieldDescriptor {
  return {
    id: 'fld_ref',
    col: 'systemcol1',
    label: 'Company',
    type: 'SingleReference',
    required: false,
    multiple: false,
    refModule: 'Entity',
    entityType: 'x/company',
    component: { name: 'LinkView' },
    ...overrides,
  }
}

const Read = getComponentRenderer('LinkView')!

function wrap(node: ReactNode, open?: LinkedRecordOpener, names: Record<string, string> = {}) {
  return render(
    <DisplayNameProvider resolve={(id) => names[id]}>
      <LinkedRecordProvider onOpenLinkedRecord={open}>{node}</LinkedRecordProvider>
    </DisplayNameProvider>,
  )
}

describe('LinkView — registration', () => {
  it('is registered under the name blueprints already author', () => {
    expect(typeof Read).toBe('function')
  })
})

describe('LinkView — activation', () => {
  it('renders the target record’s display name as an activatable control', () => {
    const open = vi.fn()
    wrap(<Read descriptor={descriptor()} value="CO-04" />, open, { 'CO-04': 'Falcon Logistics' })
    const link = screen.getByRole('button', { name: /Falcon Logistics/ })
    expect(link).toHaveAttribute('data-entity-type', 'x/company')
    expect(link).toHaveAttribute('data-record-id', 'CO-04')
    fireEvent.click(link)
    expect(open).toHaveBeenCalledWith({ entityType: 'x/company', recordId: 'CO-04', col: 'systemcol1' })
  })

  it('falls back to the raw id when the host directory cannot resolve it', () => {
    wrap(<Read descriptor={descriptor()} value="CO-99" />, vi.fn())
    expect(screen.getByRole('button', { name: /CO-99/ })).toBeInTheDocument()
  })

  it('does not bubble its click to the surrounding row (which would open the host record too)', () => {
    const open = vi.fn()
    const rowClick = vi.fn()
    render(
      <LinkedRecordProvider onOpenLinkedRecord={open}>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
        <div onClick={rowClick}>
          <Read descriptor={descriptor()} value="CO-04" />
        </div>
      </LinkedRecordProvider>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(open).toHaveBeenCalledTimes(1)
    expect(rowClick).not.toHaveBeenCalled()
  })
})

describe('LinkView — degradation (existing consumers stay unchanged)', () => {
  const cases: [string, FieldDescriptor, unknown][] = [
    ['no LinkedRecordProvider above it', descriptor(), 'CO-04'],
    ['a non-Entity reference domain', descriptor({ refModule: 'Users' }), 'u_admin'],
    ['an Entity reference with no entityType', descriptor({ entityType: undefined }), 'CO-04'],
    ['an empty value', descriptor(), ''],
  ]

  it.each(cases)('renders EXACTLY the type renderer for %s', (label, desc, value) => {
    const withProvider = label !== 'no LinkedRecordProvider above it'
    const Fallback = getReadRenderer(desc.type)
    const linked = render(
      <LinkedRecordProvider onOpenLinkedRecord={withProvider ? vi.fn() : undefined}>
        <Read descriptor={desc} value={value} />
      </LinkedRecordProvider>,
    )
    const plain = render(<Fallback descriptor={desc} value={value} />)
    expect(linked.container.innerHTML).toBe(plain.container.innerHTML)
    expect(linked.queryByRole('button')).toBeNull()
  })

  it('a reference field that never authored LinkView is untouched by this registration', () => {
    const plain = descriptor({ component: undefined })
    const Fallback = getReadRenderer(plain.type)
    const { container } = render(
      <LinkedRecordProvider onOpenLinkedRecord={vi.fn()}>
        <Fallback descriptor={plain} value="CO-04" />
      </LinkedRecordProvider>,
    )
    expect(container.querySelector('[data-slot="link-view"]')).toBeNull()
    expect(container.textContent).toContain('CO-04')
  })
})

import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRef } from 'react'
import { useDataTableResponsiveColumns } from './useDataTableResponsiveColumns'
import type { DataTableColumn } from './DataTable.types'

/**
 * text-truncation.md §8 — viewport-driven column hide order. jsdom has no
 * layout engine and `vitest.setup.ts` stubs `ResizeObserver` to a no-op, so
 * `containerWidth` never naturally becomes non-zero here — these tests
 * install a LOCAL fake `ResizeObserver` that captures its callback and lets
 * each test fire a controlled `contentRect.width`, the same technique
 * `useVirtualRows.test.ts` documents for "jsdom degrades gracefully."
 */

interface Row {
  imei: string
  driverInVehicle: string
  address: string
  speed: number
}

const COLUMNS: DataTableColumn<Row>[] = [
  { key: 'imei', label: 'IMEI', contentType: 'fixed-id' },
  { key: 'driverInVehicle', label: 'Driver / Vehicle', contentType: 'variable-id' },
  { key: 'address', label: 'Address', contentType: 'descriptive' },
  { key: 'speed', label: 'Speed', contentType: 'fixed-content' },
]

type ROCallback = (entries: Array<{ contentRect: { width: number } }>) => void

function installFakeResizeObserver() {
  let callback: ROCallback | null = null
  class FakeResizeObserver {
    constructor(cb: ROCallback) {
      callback = cb
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  const original = globalThis.ResizeObserver
  globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver
  return {
    fire: (width: number) => callback?.([{ contentRect: { width } }]),
    restore: () => {
      globalThis.ResizeObserver = original
    },
  }
}

describe('useDataTableResponsiveColumns', () => {
  it('hides nothing while unmeasured (jsdom default — containerWidth stays 0)', () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null)
      return useDataTableResponsiveColumns({ containerRef: ref, columns: COLUMNS })
    })
    expect(result.current.size).toBe(0)
  })

  it('hides nothing when every column already fits the measured width', () => {
    const fake = installFakeResizeObserver()
    try {
      const ref = { current: document.createElement('div') }
      const { result } = renderHook(() =>
        useDataTableResponsiveColumns({ containerRef: ref, columns: COLUMNS }),
      )
      act(() => fake.fire(2000))
      expect(result.current.size).toBe(0)
    } finally {
      fake.restore()
    }
  })

  it('drops "descriptive" first as the container narrows', () => {
    const fake = installFakeResizeObserver()
    try {
      const ref = { current: document.createElement('div') }
      const { result } = renderHook(() =>
        useDataTableResponsiveColumns({ containerRef: ref, columns: COLUMNS }),
      )
      // Narrow enough to drop exactly the lowest-tier column, not more.
      act(() => fake.fire(340))
      expect(result.current.has('address')).toBe(true)
      expect(result.current.has('driverInVehicle')).toBe(false)
      expect(result.current.has('imei')).toBe(false)
      expect(result.current.has('speed')).toBe(false)
    } finally {
      fake.restore()
    }
  })

  it('drops "variable-id" next, once descriptive alone is not enough', () => {
    const fake = installFakeResizeObserver()
    try {
      const ref = { current: document.createElement('div') }
      const { result } = renderHook(() =>
        useDataTableResponsiveColumns({ containerRef: ref, columns: COLUMNS }),
      )
      act(() => fake.fire(150))
      expect(result.current.has('address')).toBe(true)
      expect(result.current.has('driverInVehicle')).toBe(true)
      // fixed-id/fixed-content are never auto-hidden, per §8.
      expect(result.current.has('imei')).toBe(false)
      expect(result.current.has('speed')).toBe(false)
    } finally {
      fake.restore()
    }
  })

  it('never auto-hides "fixed-id"/"fixed-content", and always keeps at least one column', () => {
    const fake = installFakeResizeObserver()
    try {
      const ref = { current: document.createElement('div') }
      const { result } = renderHook(() =>
        useDataTableResponsiveColumns({ containerRef: ref, columns: COLUMNS }),
      )
      act(() => fake.fire(1)) // absurdly narrow
      expect(result.current.has('imei')).toBe(false)
      expect(result.current.has('speed')).toBe(false)
      expect(result.current.size).toBeLessThan(COLUMNS.length)
    } finally {
      fake.restore()
    }
  })

  it('never auto-hides a column with isHideable={false}, even if descriptive', () => {
    const fake = installFakeResizeObserver()
    const columns: DataTableColumn<Row>[] = [
      { key: 'address', label: 'Address', contentType: 'descriptive', isHideable: false },
      { key: 'driverInVehicle', label: 'Driver / Vehicle', contentType: 'variable-id' },
    ]
    try {
      const ref = { current: document.createElement('div') }
      const { result } = renderHook(() =>
        useDataTableResponsiveColumns({ containerRef: ref, columns }),
      )
      act(() => fake.fire(150))
      expect(result.current.has('address')).toBe(false)
      expect(result.current.has('driverInVehicle')).toBe(true)
    } finally {
      fake.restore()
    }
  })

  it('subtracts reservedPx (selection/trailing columns) from the available width', () => {
    const fake = installFakeResizeObserver()
    try {
      const ref = { current: document.createElement('div') }
      const { result } = renderHook(() =>
        useDataTableResponsiveColumns({ containerRef: ref, columns: COLUMNS, reservedPx: 300 }),
      )
      // Fits with no reservation, but not once 300px is carved out first.
      act(() => fake.fire(432))
      expect(result.current.has('address')).toBe(true)
    } finally {
      fake.restore()
    }
  })
})

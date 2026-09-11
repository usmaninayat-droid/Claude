import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ComposedModule } from './composer'
import type { ComposedModuleProps, DataAdapter, RendererRegistry } from './composer'
import type { ModuleBlueprint } from './blueprint-schema'
import type { EntityRecord } from './types'

const emptyData: DataAdapter = {
  list: () => [] as EntityRecord[],
  get: () => undefined,
}

const entityModule: ModuleBlueprint = { id: 'things', type: 'entity', label: 'Things' }

describe('ComposedModule — bespoke path', () => {
  it('renders the caller-supplied children verbatim', () => {
    render(
      <ComposedModule>
        <div data-testid="bespoke">hand-rolled</div>
      </ComposedModule>,
    )
    expect(screen.getByTestId('bespoke')).toHaveTextContent('hand-rolled')
  })
})

describe('ComposedModule — low-code path', () => {
  it('renders through the injected renderer for the resolved template ref', () => {
    const renderers: RendererRegistry = {
      ListView: (ctx) => <div data-testid="list">list of {ctx.module.label}</div>,
    }
    render(<ComposedModule blueprint={entityModule} data={emptyData} renderers={renderers} />)
    expect(screen.getByTestId('list')).toHaveTextContent('list of Things')
  })

  it('falls back to a marked placeholder when no renderer is wired', () => {
    render(<ComposedModule blueprint={entityModule} data={emptyData} renderers={{}} />)
    const note = screen.getByRole('note')
    expect(note).toHaveAttribute('data-composer-placeholder')
    expect(note).toHaveTextContent('Things')
  })

  it('falls back to a placeholder for a placeholder module type', () => {
    const reports: ModuleBlueprint = { id: 'r', type: 'reports', label: 'Reports' }
    render(<ComposedModule blueprint={reports} data={emptyData} renderers={{}} />)
    expect(screen.getByRole('note')).toHaveTextContent('Reports')
  })
})

describe('ComposedModule — discriminated-union XOR (compile-time)', () => {
  it('accepts each valid shape and rejects mixing them', () => {
    // Valid low-code props.
    const lowcode: ComposedModuleProps = { blueprint: entityModule, data: emptyData }
    // Valid bespoke props.
    const bespoke: ComposedModuleProps = { children: <span /> }

    // @ts-expect-error — cannot pass both a blueprint and children (XOR).
    const both: ComposedModuleProps = { blueprint: entityModule, data: emptyData, children: <span /> }

    // @ts-expect-error — low-code path requires `data`.
    const missingData: ComposedModuleProps = { blueprint: entityModule }

    // @ts-expect-error — bespoke path forbids a blueprint.
    const bespokeWithBlueprint: ComposedModuleProps = { children: <span />, blueprint: entityModule }

    void lowcode
    void bespoke
    void both
    void missingData
    void bespokeWithBlueprint
    expect(true).toBe(true)
  })
})

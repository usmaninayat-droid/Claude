import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import { BeforePhotosSection, FieldColumnsSection, FieldTilesSection, NotesProofsSection, NotesSection } from './section-renderers'

/**
 * These are PLAIN exported components — this file deliberately does not
 * self-register them (`TaskDetail.tsx` does, as real top-level calls; see
 * that file's comment on why a bare `import './section-renderers'` side
 * effect gets silently dropped once `"sideEffects": false` and no imported
 * binding are both true — confirmed against a real `tsup` build). The
 * "`NotesSection`/`BeforePhotosSection` resolve by name" coverage lives in
 * `TaskDetail.test.tsx` instead, alongside the rest of the section-component
 * dispatch behavior.
 */

const config = {} as EntityConfig

function recordWith(fields: Record<string, unknown>): EntityRecord {
  return { id: 'r1', ...fields }
}

describe('NotesSection', () => {
  it('renders nothing when the configured field is empty', () => {
    const { container } = render(<NotesSection config={config} record={recordWith({})} props={{ textField: 'notes' }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the note body from the configured field', () => {
    render(<NotesSection config={config} record={recordWith({ notes: 'Lorem ipsum.' })} props={{ textField: 'notes' }} />)
    expect(screen.getByText('Lorem ipsum.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show more/i })).toBeInTheDocument()
  })

  it('renders an array of paragraphs as separate <p> blocks', () => {
    render(
      <NotesSection
        config={config}
        record={recordWith({ notes: ['First paragraph.', 'Second paragraph.'] })}
        props={{ textField: 'notes' }}
      />,
    )
    expect(screen.getByText('First paragraph.')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument()
  })
})

describe('BeforePhotosSection', () => {
  it('renders nothing when the configured field is empty', () => {
    const { container } = render(
      <BeforePhotosSection config={config} record={recordWith({})} props={{ imagesField: 'photos' }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a thumbnail per image from the configured field', () => {
    render(
      <BeforePhotosSection
        config={config}
        record={recordWith({
          photos: [
            { src: 'https://example.com/a.jpg', alt: 'Bin overflow, site A' },
            { src: 'https://example.com/b.jpg', alt: 'Bin overflow, site B' },
          ],
        })}
        props={{ imagesField: 'photos' }}
      />,
    )
    expect(screen.getAllByRole('button', { name: /Bin overflow/ })).toHaveLength(2)
  })
})

describe('FieldColumnsSection', () => {
  const fields = [
    { id: 'kpi', label: 'KPI', value: '2.1 Collection & Transportation' },
    { id: 'kpiCategory', label: 'KPI Category', value: '2.0 Solid Waste Collection' },
  ]

  it('defaults to a single column (the KPI accordion pattern)', () => {
    const { container } = render(<FieldColumnsSection config={config} record={recordWith({})} fields={fields} />)
    const grid = container.querySelector('[data-slot="field-grid"]')
    expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(1, minmax(0, 1fr))' })
    expect(screen.getByText('KPI')).toBeInTheDocument()
    expect(screen.getByText('KPI Category')).toBeInTheDocument()
  })

  it('honors an explicit `columns` prop', () => {
    const { container } = render(
      <FieldColumnsSection config={config} record={recordWith({})} fields={fields} props={{ columns: 2 }} />,
    )
    const grid = container.querySelector('[data-slot="field-grid"]')
    expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' })
  })

  it('renders no fields when none are given', () => {
    const { container } = render(<FieldColumnsSection config={config} record={recordWith({})} />)
    expect(container.querySelectorAll('[class*="min-w-0"]')).toHaveLength(0)
  })
})

describe('NotesProofsSection', () => {
  it('renders the "Proofs"/"Notes" subheadings in the accessible field-label role, not gray-400 (fix7, A7 gate blocker)', () => {
    render(
      <NotesProofsSection
        config={config}
        record={recordWith({ notes: 'Inspection passed.', proofs: [{ src: 'photo.jpg', alt: 'Proof' }] })}
        props={{ notesField: 'notes', imagesField: 'proofs' }}
      />,
    )
    const proofsLabel = screen.getByText('Proofs')
    const notesLabel = screen.getByText('Notes')
    expect(proofsLabel).toHaveClass('text-muted-foreground-strong')
    expect(notesLabel).toHaveClass('text-muted-foreground-strong')
    expect(proofsLabel).not.toHaveClass('text-gray-400')
    expect(notesLabel).not.toHaveClass('text-gray-400')
  })
})

describe('FieldTilesSection', () => {
  const fields = [{ id: 'systemcol12', label: 'Municipality', value: 'Al Reef' }]

  it('renders the tile label in the accessible field-label role, not gray-400 (fix7, A7 gate blocker)', () => {
    render(<FieldTilesSection config={config} record={recordWith({})} fields={fields} />)
    const label = screen.getByText('Municipality')
    expect(label).toHaveClass('text-muted-foreground-strong')
    expect(label).not.toHaveClass('text-gray-400')
  })
})

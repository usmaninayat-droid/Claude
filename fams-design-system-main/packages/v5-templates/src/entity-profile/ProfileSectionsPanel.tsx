import { DetailSection, FieldGrid } from '@fams/ui-kit'
import type { CompiledFieldSet, DetailModel, EntityRecord } from '@fams/v5-composer'
import { renderCellValue } from './render-cell-value'

export interface ProfileSectionsPanelProps {
  /** Named field groups, already ordered (`deriveDetail` sorts by `ProfileSection.order`). */
  sections: DetailModel['sections']
  compiled: CompiledFieldSet | null
  record?: EntityRecord
}

/**
 * ProfileSectionsPanel — renders `DetailModel.sections` as named, bordered
 * field-grid cards in a responsive 2-column layout (v5 Figma reference:
 * "Vehicle Details" / "Dimension" / "Weight" / "Performance"). Pure
 * composition of existing core primitives (`DetailSection` + `FieldGrid`) —
 * no new chrome. `EntityProfile` wires this in automatically for any
 * blueprint tab declaring `component: 'sections'`, so a blueprint gets this
 * layout with zero custom React (Rule 4: config-driven rendering).
 */
export function ProfileSectionsPanel({ sections, compiled, record }: ProfileSectionsPanelProps) {
  if (!sections.length) {
    return <p className="text-body-sm text-muted-foreground">No details available.</p>
  }
  return (
    <div className="grid items-start gap-section sm:grid-cols-2">
      {sections.map((section) => (
        <DetailSection key={section.name} title={section.name}>
          <FieldGrid
            layout="rows"
            fields={section.fields.map((f) => ({
              id: f.col,
              label: f.label,
              value: renderCellValue(compiled, record, f),
            }))}
          />
        </DetailSection>
      ))}
    </div>
  )
}

ProfileSectionsPanel.displayName = 'ProfileSectionsPanel'

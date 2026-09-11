import { describe, expect, it } from 'vitest'
import type { EntityConfig } from '@fams/v5-composer'
import { getResolvedConfig } from './demo/content'

/**
 * Phase-4 agent-drill verification (Task 4.D-prep §4 — scaffolding).
 *
 * The drill (docs/agent-drill.md) originally executed this ticket end-to-end:
 *   "IWMP Ticketing: add fields Severity Level (select: Low/Medium/High) and
 *    Penalty Payment Due Date (date) to task details."
 * and proved success by making both fields VISIBLE on the detail surface.
 *
 * Design-QA round 1 (plan/overnight-2026-08-13) superseded that goalpost: the
 * Figma ticket-detail spec does not include either field in the details grid
 * (qa/detail-round1.md #9 — "extra visible rows not in Figma's grid"), so the
 * iwmp tenant delta (`tenants/iwmp/deltas/ticketing.ops.json`) now adds both
 * fields WITHOUT a `details` placement: they stay DEFINED (systemcolumns,
 * still capture/promote-able, still real data) but are deliberately not
 * rendered on the details grid. This file still reads the COMMITTED resolved
 * IWMP ticketing blueprint; it now asserts the fields are defined but NOT
 * placed, matching the corrected design intent.
 *
 *   • DRILL_DONE = true  → the drill's original "field renders" success state.
 *   • DRILL_DONE = false → the design-QA-corrected state (defined, hidden).
 */
const DRILL_DONE = false

/** The two fields the scripted ticket asks for, matched by their human label. */
const DRILL_FIELDS = ['Severity Level', 'Penalty Payment Due Date'] as const

const ticketing = (): EntityConfig =>
  getResolvedConfig('iwmp', 'ticketing') as unknown as EntityConfig

/** A field is VISIBLE when it is defined in systemcolumns AND placed on details. */
function fieldVisibleOnDetails(config: EntityConfig, label: string): boolean {
  const col = config.systemcolumns.find((c) => c.name === label)
  if (!col) return false
  return (config.uiConfig.profile?.details ?? []).some((d) => d.id === col.id)
}

describe('phase-4 drill — IWMP ticketing detail fields', () => {
  for (const label of DRILL_FIELDS) {
    it(`${DRILL_DONE ? 'shows' : 'does not yet show'} "${label}" on the IWMP ticketing detail surface`, () => {
      expect(fieldVisibleOnDetails(ticketing(), label)).toBe(DRILL_DONE)
    })
  }
})

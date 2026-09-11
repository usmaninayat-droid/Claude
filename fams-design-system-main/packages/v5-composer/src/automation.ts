import type { EntityRecord, RecordAutomation, RecordAutomationEffect } from './types'

/**
 * Record-automation evaluator — the generic "when a column reaches a value,
 * create a record in another module and reference it back" vocabulary
 * (`UiConfig.recordAutomation`, see `types.ts`). Mirrors `rules.ts`'s house
 * style: a PURE function, no `eval()`, no React, no I/O, no store access.
 * It only computes the INTENDED effects; the consuming app performs the
 * actual cross-module create + patch (the demo env's `composer-data.ts` is
 * the current caller — ~30 lines composing `@fams/*` seams, no bespoke
 * persistence path).
 *
 * Why "fires only on the declared transition": `when.col`'s value must
 * BECOME `equals` — i.e. the merged (prev + patch) value equals it AND the
 * prior value did not already. That enter-transition guard is what makes a
 * later, unrelated patch to the same record never re-fire the automation
 * (the composer has no other de-dup mechanism — the record's own resulting
 * state IS the "already fired" marker), and what stops the automation from
 * being its own trigger (the PM rule's `status` flips to `jobOrderCreated`
 * as an EFFECT of this function firing, so `status` itself can never be the
 * `when.col` for the same automation without perpetually re-triggering).
 */
export function evalRecordAutomations(
  automations: RecordAutomation[] | undefined,
  prev: EntityRecord,
  patch: Record<string, unknown>,
): RecordAutomationEffect[] {
  if (!automations?.length) return []

  const merged: Record<string, unknown> = { ...prev, ...patch }
  const effects: RecordAutomationEffect[] = []

  for (const automation of automations) {
    const { col, equals } = automation.when
    const nextValue = col in patch ? patch[col] : prev[col]
    if (nextValue !== equals) continue
    if (prev[col] === equals) continue // already at this value before the patch — not a transition, no refire

    const values: Record<string, unknown> = {}
    for (const [targetCol, spec] of Object.entries(automation.create.values)) {
      values[targetCol] = 'const' in spec ? spec.const : merged[spec.fromCol as string]
    }

    effects.push({
      automationId: automation.id,
      create: { entityType: automation.create.entityType, values },
      patchSource: automation.patchSource,
    })
  }

  return effects
}

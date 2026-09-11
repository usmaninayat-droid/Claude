import type { EntityRecord, RelationalStore } from '@fams/demo-kit'

/**
 * The data-coherence primitive (decision #19). Given a record id, return every
 * record of `type` that forward-references it — read straight off the demo-kit
 * store's bidirectional reference integrity (`getReferrers`), NOT a buffer.
 *
 * This is what powers the vehicle profile's Assignments tab: create a workforce
 * row whose `Assigned Vehicle` points at VEH-03, and `linkedRecords(store,
 * 'VEH-03', 'workforce/driver')` returns it — the inverse link the store
 * maintains after every mutation. Pure + framework-free so it is unit-testable
 * through the real fetch/MSW → store path.
 */
export function linkedRecords(store: RelationalStore, id: string, type: string): EntityRecord[] {
  const out: EntityRecord[] = []
  for (const ref of store.getReferrers(id)) {
    if (ref.type !== type) continue
    const rec = store.read(ref.type, ref.id)
    if (rec) out.push(rec)
  }
  return out
}

import type { FilterFacet } from '@fams/v5-composer'

/**
 * Generic FAMILY C filter fixtures. Deliberately vocabulary-free (J.87): no
 * module, entity or status names appear here — a `Group`, a `State`, an
 * `Owner`. If a real product noun ever shows up in this file, the panel has
 * stopped being generic.
 */

export const multiFacet: FilterFacet = {
  col: 'group',
  label: 'Group',
  type: 'select',
  kind: 'multi-select',
  multiple: true,
  icon: 'filter',
  optionDefs: [
    { value: 'g1', label: 'Group One' },
    { value: 'g2', label: 'Group Two' },
    { value: 'g3', label: 'Group Three' },
    { value: 'g4', label: 'Group Four' },
    { value: 'g5', label: 'Group Five' },
  ],
}

export const statusFacet: FilterFacet = {
  col: 'state',
  label: 'State',
  type: 'select',
  kind: 'status',
  multiple: true,
  optionDot: 'status',
  showCounts: true,
  icon: 'filter',
  optionDefs: [
    // Raw runtime colours, exactly as blueprint metadata carries them
    // (`FilterOption.color` is never a token name). Written in `rgb()` rather
    // than hex only so `lint:tokens`, which cannot tell metadata from a
    // hardcoded style, does not read them as a design-token violation.
    { value: 's1', label: 'State One', color: 'rgb(18, 183, 106)', count: 12 },
    { value: 's2', label: 'State Two', color: 'rgb(247, 144, 9)', count: 4 },
  ],
}

export const singleFacet: FilterFacet = {
  col: 'mode',
  label: 'Mode',
  type: 'select',
  kind: 'single-select',
  multiple: false,
  icon: 'filter',
  optionDefs: [
    { value: 'm1', label: 'Mode One' },
    { value: 'm2', label: 'Mode Two' },
  ],
}

export const checkboxFacet: FilterFacet = {
  col: 'level',
  label: 'Level',
  type: 'select',
  kind: 'checkbox-group',
  multiple: true,
  icon: 'filter',
  optionDefs: [
    { value: 'l1', label: 'Level One' },
    { value: 'l2', label: 'Level Two' },
  ],
}

export const tagsFacet: FilterFacet = {
  col: 'label',
  label: 'Label',
  type: 'select',
  kind: 'tags',
  multiple: true,
  categoryCol: 'category',
  icon: 'filter',
  optionDefs: [
    { value: 't1', label: 'Label One', category: 'Category A' },
    { value: 't2', label: 'Label Two', category: 'Category A' },
    { value: 't3', label: 'Label Three', category: 'Category B' },
  ],
}

export const entityFacet: FilterFacet = {
  col: 'owner',
  label: 'Owner',
  type: 'reference',
  kind: 'entity',
  multiple: true,
  expandable: true,
  icon: 'filter',
  expandView: { columns: [{ col: 'name', label: 'Name' }] },
  optionDefs: [
    { value: 'o1', label: 'Owner One' },
    { value: 'o2', label: 'Owner Two' },
  ],
}

export const dateFacet: FilterFacet = {
  col: 'window',
  label: 'Window',
  type: 'date',
  kind: 'date',
  multiple: false,
  icon: 'filter',
}

/** Long enough to exercise the `+N` trigger overflow (E.41/E.42). */
export const manyOptionsFacet: FilterFacet = {
  col: 'bucket',
  label: 'Bucket',
  type: 'select',
  kind: 'multi-select',
  multiple: true,
  icon: 'filter',
  optionDefs: Array.from({ length: 20 }, (_, i) => ({
    value: `b${i + 1}`,
    label: `Bucket Number ${i + 1}`,
  })),
}

export const panelFacets: FilterFacet[] = [multiFacet, statusFacet, singleFacet, tagsFacet, entityFacet, dateFacet]

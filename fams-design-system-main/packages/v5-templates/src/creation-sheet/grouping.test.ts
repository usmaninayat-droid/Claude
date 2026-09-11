import { describe, expect, it } from 'vitest'
import { compileFieldSet, type EntityConfig } from '@fams/v5-composer'
import { computeCreationGroups } from './grouping'
import { companiesConfig, dealsConfig } from '../entity-profile/fixtures'

describe('computeCreationGroups — decision #10 (first-five → Basic Info)', () => {
  it('puts a ≤5-field entity into a single Basic Info group (single sheet)', () => {
    const compiled = compileFieldSet(companiesConfig)
    const groups = computeCreationGroups(compiled, companiesConfig)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.title).toBe('Basic Info')
    expect(groups[0]?.cols).toEqual(['title', 'status', 'systemcol1', 'systemcol2', 'systemcol3'])
  })

  it('splits the first five into Basic Info and the rest into Details (multi-step)', () => {
    const compiled = compileFieldSet(dealsConfig)
    const groups = computeCreationGroups(compiled, dealsConfig)
    expect(groups.map((g) => g.title)).toEqual(['Basic Info', 'Details'])
    expect(groups[0]?.cols).toHaveLength(5)
    expect(groups[1]?.cols).toEqual(['systemcol6', 'systemcol7'])
  })

  it('never offers an Auto (system-generated) field via the IMPLICIT Basic-Info/Details buckets', () => {
    const compiled = compileFieldSet({
      code: 'x/auto',
      version: 1,
      fields: [
        { id: 'fld_uid', col: 'uniqueidentifier', name: 'ID', type: 'Auto' },
        { id: 'fld_title', col: 'title', name: 'Name', type: 'SmallText', required: true },
      ],
    })
    const groups = computeCreationGroups(compiled)
    expect(groups[0]?.cols).toEqual(['title'])
  })

  it('DOES include an Auto field when a blueprint profile section explicitly places it — read-only via AutoWidget', () => {
    // figma-spec-create-sheet.md §2.6's Compliance Time box: a system-computed
    // field the create form still shows, filled/non-interactive, because the
    // blueprint author explicitly placed it in a section (not because it fell
    // into an implicit "first N"/trailing catch-all bucket).
    const config: EntityConfig = {
      code: 'x/auto-section',
      name: 'Auto Section Fixture',
      systemcolumns: [
        { col: 'title', name: 'Name', type: 'SmallText', required: true },
        { col: 'systemcol1', name: 'Notes', type: 'BigText' },
        { col: 'complianceTime', name: 'Compliance Time', type: 'Auto' },
      ],
      listcolumns: [],
      uiConfig: {
        statusList: [],
        profile: {
          title: { col: 'title' },
          details: [],
          sections: [{ id: 'sec_kpi', name: 'KPI', order: 1, fields: [{ col: 'complianceTime' }] }],
        },
      },
    }
    const compiled = compileFieldSet(config)
    const groups = computeCreationGroups(compiled, config)

    // The two non-Auto fields land in the implicit "Basic Info" bucket, same
    // as ever — the Auto field is NOT among them.
    expect(groups[0]?.title).toBe('Basic Info')
    expect(groups[0]?.cols).toEqual(['title', 'systemcol1'])

    // The section that explicitly names it surfaces it — and nothing spills
    // into a trailing "Details" catch-all group.
    const kpiGroup = groups.find((g) => g.id === 'sec_kpi')
    expect(kpiGroup?.cols).toEqual(['complianceTime'])
    expect(groups.find((g) => g.id === 'details')).toBeUndefined()
  })

  it('an Auto field NOT placed in any section still never appears, even alongside other sections', () => {
    const config: EntityConfig = {
      code: 'x/auto-unplaced',
      name: 'Auto Unplaced Fixture',
      systemcolumns: [
        { col: 'title', name: 'Name', type: 'SmallText', required: true },
        { col: 'systemcol1', name: 'Notes', type: 'BigText' },
        { col: 'systemcol2', name: 'Owner', type: 'SmallText' },
        { col: 'complianceTime', name: 'Compliance Time', type: 'Auto' },
      ],
      listcolumns: [],
      uiConfig: {
        statusList: [],
        profile: {
          title: { col: 'title' },
          details: [],
          sections: [{ id: 'sec_notes', name: 'Notes', order: 1, fields: [{ col: 'systemcol1' }] }],
        },
      },
    }
    const compiled = compileFieldSet(config)
    const groups = computeCreationGroups(compiled, config)
    const allCols = groups.flatMap((g) => g.cols)
    expect(allCols).not.toContain('complianceTime')
  })

  it('a section group defaults to showLabel:false; opts in via ProfileSection.showLabel; basic never shows a label; the trailing Details catch-all always does', () => {
    // figma-spec-create-sheet.md's field list has exactly ONE section
    // heading ("Location Details") — every other section (KPI, Note, …)
    // flows its fields unlabeled (finding: "Note" rendered twice, a lone
    // "KPI" heading floated above just Compliance Time).
    const config: EntityConfig = {
      code: 'x/show-label',
      name: 'Show Label Fixture',
      systemcolumns: [
        { col: 'title', name: 'Name', type: 'SmallText', required: true },
        { col: 'systemcol1', name: 'A', type: 'SmallText' },
        { col: 'systemcol2', name: 'B', type: 'SmallText' },
        { col: 'systemcol3', name: 'C', type: 'SmallText' },
        { col: 'systemcol4', name: 'D', type: 'SmallText' },
        { col: 'note', name: 'Note', type: 'BigText' },
        { col: 'coords', name: 'Latitude/Longitude', type: 'SmallText' },
        { col: 'leftover', name: 'Leftover', type: 'SmallText' },
      ],
      listcolumns: [],
      uiConfig: {
        statusList: [],
        profile: {
          title: { col: 'title' },
          details: [],
          sections: [
            { id: 'sec_note', name: 'Note', order: 1, fields: [{ col: 'note' }] },
            { id: 'sec_location', name: 'Location Details', order: 2, showLabel: true, fields: [{ col: 'coords' }] },
          ],
        },
      },
    }
    const compiled = compileFieldSet(config)
    const groups = computeCreationGroups(compiled, config)

    expect(groups.find((g) => g.id === 'basic')?.showLabel).toBe(false)
    expect(groups.find((g) => g.id === 'sec_note')?.showLabel).toBe(false) // no opt-in on this section
    expect(groups.find((g) => g.id === 'sec_location')?.showLabel).toBe(true) // explicit opt-in
    expect(groups.find((g) => g.id === 'details')?.showLabel).toBe(true) // catch-all, unaffected
  })
})

describe('computeCreationGroups — uiConfig.creation.explicit (hidden-in-create)', () => {
  function makeConfig(explicit?: boolean): EntityConfig {
    return {
      code: 'x/explicit',
      name: 'Explicit Fixture',
      systemcolumns: [
        { col: 'title', name: 'Title', type: 'SmallText', required: true },
        { col: 'systemcol1', name: 'Field 1', type: 'SmallText' },
        { col: 'systemcol2', name: 'Field 2', type: 'SmallText' },
        { col: 'systemcol3', name: 'Field 3', type: 'SmallText' },
        { col: 'systemcol4', name: 'Field 4', type: 'SmallText' },
        // Beyond BASIC_COUNT (5): one placed in a section, two never placed
        // anywhere (the "Assigned Driver"/duplicate-Customer-Name shape).
        { col: 'systemcol5', name: 'Location', type: 'SmallText' },
        { col: 'systemcol6', name: 'Assigned Driver', type: 'SmallText' },
        { col: 'systemcol7', name: 'Customer Name (dup)', type: 'SmallText' },
      ],
      listcolumns: [],
      uiConfig: {
        statusList: [],
        profile: {
          title: { col: 'title' },
          details: [],
          sections: [{ id: 'sec_location', name: 'Location', order: 1, fields: [{ col: 'systemcol5' }] }],
        },
        creation: explicit === undefined ? undefined : { explicit },
      },
    }
  }

  it('default (omitted) keeps the trailing "Details" catch-all — unchanged pre-existing behavior', () => {
    const config = makeConfig(undefined)
    const compiled = compileFieldSet(config)
    const groups = computeCreationGroups(compiled, config)
    const details = groups.find((g) => g.id === 'details')
    expect(details?.cols).toEqual(['systemcol6', 'systemcol7'])
  })

  it('explicit: false behaves identically to omitted', () => {
    const config = makeConfig(false)
    const compiled = compileFieldSet(config)
    const groups = computeCreationGroups(compiled, config)
    expect(groups.find((g) => g.id === 'details')?.cols).toEqual(['systemcol6', 'systemcol7'])
  })

  it('explicit: true suppresses the catch-all — only Basic Info + explicitly-placed sections show', () => {
    const config = makeConfig(true)
    const compiled = compileFieldSet(config)
    const groups = computeCreationGroups(compiled, config)
    expect(groups.find((g) => g.id === 'details')).toBeUndefined()
    const allCols = groups.flatMap((g) => g.cols)
    expect(allCols).not.toContain('systemcol6')
    expect(allCols).not.toContain('systemcol7')
    // The explicitly-placed section field still shows.
    expect(groups.find((g) => g.id === 'sec_location')?.cols).toEqual(['systemcol5'])
  })

  it('explicit: true with NO sections at all leaves just "Basic Info"', () => {
    const config = makeConfig(true)
    config.uiConfig.profile!.sections = []
    const compiled = compileFieldSet(config)
    const groups = computeCreationGroups(compiled, config)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.title).toBe('Basic Info')
  })
})

describe('computeCreationGroups — descriptor.creation.hidden (per-field, hidden-in-create)', () => {
  // "Assigned Driver" shape: a whole section (Name + Phone) that's needed on
  // the DETAIL accordion but reads as a duplicate of the create form's own
  // Customer Name/Phone Number fields, so every field in it is hidden.
  function makeConfig(): EntityConfig {
    return {
      code: 'x/hidden-field',
      name: 'Hidden Field Fixture',
      systemcolumns: [
        { col: 'title', name: 'Title', type: 'SmallText', required: true },
        { col: 'systemcol1', name: 'Field 1', type: 'SmallText' },
        { col: 'systemcol2', name: 'Field 2', type: 'SmallText' },
        { col: 'systemcol3', name: 'Field 3', type: 'SmallText' },
        { col: 'systemcol4', name: 'Field 4', type: 'SmallText' },
        // Beyond BASIC_COUNT (5), placed in a section, both hidden.
        { col: 'systemcol5', name: 'Driver Name', type: 'SmallText', creation: { hidden: true } },
        { col: 'systemcol6', name: 'Driver Phone', type: 'Phone', creation: { hidden: true } },
        // A field that's genuinely wanted, still lands in the catch-all.
        { col: 'systemcol7', name: 'Customer Name', type: 'SmallText' },
      ],
      listcolumns: [],
      uiConfig: {
        statusList: [],
        profile: {
          title: { col: 'title' },
          details: [],
          sections: [
            {
              id: 'sec_driver',
              name: 'Assigned Driver',
              order: 1,
              fields: [{ col: 'systemcol5' }, { col: 'systemcol6' }],
            },
          ],
        },
      },
    }
  }

  it('a hidden field never appears in any bucket', () => {
    const config = makeConfig()
    const compiled = compileFieldSet(config)
    const groups = computeCreationGroups(compiled, config)
    const allCols = groups.flatMap((g) => g.cols)
    expect(allCols).not.toContain('systemcol5')
    expect(allCols).not.toContain('systemcol6')
  })

  it('a section whose EVERY field is hidden disappears from create entirely (no empty group)', () => {
    const config = makeConfig()
    const compiled = compileFieldSet(config)
    const groups = computeCreationGroups(compiled, config)
    expect(groups.find((g) => g.id === 'sec_driver')).toBeUndefined()
  })

  it('a genuinely-wanted field with no section placement still lands in the trailing catch-all (default, non-explicit mode)', () => {
    const config = makeConfig()
    const compiled = compileFieldSet(config)
    const groups = computeCreationGroups(compiled, config)
    expect(groups.find((g) => g.id === 'details')?.cols).toEqual(['systemcol7'])
  })

  it('is independent of the detail-page section — the hidden fields are still resolvable off compiled.byCol (unaffected elsewhere)', () => {
    const config = makeConfig()
    const compiled = compileFieldSet(config)
    expect(compiled.byCol.systemcol5?.creation).toEqual({ hidden: true })
    expect(compiled.byCol.systemcol5?.type).toBe('SmallText')
  })
})

describe('computeCreationGroups — uiConfig.creation.basicCount', () => {
  it('defaults the first "Basic Info" group to 5 fields', () => {
    const groups = computeCreationGroups(compileFieldSet(dealsConfig), dealsConfig)
    expect(groups.find((g) => g.id === 'basic')?.cols).toHaveLength(5)
  })

  it('honors basicCount to size the first group exactly', () => {
    const config: EntityConfig = {
      ...dealsConfig,
      uiConfig: { ...dealsConfig.uiConfig, creation: { basicCount: 2 } },
    }
    const groups = computeCreationGroups(compileFieldSet(config), config)
    expect(groups.find((g) => g.id === 'basic')?.cols).toHaveLength(2)
  })
})

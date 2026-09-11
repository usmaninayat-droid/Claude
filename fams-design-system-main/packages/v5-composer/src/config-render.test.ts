import { describe, it, expect } from 'vitest'
import {
  deriveColumns,
  deriveCard,
  deriveDetail,
  deriveFilters,
  buildEntityModuleData,
  buildPipelineModuleData,
} from './config-render'
import { toEntityConfig } from './blueprint-loader'
import type { ModuleConfigJson } from './blueprint-loader'
import type { EntityConfig, EntityRecord } from './types'
import dealsJson from '../blueprints/crm/deals.module.json'
import companiesJson from '../blueprints/crm/companies.module.json'
import dealsSeed from '../blueprints/crm/deals.seed.json'

const deals = toEntityConfig(dealsJson as unknown as ModuleConfigJson)
const companies = toEntityConfig(companiesJson as unknown as ModuleConfigJson)
const dealRecords = dealsSeed as unknown as EntityRecord[]

describe('config-render — deriveColumns', () => {
  it('derives list columns from listcolumns, keying id off the placement stable id', () => {
    const cols = deriveColumns(companies)
    expect(cols).toHaveLength(6)
    const uid = cols[0]
    expect(uid.id).toBe('fld_uniqueidentifier')
    expect(uid.accessorKey).toBe('uniqueidentifier')
    // `component` now carries the placement's full override object (name +
    // props), not just a bare name string — so a listcolumns-level `props`
    // bag (e.g. `title`'s `handleOverflow`) survives to the cell renderer.
    expect(uid.component).toEqual({ name: 'TextView' })
    expect(cols.find((c) => c.accessorKey === 'title')?.component).toEqual({
      name: 'TextView',
      props: { handleOverflow: true },
    })
    // Header falls back to the field name for cols without an explicit label.
    expect(cols.find((c) => c.accessorKey === 'systemcol1')?.header).toBe('Industry')
  })

  it('derives contentType from the field type (W9 P0-1a — the "reachable for every table" half of the C1 fix)', () => {
    const cols = deriveColumns(companies)
    // The platform's identity slot is ALWAYS 'fixed-id', regardless of its
    // (absent) systemcolumn type — it never auto-hides or truncates.
    expect(cols.find((c) => c.accessorKey === 'uniqueidentifier')?.contentType).toBe('fixed-id')
    // `status` is a SingleSelect — a short, fixed-format enum — never
    // auto-hidden or truncated either. Together with `title` below, this is
    // what protects PM's SERVICE and STATUS columns by CLASSIFICATION — not
    // merely by the per-table auto-hide opt-out, which is a second, coarser
    // safety net rather than the fix.
    expect(cols.find((c) => c.accessorKey === 'status')?.contentType).toBe('fixed-content')
    // `systemcol2` (Owner) is an Assignee reference — a variable-length name.
    expect(cols.find((c) => c.accessorKey === 'systemcol2')?.contentType).toBe('variable-id')
    // `title` is SmallText — and it is the ROW'S IDENTITY, so it is
    // 'fixed-id' (never auto-hidden).
    //
    // This assertion previously expected `undefined`, described as "unchanged,
    // free-text/no-op auto-hide-tier-0 behavior". That WAS the behaviour, and
    // it was the bug: `undefined` falls to `DEFAULT_HIDE_TIER = 0`, i.e. hides
    // FIRST — which is precisely how PM's SERVICE column vanished at 1280px
    // leaving rows that could not be told apart. Classifying the identity
    // column as unprotected is what the C1 fix exists to stop, so the old
    // expectation is wrong under the new contract rather than merely
    // inconvenient. The map is now TOTAL over `FieldType`, so a future field
    // type cannot reintroduce this by omission — TypeScript fails the build.
    expect(cols.find((c) => c.accessorKey === 'title')?.contentType).toBe('fixed-id')
  })
})

describe('config-render — deriveCard', () => {
  it('derives a kanban card from the kanbanCard config + record', () => {
    const rec = dealRecords.find((r) => r.id === 'D-104')!
    const card = deriveCard(deals, rec)
    expect(card.stageId).toBe('proposal')
    expect(card.ticketId).toBe('D-104')
    expect(card.title).toBe('Hooli — Enterprise rollout')
    // header placement order preserved; PriorityFlag component (name + props) surfaced.
    expect(card.header[0]).toMatchObject({ col: 'systemcol2', component: { name: 'PriorityFlag' } })
    expect(card.footer.map((c) => c.col)).toEqual(['systemcol6', 'systemcol7'])
    // The placement's `component` carries its NAME + PROPS (not just the
    // name) — the props are what a named-component renderer (e.g.
    // `AssigneeList`'s `avatarOnly`) reads at render time.
    expect(card.footer[0]).toMatchObject({
      col: 'systemcol6',
      component: { name: 'AssigneeList', props: { avatarOnly: true } },
    })
    // The raw record travels with the card (consumers read fields straight
    // off it rather than reconstructing one from the derived cells).
    expect(card.record).toBe(rec)
  })

  it('drops empty-valued kanbanCard placements entirely rather than resolving a placeholder cell', () => {
    // figma-spec-kanban.md §3/§6: a non-reopened card shows NO filler row
    // where an unset status-badge placement would otherwise sit — the
    // fix is to never emit a Cell for an empty value in the first place,
    // so no downstream renderer gets a chance to show a literal "–".
    const rec: EntityRecord = { ...dealRecords.find((r) => r.id === 'D-104')!, systemcol1: '' }
    const card = deriveCard(deals, rec)
    expect(card.header.some((c) => c.col === 'systemcol1')).toBe(false)
    // A populated placement in the same group is unaffected.
    expect(card.header.some((c) => c.col === 'systemcol2')).toBe(true)
  })

  it('resolves highlightColor from kanbanCard.highlight.col — figma-spec-kanban.md §6', () => {
    const config: EntityConfig = {
      ...deals,
      uiConfig: {
        ...deals.uiConfig,
        kanbanCard: { ...deals.uiConfig.kanbanCard!, highlight: { col: 'systemcol9' } },
      },
    }
    const flagged: EntityRecord = { id: 'r1', systemcol9: '#f79009' }
    const unflagged: EntityRecord = { id: 'r2', systemcol9: '' }
    expect(deriveCard(config, flagged).highlightColor).toBe('#f79009')
    expect(deriveCard(config, unflagged).highlightColor).toBeUndefined()
  })

  it('leaves highlightColor undefined when the config carries no highlight binding', () => {
    const rec = dealRecords.find((r) => r.id === 'D-104')!
    expect(deriveCard(deals, rec).highlightColor).toBeUndefined()
  })
})

describe('config-render — deriveDetail', () => {
  it('derives the detail surface from uiConfig.profile', () => {
    const rec = dealRecords.find((r) => r.id === 'D-101')!
    const detail = deriveDetail(deals, rec)
    expect(detail.title).toBe('Globex — Platform pilot')
    // explicit per-field label honored
    expect(detail.details.find((c) => c.col === 'uniqueidentifier')?.label).toBe('Deal ID')
    expect(detail.rightPanelTabs.map((t) => t.key)).toEqual([
      'timeline',
      'activity',
      'linked',
      'attachments',
    ])
  })

  it('applies the matching identityVariant\'s details/infoTitle/placeholderIcon', () => {
    // ONE module, two record shapes: a variant keyed on a plain record field
    // replaces the identity rail's heading, glyph and key-detail rows for the
    // rows it claims, and leaves every other row on the defaults.
    const rec = dealRecords.find((r) => r.id === 'D-101')!
    const withVariants = {
      ...deals,
      uiConfig: {
        ...deals.uiConfig,
        profile: {
          ...deals.uiConfig.profile!,
          infoTitle: 'Deal Details',
          placeholderIcon: 'briefcase-01',
          identityVariants: [
            {
              whenField: 'status',
              whenEquals: [rec.status as string],
              infoTitle: 'Variant Details',
              placeholderIcon: 'user-01',
              details: [{ id: 'v1', col: 'title', pos: 'left' as const, order: 1 }],
            },
          ],
        },
      },
    }
    const hit = deriveDetail(withVariants, rec)
    expect(hit.infoTitle).toBe('Variant Details')
    expect(hit.placeholderIcon).toBe('user-01')
    expect(hit.details.map((c) => c.col)).toEqual(['title'])

    // A record the variant does not claim keeps the defaults.
    const other = { ...rec, status: '__no-such-status__' }
    const miss = deriveDetail(withVariants, other)
    expect(miss.infoTitle).toBe('Deal Details')
    expect(miss.placeholderIcon).toBe('briefcase-01')
    expect(miss.details.length).toBeGreaterThan(1)
  })

  it('carries each right-panel tab\'s component NAME and its authored PROPS', () => {
    // The props half is the regression guard. `deriveDetail` used to map a tab
    // to `{key, title, component}` only, silently dropping `component.props`
    // — the field-key indirection a GENERIC tab renderer needs to know which
    // record field to render. With it gone, every generic tab body degraded to
    // the "not wired yet" placeholder and the only right-panel tabs that could
    // ever work were bespoke, app-authored ones. (Sections next to it had
    // carried `componentProps` all along; tabs simply never did.)
    const rec = dealRecords.find((r) => r.id === 'D-101')!
    const withProps = {
      ...deals,
      uiConfig: {
        ...deals.uiConfig,
        profile: {
          ...deals.uiConfig.profile,
          rightPanel: {
            type: 'tab' as const,
            tabs: [
              {
                id: 'tab_attachments',
                key: 'attachments',
                title: 'Attachments',
                order: 1,
                component: { name: 'RecordList', props: { field: 'attachments', variant: 'file' } },
              },
            ],
          },
        },
      },
    } as typeof deals
    const [tab] = deriveDetail(withProps, rec).rightPanelTabs
    expect(tab.component).toBe('RecordList')
    expect(tab.componentProps).toEqual({ field: 'attachments', variant: 'file' })
  })

  it('passes through a section id, a named section component + props, and a labelWidth override', () => {
    const rec = dealRecords.find((r) => r.id === 'D-101')!
    const withSection = {
      ...deals,
      uiConfig: {
        ...deals.uiConfig,
        profile: deals.uiConfig.profile
          ? {
              ...deals.uiConfig.profile,
              layout: { labelWidth: '9.0625rem' },
              sections: [
                {
                  id: 'sec_location',
                  name: 'Location',
                  order: 1,
                  fields: [],
                  component: { name: 'LocationMapSection', props: { centerField: 'systemcol9' } },
                },
                {
                  id: 'sec_kpi',
                  name: 'KPI',
                  order: 2,
                  fields: [{ col: 'systemcol3', order: 1, name: 'Segment' }],
                  layout: { labelWidth: '8.25rem' },
                },
              ],
            }
          : undefined,
      },
    }
    const detail = deriveDetail(withSection, rec)
    expect(detail.detailsLabelWidth).toBe('9.0625rem')
    expect(detail.sections[0]).toMatchObject({
      id: 'sec_location',
      name: 'Location',
      component: 'LocationMapSection',
      componentProps: { centerField: 'systemcol9' },
    })
    expect(detail.sections[1]).toMatchObject({ id: 'sec_kpi', labelWidth: '8.25rem' })
  })

  it('falls back to a positional section id when the blueprint omits one', () => {
    const rec = dealRecords.find((r) => r.id === 'D-101')!
    const withSection = {
      ...deals,
      uiConfig: {
        ...deals.uiConfig,
        profile: deals.uiConfig.profile
          ? { ...deals.uiConfig.profile, sections: [{ name: 'Untitled', order: 1, fields: [] } as never] }
          : undefined,
      },
    }
    const detail = deriveDetail(withSection, rec)
    expect(detail.sections[0].id).toBe('section-0')
  })

  it('excludes a `detailHidden` section from the detail accordion list (CREATE-only section)', () => {
    // A section whose only purpose is CREATE field ordering for fields ALSO
    // placed in `profile.details` (the top grid) must not surface a second,
    // duplicate accordion on the detail page — see ProfileSection.detailHidden.
    const rec = dealRecords.find((r) => r.id === 'D-101')!
    const withSection = {
      ...deals,
      uiConfig: {
        ...deals.uiConfig,
        profile: deals.uiConfig.profile
          ? {
              ...deals.uiConfig.profile,
              sections: [
                { id: 'sec_visible', name: 'Visible', order: 1, fields: [] },
                { id: 'sec_hidden', name: 'Create Only', order: 2, fields: [], detailHidden: true },
              ],
            }
          : undefined,
      },
    }
    const detail = deriveDetail(withSection, rec)
    expect(detail.sections.map((s) => s.id)).toEqual(['sec_visible'])
  })
})

describe('config-render — deriveFilters', () => {
  it('types the status filter as a select over the status keys', () => {
    const facets = deriveFilters(deals)
    const status = facets.find((f) => f.col === 'status')!
    expect(status.type).toBe('select')
    expect(status.options).toEqual(['lead', 'qualified', 'proposal', 'won', 'lost'])
    // a listValues field surfaces its allowed values
    const priority = facets.find((f) => f.col === 'systemcol2')!
    expect(priority.options).toEqual(['High', 'Medium', 'Low'])
  })
})

describe('config-render — module-data builders', () => {
  it('buildEntityModuleData carries columns + search + a toDetail fn', () => {
    const data = buildEntityModuleData(companies, [])
    expect(data.columns).toHaveLength(6)
    expect(data.searchColumns).toEqual(['title', 'systemcol1', 'systemcol2'])
    expect(typeof data.toDetail).toBe('function')
  })

  it('buildPipelineModuleData exposes the five stages + one card per record', () => {
    const data = buildPipelineModuleData(deals, dealRecords)
    expect(data.stages.map((s) => s.id)).toEqual([
      'lead',
      'qualified',
      'proposal',
      'won',
      'lost',
    ])
    expect(data.cards).toHaveLength(dealRecords.length)
    // Each card carries its raw source record through (Gap A: no
    // reconstruct-from-derived-cells workaround downstream).
    expect(data.cards[0].record).toBe(dealRecords[0])
  })
})

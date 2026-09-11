import type { EntityConfig, EntityRecord } from '@fams/v5-templates'

/**
 * A compact CRM "deals" pipeline blueprint for the view-template demos
 * (ModuleView / ListView / KanbanView / HybridView / TaskDetail) — the same
 * shape as v5-composer's shipped crm golden, inlined so the showcase depends
 * only on `@fams/v5-templates`.
 */
export const dealsConfig: EntityConfig = {
  code: 'crm/deals',
  name: 'Deals',
  uidPrefix: 'D',
  systemcolumns: [
    { id: 'fld_uid', col: 'uniqueidentifier', name: 'Deal ID', type: 'Auto' },
    { id: 'fld_title', col: 'title', name: 'Deal', type: 'SmallText', required: true },
    { id: 'fld_status', col: 'status', name: 'Stage', type: 'SingleSelect' },
    { id: 'fld_systemcol1', col: 'systemcol1', name: 'Type', type: 'SingleSelect', listValues: ['NEW', 'EXPANSION', 'RENEWAL'] },
    { id: 'fld_systemcol2', col: 'systemcol2', name: 'Priority', type: 'SingleSelect', listValues: ['High', 'Medium', 'Low'] },
    { id: 'fld_systemcol3', col: 'systemcol3', name: 'Company', type: 'SmallText' },
    { id: 'fld_systemcol6', col: 'systemcol6', name: 'Owner', type: 'Assignee' },
    { id: 'fld_systemcol7', col: 'systemcol7', name: 'Date', type: 'SmallText' },
  ],
  uiConfig: {
    statusList: [
      { id: 'sts_lead', key: 'lead', label: 'Lead', color: 'var(--color-muted)' },
      { id: 'sts_qualified', key: 'qualified', label: 'Qualified', color: 'var(--color-info)' },
      { id: 'sts_proposal', key: 'proposal', label: 'Proposal', color: 'var(--color-warning)' },
      { id: 'sts_won', key: 'won', label: 'Won', color: 'var(--color-success)' },
      { id: 'sts_lost', key: 'lost', label: 'Lost', color: 'var(--color-destructive)' },
    ],
    kanbanCard: {
      header: [
        { id: 'fld_systemcol2', col: 'systemcol2', pos: 'left', order: 1 },
        { id: 'fld_systemcol1', col: 'systemcol1', pos: 'left', order: 2 },
        // Same row as the priority chip, pinned to the far end — mirrors the
        // real crm/deals golden blueprint's placement (pos:'right', same
        // order as Priority) so the ticket-id chip (Figma "Badges" pattern,
        // 5729:39935: gray `#`-hash pill) sits opposite it, not stacked below.
        { id: 'fld_uid', col: 'uniqueidentifier', pos: 'right', order: 1 },
        { id: 'fld_title', col: 'title', pos: 'left', order: 3 },
      ],
      body: [{ id: 'fld_systemcol3', col: 'systemcol3', pos: 'left', order: 1 }],
      footer: [
        { id: 'fld_systemcol6', col: 'systemcol6', pos: 'left', order: 1 },
        { id: 'fld_systemcol7', col: 'systemcol7', pos: 'right', order: 1 },
      ],
    },
    profile: {
      title: { id: 'fld_title', col: 'title', pos: 'left' },
      details: [
        { id: 'fld_uid', col: 'uniqueidentifier', pos: 'left', order: 1, name: 'Deal ID' },
        { id: 'fld_status', col: 'status', pos: 'right', order: 1 },
        { id: 'fld_systemcol3', col: 'systemcol3', pos: 'left', order: 2 },
        { id: 'fld_systemcol6', col: 'systemcol6', pos: 'right', order: 2 },
        { id: 'fld_systemcol2', col: 'systemcol2', pos: 'left', order: 3 },
      ],
      sections: [],
      rightPanel: {
        type: 'tab',
        tabs: [
          { id: 'tab_timeline', key: 'timeline', title: 'Timeline', order: 1, component: { name: 'PipelineTimeline' } },
          { id: 'tab_activity', key: 'activity', title: 'Activity', order: 2, component: { name: 'ActivityFeed' } },
          { id: 'tab_linked', key: 'linked', title: 'Linked', order: 3, component: { name: 'LinkedItems' } },
          { id: 'tab_attachments', key: 'attachments', title: 'Files', order: 4, component: { name: 'Attachments' } },
        ],
      },
    },
    filters: [
      { id: 'flt_status', col: 'status', order: 1 },
      { id: 'flt_systemcol2', col: 'systemcol2', order: 2 },
    ],
    search: { columns: ['title', 'uniqueidentifier', 'systemcol3'] },
  },
  listcolumns: [
    { id: 'fld_uid', col: 'uniqueidentifier' },
    { id: 'fld_title', col: 'title' },
    { id: 'fld_status', col: 'status' },
    { id: 'fld_systemcol3', col: 'systemcol3' },
    { id: 'fld_systemcol2', col: 'systemcol2' },
    { id: 'fld_systemcol6', col: 'systemcol6' },
  ],
}

export const dealRecords: EntityRecord[] = [
  { id: 'D-101', uniqueidentifier: 'D-101', title: 'Globex — Platform pilot', status: 'lead', systemcol1: 'NEW', systemcol2: 'Medium', systemcol3: 'Globex Corp', systemcol6: 'Dana Reyes', systemcol7: '28 Feb' },
  { id: 'D-102', uniqueidentifier: 'D-102', title: 'Soylent — Annual plan', status: 'lead', systemcol1: 'NEW', systemcol2: 'Low', systemcol3: 'Soylent Inc', systemcol6: 'Mia Chen', systemcol7: '02 Mar' },
  { id: 'D-103', uniqueidentifier: 'D-103', title: 'Initech — Seat expansion', status: 'qualified', systemcol1: 'EXPANSION', systemcol2: 'High', systemcol3: 'Initech', systemcol6: 'Sam Patel', systemcol7: '24 Feb' },
  { id: 'D-104', uniqueidentifier: 'D-104', title: 'Hooli — Enterprise rollout', status: 'proposal', systemcol1: 'NEW', systemcol2: 'High', systemcol3: 'Hooli', systemcol6: 'Dana Reyes', systemcol7: '20 Feb' },
  { id: 'D-105', uniqueidentifier: 'D-105', title: 'Northwind — Add-on modules', status: 'proposal', systemcol1: 'EXPANSION', systemcol2: 'Medium', systemcol3: 'Northwind Traders', systemcol6: 'Sam Patel', systemcol7: '21 Feb' },
  { id: 'D-106', uniqueidentifier: 'D-106', title: 'Northwind — Renewal', status: 'won', systemcol1: 'RENEWAL', systemcol2: 'Medium', systemcol3: 'Northwind Traders', systemcol6: 'Mia Chen', systemcol7: '10 Feb' },
]

/** Golden pipeline transitions (deals.rules.json) for the demos' move guard. */
export const dealTransitions: Record<string, string[]> = {
  lead: ['qualified', 'lost'],
  qualified: ['proposal', 'lost'],
  proposal: ['won', 'lost'],
  won: [],
  lost: ['lead'],
}

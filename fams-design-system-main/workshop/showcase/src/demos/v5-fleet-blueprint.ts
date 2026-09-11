import type { EntityConfig, EntityRecord } from '@fams/v5-templates'

/**
 * A compact CRM/fleet-style blueprint used by the EntityProfile + CreationSheet
 * demos — the same *shape* as v5-composer's shipped crm golden, inlined here so
 * the showcase depends only on `@fams/v5-templates`. Seven editable fields, so
 * CreationSheet's decision-#10 grouping produces a Basic Info + Details wizard.
 */
export const vehiclesConfig: EntityConfig = {
  code: 'fleet/vehicles',
  name: 'Vehicle',
  uidPrefix: 'VH',
  systemcolumns: [
    { id: 'fld_title', col: 'title', name: 'Vehicle', type: 'SmallText', required: true },
    { id: 'fld_status', col: 'status', name: 'Status', type: 'SingleSelect', listValues: ['Active', 'Maintenance', 'Idle'] },
    { id: 'fld_systemcol1', col: 'systemcol1', name: 'Make', type: 'SmallText' },
    { id: 'fld_systemcol2', col: 'systemcol2', name: 'Model', type: 'SmallText' },
    { id: 'fld_systemcol3', col: 'systemcol3', name: 'Odometer', type: 'Number' },
    { id: 'fld_systemcol4', col: 'systemcol4', name: 'Driver', type: 'Assignee' },
    { id: 'fld_systemcol5', col: 'systemcol5', name: 'Notes', type: 'LongText' },
  ],
  uiConfig: {
    statusList: [
      { id: 'sts_active', key: 'Active', label: 'Active', color: 'var(--color-success)' },
      { id: 'sts_maint', key: 'Maintenance', label: 'Maintenance', color: 'var(--color-warning)' },
      { id: 'sts_idle', key: 'Idle', label: 'Idle', color: 'var(--color-muted)' },
    ],
    profile: {
      title: { id: 'fld_title', col: 'title', pos: 'left' },
      details: [
        { id: 'fld_uid', col: 'uniqueidentifier', pos: 'left', order: 1, name: 'Vehicle ID' },
        { id: 'fld_status', col: 'status', pos: 'right', order: 1 },
        { id: 'fld_systemcol1', col: 'systemcol1', pos: 'left', order: 2 },
        { id: 'fld_systemcol2', col: 'systemcol2', pos: 'right', order: 2 },
        { id: 'fld_systemcol3', col: 'systemcol3', pos: 'left', order: 3 },
      ],
      sections: [],
      rightPanel: {
        type: 'tab',
        tabs: [
          { id: 'tab_overview', key: 'overview', title: 'Overview', order: 1, component: { name: 'OverviewPanel' } },
          { id: 'tab_trips', key: 'trips', title: 'Trips', order: 2, component: { name: 'TripsPanel' } },
          { id: 'tab_maint', key: 'maintenance', title: 'Maintenance', order: 3, component: { name: 'MaintenancePanel' } },
        ],
      },
    },
    search: { columns: ['title', 'systemcol1'] },
  },
  listcolumns: [
    { id: 'fld_uid', col: 'uniqueidentifier' },
    { id: 'fld_title', col: 'title' },
    { id: 'fld_status', col: 'status' },
  ],
}

export const vehicleRecords: EntityRecord[] = [
  {
    id: 'vh-1',
    uniqueidentifier: 'VH-4021',
    title: 'Truck AUH-4021',
    status: 'Active',
    systemcol1: 'Volvo',
    systemcol2: 'FH16',
    systemcol3: 84210,
    systemcol4: 'Sara Ahmed',
    systemcol5: 'Assigned to the northern district route.',
  },
  {
    id: 'vh-2',
    uniqueidentifier: 'VH-4102',
    title: 'Van DXB-2299',
    status: 'Maintenance',
    systemcol1: 'Ford',
    systemcol2: 'Transit',
    systemcol3: 128740,
    systemcol4: 'Omar Khalid',
    systemcol5: 'Scheduled brake service.',
  },
]

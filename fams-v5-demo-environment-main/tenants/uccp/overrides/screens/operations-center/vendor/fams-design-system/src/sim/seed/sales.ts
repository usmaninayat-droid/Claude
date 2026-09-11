import type { EntityConfig, PipelineRules, EntityRecord, UserContext } from '../engine/types';
import type { EntityStore } from '../engine/entity-store';

/**
 * Sales CRM seed — faithful EAV shapes that project 1:1 onto the existing
 * `sales.config.tsx` Deal/Company models, so swapping the static sample data
 * for sim-backed data needs only a thin projection in the config.
 *
 * Two demo users exercise RBAC: a rep sees only their own deals and can't
 * close/discard; a manager sees all and owns the won/lost transitions.
 */

export const salesUsers: Record<'rep' | 'manager', UserContext> = {
  rep: { id: 'u_rep', roles: ['SalesRep'], orgId: 'org_demo', type: 'user' },
  manager: { id: 'u_mgr', roles: ['SalesManager'], orgId: 'org_demo', type: 'user' },
};

/* ── Deals (pipeline) ───────────────────────────────────────────────────────── */
// systemcol map: 1=type 2=priority 3=company 4=avatarLetter 5=avatarColor
//                6=ownerId 7=dateLabel 8=unassigned

export const dealsConfig: EntityConfig = {
  code: 'crm/deals',
  name: 'Deals',
  uidPrefix: 'D',
  systemcolumns: [
    { col: 'title', name: 'Deal', type: 'SmallText', required: true },
    { col: 'status', name: 'Stage', type: 'SingleSelect' },
    { col: 'systemcol1', name: 'Type', type: 'SingleSelect', listValues: ['NEW', 'EXPANSION', 'RENEWAL'] },
    { col: 'systemcol2', name: 'Priority', type: 'SingleSelect', listValues: ['High', 'Medium', 'Low'] },
    { col: 'systemcol3', name: 'Company', type: 'SingleReference', refModule: 'crm/companies' },
    { col: 'systemcol4', name: 'Owner initial', type: 'SmallText' },
    { col: 'systemcol5', name: 'Owner color', type: 'SmallText' },
    { col: 'systemcol6', name: 'Owner', type: 'SingleReference', refModule: 'user' },
    { col: 'systemcol7', name: 'Date', type: 'SmallText' },
    { col: 'systemcol8', name: 'Unassigned', type: 'Boolean' },
  ],
  uiConfig: {
    statusList: [
      { key: 'lead', label: 'Lead', color: '#94a3b8' },
      { key: 'qualified', label: 'Qualified', color: '#0072d6' },
      { key: 'proposal', label: 'Proposal', color: '#f79009' },
      { key: 'won', label: 'Won', color: '#16a34a' },
      { key: 'lost', label: 'Lost', color: '#f04438' },
    ],
    search: { columns: ['title', 'uniqueidentifier', 'systemcol3'] },
    filters: [
      { col: 'status', order: 1 },
      { col: 'systemcol2', order: 2 },
    ],
  },
  listcolumns: [],
};

export const dealsRules: PipelineRules = {
  statuses: ['lead', 'qualified', 'proposal', 'won', 'lost'],
  transitions: {
    lead: ['qualified', 'lost'],
    qualified: ['proposal', 'lost'],
    proposal: ['won', 'lost'],
    won: [],
    lost: ['lead'],
  },
  transition_rules: {
    // Only managers close or discard deals.
    'proposal->won': { '$.user.roles': { $in: ['SalesManager'] } },
    'lead->lost': { '$.user.roles': { $in: ['SalesManager'] } },
    'qualified->lost': { '$.user.roles': { $in: ['SalesManager'] } },
    'proposal->lost': { '$.user.roles': { $in: ['SalesManager'] } },
  },
  task_rules: {
    // Reps see only deals they own; managers see all.
    view: [
      { '$.user.roles': { $in: ['SalesManager'] } },
      { $and: [{ '$.user.roles': { $in: ['SalesRep'] } }, { '$.task.systemcol6': { $eq: 'u_rep' } }] },
    ],
  },
};

const dealRecords: EntityRecord[] = [
  { id: 'D-101', uniqueidentifier: 'D-101', title: 'Globex — Platform pilot', status: 'lead', systemcol1: 'NEW', systemcol2: 'Medium', systemcol3: 'Globex Corp', systemcol4: 'S', systemcol5: '#0072d6', systemcol6: 'u_rep', systemcol7: '28 Feb' },
  { id: 'D-102', uniqueidentifier: 'D-102', title: 'Soylent — Annual plan', status: 'lead', systemcol1: 'NEW', systemcol2: 'Low', systemcol3: 'Soylent Inc', systemcol6: 'u_mgr', systemcol7: '02 Mar', systemcol8: true },
  { id: 'D-103', uniqueidentifier: 'D-103', title: 'Initech — Seat expansion', status: 'qualified', systemcol1: 'EXPANSION', systemcol2: 'High', systemcol3: 'Initech', systemcol4: 'D', systemcol5: '#16a34a', systemcol6: 'u_rep', systemcol7: '24 Feb' },
  { id: 'D-104', uniqueidentifier: 'D-104', title: 'Hooli — Enterprise rollout', status: 'proposal', systemcol1: 'NEW', systemcol2: 'High', systemcol3: 'Hooli', systemcol4: 'S', systemcol5: '#0072d6', systemcol6: 'u_mgr', systemcol7: '20 Feb' },
  { id: 'D-105', uniqueidentifier: 'D-105', title: 'Northwind — Add-on modules', status: 'proposal', systemcol1: 'EXPANSION', systemcol2: 'Medium', systemcol3: 'Northwind Traders', systemcol4: 'M', systemcol5: '#ab47bc', systemcol6: 'u_rep', systemcol7: '21 Feb' },
  { id: 'D-106', uniqueidentifier: 'D-106', title: 'Northwind — Renewal', status: 'won', systemcol1: 'RENEWAL', systemcol2: 'Medium', systemcol3: 'Northwind Traders', systemcol4: 'D', systemcol5: '#16a34a', systemcol6: 'u_mgr', systemcol7: '10 Feb' },
];

/* ── Companies (entity) ─────────────────────────────────────────────────────── */
// systemcol map: 1=industry 2=owner 3=arr ; status=Customer|Prospect|Churned

export const companiesConfig: EntityConfig = {
  code: 'crm/companies',
  name: 'Companies',
  uidPrefix: 'C',
  systemcolumns: [
    { col: 'title', name: 'Company', type: 'SmallText', required: true },
    { col: 'systemcol1', name: 'Industry', type: 'SmallText' },
    { col: 'systemcol2', name: 'Owner', type: 'SmallText' },
    { col: 'systemcol3', name: 'ARR', type: 'SmallText' },
    { col: 'status', name: 'Status', type: 'SingleSelect', listValues: ['Customer', 'Prospect', 'Churned'] },
  ],
  uiConfig: {
    statusList: [],
    search: { columns: ['title', 'systemcol1'] },
    filters: [{ col: 'status', order: 1 }, { col: 'systemcol1', order: 2 }],
  },
  listcolumns: [],
};

const companyRecords: EntityRecord[] = [
  { id: 'C-01', uniqueidentifier: 'C-01', title: 'Northwind Traders', systemcol1: 'Logistics', systemcol2: 'Dana Reyes', systemcol3: '$120k', status: 'Customer' },
  { id: 'C-02', uniqueidentifier: 'C-02', title: 'Globex Corp', systemcol1: 'Manufacturing', systemcol2: 'Sam Patel', systemcol3: '$0', status: 'Prospect' },
  { id: 'C-03', uniqueidentifier: 'C-03', title: 'Initech', systemcol1: 'Software', systemcol2: 'Dana Reyes', systemcol3: '$64k', status: 'Customer' },
  { id: 'C-04', uniqueidentifier: 'C-04', title: 'Soylent Inc', systemcol1: 'Food & Bev', systemcol2: 'Mia Chen', systemcol3: '$0', status: 'Prospect' },
  { id: 'C-05', uniqueidentifier: 'C-05', title: 'Hooli', systemcol1: 'Technology', systemcol2: 'Sam Patel', systemcol3: '$210k', status: 'Customer' },
  { id: 'C-06', uniqueidentifier: 'C-06', title: 'Vehement Capital', systemcol1: 'Finance', systemcol2: 'Mia Chen', systemcol3: '$0', status: 'Churned' },
];

export const salesConfigs: EntityConfig[] = [dealsConfig, companiesConfig];
export const salesRules: Record<string, PipelineRules> = { 'crm/deals': dealsRules };

export function seedSales(store: EntityStore): void {
  for (const cfg of salesConfigs) store.registerConfig(cfg);
  store.seed('crm/companies', companyRecords);
  store.seed('crm/deals', dealRecords);
}

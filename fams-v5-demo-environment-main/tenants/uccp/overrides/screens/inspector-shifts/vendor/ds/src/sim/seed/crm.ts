import type { EntityConfig, PipelineRules, EntityRecord, UserContext } from '../engine/types';
import type { EntityStore } from '../engine/entity-store';

/**
 * CRM seed dataset — the first vertical slice.
 *
 * Faithful shapes: entity types are defined as EntityConfig with systemcolN
 * mappings (not named columns) exactly like production; the Leads pipeline
 * carries real role-gated pipeline_rules so the rules evaluator has something
 * meaningful to resolve. Two demo users exercise RBAC (a rep who only sees
 * their own leads, a manager who sees all and can close deals).
 */

/* ── Demo users (for RBAC demos) ────────────────────────────────────────────── */

export const crmUsers: Record<'rep' | 'manager', UserContext> = {
  rep: { id: 'u_rep', roles: ['SalesRep'], orgId: 'org_demo', type: 'user' },
  manager: { id: 'u_mgr', roles: ['SalesManager'], orgId: 'org_demo', type: 'user' },
};

/* ── Leads (pipeline) ───────────────────────────────────────────────────────── */

export const leadsConfig: EntityConfig = {
  code: 'crm/leads',
  name: 'Leads',
  uidPrefix: 'LEAD',
  systemcolumns: [
    { col: 'title', name: 'Lead title', type: 'SmallText', required: true },
    { col: 'status', name: 'Stage', type: 'SingleSelect' },
    { col: 'systemcol1', name: 'Est. value', type: 'Currency' },
    { col: 'systemcol2', name: 'Source', type: 'SingleSelect', listValues: ['Inbound', 'Outbound', 'Referral', 'Event'] },
    { col: 'systemcol3', name: 'Priority', type: 'SingleSelect', listValues: ['High', 'Medium', 'Low'] },
    { col: 'systemcol4', name: 'Owner', type: 'SingleReference', refModule: 'user' },
    { col: 'systemcol5', name: 'Company', type: 'SingleReference', refModule: 'crm/companies' },
    { col: 'systemcol6', name: 'Contact', type: 'SingleReference', refModule: 'crm/contacts' },
    { col: 'systemcol7', name: 'Next step', type: 'Date' },
    { col: 'systemcol8', name: 'Notes', type: 'LongText' },
    { col: 'tags', name: 'Tags', type: 'tags' },
  ],
  uiConfig: {
    statusList: [
      { key: 'new', label: 'New', color: '#0072D6', chipColor: '#DBEAFE' },
      { key: 'contacted', label: 'Contacted', color: '#06B6D4', chipColor: '#CFFAFE' },
      { key: 'qualified', label: 'Qualified', color: '#9E77ED', chipColor: '#EBE9FE' },
      { key: 'proposal', label: 'Proposal', color: '#F79009', chipColor: '#FEF0C7' },
      { key: 'won', label: 'Won', color: '#12B76A', chipColor: '#D1FADF' },
      { key: 'lost', label: 'Lost', color: '#F04438', chipColor: '#FEE4E2' },
    ],
    kanbanCard: {
      header: [
        { col: 'systemcol3', pos: 'left', order: 1, component: { name: 'SeverityBadge', props: { compact: true } } },
        { col: 'uniqueidentifier', pos: 'right', order: 1 },
        { col: 'title', pos: 'left', order: 2 },
      ],
      body: [
        { col: 'systemcol1', pos: 'left', order: 1, component: { name: 'PenaltyAmount' } },
        { col: 'systemcol5', pos: 'left', order: 2 },
      ],
      footer: [
        { col: 'systemcol4', pos: 'left', order: 1, component: { name: 'AssigneeList', props: { avatarOnly: true } } },
        { col: 'systemcol7', pos: 'right', order: 1, component: { name: 'DateView' } },
      ],
    },
    profile: {
      title: { col: 'title', pos: 'left' },
      details: [
        { col: 'uniqueidentifier', pos: 'left', order: 1, component: { name: 'LinkView' } },
        { col: 'status', pos: 'right', order: 1, component: { name: 'StatusList', props: { editable: true } } },
        { col: 'systemcol1', pos: 'left', order: 2 },
        { col: 'systemcol7', pos: 'right', order: 2, component: { name: 'DateView', props: { showIcon: true } } },
        { col: 'systemcol5', pos: 'left', order: 3 },
        { col: 'systemcol6', pos: 'right', order: 3 },
        { col: 'systemcol4', pos: 'left', order: 4, component: { name: 'AssigneeSelector', props: { editable: true } } },
      ],
      sections: [
        {
          name: 'Notes',
          order: 1,
          fields: [
            { col: 'systemcol8', order: 1, showLabel: true, component: { name: 'PreviewTextArea', props: { placeholderText: 'No notes yet.', editable: true } } },
          ],
        },
      ],
      rightPanel: { type: 'tab', tabs: [{ key: 'timeline', title: 'Timeline', order: 1, component: { name: 'PipelineTimeline' } }] },
    },
    filters: [
      { col: 'status', order: 1 },
      { col: 'systemcol3', order: 2 },
      { col: 'systemcol2', order: 3 },
      { col: 'systemcol4', order: 4, name: 'Owner', visibility: { excludeRoles: ['SalesRep'] } },
    ],
    search: { columns: ['title', 'uniqueidentifier'] },
  },
  listcolumns: [
    { col: 'uniqueidentifier', component: { name: 'TextView' } },
    { col: 'title', component: { name: 'TextView', props: { handleOverflow: true } } },
    { col: 'status', component: { name: 'StatusList' } },
    { col: 'systemcol1', component: { name: 'PenaltyAmount' } },
    { col: 'systemcol3', component: { name: 'TextView' } },
    { col: 'systemcol4', component: { name: 'AssigneeList' } },
    { col: 'systemcol7', component: { name: 'DateView' } },
  ],
};

/** Role-gated pipeline rules — reps work the funnel, only managers close/discard. */
export const leadsRules: PipelineRules = {
  statuses: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'],
  transitions: {
    new: ['contacted', 'lost'],
    contacted: ['qualified', 'lost'],
    qualified: ['proposal', 'lost'],
    proposal: ['won', 'lost'],
    won: [],
    lost: ['new'],
  },
  transition_rules: {
    'proposal->won': { '$.user.roles': { $in: ['SalesManager'] } },
    'new->lost': { '$.user.roles': { $in: ['SalesManager'] } },
    'contacted->lost': { '$.user.roles': { $in: ['SalesManager'] } },
    'qualified->lost': { '$.user.roles': { $in: ['SalesManager'] } },
    'proposal->lost': { '$.user.roles': { $in: ['SalesManager'] } },
  },
  field_rules: {
    // Only managers may change the deal value.
    systemcol1: { update: { '$.user.roles': { $in: ['SalesManager'] } } },
  },
  task_rules: {
    // Reps see only their own leads; managers see everything.
    view: [
      { '$.user.roles': { $in: ['SalesManager'] } },
      { $and: [{ '$.user.roles': { $in: ['SalesRep'] } }, { '$.task.systemcol4': { $eq: 'u_rep' } }] },
    ],
  },
};

const leadRecords: EntityRecord[] = [
  { id: 'lead1', uniqueidentifier: 'LEAD-1001', title: 'Tadweer fleet expansion', status: 'qualified', systemcol1: '120000', systemcol2: 'Referral', systemcol3: 'High', systemcol4: 'u_rep', systemcol5: 'co1', systemcol6: 'ct1', systemcol7: '2026-06-20', systemcol8: 'Wants 40-vehicle telematics rollout.', tags: ['enterprise'] },
  { id: 'lead2', uniqueidentifier: 'LEAD-1002', title: 'EAD compliance portal', status: 'proposal', systemcol1: '85000', systemcol2: 'Outbound', systemcol3: 'High', systemcol4: 'u_mgr', systemcol5: 'co2', systemcol6: 'ct2', systemcol7: '2026-06-18', systemcol8: 'Proposal sent; awaiting procurement.', tags: ['government'] },
  { id: 'lead3', uniqueidentifier: 'LEAD-1003', title: 'Truemax workshop add-on', status: 'contacted', systemcol1: '32000', systemcol2: 'Inbound', systemcol3: 'Medium', systemcol4: 'u_rep', systemcol5: 'co3', systemcol6: 'ct3', systemcol7: '2026-06-15' },
  { id: 'lead4', uniqueidentifier: 'LEAD-1004', title: 'Last-mile delivery pilot', status: 'new', systemcol1: '18000', systemcol2: 'Event', systemcol3: 'Low', systemcol4: 'u_mgr', systemcol5: 'co4', systemcol6: 'ct4', systemcol7: '2026-06-25' },
  { id: 'lead5', uniqueidentifier: 'LEAD-1005', title: 'Cement logistics integration', status: 'won', systemcol1: '210000', systemcol2: 'Referral', systemcol3: 'High', systemcol4: 'u_rep', systemcol5: 'co1', systemcol6: 'ct1', systemcol7: '2026-06-10', tags: ['enterprise', 'closed'] },
  { id: 'lead6', uniqueidentifier: 'LEAD-1006', title: 'Smart-city bin sensors', status: 'lost', systemcol1: '64000', systemcol2: 'Outbound', systemcol3: 'Medium', systemcol4: 'u_mgr', systemcol5: 'co2', systemcol6: 'ct2', systemcol8: 'Lost to incumbent on price.' },
];

/* ── Companies (entity) ─────────────────────────────────────────────────────── */

export const companiesConfig: EntityConfig = {
  code: 'crm/companies',
  name: 'Companies',
  uidPrefix: 'CO',
  systemcolumns: [
    { col: 'title', name: 'Company name', type: 'SmallText', required: true },
    { col: 'systemcol1', name: 'Industry', type: 'SingleSelect', listValues: ['Government', 'Logistics', 'Construction', 'Waste', 'Retail'] },
    { col: 'systemcol2', name: 'Size', type: 'SingleSelect', listValues: ['SME', 'Mid-market', 'Enterprise'] },
    { col: 'systemcol3', name: 'City', type: 'SmallText' },
    { col: 'systemcol4', name: 'Website', type: 'SmallText' },
    { col: 'tags', name: 'Tags', type: 'tags' },
  ],
  uiConfig: {
    statusList: [],
    filters: [
      { col: 'systemcol1', order: 1 },
      { col: 'systemcol2', order: 2 },
    ],
    search: { columns: ['title', 'systemcol3'] },
  },
  listcolumns: [
    { col: 'uniqueidentifier', component: { name: 'TextView' } },
    { col: 'title', component: { name: 'TextView', props: { handleOverflow: true } } },
    { col: 'systemcol1', component: { name: 'TextView' } },
    { col: 'systemcol2', component: { name: 'TextView' } },
    { col: 'systemcol3', component: { name: 'TextView' } },
  ],
};

const companyRecords: EntityRecord[] = [
  { id: 'co1', uniqueidentifier: 'CO-2001', title: 'Tadweer', systemcol1: 'Waste', systemcol2: 'Enterprise', systemcol3: 'Abu Dhabi', systemcol4: 'tadweer.ae', tags: ['government'] },
  { id: 'co2', uniqueidentifier: 'CO-2002', title: 'Environment Agency Abu Dhabi', systemcol1: 'Government', systemcol2: 'Enterprise', systemcol3: 'Abu Dhabi' },
  { id: 'co3', uniqueidentifier: 'CO-2003', title: 'Truemax', systemcol1: 'Construction', systemcol2: 'Mid-market', systemcol3: 'Dubai' },
  { id: 'co4', uniqueidentifier: 'CO-2004', title: 'Fruitful Day', systemcol1: 'Logistics', systemcol2: 'SME', systemcol3: 'Dubai', systemcol4: 'fruitfulday.com' },
];

/* ── Contacts (entity) ──────────────────────────────────────────────────────── */

export const contactsConfig: EntityConfig = {
  code: 'crm/contacts',
  name: 'Contacts',
  uidPrefix: 'CT',
  systemcolumns: [
    { col: 'title', name: 'Full name', type: 'SmallText', required: true },
    { col: 'systemcol1', name: 'Email', type: 'SmallText' },
    { col: 'systemcol2', name: 'Phone', type: 'SmallText' },
    { col: 'systemcol3', name: 'Company', type: 'SingleReference', refModule: 'crm/companies' },
    { col: 'systemcol4', name: 'Role', type: 'SmallText' },
    { col: 'tags', name: 'Tags', type: 'tags' },
  ],
  uiConfig: {
    statusList: [],
    filters: [{ col: 'systemcol3', order: 1 }],
    search: { columns: ['title', 'systemcol1'] },
  },
  listcolumns: [
    { col: 'uniqueidentifier', component: { name: 'TextView' } },
    { col: 'title', component: { name: 'TextView' } },
    { col: 'systemcol1', component: { name: 'TextView' } },
    { col: 'systemcol4', component: { name: 'TextView' } },
    { col: 'systemcol3', component: { name: 'TextView' } },
  ],
};

const contactRecords: EntityRecord[] = [
  { id: 'ct1', uniqueidentifier: 'CT-3001', title: 'Layla Al Mansoori', systemcol1: 'layla@tadweer.ae', systemcol2: '+971 50 111 2233', systemcol3: 'co1', systemcol4: 'Fleet Director' },
  { id: 'ct2', uniqueidentifier: 'CT-3002', title: 'Omar Khalifa', systemcol1: 'omar@ead.gov.ae', systemcol2: '+971 50 222 3344', systemcol3: 'co2', systemcol4: 'Procurement Lead' },
  { id: 'ct3', uniqueidentifier: 'CT-3003', title: 'Sara Haddad', systemcol1: 'sara@truemax.com', systemcol2: '+971 50 333 4455', systemcol3: 'co3', systemcol4: 'Ops Manager' },
  { id: 'ct4', uniqueidentifier: 'CT-3004', title: 'Daniel Roy', systemcol1: 'daniel@fruitfulday.com', systemcol2: '+971 50 444 5566', systemcol3: 'co4', systemcol4: 'Founder' },
];

/* ── Registry + seeding ─────────────────────────────────────────────────────── */

export const crmConfigs: EntityConfig[] = [leadsConfig, companiesConfig, contactsConfig];
export const crmRules: Record<string, PipelineRules> = { 'crm/leads': leadsRules };

/** Register configs and seed sample data into a store. Idempotent per store. */
export function seedCrm(store: EntityStore): void {
  for (const cfg of crmConfigs) store.registerConfig(cfg);
  store.seed('crm/companies', companyRecords);
  store.seed('crm/contacts', contactRecords);
  store.seed('crm/leads', leadRecords);
}

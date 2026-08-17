import * as React from 'react';
import type { AppConfig } from '@ds/components/app-shell';
import { TagsAndCategories, CategorySheet, DEFAULT_COLOR, RolesManagement, RoleSheet, DEFAULT_APPS, ApplicationManagement, AppSheet, EventConfiguration, EventConfigSheet, EntityConfiguration, EntityConfigSheet, DEFAULT_ENTITY_ICONS, UserAccounts, UserAccountSheet, UserSuccessDialog, DEFAULT_USER_ROLES, DEFAULT_COUNTRY_CODES, PipelineConfiguration, PipelineConfigSheet, DEFAULT_PIPELINE_ICONS, DEFAULT_TASK_TYPES, STAGE_COLORS, Preferences, Subscriptions } from '@ds/components/settings';
import type { Tag, TagCategory, CategoryDraft, RoleRow, RoleAction, RoleDraft, AppCard, AppDraft, EventRow, EventAction, EventDraft, EntityNode, EntityDraft, EntityAction, UserRow, UserDraft, UserAction, UserSuccessDialogProps, PipelineCard, PipelineDraft, PipelineAction, PipelineStage, PreferenceValue, ReportSubscription, OrgSubscription, SubLevel } from '@ds/components/settings';
import { Button } from '@ds/components/primitives';
import {
  Tag01, Shield01, Browser, LayersThree01, Bell01, PieChart01,
  CurrencyDollar, User02, Building02, Plus, ChevronDown,
  Users01, MarkerPin01, Signal01, Globe01, Database01, Announcement01, AlertTriangle,
  Cube01, Car01, Server01, Simcard, CheckDone01, Columns03, FilterFunnel01, BarChartSquare02, SwitchHorizontal01,
} from '@ds/icons';

/**
 * Settings BLOCK — the dedicated FAMS settings experience (opened from the blue
 * app-rail gear). Wired as `AppConfig.settings`: the DS renders the SettingsNav
 * (grouped sections) + breadcrumb; each item supplies its own content panel.
 * No bespoke chrome — just sections + render fns.
 *
 * A real **User Accounts** page (table + Add-User side sheet) is wired so you can
 * copy the pattern; the rest are placeholders. ADAPT: keep the Platform /
 * Organization grouping, swap the seeded users, and fill placeholders with the
 * app's config panels (a SchemaForm or a table per item). See settings.block.md.
 */

/* User Accounts — sample people + create/edit sheet + invite-success dialog. */
const ROLE_TONES: Record<string, string> = {
  ops: 'var(--status-warning)', sales: 'var(--chart-5)', finance: 'var(--chart-3)', admin: 'var(--primary)', driver: 'var(--status-success)',
};
const rolePills = (ids: string[]) =>
  ids.map((id) => ({ label: DEFAULT_USER_ROLES.find((r) => r.id === id)?.name ?? id, color: ROLE_TONES[id] ?? 'var(--muted-foreground)' }));

const SEED_USERS: UserRow[] = [
  { id: 'u1', name: 'Jane Doe', email: 'jane.doe@example.com', phone: '+97 302 234 987654', status: 'active', roles: [{ label: 'Admin', color: ROLE_TONES.admin }], roleIds: ['admin'], lastLogin: '15 Feb, 26 | 1:15 PM', lastActivity: '15 Feb, 26 | 1:15 PM' },
  { id: 'u2', name: 'John Smith', email: 'john.smith@example.com', phone: '+97 302 234 456789', status: 'active', roles: [{ label: 'Operations Manager', color: ROLE_TONES.ops }], roleIds: ['ops'], lastLogin: '20 Feb, 26 | 2:45 PM', lastActivity: '20 Feb, 26 | 2:45 PM' },
  { id: 'u3', name: 'Alice Johnson', email: 'alice.j@example.com', phone: '+97 302 234 321654', status: 'active', roles: [{ label: 'Sales Manager', color: ROLE_TONES.sales }], roleIds: ['sales'], lastLogin: '25 Mar, 26 | 10:30 AM', lastActivity: '25 Mar, 26 | 10:30 AM' },
  { id: 'u4', name: 'Bob Brown', email: 'bob.brown@example.com', phone: '+97 302 234 654321', status: 'active', roles: [{ label: 'Finance Manager', color: ROLE_TONES.finance }], roleIds: ['finance'], lastLogin: '30 Apr, 26 | 11:00 AM', lastActivity: '30 Apr, 26 | 11:00 AM' },
  { id: 'u5', name: 'Emily White', email: 'emily.white@example.com', phone: '+97 302 234 789012', status: 'active', roles: [{ label: 'Sales Manager', color: ROLE_TONES.sales }], roleIds: ['sales'], lastLogin: '05 May, 26 | 9:15 AM', lastActivity: '05 May, 26 | 9:15 AM' },
  { id: 'u6', name: 'Michael Green', email: 'michael.green@example.com', phone: '+97 302 234 012345', status: 'active', roles: [{ label: 'Operations Manager', color: ROLE_TONES.ops }], roleIds: ['ops'], lastLogin: '15 Jun, 26 | 3:00 PM', lastActivity: '15 Jun, 26 | 3:00 PM' },
  { id: 'u7', name: 'Sarah Black', email: 'sarah.black@example.com', phone: '+97 302 234 987123', status: 'invited', roles: [{ label: 'Finance Manager', color: ROLE_TONES.finance }], roleIds: ['finance'] },
  { id: 'u8', name: 'David Blue', email: 'david.blue@example.com', phone: '+97 302 234 456012', status: 'active', roles: [{ label: 'Sales Manager', color: ROLE_TONES.sales }], roleIds: ['sales'], lastLogin: '30 Aug, 26 | 5:30 PM', lastActivity: '30 Aug, 26 | 5:30 PM' },
  { id: 'u9', name: 'Anna Grey', email: 'anna.grey@example.com', phone: '+97 302 234 321987', status: 'active', roles: [{ label: 'Operations Manager', color: ROLE_TONES.ops }], roleIds: ['ops'], lastLogin: '15 Sep, 26 | 8:45 AM', lastActivity: '15 Sep, 26 | 8:45 AM' },
  { id: 'u10', name: 'Chris Red', email: 'chris.red@example.com', phone: '+97 302 234 654321', status: 'inactive', roles: [{ label: 'Finance Manager', color: ROLE_TONES.finance }], roleIds: ['finance'], lastLogin: '20 Oct, 26 | 12:00 PM', lastActivity: '20 Oct, 26 | 12:00 PM' },
];

type SuccessState = Pick<UserSuccessDialogProps, 'variant' | 'fullName' | 'inviteLink' | 'username' | 'password'>;

/** Seed a draft from a seeded user row that has no stored draft, so editing it doesn't open a
 *  blank sheet and blank the row on save (T-007 drop-on-load class). Splits the leading country
 *  code out of the stored phone string against DEFAULT_COUNTRY_CODES (unmatched → '' — submitUser's
 *  `.trim()` then reassembles the original string untouched, instead of double-prefixing it with
 *  the sheet's default code). Prefers the row's own `roleIds` (round-trip slot); falls back to
 *  reverse-mapping the display role pills by name for older/seed rows that predate it. */
const userToDraftSeed = (u?: UserRow): Partial<UserDraft> => {
  if (!u) return {};
  const matched = DEFAULT_COUNTRY_CODES.find((c) => u.phone.startsWith(c.code));
  return {
    fullName: u.name,
    countryCode: matched ? matched.code : '',
    phone: matched ? u.phone.slice(matched.code.length).trim() : u.phone,
    authMode: u.email ? 'email' : 'username',
    email: u.email ?? '',
    username: u.username ?? '',
    roleIds: u.roleIds ?? DEFAULT_USER_ROLES.filter((r) => u.roles.some((p) => p.label === r.name)).map((r) => r.id),
  };
};

function UserAccountsPage() {
  const [users, setUsers] = React.useState<UserRow[]>(SEED_USERS);
  const [drafts, setDrafts] = React.useState<Record<string, UserDraft>>({});
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<SuccessState | null>(null);
  const seq = React.useRef(100);

  const onUserAction = (u: UserRow, action: UserAction) => {
    if (action === 'edit') { setEditingId(u.id); setSheetOpen(true); }
    else if (action === 'delete') setUsers((us) => us.filter((x) => x.id !== u.id));
    else if (action === 'suspend') setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, status: 'suspended' } : x)));
    else if (action === 'activate') setUsers((us) => us.map((x) => (x.id === u.id ? { ...x, status: 'active' } : x)));
    else if (action === 'resend') setSuccess({ variant: 'resent', fullName: u.name, inviteLink: `https://www.fams.com/organization/userinvite/${u.id}` });
  };

  /** Persist the WHOLE draft (wholesale — no drop-on-save, G-ROUNDTRIP), reflect the summary
   *  into the row, and surface the right invite-success dialog. */
  const submitUser = (d: UserDraft) => {
    const phone = `${d.countryCode} ${d.phone}`.trim();
    if (editingId) {
      setDrafts((cur) => ({ ...cur, [editingId]: d }));
      setUsers((us) => us.map((x) => (x.id === editingId ? { ...x, name: d.fullName || x.name, phone, email: d.authMode === 'email' ? d.email : undefined, username: d.authMode === 'username' ? d.username : undefined, roles: rolePills(d.roleIds) } : x)));
    } else {
      const id = `user-${(seq.current += 1)}`;
      setDrafts((cur) => ({ ...cur, [id]: d }));
      setUsers((us) => [...us, {
        id, name: d.fullName, phone,
        email: d.authMode === 'email' ? d.email : undefined,
        username: d.authMode === 'username' ? d.username : undefined,
        status: d.authMode === 'email' ? 'invited' : 'active',
        roles: rolePills(d.roleIds),
      }]);
      setSuccess(d.authMode === 'email'
        ? { variant: 'invite', fullName: d.fullName, inviteLink: `https://www.fams.com/organization/userinvite/${id}` }
        : { variant: 'credentials', fullName: d.fullName, username: d.username, password: d.password });
    }
    setEditingId(null);
  };

  const editing = editingId ? drafts[editingId] : undefined;
  const editingUser = editingId ? users.find((u) => u.id === editingId) : undefined;

  return (
    <div>
      <UserAccounts
        users={users}
        onCreateUser={() => { setEditingId(null); setSheetOpen(true); }}
        onUserAction={onUserAction}
      />
      <UserAccountSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={editingId ? { id: editingId, ...(editing ?? userToDraftSeed(editingUser)) } : undefined}
        onSubmit={submitUser}
      />
      <UserSuccessDialog
        open={!!success}
        onOpenChange={(o) => { if (!o) setSuccess(null); }}
        variant={success?.variant ?? 'invite'}
        fullName={success?.fullName}
        inviteLink={success?.inviteLink}
        username={success?.username}
        password={success?.password}
      />
    </div>
  );
}

/* Tags & Categories — sample data (colours are DATA, per-tag). */
const SEED_PRIVATE: Tag[] = [{ id: 'p1', label: 'My Vehicles' }];
const SEED_CATEGORIES: TagCategory[] = [
  { id: 'general', name: 'General', configurable: false, tags: [
    { id: 'g1', label: 'Red', color: '#B94A3F' }, { id: 'g2', label: 'Yellow', color: '#E0A93B' },
    { id: 'g3', label: 'Black', color: '#101828' }, { id: 'g4', label: 'Orange', color: '#EE9A1F' },
    { id: 'g5', label: 'Blue', color: '#2E90FA' }, { id: 'g6', label: 'Blue Grey', color: '#4A6091' },
    { id: 'g7', label: 'Mustard', color: '#C99A2E' }, { id: 'g8', label: 'Off-White', color: '#98A2B3' },
    { id: 'g9', label: 'Light Blue', color: '#12B0F0' }, { id: 'g10', label: 'Purple', color: '#9B4FD0' },
  ] },
  { id: 'truck-type', name: 'Truck Type', selectType: 'single', configurable: true, tags: [
    { id: 'tt1', label: 'Waste Truck', color: '#475467' }, { id: 'tt2', label: 'Garbage Truck', color: '#475467' },
    { id: 'tt3', label: 'Liquid Waste', color: '#475467' }, { id: 'tt4', label: 'Plastic Waste', color: '#475467' },
  ] },
  { id: 'waste-mgmt', name: 'Waste Management', selectType: 'multi', configurable: true, tags: [
    { id: 'wm1', label: 'Landrover', color: '#4FBE6E' }, { id: 'wm2', label: 'Mazda', color: '#4FBE6E' },
    { id: 'wm3', label: 'Mercedes', color: '#4FBE6E' },
  ] },
];

/** Stateful Tags & Categories page — wires the DS components to sample data.
 *  `readOnly` renders the inherited sub-organization view (with an org-context header). */
function TagsCategoriesPage({ readOnly }: { readOnly?: boolean }) {
  const [privateTags, setPrivateTags] = React.useState<Tag[]>(SEED_PRIVATE);
  const [categories, setCategories] = React.useState<TagCategory[]>(SEED_CATEGORIES);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const seq = React.useRef(100);
  const nextId = (p: string) => `${p}-${(seq.current += 1)}`;

  const editing = categories.find((c) => c.id === editingId);
  const addTag = (categoryId: string, label: string) =>
    setCategories((cs) => cs.map((c) => (c.id === categoryId ? { ...c, tags: [...c.tags, { id: nextId('t'), label, color: c.tags[0]?.color }] } : c)));
  const removeTag = (categoryId: string, tagId: string) =>
    setCategories((cs) => cs.map((c) => (c.id === categoryId ? { ...c, tags: c.tags.filter((t) => t.id !== tagId) } : c)));

  const submitCategory = (d: CategoryDraft) => {
    if (editingId) {
      setCategories((cs) => cs.map((c) => (c.id === editingId ? { ...c, name: d.name, selectType: d.selectType, color: d.color, entityIds: d.entityIds, tags: d.tags } : c)));
    } else {
      setCategories((cs) => [...cs, { id: nextId('cat'), name: d.name, selectType: d.selectType, color: d.color, entityIds: d.entityIds, configurable: true, tags: d.tags }]);
    }
    setEditingId(null);
  };

  return (
    <div>
      {readOnly && (
        <div className="flex items-center gap-1.5 border-b border-border bg-muted/30 px-8 py-2.5 text-body-sm">
          <Building02 size={15} className="text-muted-foreground" />
          <span className="text-muted-foreground">Falkenherz</span>
          <ChevronDown size={13} className="-rotate-90 text-muted-foreground" />
          <span className="font-semibold text-foreground">Voltro LLC</span>
          <span className="ml-2 rounded-md bg-muted px-2 py-0.5 text-caption font-medium text-muted-foreground">Sub-organization · inherited</span>
        </div>
      )}
      <TagsAndCategories
        readOnly={readOnly}
        privateTags={privateTags}
        categories={categories}
        onAddPrivateTag={(label) => setPrivateTags((t) => [...t, { id: nextId('p'), label }])}
        onRemovePrivateTag={(id) => setPrivateTags((t) => t.filter((x) => x.id !== id))}
        onAddTag={addTag}
        onRemoveTag={removeTag}
        onConfigureCategory={(id) => { setEditingId(id); setSheetOpen(true); }}
        onCreateCategory={() => { setEditingId(null); setSheetOpen(true); }}
      />
      <CategorySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={editing ? { id: editing.id, name: editing.name, color: editing.color ?? DEFAULT_COLOR, selectType: editing.selectType ?? 'multi', tags: editing.tags, entityIds: editing.entityIds ?? [] } : undefined}
        existingNames={categories.filter((c) => c.id !== editingId).map((c) => c.name)}
        onSubmit={submitCategory}
        onDelete={editingId ? () => { setCategories((cs) => cs.filter((c) => c.id !== editingId)); setEditingId(null); setSheetOpen(false); } : undefined}
      />
    </div>
  );
}

/* Roles Management — sample data + stepped-sheet wiring. */
const SEED_ROLES: RoleRow[] = [
  { id: 'r1', name: 'Operations Manager', access: [{ label: 'Fleet Management System', icon: MarkerPin01 }], userCount: 3, createdOn: '12 Jan, 2023', status: 'active' },
  { id: 'r2', name: 'Finance Manager', access: [{ label: 'HR Management System', icon: Users01 }, { label: 'Reports', icon: Signal01 }, { label: 'Billing' }], userCount: 12, createdOn: '12 Jan, 2023', status: 'disabled' },
  { id: 'r3', name: 'Super Admin & Owner', access: [{ label: 'HR Management System', icon: Users01 }, { label: 'Vehicle Tracking', icon: MarkerPin01 }, { label: 'Data Management' }], userCount: 1, createdOn: '12 Jan, 2023', status: 'active' },
];

/** Derives display chips from `appIds` via the app catalogue (single source of
 *  truth) — real name + icon, instead of guessing from the raw id. */
const accessFromAppIds = (appIds: string[]) =>
  appIds.map((id) => {
    const app = DEFAULT_APPS.find((a) => a.id === id);
    return app ? { label: app.name, icon: app.icon } : { label: id };
  });
const formatCreatedOn = (d: Date) => d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

function RolesManagementPage() {
  const [roles, setRoles] = React.useState<RoleRow[]>(SEED_ROLES);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const seq = React.useRef(100);

  const onRoleAction = (role: RoleRow, action: RoleAction) => {
    if (action === 'edit') { setEditingId(role.id); setSheetOpen(true); }
    else if (action === 'toggle') setRoles((rs) => rs.map((r) => (r.id === role.id ? { ...r, status: r.status === 'active' ? 'disabled' : 'active' } : r)));
    else if (action === 'delete') setRoles((rs) => rs.filter((r) => r.id !== role.id));
  };
  const createRole = (d: RoleDraft) => {
    const access = accessFromAppIds(d.appIds);
    if (editingId) {
      setRoles((rs) => rs.map((r) => (r.id === editingId
        ? { ...r, name: d.name, description: d.description, appIds: d.appIds, privileges: d.privileges, access }
        : r)));
    } else {
      setRoles((rs) => [...rs, {
        id: `role-${(seq.current += 1)}`, name: d.name, description: d.description, appIds: d.appIds,
        privileges: d.privileges, access, userCount: 0, createdOn: formatCreatedOn(new Date()), status: 'active',
      }]);
    }
    setEditingId(null);
  };
  const editingRole = roles.find((r) => r.id === editingId);

  return (
    <div>
      <RolesManagement
        roles={roles}
        onCreateRole={() => { setEditingId(null); setSheetOpen(true); }}
        onRoleAction={onRoleAction}
      />
      <RoleSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={editingRole ? {
          id: editingRole.id, name: editingRole.name, description: editingRole.description,
          appIds: editingRole.appIds, privileges: editingRole.privileges,
        } : undefined}
        onSubmit={createRole}
      />
    </div>
  );
}

/* Application Management — sample apps + create-wizard wiring. */
const SEED_APPS: AppCard[] = [
  { id: 'vts', name: 'Vehicle Tracking System', icon: MarkerPin01, description: 'Real-time fleet monitoring — live location, speed, route history, driver behaviour and geofencing.', tags: ['Workforce', 'Assets', 'Live Tracking'] },
  { id: 'waste', name: 'Waste Management', icon: Globe01, description: 'Smart tracking for waste collection vehicles, schedules and routes with real-time updates.', tags: ['Workforce', 'Assets', 'Zones'] },
  { id: 'hr', name: 'HR – Human Resource Management System', icon: Users01, description: 'Centralised platform to manage employee profiles, shift planning and driver authentication.', tags: ['Workforce', 'Assets', 'Monitoring', 'Reports', 'Dashboards'] },
  { id: 'dms', name: 'Data Management System', icon: Database01, description: 'Enterprise-grade module for organizing, storing and analyzing documents and operational data.', tags: ['Workforce', 'Assets', 'Live Tracking'] },
];

function ApplicationManagementPage() {
  const [apps, setApps] = React.useState<AppCard[]>(SEED_APPS);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const seq = React.useRef(100);
  const editing = apps.find((a) => a.id === editingId);

  const submitApp = (d: AppDraft) => {
    const tags = Object.entries(d.modules).filter(([, m]) => m.enabled).map(([id, m]) => m.customName || id);
    if (editingId) {
      setApps((cur) => cur.map((a) => (a.id === editingId
        ? { ...a, name: d.name, description: d.description, modules: d.modules, subOrgIds: d.subOrgIds, roleIds: d.roleIds, tags }
        : a)));
    } else {
      setApps((cur) => [...cur, {
        id: `app-${(seq.current += 1)}`, name: d.name, description: d.description, icon: Announcement01,
        modules: d.modules, subOrgIds: d.subOrgIds, roleIds: d.roleIds, tags,
      }]);
    }
    setEditingId(null);
  };

  return (
    <div>
      <ApplicationManagement
        apps={apps}
        onCreateApp={() => { setEditingId(null); setSheetOpen(true); }}
        onOpenApp={(a) => { setEditingId(a.id); setSheetOpen(true); }}
      />
      <AppSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={editing ? {
          id: editing.id, name: editing.name, description: editing.description,
          modules: editing.modules, subOrgIds: editing.subOrgIds, roleIds: editing.roleIds,
        } : undefined}
        onSubmit={submitApp}
      />
    </div>
  );
}

/* Event Configuration — sample events + configure-wizard wiring. */
const SEED_EVENTS: EventRow[] = [
  { id: 'e1', name: 'Overspeeding', iconKey: 'Overspeed', type: 'single', trigger: 'Device', criticality: 'critical', configType: 'system', enabled: true },
  { id: 'e2', name: 'Zone Violation', iconKey: 'Harsh Turning', type: 'dual', trigger: 'Device', criticality: 'critical', configType: 'system', enabled: true },
  { id: 'e3', name: 'Excess Idle', iconKey: 'Excess Idle', type: 'single', trigger: 'Device', criticality: 'normal', configType: 'system', enabled: false },
  { id: 'e4', name: 'Harsh Braking', iconKey: 'Idle', type: 'dual', trigger: 'Device', criticality: 'normal', configType: 'custom', enabled: true },
  { id: 'e5', name: 'Engine Temp Drop', iconKey: 'Engine Temp drop', type: 'single', trigger: 'Device', criticality: 'critical', configType: 'custom', enabled: true },
];

/** Seed a full draft from a row's own persisted fields (not just `name`) so editing a
 *  seeded custom event doesn't fabricate defaults over real data (T-007 drop-on-load class). */
const eventToDraftSeed = (e?: EventRow): Partial<EventDraft> => (e ? {
  name: e.name,
  iconKey: e.iconKey ?? '',
  triggerPoint: e.trigger,
  criticality: e.criticality === 'critical' ? 'Critical' : 'Normal',
} : {});

function EventConfigPage() {
  const [events, setEvents] = React.useState<EventRow[]>(SEED_EVENTS);
  const [drafts, setDrafts] = React.useState<Record<string, EventDraft>>({});
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const seq = React.useRef(100);

  const onEventAction = (ev: EventRow, action: EventAction) => {
    if (action === 'edit') { setEditingId(ev.id); setSheetOpen(true); }
    else if (action === 'duplicate') setEvents((es) => [...es, { ...ev, id: `event-${(seq.current += 1)}`, name: `${ev.name} (copy)`, configType: 'custom' }]);
    else if (action === 'delete') setEvents((es) => es.filter((e) => e.id !== ev.id));
  };
  /** Create/update the row from the wizard draft. `closeOnDone` finalizes (Save/Create Event) —
   *  a plain draft-save (closeOnDone=false) captures the generated id into `editingId` so a
   *  REPEATED draft-save updates the same row instead of minting a duplicate every click. */
  const upsertEvent = (d: EventDraft, closeOnDone: boolean) => {
    if (editingId) {
      setDrafts((cur) => ({ ...cur, [editingId]: d }));
      setEvents((es) => es.map((e) => (e.id === editingId
        ? { ...e, name: d.name, iconKey: d.iconKey || e.iconKey, trigger: d.triggerPoint, criticality: d.criticality === 'Normal' ? 'normal' : 'critical' }
        : e)));
      if (closeOnDone) setEditingId(null);
    } else {
      const id = `event-${(seq.current += 1)}`;
      setDrafts((cur) => ({ ...cur, [id]: d }));
      setEvents((es) => [...es, { id, name: d.name, iconKey: d.iconKey, type: 'single', trigger: d.triggerPoint, criticality: d.criticality === 'Normal' ? 'normal' : 'critical', configType: 'custom', enabled: true }]);
      setEditingId(closeOnDone ? null : id);
    }
  };
  const submitEvent = (d: EventDraft) => upsertEvent(d, true);
  const saveEventDraft = (d: EventDraft) => upsertEvent(d, false);

  return (
    <div>
      <EventConfiguration
        events={events}
        onCreateEvent={() => { setEditingId(null); setSheetOpen(true); }}
        onToggleEvent={(id, enabled) => setEvents((es) => es.map((e) => (e.id === id ? { ...e, enabled } : e)))}
        onEventAction={onEventAction}
      />
      <EventConfigSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={editingId ? { id: editingId, ...(drafts[editingId] ?? eventToDraftSeed(events.find((e) => e.id === editingId))) } : undefined}
        onSubmit={submitEvent}
        onSaveDraft={saveEventDraft}
      />
    </div>
  );
}

/* Entity Configuration — the data-model tree (core entities → sub-entities). */
const SEED_ENTITIES: EntityNode[] = [
  { id: 'asset', name: 'Asset', icon: Cube01, configType: 'system', fieldCount: 50, children: [
    { id: 'vehicle', name: 'Vehicle', icon: Car01, configType: 'system', fieldCount: 32, children: [
      { id: 'engine', name: 'Engine', icon: Server01, configType: 'system', fieldCount: 32 },
    ] },
    { id: 'equipment', name: 'Equipment', icon: Cube01, configType: 'system', fieldCount: 28 },
  ] },
  { id: 'device', name: 'Device', icon: Signal01, configType: 'system', fieldCount: 50, children: [
    { id: 'tracker', name: 'Tracker', icon: Signal01, configType: 'system', fieldCount: 40 },
  ] },
  { id: 'workforce', name: 'Workforce', icon: Users01, configType: 'custom', fieldCount: 50 },
  { id: 'sims', name: 'Sims', icon: Simcard, configType: 'system', fieldCount: 50 },
  { id: 'tasks', name: 'Tasks', icon: CheckDone01, configType: 'custom', fieldCount: 50, children: [
    { id: 'inspection', name: 'Inspection', icon: CheckDone01, configType: 'custom', fieldCount: 22 },
  ] },
];
const REFERENCE_ENTITIES = ['Asset', 'Device', 'Workforce', 'Sims', 'Tasks', 'Contacts', 'User'];
/** icon-key (as stored on the draft) → DS icon component, for reflecting the picked icon into the tree row. */
const DEFAULT_ENTITY_ICON_BY_KEY: Record<string, EntityNode['icon']> = Object.fromEntries(DEFAULT_ENTITY_ICONS.map((i) => [i.key, i.icon]));

/** Recursive tree helpers — add child / update / remove a node by id. */
const treeUpdate = (nodes: EntityNode[], id: string, fn: (n: EntityNode) => EntityNode): EntityNode[] =>
  nodes.map((n) => (n.id === id ? fn(n) : { ...n, children: n.children ? treeUpdate(n.children, id, fn) : n.children }));
const treeRemove = (nodes: EntityNode[], id: string): EntityNode[] =>
  nodes.filter((n) => n.id !== id).map((n) => ({ ...n, children: n.children ? treeRemove(n.children, id) : n.children }));
const treeAddChild = (nodes: EntityNode[], parentId: string, child: EntityNode): EntityNode[] =>
  treeUpdate(nodes, parentId, (n) => ({ ...n, children: [...(n.children ?? []), child] }));

function EntityConfigPage() {
  const [entities, setEntities] = React.useState<EntityNode[]>(SEED_ENTITIES);
  const [drafts, setDrafts] = React.useState<Record<string, EntityDraft>>({});
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [parentFor, setParentFor] = React.useState<EntityNode | null>(null);
  const seq = React.useRef(100);

  const onEntityAction = (node: EntityNode, action: EntityAction) => {
    if (action === 'edit') { setParentFor(null); setEditingId(node.id); setSheetOpen(true); }
    else if (action === 'add-sub') { setEditingId(null); setParentFor(node); setSheetOpen(true); }
    else if (action === 'delete') setEntities((es) => treeRemove(es, node.id));
  };

  /** Persist the WHOLE draft (wholesale — no drop-on-save, G-ROUNDTRIP), then reflect the
   *  summary fields into the tree row. `closeOnDone` finalizes (Create/Save Entity); a plain
   *  draft-save (false) captures the generated id into `editingId` — and KEEPS `parentFor` — so
   *  a repeated draft-save updates the same row instead of minting a duplicate or promoting a
   *  sub-entity to top-level (mirrors upsertEvent). */
  const upsertEntity = (d: EntityDraft, closeOnDone: boolean) => {
    const hasUserFields = d.groups.some((g) => g.fields.some((f) => f.name.trim()));
    const computedCount = d.groups.reduce((sum, g) => sum + g.fields.filter((f) => f.name.trim()).length, 0);
    const icon = DEFAULT_ENTITY_ICON_BY_KEY[d.icon] ?? Cube01;
    if (editingId) {
      setDrafts((cur) => ({ ...cur, [editingId]: d }));
      setEntities((es) => treeUpdate(es, editingId, (n) => ({
        ...n,
        name: d.title || n.name,
        icon: DEFAULT_ENTITY_ICON_BY_KEY[d.icon] ?? n.icon ?? Cube01,
        // a seeded row we couldn't fully hydrate has no user fields — don't zero its real count
        fieldCount: hasUserFields ? computedCount : n.fieldCount,
      })));
      if (closeOnDone) { setEditingId(null); setParentFor(null); }
    } else {
      const id = `entity-${(seq.current += 1)}`;
      setDrafts((cur) => ({ ...cur, [id]: d }));
      const node: EntityNode = { id, name: d.title, icon, configType: 'custom', fieldCount: computedCount };
      setEntities((es) => (parentFor ? treeAddChild(es, parentFor.id, node) : [...es, node]));
      setEditingId(closeOnDone ? null : id);
      if (closeOnDone) setParentFor(null);
    }
  };
  const submitEntity = (d: EntityDraft) => upsertEntity(d, true);
  const saveEntityDraft = (d: EntityDraft) => upsertEntity(d, false);

  const editingNode = editingId ? findNode(entities, editingId) : undefined;

  return (
    <div>
      <EntityConfiguration
        entities={entities}
        onCreateEntity={() => { setEditingId(null); setParentFor(null); setSheetOpen(true); }}
        onEntityAction={onEntityAction}
      />
      <EntityConfigSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        referenceEntities={REFERENCE_ENTITIES}
        initial={
          editingId
            ? { id: editingId, ...(drafts[editingId] ?? entityToDraftSeed(editingNode)) }
            : parentFor
              ? { parentId: parentFor.id, parentName: parentFor.name }
              : undefined
        }
        onSubmit={submitEntity}
        onSaveDraft={saveEntityDraft}
      />
    </div>
  );
}
/** Seed a draft from a row's own persisted summary (icon reverse-mapped to its key + title) so
 *  editing a seeded/system entity that has no stored draft doesn't fabricate defaults over real
 *  data (T-007 drop-on-load class). */
const entityToDraftSeed = (node?: EntityNode): Partial<EntityDraft> => (node ? {
  title: node.name,
  icon: DEFAULT_ENTITY_ICONS.find((i) => i.icon === node.icon)?.key ?? 'Cube01',
} : {});
const findNode = (nodes: EntityNode[], id: string): EntityNode | undefined => {
  for (const n of nodes) { if (n.id === id) return n; const c = n.children && findNode(n.children, id); if (c) return c; }
  return undefined;
};

/* Pipeline Configuration — sample pipelines + 3-step configure wizard. */
const PIPELINE_ICON_BY_KEY: Record<string, PipelineCard['icon']> = Object.fromEntries(DEFAULT_PIPELINE_ICONS.map((i) => [i.key, i.icon]));
const LEADS_DEALS = [{ label: 'Leads', icon: Tag01 }, { label: 'Deals', icon: CurrencyDollar }];
const SEED_PIPELINES: PipelineCard[] = [
  { id: 'crm', name: 'CRM Pipeline', icon: Columns03, description: 'Track leads and deals from first touch to close across your sales motion.', taskTypes: LEADS_DEALS },
  { id: 'tasks', name: 'Tasks Pipeline', icon: Tag01, description: 'Organize day-to-day tasks and requests through a simple board.', taskTypes: LEADS_DEALS },
  { id: 'simple', name: 'Simple Pipeline', icon: FilterFunnel01, description: 'A lightweight funnel for any linear process you want to track.', taskTypes: LEADS_DEALS },
  { id: 'hr', name: 'HR Pipeline', icon: Users01, description: 'Move people processes — onboarding, leaves, requests — through clear stages.', taskTypes: LEADS_DEALS },
  { id: 'onboarding', name: 'Onboarding Pipeline', icon: BarChartSquare02, description: 'Guide new hires or customers through a structured onboarding journey.', taskTypes: LEADS_DEALS },
];

/** Seed stages for the seeded pipelines (a seeded row has no stored draft, and the Stages
 *  step's `canProceed` used to gate on ≥1 named stage — leaving a seeded pipeline permanently
 *  save-blocked when edited). Colours are per-stage DATA (chart tokens). */
const SEED_STAGES: Record<string, PipelineStage[]> = {
  crm: [
    { id: 'crm-s1', name: 'Discovery', color: STAGE_COLORS[0] },
    { id: 'crm-s2', name: 'Proposal', color: STAGE_COLORS[1] },
    { id: 'crm-s3', name: 'Negotiation', color: STAGE_COLORS[2] },
    { id: 'crm-s4', name: 'Won', color: STAGE_COLORS[3] },
  ],
  tasks: [
    { id: 'tasks-s1', name: 'To Do', color: STAGE_COLORS[0] },
    { id: 'tasks-s2', name: 'In Progress', color: STAGE_COLORS[1] },
    { id: 'tasks-s3', name: 'Done', color: STAGE_COLORS[3] },
  ],
  simple: [
    { id: 'simple-s1', name: 'Started', color: STAGE_COLORS[0] },
    { id: 'simple-s2', name: 'In Review', color: STAGE_COLORS[1] },
    { id: 'simple-s3', name: 'Complete', color: STAGE_COLORS[3] },
  ],
  hr: [
    { id: 'hr-s1', name: 'Submitted', color: STAGE_COLORS[0] },
    { id: 'hr-s2', name: 'Approval', color: STAGE_COLORS[1] },
    { id: 'hr-s3', name: 'Processed', color: STAGE_COLORS[3] },
  ],
  onboarding: [
    { id: 'onb-s1', name: 'Invited', color: STAGE_COLORS[0] },
    { id: 'onb-s2', name: 'Documentation', color: STAGE_COLORS[1] },
    { id: 'onb-s3', name: 'Orientation', color: STAGE_COLORS[2] },
    { id: 'onb-s4', name: 'Active', color: STAGE_COLORS[3] },
  ],
};

/** Seed a draft from a seeded pipeline card (icon reverse-map + task-type labels→ids + stages)
 *  so editing a seeded pipeline doesn't open blank / drop data on save (T-007 drop-on-load class). */
const pipelineToDraftSeed = (p?: PipelineCard): Partial<PipelineDraft> => (p ? {
  name: p.name,
  description: p.description ?? '',
  icon: DEFAULT_PIPELINE_ICONS.find((i) => i.icon === p.icon)?.key ?? 'Columns03',
  taskTypeIds: DEFAULT_TASK_TYPES.filter((t) => (p.taskTypes ?? []).some((c) => c.label === t.name)).map((t) => t.id),
  stages: SEED_STAGES[p.id] ?? [],
} : {});

function PipelineConfigPage() {
  const [pipelines, setPipelines] = React.useState<PipelineCard[]>(SEED_PIPELINES);
  const [drafts, setDrafts] = React.useState<Record<string, PipelineDraft>>({});
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const seq = React.useRef(100);

  const onPipelineAction = (p: PipelineCard, action: PipelineAction) => {
    if (action === 'edit') { setEditingId(p.id); setSheetOpen(true); }
    else if (action === 'delete') {
      setPipelines((ps) => ps.filter((x) => x.id !== p.id));
      setDrafts((cur) => { const { [p.id]: _drop, ...rest } = cur; return rest; });
    }
  };

  /** Persist the WHOLE draft (wholesale — no drop-on-save, G-ROUNDTRIP); reflect summary into the
   *  card. `closeOnDone` finalizes (Create/Save Pipeline) — a plain draft-save (false) captures the
   *  generated id into `editingId` so a repeated draft-save updates the same row instead of minting
   *  a duplicate every click (mirrors upsertEvent). */
  const upsertPipeline = (d: PipelineDraft, closeOnDone: boolean) => {
    const icon = PIPELINE_ICON_BY_KEY[d.icon] ?? Columns03;
    const taskTypes = DEFAULT_TASK_TYPES.filter((t) => d.taskTypeIds.includes(t.id)).map((t) => ({ label: t.name, icon: t.icon }));
    if (editingId) {
      setDrafts((cur) => ({ ...cur, [editingId]: d }));
      setPipelines((ps) => ps.map((x) => (x.id === editingId ? { ...x, name: d.name || x.name, description: d.description, icon, taskTypes } : x)));
      if (closeOnDone) setEditingId(null);
    } else {
      const id = `pipeline-${(seq.current += 1)}`;
      setDrafts((cur) => ({ ...cur, [id]: d }));
      setPipelines((ps) => [...ps, { id, name: d.name, description: d.description, icon, taskTypes }]);
      setEditingId(closeOnDone ? null : id);
    }
  };

  const editing = editingId ? drafts[editingId] : undefined;
  const editingCard = editingId ? pipelines.find((p) => p.id === editingId) : undefined;

  return (
    <div>
      <PipelineConfiguration
        pipelines={pipelines}
        onCreatePipeline={() => { setEditingId(null); setSheetOpen(true); }}
        onOpenPipeline={(p) => { setEditingId(p.id); setSheetOpen(true); }}
        onPipelineAction={onPipelineAction}
      />
      <PipelineConfigSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initial={editingId ? { id: editingId, ...(editing ?? pipelineToDraftSeed(editingCard)) } : undefined}
        onSubmit={(d) => upsertPipeline(d, true)}
        onSaveDraft={(d) => upsertPipeline(d, false)}
      />
    </div>
  );
}

/* Preferences — a live sectioned settings form (no draft; values persist directly). */
const SEED_PREFERENCES: Record<string, PreferenceValue> = {
  mapRegion: 'Dubai', language: 'English',
  dateFormat: 'MM/DD/YYYY', timeFormat: 'HH:MM', clockType: '12 Hour', timezone: 'Dubai (UTC+04:00)',
  distance: 'Kilometer', speed: 'Kilometer/Hour',
  petrolCost: '2.73', dieselCost: '2.77',
  emailNotifications: true, pushNotifications: true, productUpdates: false,
};
function PreferencesPage() {
  const [values, setValues] = React.useState<Record<string, PreferenceValue>>(SEED_PREFERENCES);
  return <Preferences values={values} onChange={(k, v) => setValues((cur) => ({ ...cur, [k]: v }))} />;
}

/* Subscriptions — My (scheduled reports) + Organization (notification rules). */
const SEED_REPORTS: ReportSubscription[] = [
  { id: 's1', name: 'Vehicle Utilization Report', type: 'Report', frequency: 'Weekly', nextRun: '8 Sep, 2024 · 12:00', lastRun: '8 Sep, 2024 · 12:00', subOrg: 'Society of Petroleum Engineers', enabled: true },
  { id: 's2', name: 'Fuel Consumption Analysis', type: 'Report', frequency: 'Monthly', nextRun: '17 Oct, 2024 · 12:00', lastRun: '17 Oct, 2024 · 12:00', subOrg: 'Weir', enabled: false },
  { id: 's3', name: 'Maintenance Schedule Overview', type: 'Report', frequency: 'Daily', nextRun: '21 Sep, 2024 · 12:00', lastRun: '21 Sep, 2024 · 12:00', subOrg: 'BP', enabled: true },
  { id: 's4', name: 'Driver Performance Summary', type: 'Report', frequency: 'Daily', nextRun: '8 Sep, 2024 · 12:00', lastRun: '8 Sep, 2024 · 12:00', subOrg: 'FieldCore', enabled: true },
  { id: 's5', name: 'Trip History Report', type: 'Report', frequency: 'Monthly', nextRun: '8 Sep, 2024 · 12:00', lastRun: '8 Sep, 2024 · 12:00', subOrg: 'Jacobs', enabled: true },
  { id: 's6', name: 'Fleet Efficiency Report', type: 'Report', frequency: 'Daily', nextRun: '17 Oct, 2024 · 12:00', lastRun: '17 Oct, 2024 · 12:00', subOrg: 'HSEC Services', enabled: false },
  { id: 's7', name: 'Idle Time Analysis', type: 'Report', frequency: 'Daily', nextRun: '8 Sep, 2024 · 12:00', lastRun: '8 Sep, 2024 · 12:00', subOrg: 'Emerson', enabled: true },
  { id: 's8', name: 'Accident & Incident Report', type: 'Report', frequency: 'Weekly', nextRun: '17 Oct, 2024 · 12:00', lastRun: '17 Oct, 2024 · 12:00', subOrg: 'Agoil LLC', enabled: true },
];
const SEED_ORG_SUBS: OrgSubscription[] = [
  { id: 'o1', role: 'Inspector', trigger: 'Rectification Submitted', severity: 'critical', notification: 'ESP has submitted rectification for [Incident ID]', level: 'mandatory' },
  { id: 'o2', role: 'Project Officer', trigger: 'Zero-tolerance Incident', severity: 'critical', notification: 'Zero-tolerance incident reported at [Location]', level: 'mandatory' },
  { id: 'o3', role: 'Project Officer', trigger: 'Incident Escalated', severity: 'other', notification: 'Incident [ID] moved to Escalated stage', level: 'on' },
  { id: 'o4', role: 'Project Officer', trigger: 'Re-rectification Submitted', severity: 'critical', notification: 'ESP submitted Re-rectification for [Incident ID]', level: 'on' },
  { id: 'o5', role: 'ESP', trigger: 'New Incident Created', severity: 'critical', notification: 'New Incident [ID] reported against your entity', level: 'on' },
  { id: 'o6', role: 'ESP', trigger: 'Rectification Rejected', severity: 'minor', notification: 'Rectification for [ID] was rejected', level: 'on' },
  { id: 'o7', role: 'ESP', trigger: 'Re-rectification Request', severity: 'critical', notification: 'PO has requested re-rectification for [ID]', level: 'on' },
  { id: 'o8', role: 'ESP', trigger: 'Penalty Issued', severity: 'medium', notification: 'Penalty issued regarding Incident [ID]', level: 'mandatory' },
];
function SubscriptionsPage() {
  const [reports, setReports] = React.useState<ReportSubscription[]>(SEED_REPORTS);
  const [orgSubs, setOrgSubs] = React.useState<OrgSubscription[]>(SEED_ORG_SUBS);
  return (
    <Subscriptions
      reportSubscriptions={reports}
      orgSubscriptions={orgSubs}
      onToggleReport={(id, enabled) => setReports((rs) => rs.map((r) => (r.id === id ? { ...r, enabled } : r)))}
      onReportAction={(sub, action) => { if (action === 'remove') setReports((rs) => rs.filter((r) => r.id !== sub.id)); }}
      onSetLevel={(id, level) => setOrgSubs((os) => os.map((o) => (o.id === id ? { ...o, level } : o)))}
      onBulkSetLevel={(ids, level) => setOrgSubs((os) => os.map((o) => (ids.includes(o.id) ? { ...o, level } : o)))}
    />
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="p-7">
      <h1 className="text-h5 font-semibold text-foreground">{title}</h1>
      <p className="mt-1 text-body-sm text-muted-foreground">Configuration for {title.toLowerCase()} will appear here.</p>
    </div>
  );
}

export const settingsBlock: AppConfig['settings'] = {
  title: 'Settings',
  sections: [
    {
      label: 'Platform Settings',
      items: [
        { id: 'tags', label: 'Tags & Categories', icon: Tag01, render: () => <TagsCategoriesPage /> },
        { id: 'roles', label: 'Roles Management', icon: Shield01, render: () => <RolesManagementPage /> },
        { id: 'apps', label: 'Application Management', icon: Browser, render: () => <ApplicationManagementPage /> },
        { id: 'events', label: 'Event Configuration', icon: AlertTriangle, render: () => <EventConfigPage /> },
        { id: 'entities', label: 'Entity Configuration', icon: Cube01, render: () => <EntityConfigPage /> },
        { id: 'pipelines', label: 'Pipeline Configuration', icon: Columns03, render: () => <PipelineConfigPage /> },
        { id: 'preferences', label: 'Preferences', icon: SwitchHorizontal01, render: () => <PreferencesPage /> },
        { id: 'modules', label: 'Module Management', icon: LayersThree01, render: () => <Placeholder title="Module Management" /> },
        { id: 'subs', label: 'Subscriptions', icon: Bell01, render: () => <SubscriptionsPage /> },
        { id: 'appearance', label: 'Appearance', icon: PieChart01, render: () => <Placeholder title="Appearance" /> },
        { id: 'billing', label: 'Billing & License', icon: CurrencyDollar, render: () => <Placeholder title="Billing & License" /> },
      ],
    },
    {
      label: 'Organization Settings',
      items: [
        { id: 'users', label: 'User Accounts', icon: User02, render: () => <UserAccountsPage /> },
        { id: 'org', label: 'Organization Settings', icon: Building02, render: () => <Placeholder title="Organization Settings" /> },
        { id: 'sub-org', label: 'Sub-Organization', icon: LayersThree01, render: () => <TagsCategoriesPage readOnly /> },
      ],
    },
  ],
};

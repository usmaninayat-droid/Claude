/**
 * Faithful simulation — core data shapes.
 *
 * Mirror the real FAMS V5 backend (EAV entityconfig/entitydata + pipeline_rules)
 * so the front-end behaves like production with no server. Pure TS — no React,
 * no DS imports. See the monorepo docs/learnings/ for the spec this mirrors.
 */

export type FieldType =
  | 'SmallText' | 'LongText' | 'Date' | 'DateTime'
  | 'SingleReference' | 'MultiReference'
  | 'SingleSelect' | 'MultiSelect'
  | 'Currency' | 'Number' | 'Boolean' | 'tags';

export interface SystemColumn {
  /** systemcol1..50, usercol1..50, title, status, uniqueidentifier, tags. */
  col: string;
  name: string;
  type: FieldType;
  required?: boolean;
  default?: unknown;
  listValues?: string[];
  /** Referenced entity code for Single/MultiReference. */
  refModule?: string;
}

export interface StatusDef {
  key: string;
  label: string;
  color: string;
  bgColor?: string;
  chipColor?: string;
  /**
   * When moving TO this stage, first collect data via a side-sheet form (e.g.
   * completing a job opens a "Maintenance Report"). On submit the move applies
   * and the field values are persisted. Plain field shape (no DS imports); the
   * renderer maps it to the DS SchemaForm.
   */
  transitionForm?: {
    title?: string;
    submitLabel?: string;
    fields: {
      key: string;
      label: string;
      type?: string;
      placeholder?: string;
      required?: boolean;
      options?: { label: string; value: string }[];
    }[];
  };
}

export interface FieldPlacement {
  col: string;
  pos?: 'left' | 'right';
  order?: number;
  showLabel?: boolean;
  name?: string;
  component?: { name: string; props?: Record<string, unknown> };
}

export interface ProfileSection {
  name: string;
  order: number;
  fields: FieldPlacement[];
}

export interface FilterDef {
  col: string;
  order?: number;
  name?: string;
  boolean?: boolean;
  booleanOptions?: { trueLabel: string; falseLabel: string };
  userTypes?: string[];
  orgUsers?: boolean;
  visibility?: { excludeRoles?: string[]; includeRoles?: string[]; requirePrivileges?: string[] };
}

export interface UiConfig {
  statusList: StatusDef[];
  statusChangeRule?: Record<string, string[]>;
  kanbanCard?: {
    header: FieldPlacement[];
    body: FieldPlacement[];
    footer: FieldPlacement[];
    /** Optional cover image: the column holding an image URL (e.g. first uploaded
     *  task image). When set, the kanban card renders a photo banner; cards whose
     *  value is empty fall back to the text-only card. */
    image?: { col: string };
  };
  /** Optional geo binding for the hybrid (list + map) view. A card links to either
   *  a point (latCol/lngCol) or a zone (zoneCol → one of `zones`). Plain coords here
   *  (no DS imports); the renderer maps them to map markers / polygons. */
  map?: {
    center?: [number, number];
    latCol?: string;
    lngCol?: string;
    zoneCol?: string;
    zones?: { id: string; points: [number, number][]; color?: string; label?: string }[];
  };
  profile?: {
    title: FieldPlacement;
    details: FieldPlacement[];
    sections: ProfileSection[];
    /**
     * Dashboard widgets for the entity-profile "Overview" tab. Interpreted by
     * the runtime as `DashboardWidget[]` (kept loosely typed here so the sim
     * layer stays free of component-layer imports).
     */
    overview?: unknown[];
    rightPanel?: { type: 'tab'; tabs: { key: string; title: string; order: number; component: { name: string } }[] };
  };
  filters?: FilterDef[];
  search?: { columns: string[] };
}

export interface EntityConfig {
  code: string;
  name: string;
  systemcolumns: SystemColumn[];
  uiConfig: UiConfig;
  listcolumns: FieldPlacement[];
  uidPrefix?: string;
}

export interface EntityRecord {
  id: string;
  uniqueidentifier?: string;
  title?: string;
  status?: string;
  tags?: string[];
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [systemcol: string]: unknown;
}

/**
 * JSONLogic-lite condition: a path leaf ("$.user.roles" / "$.task.systemcol34")
 * mapped to an operator, or a combinator ($and/$or).
 */
export type Condition =
  | { $and: Condition[] }
  | { $or: Condition[] }
  | { [path: string]: { $in?: unknown[]; $eq?: unknown; $ne?: unknown } };

export interface PipelineRules {
  statuses: string[];
  transitions: Record<string, string[]>;
  transition_rules?: Record<string, Condition>;
  field_rules?: Record<string, { view?: Condition; update?: Condition }>;
  status_rules?: Record<string, { view?: Condition }>;
  task_rules?: { view?: Condition[] };
}

export interface ResolvedPermissions {
  fieldRules: Record<string, { view: boolean; update: boolean }>;
  statusRules: Record<string, { view: boolean }>;
  transitionRules: Record<string, boolean>;
}

export interface UserContext {
  id: string;
  roles: string[];
  orgId?: string;
  privileges?: string[];
  type?: string;
}

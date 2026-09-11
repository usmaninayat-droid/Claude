import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import {
  Button, Badge, Popover, PopoverTrigger, PopoverContent,
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '../primitives';

/**
 * EntityConfiguration — Settings › Entity Configuration (FAMS Settings, Figma
 * 398-8765 / 398-9313 / 398-7931). The data-model authoring surface: FAMS ships
 * CORE entities (Asset · Device · Workforce · Sims · Tasks) and users nest
 * SUB-ENTITIES beneath them (Asset → Vehicle → Engine), each with its own fields.
 *
 * A recursive tree table: one card per top-level entity; expand to reveal nested
 * sub-entities with indent guides. Columns: Name (icon) · Sub-Entities · Fields ·
 * Config Type badge (SYSTEM / CUSTOM). Per-row hover actions: add-sub-entity (+)
 * and a kebab (Edit · Add sub-entity · Delete → confirm). Config-driven
 * (`entities: EntityNode[]`), token-only. Reuses the DS Cell caption pattern.
 */

export type EntityConfigType = 'system' | 'custom';
export type EntityIcon = React.ComponentType<{ size?: number; className?: string }>;
export type EntityAction = 'edit' | 'add-sub' | 'delete';

export interface EntityNode {
  id: string;
  name: string;
  icon?: EntityIcon;
  configType: EntityConfigType;
  /** Total fields defined on this entity. */
  fieldCount: number;
  /** Nested sub-entities (recursive). Sub-entity count is derived from this. */
  children?: EntityNode[];
}

export interface EntityConfigurationProps {
  title?: string;
  subtitle?: string;
  entities: EntityNode[];
  onCreateEntity?: () => void;
  onEntityAction?: (entity: EntityNode, action: EntityAction) => void;
  /** Controlled search value (matches on entity name, recursively). */
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  className?: string;
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-caption font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="truncate text-body-sm text-foreground">{children}</span>
    </div>
  );
}

/** Depth-first filter that keeps a node if it (or any descendant) matches. */
function filterTree(nodes: EntityNode[], q: string): EntityNode[] {
  const s = q.trim().toLowerCase();
  if (!s) return nodes;
  const walk = (list: EntityNode[]): EntityNode[] =>
    list.reduce<EntityNode[]>((acc, n) => {
      const kids = n.children ? walk(n.children) : [];
      if (n.name.toLowerCase().includes(s) || kids.length) acc.push({ ...n, children: kids.length ? kids : n.children });
      return acc;
    }, []);
  return walk(nodes);
}

export function EntityConfiguration({
  title = 'Entity Configuration',
  subtitle = 'Structure the data model FAMS runs on — define core entities, nest sub-entities beneath them, and shape each one’s fields.',
  entities, onCreateEntity, onEntityAction, searchQuery, onSearchChange, className,
}: EntityConfigurationProps) {
  const [internalQ, setInternalQ] = React.useState('');
  const q = searchQuery ?? internalQ;
  const setQ = onSearchChange ?? setInternalQ;
  const [pendingDelete, setPendingDelete] = React.useState<EntityNode | null>(null);

  const visible = React.useMemo(() => filterTree(entities, q), [entities, q]);

  const act = (entity: EntityNode, action: EntityAction) => {
    if (action === 'delete') { setPendingDelete(entity); return; }
    onEntityAction?.(entity, action);
  };

  return (
    <div className={cn('p-7', className)}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-h5 font-semibold text-foreground">{title}</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              aria-label="Search entity types"
              placeholder="Search entity types"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 w-56 rounded-md border border-border bg-input-background pl-8 pr-3 text-body-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          {onCreateEntity && (
            <Button variant="primary" onClick={onCreateEntity}><Icons.Plus size={16} className="mr-1.5" />Create New Entity</Button>
          )}
        </div>
      </div>

      {visible.length ? (
        <div className="flex flex-col gap-2.5">
          {visible.map((e) => (
            <div key={e.id} className="overflow-hidden rounded-xl border border-border bg-card">
              <EntityTreeNode node={e} depth={0} onAction={act} forceExpanded={!!q.trim()} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-body-sm text-muted-foreground">
          {q.trim() ? 'No entities match your search.' : 'No entities configured yet — create your first entity.'}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <span className="mb-1 grid size-11 place-items-center rounded-full bg-destructive/10 text-[var(--status-error)]"><Icons.AlertCircle size={22} /></span>
            <AlertDialogTitle>Delete Entity!</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {pendingDelete ? <span className="font-semibold text-foreground">{pendingDelete.name}</span> : 'this entity'} from this organization? Its sub-entities and fields will be removed too.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--status-error)] text-primary-foreground hover:opacity-90"
              onClick={() => { if (pendingDelete) onEntityAction?.(pendingDelete, 'delete'); setPendingDelete(null); }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EntityTreeNode({ node, depth, onAction, forceExpanded }: { node: EntityNode; depth: number; onAction: (e: EntityNode, a: EntityAction) => void; forceExpanded?: boolean }) {
  const [expanded, setExpanded] = React.useState(depth === 0);
  const isExpanded = expanded || !!forceExpanded; // an active search forces branches open so nested matches show
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const Icon = node.icon;

  return (
    <>
      <div
        className={cn('group/row relative flex items-center gap-4 px-5 py-3.5', depth > 0 && 'border-t border-border bg-muted/20')}
        style={depth > 0 ? { paddingLeft: `${20 + depth * 28}px` } : undefined}
      >
        {/* elbow guide connecting a child to its parent (token-only — uses --border) */}
        {depth > 0 && (
          <span aria-hidden className="pointer-events-none absolute top-0 h-1/2 w-4 rounded-bl-md border-b border-l border-border" style={{ left: `${20 + (depth - 1) * 28 + 3}px` }} />
        )}
        <button
          type="button"
          aria-label={hasChildren ? (isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`) : undefined}
          aria-expanded={hasChildren ? isExpanded : undefined}
          disabled={!hasChildren}
          onClick={() => hasChildren && setExpanded((v) => !v)}
          className={cn('grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors', hasChildren ? 'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring' : 'opacity-0')}
        >
          <Icons.ChevronDown size={16} className={cn('transition-transform', !isExpanded && '-rotate-90')} />
        </button>

        <div className="grid flex-1 grid-cols-2 items-center gap-x-6 gap-y-3 sm:grid-cols-4">
          <Cell label="Name">
            <span className="flex items-center gap-2">
              {Icon ? <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon size={18} /></span> : null}
              <span className="truncate font-semibold" title={node.name}>{node.name}</span>
            </span>
          </Cell>
          <Cell label="Sub-Entities">{children.length}</Cell>
          <Cell label="Fields">{node.fieldCount}</Cell>
          <Cell label="Config Type">
            <Badge color={node.configType === 'system' ? 'var(--primary)' : 'var(--status-success)'}>
              {node.configType === 'system' ? 'SYSTEM' : 'CUSTOM'}
            </Badge>
          </Cell>
        </div>

        <div className="flex items-center gap-2 opacity-0 focus-within:opacity-100 group-hover/row:opacity-100 motion-safe:transition-opacity">
          <button
            type="button"
            aria-label={`Add sub-entity to ${node.name}`}
            onClick={() => onAction(node, 'add-sub')}
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icons.Plus size={16} />
          </button>
          <RowMenu node={node} onAction={onAction} />
        </div>
      </div>

      {hasChildren && isExpanded && children.map((c) => (
        <EntityTreeNode key={c.id} node={c} depth={depth + 1} onAction={onAction} forceExpanded={forceExpanded} />
      ))}
    </>
  );
}

function RowMenu({ node, onAction }: { node: EntityNode; onAction: (e: EntityNode, a: EntityAction) => void }) {
  const [open, setOpen] = React.useState(false);
  const item = 'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Actions for ${node.name}`} className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><Icons.DotsVertical size={18} /></button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <button type="button" className={item} onClick={() => { onAction(node, 'edit'); setOpen(false); }}><Icons.Edit01 size={15} className="text-muted-foreground" />Edit entity</button>
        <button type="button" className={item} onClick={() => { onAction(node, 'add-sub'); setOpen(false); }}><Icons.Plus size={15} className="text-muted-foreground" />Add sub-entity</button>
        <button type="button" className={cn(item, 'text-[var(--status-error)]')} onClick={() => { onAction(node, 'delete'); setOpen(false); }}><Icons.Trash01 size={15} />Delete</button>
      </PopoverContent>
    </Popover>
  );
}

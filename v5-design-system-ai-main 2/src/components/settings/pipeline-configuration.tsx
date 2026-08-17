import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import {
  Button, Popover, PopoverTrigger, PopoverContent,
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from '../primitives';

/**
 * PipelineConfiguration — Settings › Pipeline Configuration (FAMS Settings, Figma
 * 189-17867). Author the pipelines a product runs on: a card grid, one card per
 * pipeline (icon · name · description · task-type chips) with a hover open-arrow
 * and a kebab (Delete → confirm). Header carries search + "Create New Pipeline".
 * Config-driven (`pipelines: PipelineCard[]`), token-only.
 */

export type PipelineIcon = React.ComponentType<{ size?: number; className?: string }>;
export type PipelineAction = 'edit' | 'delete';
export interface PipelineTaskChip { label: string; icon?: PipelineIcon }
export interface PipelineCard {
  id: string;
  name: string;
  icon?: PipelineIcon;
  description?: string;
  taskTypes?: PipelineTaskChip[];
}
export interface PipelineConfigurationProps {
  title?: string;
  subtitle?: string;
  pipelines: PipelineCard[];
  onCreatePipeline?: () => void;
  onOpenPipeline?: (pipeline: PipelineCard) => void;
  onPipelineAction?: (pipeline: PipelineCard, action: PipelineAction) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  className?: string;
}

export function PipelineConfiguration({
  title = 'Pipeline Configuration',
  subtitle = 'Streamline your processes with Pipelines by organizing tasks and tracking progress effortlessly. Collaborate with your team to achieve goals faster and stay aligned every step of the way.',
  pipelines, onCreatePipeline, onOpenPipeline, onPipelineAction, searchQuery, onSearchChange, className,
}: PipelineConfigurationProps) {
  const [internalQ, setInternalQ] = React.useState('');
  const q = searchQuery ?? internalQ;
  const setQ = onSearchChange ?? setInternalQ;
  const [pendingDelete, setPendingDelete] = React.useState<PipelineCard | null>(null);

  const visible = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return pipelines;
    return pipelines.filter((p) => p.name.toLowerCase().includes(s) || (p.description ?? '').toLowerCase().includes(s) || (p.taskTypes ?? []).some((t) => t.label.toLowerCase().includes(s)));
  }, [pipelines, q]);

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
            <input type="search" aria-label="Search pipelines" placeholder="Search pipelines" value={q} onChange={(e) => setQ(e.target.value)}
              className="h-9 w-64 max-w-[60vw] rounded-md border border-border bg-input-background pl-8 pr-3 text-body-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          {onCreatePipeline && <Button variant="primary" onClick={onCreatePipeline}><Icons.Plus size={16} className="mr-1.5" />Create New Pipeline</Button>}
        </div>
      </div>

      {visible.length ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visible.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.id} className="group/card relative rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary hover:shadow-sm">
                <button type="button" onClick={() => onOpenPipeline?.(p)} className="block w-full text-left focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Open ${p.name}`}>
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary">{Icon ? <Icon size={20} /> : <Icons.Columns03 size={20} />}</span>
                    <div className="min-w-0 flex-1 pr-12">
                      <h3 className="truncate text-body-md font-semibold text-foreground">{p.name}</h3>
                      {p.description && <p className="mt-1 line-clamp-2 text-body-sm text-muted-foreground">{p.description}</p>}
                    </div>
                  </div>
                </button>
                {p.taskTypes?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2 pl-[52px]">
                    {p.taskTypes.map((t, i) => {
                      const TI = t.icon;
                      return <span key={i} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-caption font-medium text-muted-foreground">{TI ? <TI size={13} /> : null}{t.label}</span>;
                    })}
                  </div>
                ) : null}

                <div className="absolute right-4 top-4 flex items-center gap-1 opacity-0 focus-within:opacity-100 group-hover/card:opacity-100 motion-safe:transition-opacity">
                  {onPipelineAction && <RowMenu pipeline={p} onDelete={() => setPendingDelete(p)} onEdit={() => onPipelineAction(p, 'edit')} />}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-body-sm text-muted-foreground">
          {q.trim() ? 'No pipelines match your search.' : 'No pipelines yet — create your first pipeline.'}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => { if (!o) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <span className="mb-1 grid size-11 place-items-center rounded-full bg-destructive/10 text-[var(--status-error)]"><Icons.AlertCircle size={22} /></span>
            <AlertDialogTitle>Delete Pipeline!</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete {pendingDelete ? <span className="font-semibold text-foreground">{pendingDelete.name}</span> : 'this pipeline'} from this organization?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (pendingDelete) onPipelineAction?.(pendingDelete, 'delete'); setPendingDelete(null); }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RowMenu({ pipeline, onEdit, onDelete }: { pipeline: PipelineCard; onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = React.useState(false);
  const item = 'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring';
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label={`Actions for ${pipeline.name}`} className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><Icons.DotsHorizontal size={18} /></button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1">
        <button type="button" className={item} onClick={() => { onEdit(); setOpen(false); }}><Icons.Edit01 size={15} className="text-muted-foreground" />Edit</button>
        <button type="button" className={cn(item, 'text-[var(--status-error)]')} onClick={() => { onDelete(); setOpen(false); }}><Icons.Trash01 size={15} />Delete</button>
      </PopoverContent>
    </Popover>
  );
}

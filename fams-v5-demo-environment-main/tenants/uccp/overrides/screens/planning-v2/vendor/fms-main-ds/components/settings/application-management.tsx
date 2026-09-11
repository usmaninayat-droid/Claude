import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button } from '../primitives';
import type { AppModuleConfig } from './app-sheet';

/**
 * ApplicationManagement — Settings › Application Management list (FAMS Settings,
 * Figma 2-437). A responsive card grid of the org's applications: icon · name ·
 * description · module/entity pills (+N more). Header carries "Create New
 * Application"; cards open (↗) to edit. Config-driven (`apps: AppCard[]`), token-only.
 */

type IconCmp = React.ComponentType<{ size?: number; className?: string }>;

export interface AppCard {
  id: string;
  name: string;
  description?: string;
  icon?: IconCmp;
  tags?: string[];
  /** Full wizard draft round-trip slots — persisted so "Edit" rehydrates every step. */
  modules?: Record<string, AppModuleConfig>;
  subOrgIds?: string[];
  roleIds?: string[];
}
export interface ApplicationManagementProps {
  title?: string;
  subtitle?: string;
  apps: AppCard[];
  maxTags?: number;
  onCreateApp?: () => void;
  onOpenApp?: (app: AppCard) => void;
  className?: string;
}

export function ApplicationManagement({
  title = 'Application & their Management',
  subtitle = 'Applications bundle the modules, sub-organizations and roles your teams work in. Create one and configure what it exposes.',
  apps, maxTags = 5, onCreateApp, onOpenApp, className,
}: ApplicationManagementProps) {
  return (
    <div className={cn('p-7', className)}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h5 font-semibold text-foreground">{title}</h1>
          <p className="mt-1 max-w-xl text-body-sm text-muted-foreground">{subtitle}</p>
        </div>
        {onCreateApp && (
          <Button variant="primary" onClick={onCreateApp}><Icons.Plus size={16} className="mr-1.5" />Create New Application</Button>
        )}
      </div>

      {apps.length ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {apps.map((a) => {
            const Icon = a.icon ?? Icons.Grid01;
            const shown = (a.tags ?? []).slice(0, maxTags);
            const extra = (a.tags?.length ?? 0) - shown.length;
            return (
              <div key={a.id} className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-all hover:border-primary hover:shadow-sm">
                {onOpenApp && (
                  <button type="button" aria-label={`Open ${a.name}`} onClick={() => onOpenApp(a)} className="absolute right-4 top-4 text-muted-foreground opacity-0 transition-opacity hover:text-primary focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100">
                    <Icons.ArrowUpRight size={18} />
                  </button>
                )}
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon size={20} /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 pr-6 text-body-md font-semibold text-foreground" title={a.name}>{a.name}</h3>
                    {a.description && <p className="mt-1 line-clamp-2 text-body-sm text-muted-foreground">{a.description}</p>}
                    {shown.length ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {shown.map((t) => <span key={t} className="rounded-full border border-border px-2.5 py-1 text-caption font-medium text-muted-foreground">{t}</span>)}
                        {extra > 0 && <span className="text-caption font-semibold text-primary">+{extra} more</span>}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-body-sm text-muted-foreground">No applications yet — create your first application.</div>
      )}
    </div>
  );
}

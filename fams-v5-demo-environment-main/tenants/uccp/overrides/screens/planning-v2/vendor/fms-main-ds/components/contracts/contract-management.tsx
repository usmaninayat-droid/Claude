import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Button } from '../primitives';
import { ContractCard } from './contract-card';
import type { ContractCardData, ContractIcon } from './contract-card';

/**
 * ContractManagement — Contract/Project Management list view (FAMS, from the Tadweer
 * ref, Figma node 2111-10733). Header (search · filter · Create) + a KPI stat row
 * (Total/Active/Expiring/Drafts/Expired) + a grid of `ContractCard`s. Config-driven
 * (`contracts` + optional `stats`), token-only. Stats default to counts derived from
 * `contracts` when not supplied.
 */

export interface ContractStat { id: string; label: string; value: React.ReactNode; icon?: ContractIcon; tone?: string }
export interface ContractManagementProps {
  title?: string;
  subtitle?: string;
  contracts: ContractCardData[];
  stats?: ContractStat[];
  onCreateContract?: () => void;
  /** Label for the create button — products override the vocabulary (e.g. "Create New Project"). */
  createLabel?: string;
  /** Filter fields rendered in the toolbar row, between search and the create action —
   *  the FAMS standard puts search · filters · action on ONE row. */
  filterSlot?: React.ReactNode;
  onOpenContract?: (contract: ContractCardData) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  className?: string;
}

function deriveStats(contracts: ContractCardData[]): ContractStat[] {
  const by = (s: ContractCardData['status']) => contracts.filter((c) => c.status === s).length;
  return [
    { id: 'total', label: 'Total Contract', value: contracts.length, icon: Icons.File06, tone: 'var(--primary)' },
    { id: 'active', label: 'Active', value: by('ongoing'), icon: Icons.FileCheck02, tone: 'var(--status-success)' },
    { id: 'expiring', label: 'Expiring ≤ 120 Days', value: by('expiring'), icon: Icons.Clock, tone: 'var(--status-warning)' },
    { id: 'drafts', label: 'Drafts', value: by('draft'), icon: Icons.File02, tone: 'var(--muted-foreground)' },
    { id: 'expired', label: 'Expired', value: by('expired'), icon: Icons.FileX02, tone: 'var(--status-error)' },
  ];
}

export function ContractManagement({
  title = 'Contract Management',
  subtitle,
  contracts, stats, onCreateContract, createLabel = 'Create New Contract', filterSlot, onOpenContract, searchQuery, onSearchChange, className,
}: ContractManagementProps) {
  const [internalQ, setInternalQ] = React.useState('');
  const q = searchQuery ?? internalQ;
  const setQ = onSearchChange ?? setInternalQ;

  const visible = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return contracts;
    return contracts.filter((c) => c.name.toLowerCase().includes(s) || (c.chips ?? []).some((ch) => ch.label.toLowerCase().includes(s)));
  }, [contracts, q]);

  const cards = stats ?? deriveStats(contracts);

  return (
    <div className={cn('p-6', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
            <input type="search" aria-label="Search contracts" placeholder="Search anything here" value={q} onChange={(e) => setQ(e.target.value)}
              className="h-9 w-72 max-w-[60vw] rounded-md border border-border bg-input-background pl-8 pr-3 text-body-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <button type="button" aria-label="Filters" className="grid size-9 place-items-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><Icons.FilterFunnel02 size={16} /></button>
          {filterSlot}
        </div>
        {onCreateContract && <Button variant="primary" onClick={onCreateContract}><Icons.Plus size={16} className="mr-1.5" />{createLabel}</Button>}
      </div>
      {subtitle && <p className="mb-4 max-w-2xl text-body-sm text-muted-foreground">{subtitle}</p>}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map((s) => {
          const SI = s.icon;
          return (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5">
              {SI && <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: `color-mix(in srgb, ${s.tone ?? 'var(--muted-foreground)'} 12%, transparent)`, color: s.tone ?? 'var(--muted-foreground)' }}><SI size={18} /></span>}
              <div className="min-w-0">
                <div className="truncate text-caption font-medium text-muted-foreground">{s.label}</div>
                <div className="text-h6 font-bold text-foreground">{s.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {visible.length ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => <ContractCard key={c.id} contract={c} onOpen={() => onOpenContract?.(c)} />)}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-body-sm text-muted-foreground">
          {q.trim() ? 'No contracts match your search.' : 'No contracts yet — create your first contract.'}
        </div>
      )}
    </div>
  );
}

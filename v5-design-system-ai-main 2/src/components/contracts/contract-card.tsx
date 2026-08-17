import * as React from 'react';
import { cn } from '../utils/cn';
import { Badge } from '../primitives';

/**
 * ContractCard — Contract/Project Management list card (FAMS, from the Tadweer ref,
 * Figma lXBH6N7ZpHfBuY60tH71TD node 2111-10733). Header (name · expiry · status
 * badge) + identity chips + a grid of resource meters (label · value/max · a bar
 * whose colour derives from fill unless a `tone` is given). Config-driven, token-only.
 */

export type ContractStatus = 'ongoing' | 'expiring' | 'draft' | 'expired';
export type ContractIcon = React.ComponentType<{ size?: number; className?: string }>;
export type ResourceTone = 'success' | 'warning' | 'error';
export interface ContractResource { label: string; icon?: ContractIcon; value: number; max: number; tone?: ResourceTone }
export interface ContractChip { label: string; icon?: ContractIcon }
export interface ContractCardData {
  id: string;
  name: string;
  status: ContractStatus;
  expiryLabel?: string;
  chips?: ContractChip[];
  resources?: ContractResource[];
}

const STATUS_META: Record<ContractStatus, { label: string; tone: string }> = {
  ongoing: { label: 'ONGOING', tone: 'var(--status-success)' },
  expiring: { label: 'EXPIRING', tone: 'var(--status-warning)' },
  draft: { label: 'DRAFT', tone: 'var(--muted-foreground)' },
  expired: { label: 'EXPIRED', tone: 'var(--status-error)' },
};
const TONE_VAR: Record<ResourceTone, string> = { success: 'var(--status-success)', warning: 'var(--status-warning)', error: 'var(--status-error)' };
/** Fill-derived meter colour when no explicit tone: high=success, mid=warning, low=error. */
function resourceTone(r: ContractResource): string {
  if (r.tone) return TONE_VAR[r.tone];
  const ratio = r.max > 0 ? r.value / r.max : 0;
  return ratio >= 0.8 ? TONE_VAR.success : ratio >= 0.5 ? TONE_VAR.warning : TONE_VAR.error;
}

export function ContractCard({ contract, onOpen, className }: { contract: ContractCardData; onOpen?: () => void; className?: string }) {
  const meta = STATUS_META[contract.status];
  const expiryTone = contract.status === 'expiring' || contract.status === 'expired' ? 'text-[var(--status-error)]' : 'text-muted-foreground';
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${contract.name}`}
      className={cn('flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 truncate text-body-md font-semibold text-foreground" title={contract.name}>{contract.name}</h3>
        <div className="flex shrink-0 items-center gap-2">
          {contract.expiryLabel && <span className={cn('text-caption font-medium', expiryTone)}>{contract.expiryLabel}</span>}
          <Badge color={meta.tone}>{meta.label}</Badge>
        </div>
      </div>

      {contract.chips?.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {contract.chips.map((c, i) => {
            const CI = c.icon;
            return <span key={i} className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-2 py-0.5 text-caption font-medium text-muted-foreground">{CI ? <CI size={12} /> : null}{c.label}</span>;
          })}
        </div>
      ) : null}

      {contract.resources?.length ? (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 pt-1">
          {contract.resources.map((r) => {
            const RI = r.icon;
            const tone = resourceTone(r);
            const pct = r.max > 0 ? Math.min(100, Math.round((r.value / r.max) * 100)) : 0;
            return (
              <div key={r.label} className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center justify-between gap-2 text-body-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">{RI ? <RI size={13} /> : null}{r.label}</span>
                  <span className="tabular-nums font-medium text-foreground">{r.value}<span className="text-muted-foreground">/{r.max}</span></span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </button>
  );
}

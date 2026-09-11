import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Sparkline } from '../data-viz';

/**
 * OrganizationSettings — Settings › Organization Settings ("org overview")
 * (FAMS Settings, Figma 2-11415 logo-set / 2-11663 logo-empty). Identity header +
 * a KPI stat row (sparklines + a wide billing card) + a day-grouped activity log.
 * Read-only summary surface; config-driven + token-only; reuses the DS `Sparkline`.
 * See organization-settings.spec.md.
 */

export type TrendDir = 'up' | 'down' | 'flat';

export interface OrgIdentity { name: string; email?: string; logo?: string }

export interface OrgStat {
  id: string;
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  /** Secondary line beside/under the value (e.g. "Next billing date: 12 Jan, 2023"). */
  subValue?: React.ReactNode;
  trend?: { value: string; direction: TrendDir };
  /** Muted helper under the trend (e.g. "Compared to last month"). */
  caption?: string;
  /** Sparkline series. */
  spark?: number[];
  /** Billing-style card — taller, spans two rows. */
  wide?: boolean;
  onDrill?: () => void;
}

export interface OrgActivity {
  id: string;
  actor: string;
  actorRole?: string;
  action: React.ReactNode;
  timestamp: string;
  /** Day bucket header, e.g. "Today" / "Yesterday" / "27th November, 2023". */
  dateGroup: string;
  onActorClick?: () => void;
}

export interface OrganizationSettingsProps {
  identity: OrgIdentity;
  stats: OrgStat[];
  activity: OrgActivity[];
  activityTitle?: string;
  onEditIdentity?: () => void;
  onBack?: () => void;
  className?: string;
}

const TREND: Record<TrendDir, { color: string; Icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  up: { color: 'var(--status-success)', Icon: Icons.ArrowUpRight },
  down: { color: 'var(--status-error)', Icon: Icons.ArrowDownRight },
  flat: { color: 'var(--muted-foreground)', Icon: Icons.ArrowUpRight },
};

export function OrganizationSettings({
  identity,
  stats,
  activity,
  activityTitle = 'Organization Activity Logs',
  onEditIdentity,
  onBack,
  className,
}: OrganizationSettingsProps) {
  // Group activity by dateGroup, first-seen order.
  const groups = React.useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, OrgActivity[]>();
    for (const a of activity) {
      if (!map.has(a.dateGroup)) { map.set(a.dateGroup, []); order.push(a.dateGroup); }
      map.get(a.dateGroup)!.push(a);
    }
    return order.map((g) => ({ group: g, rows: map.get(g)! }));
  }, [activity]);

  return (
    <div className={cn('p-7', className)}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1 rounded-sm text-body-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icons.ChevronLeft size={14} /> Settings
        </button>
      )}

      {/* ── Identity header ───────────────────────────────────────────── */}
      <div className="mb-7 flex items-center gap-4">
        <div className="relative">
          <div className="grid size-16 place-items-center overflow-hidden rounded-full border border-border bg-muted">
            {identity.logo
              ? <img src={identity.logo} alt="" className="size-full object-contain" />
              : <Icons.Image01 size={22} className="text-muted-foreground" />}
          </div>
          {onEditIdentity && (
            <button
              type="button"
              aria-label="Edit organization"
              onClick={onEditIdentity}
              className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full border border-border bg-card text-primary shadow-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icons.Edit02 size={12} />
            </button>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-h4 font-semibold text-foreground">{identity.name}</h1>
          {identity.email ? <p className="truncate text-body-sm text-muted-foreground">{identity.email}</p> : null}
        </div>
      </div>

      {/* ── Stat row ──────────────────────────────────────────────────── */}
      {stats.length > 0 && (
        <div className="mb-8 grid auto-rows-max grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => <OrgStatCard key={s.id} stat={s} />)}
        </div>
      )}

      {/* ── Activity log ──────────────────────────────────────────────── */}
      {groups.length > 0 && (
        <section>
          <h2 className="mb-3 text-body font-semibold text-foreground">{activityTitle}</h2>
          <div className="flex flex-col gap-4">
            {groups.map(({ group, rows }) => (
              <div key={group} className="flex flex-col gap-1.5">
                <div className="text-body-xs font-medium text-muted-foreground">{group}</div>
                {rows.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-4 rounded-lg bg-muted/40 px-4 py-3">
                    <p className="text-body-sm text-foreground">
                      {r.onActorClick ? (
                        <button type="button" onClick={r.onActorClick} className="rounded-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                          {r.actor}{r.actorRole ? ` (${r.actorRole})` : ''}
                        </button>
                      ) : (
                        <span className="font-semibold text-primary">{r.actor}{r.actorRole ? ` (${r.actorRole})` : ''}</span>
                      )}{' '}
                      {r.action}
                    </p>
                    <span className="shrink-0 whitespace-nowrap text-body-xs text-muted-foreground">{r.timestamp}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function OrgStatCard({ stat }: { stat: OrgStat }) {
  const trend = stat.trend ? TREND[stat.trend.direction] : null;
  const sparkColor = stat.trend?.direction === 'down' ? 'var(--status-error)' : 'var(--status-success)';
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border border-border bg-card p-4',
        stat.wide && 'lg:col-span-1 lg:row-span-2',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {stat.icon ? <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary [&>svg]:size-4">{stat.icon}</span> : null}
        </div>
        {stat.onDrill && (
          <button
            type="button"
            aria-label={`Open ${stat.label}`}
            onClick={stat.onDrill}
            className="grid size-6 place-items-center rounded-md text-primary transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icons.ArrowUpRight size={16} />
          </button>
        )}
      </div>

      <div className="mt-1">
        <div className="text-h4 font-semibold tabular-nums text-foreground">{stat.value}</div>
        {stat.label ? <div className="text-body-sm text-muted-foreground">{stat.label}</div> : null}
        {stat.subValue ? <div className="mt-0.5 text-body-xs text-muted-foreground">{stat.subValue}</div> : null}
      </div>

      {stat.trend || stat.caption ? (
        <div className="mt-2 flex items-center gap-1.5">
          {trend ? (
            <span className="inline-flex items-center gap-0.5 text-body-xs font-semibold" style={{ color: trend.color }}>
              <trend.Icon size={13} />{stat.trend!.value}
            </span>
          ) : null}
          {stat.caption ? <span className="text-body-xs text-muted-foreground">{stat.caption}</span> : null}
        </div>
      ) : null}

      {stat.spark && stat.spark.length > 1 ? (
        <div className="mt-3 flex-1">
          <Sparkline data={stat.spark} color={sparkColor} width="100%" height={stat.wide ? 140 : 44} />
        </div>
      ) : null}
    </div>
  );
}

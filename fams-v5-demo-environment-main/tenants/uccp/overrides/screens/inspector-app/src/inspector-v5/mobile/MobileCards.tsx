import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * MobileCards — the mobile visual vocabulary, taken wholesale from the old
 * flood-demo inspector shell
 * (MM-flood-management-main/src/app/components/inspector/InspectorMobileShell.tsx)
 * and re-tinted to the Qatar MME maroon theme (`var(--primary)`).
 *
 * What is ported, 1:1 in geometry:
 *  · `MobileListCard`   ← old `MobileQueueCard`: white card, `rounded-xl`
 *    (12px), 1px border, `p-3.5` (14px), a 48px circular icon tile tinted
 *    16% of the record's semantic colour, then a 4px-gap stack of
 *    title line → chip/meta row → one dense muted meta line.
 *  · `MobileAssetCard`  ← old `SelectedAssetCard`: the compact card a
 *    selected map pin shows in the detail sheet's PEEK slot — 68×60
 *    `rounded-lg` tinted tile · 11px icon+text meta row · 20px semibold
 *    title · 7px colour dot + bold coloured status + muted secondary, plus a
 *    44px close button; the whole body carries the sheet's pointer handlers
 *    so a drag started on the card moves the sheet and a tap still opens.
 *  · `MobileStatTile`   ← the old overview's `rounded-[var(--radius-md)]
 *    border p-3` stat tile (10px uppercase caption over a semibold value).
 *  · `MobileProgressBar`← old `MobileProgressBar` (4px track, 2px radius).
 *  · `MobileActionButton` ← the old overview action stack: 48px min height,
 *    primary = solid maroon, outline = maroon on card with a maroon border,
 *    ghost = bare maroon text.
 *  · `MobileChip` / `MobileSolidChip` ← the old queue card's severity and
 *    status chips (9px bold uppercase, `--radius-sm`, 7×2px padding).
 */

export type DragProps = {
  onPointerDown: (e: ReactPointerEvent) => void;
  onPointerMove: (e: ReactPointerEvent) => void;
  onPointerUp: (e: ReactPointerEvent) => void;
  onPointerCancel: (e: ReactPointerEvent) => void;
};

/** 16%-tint of any runtime colour — the old shell's tile background recipe. */
export function tint(color: string, pct = 16): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

/* ── chips ──────────────────────────────────────────────────────────── */

/** Solid status/severity chip — old queue card's severity chip. */
export function MobileSolidChip({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        flexShrink: 0,
        borderRadius: 'var(--ins-radius-xs)',
        padding: '2px 7px',
        background: color,
        color: '#fff',
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        lineHeight: 1.5,
      }}
    >
      {label}
    </span>
  );
}

/** Soft chip — old queue card's secondary (status) chip. */
export function MobileChip({ label, color }: { label: string; color?: string }) {
  const c = color ?? 'var(--muted-foreground)';
  return (
    <span
      style={{
        flexShrink: 0,
        borderRadius: 'var(--ins-radius-xs)',
        padding: '2px 7px',
        background: tint(c, 12),
        color: c,
        fontSize: 9,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        lineHeight: 1.5,
      }}
    >
      {label}
    </span>
  );
}

/** Monospace record-id chip (INC-####, FPL-####) at the old chip density. */
export function MobileIdChip({ id }: { id: string }) {
  return (
    <span
      style={{
        flexShrink: 0,
        borderRadius: 'var(--ins-radius-xs)',
        padding: '2px 7px',
        background: 'var(--muted)',
        color: 'var(--muted-foreground)',
        fontFamily: 'var(--font-mono, ui-monospace, monospace)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.2,
        lineHeight: 1.5,
      }}
    >
      {id}
    </span>
  );
}

/** One inline icon+value metric in the old card's chip row (10px muted). */
export function MobileMetric({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        alignItems: 'center',
        gap: 3,
        fontSize: 10,
        color: 'var(--muted-foreground)',
      }}
    >
      <Icon size={10} />
      {children}
    </span>
  );
}

/* ── list card ──────────────────────────────────────────────────────── */

export interface MobileListCardProps {
  icon: LucideIcon;
  /** Semantic colour driving the icon tile tint + icon colour. */
  tone: string;
  title: string;
  /** Chip / metric row under the title. */
  chips?: ReactNode;
  /** One dense muted meta line ("INC-1042 · NCC · Zone 55 · 12m ago"). */
  meta?: string;
  /** Optional footer slot (progress bar on plan cards). */
  footer?: ReactNode;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
}

/** MobileListCard — the old `MobileQueueCard` recipe, data-agnostic. */
export function MobileListCard({
  icon: Icon,
  tone,
  title,
  chips,
  meta,
  footer,
  selected,
  dimmed,
  onClick,
}: MobileListCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        width: '100%',
        minWidth: 0,
        alignItems: 'flex-start',
        gap: 12,
        borderRadius: 'var(--ins-radius-md)',
        border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
        background: 'var(--card)',
        padding: 14,
        textAlign: 'start',
        cursor: 'pointer',
        boxShadow: selected
          ? '0 1px 3px rgba(16,24,40,0.10)'
          : '0 1px 3px rgba(16,24,40,0.06)',
        opacity: dimmed ? 0.55 : 1,
      }}
    >
      <span
        style={{
          display: 'flex',
          height: 48,
          width: 48,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          background: tint(tone),
        }}
      >
        <Icon size={20} style={{ color: tone }} />
      </span>

      <span style={{ display: 'flex', minWidth: 0, flex: 1, flexDirection: 'column', gap: 4 }}>
        <span
          style={{
            display: 'block',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.35,
            color: 'var(--foreground)',
          }}
        >
          {title}
        </span>

        {chips ? (
          <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>{chips}</span>
        ) : null}

        {meta ? (
          <span
            style={{
              display: 'block',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 11,
              color: 'var(--muted-foreground)',
            }}
          >
            {meta}
          </span>
        ) : null}

        {footer ? <span style={{ display: 'block', marginTop: 2 }}>{footer}</span> : null}
      </span>
    </button>
  );
}

/* ── peek / selected-asset card ─────────────────────────────────────── */

export interface MobileAssetCardProps {
  icon: LucideIcon;
  tone: string;
  meta: { icon: LucideIcon; text: string }[];
  title: string;
  statusColor: string;
  statusLabel: string;
  secondary: string;
  onTap: () => void;
  onClose: () => void;
  dragProps?: DragProps;
}

/** MobileAssetCard — old `SelectedAssetCard`, verbatim geometry. */
export function MobileAssetCard({
  icon: Icon,
  tone,
  meta,
  title,
  statusColor,
  statusLabel,
  secondary,
  onTap,
  onClose,
  dragProps,
}: MobileAssetCardProps) {
  return (
    <div
      {...dragProps}
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'flex-start',
        gap: 8,
        padding: '0 20px 20px',
        ...(dragProps ? { touchAction: 'none' as const } : null),
      }}
    >
      <button
        type="button"
        onClick={onTap}
        style={{
          display: 'flex',
          minWidth: 0,
          flex: 1,
          alignItems: 'center',
          gap: 12,
          border: 'none',
          background: 'transparent',
          textAlign: 'start',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span
          style={{
            display: 'flex',
            height: 60,
            width: 68,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--ins-radius-md)',
            background: tint(tone),
          }}
        >
          <Icon size={24} style={{ color: tone }} />
        </span>
        <span style={{ display: 'block', minWidth: 0, flex: 1 }}>
          <span
            style={{
              display: 'flex',
              minWidth: 0,
              alignItems: 'center',
              gap: 10,
              fontSize: 11,
              color: 'var(--muted-foreground)',
            }}
          >
            {meta.map((m, i) => {
              if (!m.text) return null;
              const MetaIcon = m.icon;
              return (
                <span key={i} style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 3 }}>
                  <MetaIcon size={11} style={{ flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.text}
                  </span>
                </span>
              );
            })}
          </span>
          <span
            style={{
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1.3,
              color: 'var(--foreground)',
            }}
          >
            {title}
          </span>
          <span style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: 6, fontSize: 12 }}>
            <span
              style={{ width: 7, height: 7, flexShrink: 0, borderRadius: '50%', background: statusColor }}
            />
            <span style={{ flexShrink: 0, color: statusColor, fontWeight: 700 }}>{statusLabel}</span>
            <span
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: 'var(--muted-foreground)',
              }}
            >
              {secondary}
            </span>
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        style={{
          display: 'flex',
          minHeight: 44,
          minWidth: 44,
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: 'var(--muted-foreground)',
          cursor: 'pointer',
        }}
      >
        <X size={18} />
      </button>
    </div>
  );
}

/* ── overview building blocks ───────────────────────────────────────── */

/** MobileStatTile — old overview's bordered 2-up stat tile. */
export function MobileStatTile({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 'var(--ins-radius-md)',
        border: '1px solid var(--border)',
        background: 'var(--card)',
        padding: 12,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
          color: 'var(--muted-foreground)',
        }}
      >
        {label}
      </div>
      <div
        style={{
          marginTop: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--foreground)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

/** MobileProgressBar — old inline progress bar (4px track). */
export function MobileProgressBar({
  value,
  color = 'var(--primary)',
  label,
  sublabel,
}: {
  value: number;
  color?: string;
  label: string;
  sublabel: string;
}) {
  return (
    <div style={{ display: 'flex', width: '100%', flexDirection: 'column', gap: 3 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground)' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--foreground)' }}>{sublabel}</span>
      </div>
      <div style={{ width: '100%', height: 4, borderRadius: 'var(--ins-radius-xs)', background: 'var(--border)' }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(value, 100))}%`,
            height: '100%',
            borderRadius: 'var(--ins-radius-xs)',
            background: color,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

/** MobileActionButton — old overview action stack button (48px min height). */
export function MobileActionButton({
  variant = 'primary',
  icon: Icon,
  children,
  onClick,
}: {
  variant?: 'primary' | 'outline' | 'ghost';
  icon?: LucideIcon;
  children: ReactNode;
  onClick?: () => void;
}) {
  const base: CSSProperties = {
    display: 'flex',
    minHeight: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 'var(--ins-radius-md)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  };
  const skin: CSSProperties =
    variant === 'primary'
      ? { background: 'var(--primary)', color: '#fff', border: 'none' }
      : variant === 'outline'
        ? { background: 'var(--card)', color: 'var(--primary)', border: '1px solid var(--primary)' }
        : { background: 'transparent', color: 'var(--primary)', border: 'none' };
  return (
    <button type="button" onClick={onClick} style={{ ...base, ...skin }}>
      {Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}

/**
 * MobileOverviewLayout — the old detail sheet's 80% OVERVIEW stage shell:
 * a scrolling 14px-gap column with a severity-chip + title header, one muted
 * sub-line, a free content slot, and a bottom-anchored action stack
 * (`mt-auto`) that is always reachable without scrolling.
 */
export function MobileOverviewLayout({
  chipLabel,
  chipColor,
  title,
  subline,
  children,
  actions,
}: {
  chipLabel: string;
  chipColor: string;
  title: string;
  subline?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      className="fams-hide-scrollbar"
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        overflowY: 'auto',
        padding: '0 20px 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            flexShrink: 0,
            borderRadius: 999,
            padding: '3px 10px',
            background: chipColor,
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.3,
          }}
        >
          {chipLabel}
        </span>
        <h2
          style={{
            margin: 0,
            minWidth: 0,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--foreground)',
          }}
        >
          {title}
        </h2>
      </div>
      {subline ? <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{subline}</div> : null}
      {children}
      {actions ? (
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>{actions}</div>
      ) : null}
    </div>
  );
}

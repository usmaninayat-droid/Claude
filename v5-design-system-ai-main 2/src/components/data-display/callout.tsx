import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';

/**
 * Callout — an inline, non-modal tinted banner (info / success / warning / error /
 * neutral): tone-coloured icon + optional title + body + optional actions/dismiss,
 * on a soft tone-tinted fill + border.
 *
 * This is the ONE sanctioned home for the tone→soft-tint recipe. Products were
 * each inlining `color-mix(in srgb, <tone> 25%/6%, transparent)` for status
 * banners (which the coherence law forbids as a one-off); they should consume
 * this instead. The tint is derived here from the tone TOKEN via `color-mix`, so
 * it stays theme-aware and token-only (no raw hex).
 */

type IconCmp = React.ComponentType<{ size?: number; className?: string }>;
export type CalloutTone = 'info' | 'success' | 'warning' | 'error' | 'neutral';

const TONE: Record<CalloutTone, { token: string; Icon: IconCmp }> = {
  info: { token: 'var(--primary)', Icon: Icons.InfoCircle },
  success: { token: 'var(--status-success)', Icon: Icons.CheckCircle },
  warning: { token: 'var(--status-warning)', Icon: Icons.AlertTriangle },
  error: { token: 'var(--status-error)', Icon: Icons.AlertCircle },
  neutral: { token: 'var(--muted-foreground)', Icon: Icons.InfoCircle },
};

export interface CalloutProps {
  tone?: CalloutTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Override the tone's default icon, or pass `false` to hide it. */
  icon?: React.ReactNode | false;
  /** Trailing action(s) — e.g. a link or small button. */
  actions?: React.ReactNode;
  /** When provided, renders a dismiss (×) button. */
  onDismiss?: () => void;
  className?: string;
}

export function Callout({ tone = 'info', title, children, icon, actions, onDismiss, className }: CalloutProps) {
  const { token, Icon } = TONE[tone];
  return (
    <div
      role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-lg border p-3.5', className)}
      style={{
        borderColor: `color-mix(in srgb, ${token} 30%, transparent)`,
        background: `color-mix(in srgb, ${token} 8%, var(--card))`,
      }}
    >
      {icon !== false ? (
        <span className="mt-0.5 shrink-0" style={{ color: token }}>
          {icon ?? <Icon size={18} />}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {title ? <div className="text-body-sm font-semibold text-foreground">{title}</div> : null}
        {children ? <div className="text-body-sm text-muted-foreground">{children}</div> : null}
      </div>
      {actions ? <div className="shrink-0 self-center">{actions}</div> : null}
      {onDismiss ? (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="shrink-0 rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icons.XClose size={16} />
        </button>
      ) : null}
    </div>
  );
}

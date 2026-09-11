import * as React from 'react';
import { cn } from '../utils/cn';
import { Avatar } from '../primitives/avatar';
import { Badge } from '../primitives/badge';

export interface EntityProfileField {
  label: string;
  value: React.ReactNode;
}

export interface EntityProfileTag {
  label: string;
  color?: string;
}

export interface EntityProfileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hero?: React.ReactNode; // image, vehicle vector, etc.
  /** Status chips overlaid on the hero, spread left↔right (e.g. Active · Condition). */
  heroBadges?: React.ReactNode;
  avatarSrc?: string;
  avatarFallback?: string;
  name: React.ReactNode;
  subtitle?: React.ReactNode;
  tags?: EntityProfileTag[];
  fields?: EntityProfileField[];
  actions?: React.ReactNode;
}

/**
 * EntityProfileCard — Pattern #17 left-rail identity card.
 * Hero + name + tags + key/value field list + actions.
 */
export const EntityProfileCard = React.forwardRef<HTMLDivElement, EntityProfileCardProps>(
  ({ className, hero, heroBadges, avatarSrc, avatarFallback, name, subtitle, tags, fields, actions, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-elevation', className)} {...props}>
      {hero ? (
        <div className="relative -mt-4 -mx-4 mb-1 overflow-hidden rounded-t-lg bg-muted">
          {hero}
          {heroBadges ? (
            <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">{heroBadges}</div>
          ) : null}
        </div>
      ) : avatarSrc || avatarFallback ? (
        <Avatar size="xl" src={avatarSrc} fallback={avatarFallback} className="self-center" />
      ) : null}
      <div className="flex flex-col gap-1">
        <h2 className="text-body-md font-semibold text-foreground">{name}</h2>
        {subtitle ? <div className="text-caption text-muted-foreground">{subtitle}</div> : null}
      </div>
      {tags && tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {tags.map((t, i) => <Badge key={i} variant="muted" color={t.color}>{t.label}</Badge>)}
        </div>
      ) : null}
      {fields && fields.length > 0 ? (
        <dl className="grid grid-cols-1 gap-2 text-caption">
          {fields.map((f, i) => (
            <div key={i} className="flex items-baseline justify-between gap-2 border-b border-border pb-1.5 last:border-0">
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className="text-right text-foreground">{f.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
);
EntityProfileCard.displayName = 'EntityProfileCard';

import * as React from 'react';
import { cn } from '../utils/cn';
import { EntityProfileCard, type EntityProfileCardProps } from './entity-profile-card';
import { MapWidget, type MapWidgetProps } from '../map/map-widget';

/**
 * IdentityMapCard — Composition of EntityProfileCard + embedded MapWidget.
 *
 * Spec: `identity-map-card.spec.md`.
 *
 * Production usage:
 *   - Asset Profile Overview tab (Web Portal `30212:22617`) when the entity
 *     has a location and you want both identity AND a small map in one card
 *   - Driver detail when showing current location
 *
 * Layout (responsive): top row = identity card, bottom row = map. On wide
 * screens (>=640px), they sit side-by-side. Otherwise stacked vertically.
 */

export interface IdentityMapCardProps {
  /** Props forwarded to EntityProfileCard. */
  identity: Omit<EntityProfileCardProps, 'className'>;
  /** Props forwarded to MapWidget. `children` is the map engine. */
  map: MapWidgetProps;
  /** Layout: 'side-by-side' (default, on wider screens) or 'stacked'. */
  layout?: 'side-by-side' | 'stacked' | 'auto';
  className?: string;
}

export function IdentityMapCard({
  identity, map,
  layout = 'auto',
  className,
}: IdentityMapCardProps) {
  return (
    <div
      className={cn(
        'flex w-full gap-3',
        layout === 'side-by-side' && 'flex-row',
        layout === 'stacked' && 'flex-col',
        layout === 'auto' && 'flex-col md:flex-row',
        className,
      )}
    >
      <div className="w-full md:w-[320px] md:shrink-0">
        <EntityProfileCard {...identity} />
      </div>
      <div className="flex-1">
        <MapWidget {...map} />
      </div>
    </div>
  );
}

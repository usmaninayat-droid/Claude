export { NotificationCard } from './notification-card';
export type { NotificationCardProps, NotificationCardChip } from './notification-card';

export { SystemAlert } from './system-alert';
export type { SystemAlertProps, SystemAlertSeverity } from './system-alert';

export { ContextBanner } from './context-banner';
export type { ContextBannerProps } from './context-banner';

export { HealthStrip } from './health-strip';
export type { HealthStripCell, HealthStripProps } from './health-strip';

export { CriticalEventsList } from './critical-events-list';
export type { CriticalEvent, CriticalEventsListProps } from './critical-events-list';

export { EntityProfileCard } from './entity-profile-card';
export type {
  EntityProfileField, EntityProfileTag, EntityProfileCardProps,
} from './entity-profile-card';

/** @deprecated Use StatePill from @fams-v5/ui/data-display instead. */
export { StagePill } from './stage-pill';
export type { StagePillProps } from './stage-pill';

// New widgets (2026-06-08)
export { TelematicsStatusCard } from './telematics-status-card';
export type { TelematicsStatusCardProps, TelematicsStatus } from './telematics-status-card';

export { IdentityMapCard } from './identity-map-card';
export type { IdentityMapCardProps } from './identity-map-card';

export { ActivityFeed } from './activity-feed';
export type { ActivityFeedProps, FeedEntry, FeedUser, FeedAttachment, ActivityTone } from './activity-feed';

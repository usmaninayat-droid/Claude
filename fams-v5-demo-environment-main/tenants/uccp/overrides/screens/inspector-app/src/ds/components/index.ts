export * from './utils';
export * from './primitives';
export * from './data-display';
export * from './data-viz';
export * from './navigation';
export * from './widgets';
export * from './modals';
export * from './basics';
export * from './scheduling';
export * from './planning';
export * from './events';
export * from './zones';
export * from './pois';
export * from './settings';
export * from './auth';
export * from './app-shell';

// `settings` (Settings › Subscriptions row) and `app-shell` (a report's
// Subscribe-sheet payload, T-099) both export an unrelated type named
// `ReportSubscription` — explicitly re-export the `settings` one (the
// longer-standing meaning) through this top-level barrel to resolve the
// ambiguity; `app-shell`'s own is still reachable unambiguously via
// `@ds/components/app-shell` directly (its own module doesn't re-export
// `settings`, so no clash there).
export type { ReportSubscription } from './settings';

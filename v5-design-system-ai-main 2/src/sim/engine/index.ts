/**
 * Faithful FAMS simulation engine — barrel (pure TS, no React/DS deps).
 * Mirrors the production backend so the front-end is interactive with no server.
 */
export * from './types';
export { evalCondition, resolvePermissions, isTaskVisible, allowedTransitions } from './rules';
export { EntityStore } from './entity-store';
export type { Persistence, FilterValue, AppliedFilters, ListQuery } from './entity-store';

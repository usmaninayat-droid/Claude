/**
 * @fams/design-system — public API.
 *
 * Re-exports the full component library plus the curated icon set.
 * Consumers also import the stylesheet once at app root:
 *
 *   import '@fams/design-system/styles.css';
 *   import { Button, Badge, DataTable } from '@fams/design-system';
 */
export * from './components';
export * as Icons from './icons';
export { cn } from './components/utils/cn';

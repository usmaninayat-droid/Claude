/**
 * Variant marker for Tadweer-style gradient rail (Pattern #47).
 *
 * Identical to SideNav at the component level — gradient is controlled by
 * the `--sidebar-gradient` CSS variable in the tenant theme file. Components
 * already read `var(--sidebar-gradient, var(--sidebar))`, so no extra logic
 * is required.
 *
 * This file is kept as a documented re-export so consumers can be explicit:
 *   import { SideNavGradient } from '@fams-v5/ui/navigation';
 */
export { SideNav as SideNavGradient } from './side-nav';

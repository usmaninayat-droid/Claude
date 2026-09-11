import * as React from 'react';
import { Settings as SettingsIcon, type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * SettingsNav — Figma DS V2 "settings-nav" (`730:271`).
 *
 * A standalone left navigation that opens NEXT TO the side nav (it replaces the
 * module rail) when entering Settings. Settings has no top nav, so this rail is
 * the only chrome: a "Settings" header + grouped sections of nav items.
 *
 * Layout: white surface, right border, 28px horizontal / 32px vertical padding,
 * 32px gap between the header and the list, 24px gap between sections. Each item
 * is a 14px row (16px icon + label); the active item gets the brand-lightest
 * fill (`bg-secondary`) + a darker semibold label. Config-driven via `sections`.
 */

export interface SettingsNavItem {
  id: string;
  label: string;
  icon?: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  active?: boolean;
  onClick?: () => void;
}

export interface SettingsNavSection {
  /** Section header (e.g. "Platform Settings"). Omit for an unlabelled group. */
  label?: string;
  items: SettingsNavItem[];
}

export interface SettingsNavProps {
  /** Header title — defaults to "Settings". */
  title?: React.ReactNode;
  /** Header icon — defaults to the Settings gear. */
  titleIcon?: LucideIcon | React.ComponentType<{ size?: number; className?: string }>;
  sections: SettingsNavSection[];
  className?: string;
}

export function SettingsNav({
  title = 'Settings',
  titleIcon: TitleIcon = SettingsIcon,
  sections,
  className,
}: SettingsNavProps) {
  return (
    <nav
      aria-label="Settings"
      className={cn(
        'flex h-full w-[274px] shrink-0 flex-col gap-8 overflow-y-auto border-r border-border bg-card px-7 py-8',
        className,
      )}
    >
      {/* Header — icon chip + title */}
      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center rounded-[4px] bg-secondary p-1.5 text-primary">
          <TitleIcon size={16} />
        </span>
        <span className="text-body-md font-semibold text-foreground">{title}</span>
      </div>

      {/* Sections */}
      <div className="flex w-full flex-col gap-6">
        {sections.map((section, i) => (
          <div key={section.label ?? i} className="flex w-full flex-col">
            {section.label ? (
              <div className="py-2 text-caption font-semibold text-muted-foreground">{section.label}</div>
            ) : null}
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  aria-current={item.active ? 'page' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[4px] px-3 py-2.5 text-left text-body-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring',
                    item.active
                      ? 'bg-secondary font-semibold'
                      : 'font-medium text-muted-foreground hover:bg-muted',
                  )}
                  style={item.active ? { color: 'var(--card-foreground)' } : undefined}
                >
                  {Icon ? (
                    <Icon
                      size={16}
                      className={cn('shrink-0', !item.active && 'text-muted-foreground')}
                      style={item.active ? { color: 'var(--card-foreground)' } : undefined}
                    />
                  ) : null}
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}

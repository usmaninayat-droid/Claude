import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import { Switch } from '../primitives';
import { LabeledSelect } from './field-select';

/**
 * Preferences — Settings › Preferences (FAMS Settings, Figma 350-1586). A sectioned
 * settings form: each section is a card (icon · title · description) holding fields.
 * Field kinds: `select` (LabeledSelect), `text` (with optional currency/unit suffix),
 * and `toggle` (Switch row). Fully config-driven (`sections` + `values` + `onChange`),
 * token-only. Defaults ship the 5 canonical sections but a recipe overrides them.
 */

export type PreferenceIcon = React.ComponentType<{ size?: number; className?: string }>;
export type PreferenceFieldType = 'select' | 'text' | 'toggle';

export interface PreferenceField {
  key: string;
  label: string;
  type: PreferenceFieldType;
  /** `select` options. */
  options?: string[];
  /** `text` trailing suffix (e.g. a currency or unit). */
  suffix?: string;
  placeholder?: string;
  /** `toggle` helper text under the label. */
  description?: string;
}
export interface PreferenceSection {
  id: string;
  title: string;
  description?: string;
  icon?: PreferenceIcon;
  fields: PreferenceField[];
}
export type PreferenceValue = string | boolean;

export interface PreferencesProps {
  title?: string;
  subtitle?: string;
  sections?: PreferenceSection[];
  values: Record<string, PreferenceValue>;
  onChange: (key: string, value: PreferenceValue) => void;
  className?: string;
}

// Default sections — a recipe overrides via `sections` (Law 4). The component itself is
// domain-agnostic (renders whatever `sections`/`fields` it's given); this default set is
// fleet-flavored (map region, fuel cost/liter) — a non-fleet product should pass its own.
export const DEFAULT_PREFERENCE_SECTIONS: PreferenceSection[] = [
  { id: 'region', title: 'Region & Language', description: 'Sets your default map region and preferred language for the interface.', icon: Icons.Globe01, fields: [
    { key: 'mapRegion', label: 'Default Map Region', type: 'select', options: ['Dubai', 'Abu Dhabi', 'Riyadh', 'Doha', 'London', 'New York'] },
    { key: 'language', label: 'Language', type: 'select', options: ['English', 'Arabic', 'French', 'Urdu'] },
  ] },
  { id: 'datetime', title: 'Date & Time Settings', description: 'Adjusts how dates and times appear across the platform.', icon: Icons.Clock, fields: [
    { key: 'dateFormat', label: 'Date Format', type: 'select', options: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'] },
    { key: 'timeFormat', label: 'Time Format', type: 'select', options: ['HH:MM', 'HH:MM:SS'] },
    { key: 'clockType', label: 'Clock Type', type: 'select', options: ['12 Hour', '24 Hour'] },
    { key: 'timezone', label: 'Timezone', type: 'select', options: ['Dubai (UTC+04:00)', 'Riyadh (UTC+03:00)', 'London (UTC+00:00)', 'New York (UTC-05:00)'] },
  ] },
  { id: 'units', title: 'Measurement Units', description: 'Defines measurement units used in reports and calculations.', icon: Icons.Ruler, fields: [
    { key: 'distance', label: 'Unit of Distance', type: 'select', options: ['Kilometer', 'Mile'] },
    { key: 'speed', label: 'Unit of Speed', type: 'select', options: ['Kilometer/Hour', 'Mile/Hour'] },
  ] },
  { id: 'fuel', title: 'Fuel Costs', description: 'Used for cost calculations in fuel-related analytics.', icon: Icons.Droplets01, fields: [
    { key: 'petrolCost', label: 'Petrol Cost / Liter', type: 'text', suffix: 'AED', placeholder: '0.00' },
    { key: 'dieselCost', label: 'Diesel Cost / Liter', type: 'text', suffix: 'AED', placeholder: '0.00' },
  ] },
  { id: 'notifications', title: 'Notifications & Alerts', description: 'Control how you receive notifications and system alerts.', icon: Icons.Bell01, fields: [
    { key: 'emailNotifications', label: 'Email Notifications', type: 'toggle' },
    { key: 'pushNotifications', label: 'Push Notifications', type: 'toggle' },
    { key: 'productUpdates', label: 'Product Updates', type: 'toggle' },
  ] },
];

export function Preferences({
  title = 'Preferences',
  subtitle = 'Personalize your experience by adjusting preferences to fit your workflow. Customize settings, optimize functionality, and streamline how you interact with the platform.',
  sections = DEFAULT_PREFERENCE_SECTIONS, values, onChange, className,
}: PreferencesProps) {
  return (
    <div className={cn('p-7', className)}>
      <div className="mb-6">
        <h1 className="text-h5 font-semibold text-foreground">{title}</h1>
        <p className="mt-1 max-w-3xl text-body-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex max-w-5xl flex-col gap-4">
        {sections.map((s) => {
          const Icon = s.icon;
          const toggles = s.fields.filter((f) => f.type === 'toggle');
          const inputs = s.fields.filter((f) => f.type !== 'toggle');
          return (
            <section key={s.id} className="rounded-xl border border-border bg-card p-5">
              <div className="mb-4 flex items-start gap-3">
                {Icon && <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon size={18} /></span>}
                <div>
                  <h2 className="text-body-md font-semibold text-foreground">{s.title}</h2>
                  {s.description && <p className="mt-0.5 text-body-sm text-muted-foreground">{s.description}</p>}
                </div>
              </div>

              {inputs.length > 0 && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {inputs.map((f) => (
                    <PrefInput key={f.key} field={f} value={values[f.key]} onChange={(v) => onChange(f.key, v)} />
                  ))}
                </div>
              )}
              {toggles.length > 0 && (
                <div className="flex flex-col">
                  {toggles.map((f) => (
                    <label key={f.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <span className="flex flex-col">
                        <span className="text-body-sm font-medium text-foreground">{f.label}</span>
                        {f.description && <span className="text-body-xs text-muted-foreground">{f.description}</span>}
                      </span>
                      <Switch checked={!!values[f.key]} onCheckedChange={(v) => onChange(f.key, v)} aria-label={f.label} />
                    </label>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function PrefInput({ field, value, onChange }: { field: PreferenceField; value: PreferenceValue | undefined; onChange: (v: PreferenceValue) => void }) {
  const str = typeof value === 'string' ? value : '';
  if (field.type === 'select') {
    return <LabeledSelect label={field.label} value={str} options={field.options ?? []} onChange={onChange} placeholder={field.placeholder ?? 'Select'} />;
  }
  // text (with optional trailing suffix)
  return (
    <label className="flex h-14 items-center gap-2 rounded-md border border-border bg-input-background px-3 focus-within:ring-2 focus-within:ring-ring">
      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="text-caption font-medium text-muted-foreground">{field.label}</span>
        <input value={str} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} inputMode={field.suffix ? 'decimal' : undefined} className="bg-transparent text-body-sm text-foreground outline-none" />
      </span>
      {field.suffix && <span className="shrink-0 text-body-sm font-medium text-muted-foreground">{field.suffix}</span>}
    </label>
  );
}

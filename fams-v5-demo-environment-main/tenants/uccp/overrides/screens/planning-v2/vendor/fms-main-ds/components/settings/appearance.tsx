import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import {
  Button, Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription,
} from '../primitives';
import { ColorPicker } from './color-picker';

/**
 * Appearance — Settings › Appearance ("Look & Feel") (FAMS Settings, Figma
 * 2-6120 main / 2-6350 unsaved-changes dialog). The super-admin theming surface:
 * re-skin the tenant via TOKENS + LOGO only (coherence Law 5 — re-skin, never
 * restructure). Output is a `TenantBrand`-shaped value the shell applies as CSS-var
 * overrides at its root (`AppShell` — style={brand.theme}); this component writes
 * no bespoke colour into chrome. Config-driven; reuses ColorPicker/Dialog/Button.
 * See appearance.spec.md.
 */

export type OnPrimary = 'light' | 'dark';
export interface AppearanceValue {
  /** Logo asset src / data-URL (undefined = placeholder). */
  logo?: string;
  /** Primary brand colour (→ `--primary`). */
  primary: string;
  /** Colour shown ON primary — text/icons on buttons etc. (→ `--primary-foreground`). */
  onPrimary: OnPrimary;
}
export interface ThemePreset { id: string; name?: string; primary: string; onPrimary?: OnPrimary }
export interface OnPrimaryOption { id: OnPrimary; hex: string; label: string }

// Colour VALUES here are selectable DATA (the palette a super-admin picks FROM), not theme
// chrome — same class as ColorPicker's DEFAULT_SWATCHES. Chrome stays token-only.
const DEFAULT_SUGGESTED: ThemePreset[] = [
  { id: 'blue', name: 'FAMS Blue', primary: '#0072D6', onPrimary: 'light' }, // coherence-allow — theme-DATA preset
  { id: 'violet', name: 'Violet', primary: '#6E56CF', onPrimary: 'light' }, // coherence-allow
  { id: 'coral', name: 'Coral', primary: '#E5484D', onPrimary: 'light' }, // coherence-allow
  { id: 'emerald', name: 'Emerald', primary: '#30A46C', onPrimary: 'light' }, // coherence-allow
];
const DEFAULT_ON_PRIMARY: OnPrimaryOption[] = [
  { id: 'dark', hex: '#101828', label: 'Black' }, // coherence-allow — selectable on-primary DATA
  { id: 'light', hex: '#FFFFFF', label: 'White' }, // coherence-allow — selectable on-primary DATA
];
const DEFAULT_LOGO_HINT = 'Suggested Size: 512 × 512  ·  Accepted Format: .png, .jpeg, .jpg';

export interface AppearanceProps {
  title?: string;
  subtitle?: string;
  /** Committed brand (baseline). The component tracks an internal draft against it. */
  value: AppearanceValue;
  suggestedThemes?: ThemePreset[];
  /** Custom-style palette; defaults to the DS ColorPicker palette. */
  swatches?: string[];
  onPrimaryOptions?: OnPrimaryOption[];
  /** Super-admin gate. false ⇒ read-only + lock notice, Save/Discard hidden. Default true. */
  canEdit?: boolean;
  logoHint?: string;
  onSave?: (next: AppearanceValue) => void;
  /** Fired after the leave-guard resolves (Discard reverts; Save commits). */
  onBack?: () => void;
  className?: string;
}

const eq = (a: AppearanceValue, b: AppearanceValue) =>
  (a.logo ?? '') === (b.logo ?? '') &&
  a.primary.toLowerCase() === b.primary.toLowerCase() &&
  a.onPrimary === b.onPrimary;

export function Appearance({
  title = 'Look & Feel',
  subtitle = 'Set your organization logo and colour theme. These apply across the whole platform.',
  value,
  suggestedThemes = DEFAULT_SUGGESTED,
  swatches,
  onPrimaryOptions = DEFAULT_ON_PRIMARY,
  canEdit = true,
  logoHint = DEFAULT_LOGO_HINT,
  onSave,
  onBack,
  className,
}: AppearanceProps) {
  const [draft, setDraft] = React.useState<AppearanceValue>(value);
  const [baseline, setBaseline] = React.useState<AppearanceValue>(value);
  const [guardOpen, setGuardOpen] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  // Re-baseline when the committed value changes from outside.
  React.useEffect(() => { setDraft(value); setBaseline(value); }, [value.logo, value.primary, value.onPrimary]);

  const dirty = !eq(draft, baseline);
  const patch = (p: Partial<AppearanceValue>) => canEdit && setDraft((d) => ({ ...d, ...p }));

  const commit = () => { onSave?.(draft); setBaseline(draft); };
  const revert = () => setDraft(baseline);

  const handleBack = () => { if (dirty) setGuardOpen(true); else onBack?.(); };
  const guardDiscard = () => { revert(); setGuardOpen(false); onBack?.(); };
  const guardSave = () => { commit(); setGuardOpen(false); onBack?.(); };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patch({ logo: String(reader.result) });
    reader.readAsDataURL(file);
    e.target.value = ''; // allow re-picking the same file
  };

  return (
    <div className={cn('p-7', className)}>
      {/* breadcrumb + header */}
      <button
        type="button"
        onClick={handleBack}
        className="mb-3 inline-flex items-center gap-1 rounded-sm text-body-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Icons.ChevronLeft size={14} /> Settings
      </button>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-h5 font-semibold text-foreground">{title}</h1>
          <p className="mt-1 max-w-2xl text-body-sm text-muted-foreground">{subtitle}</p>
        </div>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-2">
            {dirty && <Button variant="ghost" onClick={revert}>Discard</Button>}
            <Button onClick={commit} disabled={!dirty}>Save Changes</Button>
          </div>
        )}
      </div>

      {!canEdit && (
        <div className="mb-6 flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-body-sm text-muted-foreground">
          <Icons.Lock01 size={16} className="shrink-0" />
          Appearance can only be changed by super administrators. You have view-only access.
        </div>
      )}

      <fieldset disabled={!canEdit} className={cn('flex flex-col gap-8', !canEdit && 'opacity-60')}>
        {/* ── Organization logo ─────────────────────────────────────────── */}
        <section className="flex items-center gap-4 rounded-xl border border-border p-4">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-muted">
            {draft.logo
              ? <img src={draft.logo} alt="Organization logo" className="size-full object-contain" />
              : <Icons.Image01 size={24} className="text-muted-foreground" />}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="text-body-sm font-semibold text-foreground">Organization Logo</span>
              <button type="button" onClick={() => fileRef.current?.click()} className="rounded-sm text-body-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring">Replace</button>
              {draft.logo && (
                <button type="button" onClick={() => patch({ logo: undefined })} className="rounded-sm text-body-sm font-semibold text-[var(--status-error)] hover:underline focus-visible:ring-2 focus-visible:ring-ring">Remove</button>
              )}
            </div>
            <span className="text-body-xs text-muted-foreground">{logoHint}</span>
          </div>
          <input ref={fileRef} type="file" accept=".png,.jpeg,.jpg,image/png,image/jpeg" onChange={onFile} className="sr-only" aria-label="Replace organization logo" />
        </section>

        {/* ── Suggested themes ──────────────────────────────────────────── */}
        <section>
          <h2 className="text-body-sm font-semibold text-foreground">Suggested themes</h2>
          <p className="mt-0.5 text-body-xs text-muted-foreground">Here are some default colour palettes we have selected for you.</p>
          <div role="radiogroup" aria-label="Suggested themes" className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {suggestedThemes.map((t) => (
              <ThemePreviewCard
                key={t.id}
                preset={t}
                selected={draft.primary.toLowerCase() === t.primary.toLowerCase()}
                onSelect={() => patch({ primary: t.primary, ...(t.onPrimary ? { onPrimary: t.onPrimary } : null) })}
              />
            ))}
          </div>
        </section>

        {/* ── Select your own style ─────────────────────────────────────── */}
        <section>
          <h2 className="text-body-sm font-semibold text-foreground">Select your own style</h2>
          <p className="mt-0.5 text-body-xs text-muted-foreground">Pick a brand colour, or add a custom one.</p>
          <div className="mt-3">
            <ColorPicker value={draft.primary} onChange={(hex) => patch({ primary: hex })} swatches={swatches} />
          </div>
        </section>

        {/* ── On primary ────────────────────────────────────────────────── */}
        <section className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-1.5">
            <h2 className="text-body-sm font-semibold text-foreground">On Primary</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label="What is On Primary?" className="grid size-4 place-items-center rounded-full text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                    <Icons.HelpCircle size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Colour shown on the primary — i.e. button text, icons, fields etc.</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="mt-0.5 text-body-xs text-muted-foreground">Colour that will be shown on the primary i.e Button text, Icons, Fields etc.</p>
          <div role="radiogroup" aria-label="On primary colour" className="mt-3 flex gap-3">
            {onPrimaryOptions.map((o) => {
              const active = draft.onPrimary === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={o.label}
                  onClick={() => patch({ onPrimary: o.id })}
                  className={cn('relative grid size-12 place-items-center rounded-lg border border-border transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', active && 'ring-2 ring-primary ring-offset-1')}
                  style={{ background: o.hex }}
                >
                  {active && <Icons.Check size={16} className={o.id === 'light' ? 'text-[color:#101828]' : 'text-[color:#FFFFFF]'} /> /* coherence-allow — check contrasts the DATA swatch */}
                </button>
              );
            })}
          </div>
        </section>
      </fieldset>

      {/* ── Unsaved-changes leave guard ─────────────────────────────────── */}
      <Dialog open={guardOpen} onOpenChange={setGuardOpen}>
        <DialogContent className="max-w-sm">
          <div className="grid size-11 place-items-center rounded-full bg-[var(--status-warning)]/15 text-[var(--status-warning)]">
            <Icons.Save01 size={20} />
          </div>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>You have unsaved changes. Save them before leaving, or discard them altogether.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="tertiary" onClick={guardDiscard}>Discard</Button>
            <Button onClick={guardSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Mini app-mockup preview painted from a preset's primary — selectable radio. */
function ThemePreviewCard({ preset, selected, onSelect }: { preset: ThemePreset; selected: boolean; onSelect: () => void }) {
  const fg = (preset.onPrimary ?? 'light') === 'light' ? '#FFFFFF' : '#101828'; // coherence-allow — preview mirrors the on-primary DATA choice
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={`Theme ${preset.name ?? preset.primary}`}
      onClick={onSelect}
      className={cn('relative flex h-28 overflow-hidden rounded-xl border bg-card text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', selected ? 'border-primary ring-2 ring-primary' : 'border-border hover:border-muted-foreground/40')}
    >
      {selected && (
        <span className="absolute right-2 top-2 z-10 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground">
          <Icons.Check size={11} />
        </span>
      )}
      {/* sidebar */}
      <span aria-hidden className="h-full w-3.5" style={{ background: preset.primary }} />
      {/* body */}
      <span aria-hidden className="flex flex-1 flex-col gap-1.5 p-2.5">
        <span className="text-caption font-semibold text-foreground">Settings</span>
        <span className="h-1.5 w-3/4 rounded-full bg-muted" />
        <span className="h-1.5 w-2/3 rounded-full bg-muted" />
        <span className="h-1.5 w-1/2 rounded-full bg-muted" />
        <span className="mt-auto ml-auto rounded px-2 py-1 text-caption font-medium" style={{ background: preset.primary, color: fg }}>Proceed</span>
      </span>
    </button>
  );
}

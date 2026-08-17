import * as React from 'react';
import * as Icons from '../../icons';
import { cn } from '../utils/cn';
import {
  Sheet, SheetContent, SheetTitle, SheetDescription, Button, FloatingLabelInput, Input, Checkbox,
  Popover, PopoverTrigger, PopoverContent, Dialog, DialogContent, DialogTitle, DialogDescription,
} from '../primitives';

/**
 * UserAccountSheet — create/edit a user account (FAMS Launch Pad, Figma 5189-52627
 * / 5191-57285 / 5189-57158 / 5189-55233). A right side-sheet with two tabs:
 *   • Basic Information — name · phone · email OR username+password (toggle, with a
 *     live password-rule checklist) · Assign Role(s) · Assign Organization(s)
 *   • Workforce Profile — optional org-specific profile fields (config-driven)
 * "Select Role(s)/Organization(s)" open a searchable picker sub-sheet; once chosen
 * they render as an assigned list with an Update link. Config-driven + token-only.
 *
 * `UserSuccessDialog` (exported) is the post-create confirmation: invite link
 * (email mode) or username+password credentials (username mode), and resend.
 */

export type UserAuthMode = 'email' | 'username';
export interface UserRoleOption { id: string; name: string; apps?: string[]; icon?: React.ComponentType<{ size?: number; className?: string }> }
export interface UserOrgOption { id: string; name: string; kind?: 'main' | 'sub' }
export interface UserCountryCode { code: string; flag?: string; label?: string }
export interface WorkforceField { key: string; label: string; placeholder?: string }

export interface UserDraft {
  fullName: string;
  countryCode: string;
  phone: string;
  authMode: UserAuthMode;
  email: string;
  username: string;
  password: string;
  roleIds: string[];
  orgIds: string[];
  workforce: Record<string, string>;
}

// Default vocab — a non-fleet recipe overrides any of these via props (Law 4).
export const DEFAULT_COUNTRY_CODES: UserCountryCode[] = [
  { code: '+971', flag: '🇦🇪', label: 'UAE' }, { code: '+966', flag: '🇸🇦', label: 'KSA' },
  { code: '+974', flag: '🇶🇦', label: 'Qatar' }, { code: '+1', flag: '🇺🇸', label: 'USA' },
  { code: '+44', flag: '🇬🇧', label: 'UK' }, { code: '+92', flag: '🇵🇰', label: 'Pakistan' },
];
export const DEFAULT_USER_ROLES: UserRoleOption[] = [
  { id: 'ops', name: 'Operations Manager', apps: ['App 1', 'App 2', 'App 3'], icon: Icons.MarkerPin01 },
  { id: 'driver', name: 'Driver', apps: ['Driver App'], icon: Icons.User02 },
  { id: 'finance', name: 'Finance Manager', apps: ['App 1', 'App 2'], icon: Icons.CurrencyDollar },
  { id: 'sales', name: 'Sales Manager', apps: ['App 1', 'App 2'], icon: Icons.TrendUp01 },
  { id: 'admin', name: 'Admin', apps: ['All Apps'], icon: Icons.Shield01 },
];
export const DEFAULT_USER_ORGS: UserOrgOption[] = [
  { id: 'fams', name: 'FAMS Telematics', kind: 'main' }, { id: 'beach', name: 'Beach', kind: 'sub' },
  { id: 'voltro', name: 'Voltro LLC', kind: 'sub' }, { id: 'jetclass', name: 'JetClass', kind: 'sub' },
];
export const DEFAULT_WORKFORCE_FIELDS: WorkforceField[] = [
  { key: 'employeeId', label: 'Employee ID', placeholder: 'e.g. EMP-0293' },
  { key: 'designation', label: 'Designation', placeholder: 'e.g. Fleet Supervisor' },
  { key: 'department', label: 'Department', placeholder: 'e.g. Operations' },
  { key: 'joiningDate', label: 'Joining Date', placeholder: 'DD / MM / YYYY' },
];

export interface UserPasswordRule { id: string; label: string; test: (p: string) => boolean }
// Default password policy — a non-fleet recipe overrides via `passwordRules` (Law 4).
export const DEFAULT_PASSWORD_RULES: UserPasswordRule[] = [
  { id: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'case', label: '1 uppercase and 1 lowercase letter', test: (p) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: 'special', label: '1 number and 1 special character (! @ % # $)', test: (p) => /\d/.test(p) && /[!@%#$]/.test(p) },
];
const passwordScore = (p: string, rules: UserPasswordRule[]) => rules.filter((r) => r.test(p)).length;
const emailValid = (e: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim());

// Fixed pools cycled by length — deterministic, no crypto requirement for a dummy-data sheet.
const PW_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const PW_LOWER = 'abcdefghijkmnpqrstuvwxyz';
const PW_DIGITS = '23456789';
const PW_SPECIAL = '!@%#$';
function generatePassword(): string {
  const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)];
  const chars = [pick(PW_UPPER), pick(PW_LOWER), pick(PW_DIGITS), pick(PW_SPECIAL)];
  const all = PW_UPPER + PW_LOWER + PW_DIGITS + PW_SPECIAL;
  while (chars.length < 10) chars.push(pick(all));
  return chars.sort(() => Math.random() - 0.5).join('');
}

export interface UserAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Partial<UserDraft> & { id?: string };
  onSubmit: (draft: UserDraft) => void;
  roles?: UserRoleOption[];
  organizations?: UserOrgOption[];
  countryCodes?: UserCountryCode[];
  workforceFields?: WorkforceField[];
  passwordRules?: UserPasswordRule[];
}

function blank(countryCodes: UserCountryCode[]): UserDraft {
  return { fullName: '', countryCode: countryCodes[0]?.code ?? '+971', phone: '', authMode: 'email', email: '', username: '', password: '', roleIds: [], orgIds: [], workforce: {} };
}

export function UserAccountSheet({
  open, onOpenChange, initial, onSubmit,
  roles = DEFAULT_USER_ROLES, organizations = DEFAULT_USER_ORGS, countryCodes = DEFAULT_COUNTRY_CODES, workforceFields = DEFAULT_WORKFORCE_FIELDS,
  passwordRules = DEFAULT_PASSWORD_RULES,
}: UserAccountSheetProps) {
  const isEdit = !!initial?.id;
  const [d, setD] = React.useState<UserDraft>(() => blank(countryCodes));
  const [tab, setTab] = React.useState<'basic' | 'workforce'>('basic');
  const [picker, setPicker] = React.useState<null | 'roles' | 'orgs'>(null);
  React.useEffect(() => {
    if (open) {
      const { id: _id, ...rest } = initial ?? {};
      setD({ ...blank(countryCodes), ...rest });
      setTab('basic');
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [open]);
  const set = (patch: Partial<UserDraft>) => setD((cur) => ({ ...cur, ...patch }));

  const pwOk = d.authMode === 'email' ? true : passwordRules.every((r) => r.test(d.password));
  const idOk = d.authMode === 'email' ? emailValid(d.email) : d.username.trim().length > 0;
  const canSubmit = d.fullName.trim().length > 0 && idOk && pwOk;

  const chosenRoles = roles.filter((r) => d.roleIds.includes(r.id));
  const chosenOrgs = organizations.filter((o) => d.orgIds.includes(o.id));

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" width="min(560px, 96vw)" className="p-0">
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-6 pb-0 pt-6">
              <SheetTitle className="text-h6 font-bold text-foreground">{isEdit ? 'Edit User Account' : 'Create New User Account'}</SheetTitle>
              <SheetDescription className="sr-only">Invite a user and assign their roles and organizations.</SheetDescription>
              <nav aria-label="Sections" className="mt-4 flex items-center gap-6">
                {(['basic', 'workforce'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)} aria-current={tab === t ? 'page' : undefined}
                    className={cn('relative pb-2.5 text-body-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring', tab === t ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}>
                    {t === 'basic' ? 'Basic Information' : 'Workforce Profile'}
                    {tab === t && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </nav>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-6 py-5">
              {tab === 'basic' ? (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FloatingLabelInput label="Full Name *" placeholder="Enter full name" value={d.fullName} onChange={(e) => set({ fullName: e.target.value })} />
                    <PhoneField codes={countryCodes} code={d.countryCode} phone={d.phone} onCode={(c) => set({ countryCode: c })} onPhone={(p) => set({ phone: p })} />
                  </div>

                  {d.authMode === 'email' ? (
                    <div>
                      <FloatingLabelInput label="Email Address *" type="email" placeholder="name@company.com" value={d.email} onChange={(e) => set({ email: e.target.value })} />
                      <button type="button" onClick={() => set({ authMode: 'username' })} className="mt-1.5 rounded-sm text-body-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring">Doesn’t have an email? Use a username instead</button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div>
                        <FloatingLabelInput label="Username *" placeholder="e.g. ariyan.afidi001" value={d.username} onChange={(e) => set({ username: e.target.value })} />
                        <button type="button" onClick={() => set({ authMode: 'email' })} className="mt-1.5 rounded-sm text-body-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring">Use an email instead</button>
                      </div>
                      <PasswordField value={d.password} onChange={(v) => set({ password: v })} rules={passwordRules} />
                    </div>
                  )}

                  <AssignSection
                    label="Assign Role(s)"
                    empty={!chosenRoles.length}
                    onOpen={() => setPicker('roles')}
                    openLabel="Select Role(s)"
                    updateLabel="Update role(s)"
                  >
                    {chosenRoles.map((r) => {
                      const Icon = r.icon;
                      return (
                        <div key={r.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">{Icon ? <Icon size={16} /> : <Icons.Shield01 size={16} />}</span>
                          <div className="min-w-0">
                            <div className="truncate text-body-sm font-semibold text-foreground">{r.name}</div>
                            {r.apps?.length ? (
                              <div className="mt-1 flex flex-wrap items-center gap-1">
                                {r.apps.map((a, i) => (
                                  <span key={i} className="rounded-full border border-border px-2 py-0.5 text-caption text-muted-foreground">{a}</span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </AssignSection>

                  <AssignSection
                    label="Assign Organization(s)"
                    empty={!chosenOrgs.length}
                    onOpen={() => setPicker('orgs')}
                    openLabel="Select Organization(s)"
                    updateLabel="Update Organization(s)"
                  >
                    {chosenOrgs.map((o) => (
                      <div key={o.id} className="flex items-center gap-2 rounded-lg px-2 py-2">
                        <span className="min-w-0 flex-1 truncate text-body-sm font-semibold text-foreground">{o.name}</span>
                        {o.kind && <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-caption font-medium text-muted-foreground">{o.kind === 'main' ? 'Main Organization' : 'Sub Organization'}</span>}
                      </div>
                    ))}
                  </AssignSection>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-body-sm text-muted-foreground">Optional organizational profile for this user. Fill what applies — it can be completed later.</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {workforceFields.map((f) => (
                      <FloatingLabelInput key={f.key} label={f.label} placeholder={f.placeholder} value={d.workforce[f.key] ?? ''} onChange={(e) => set({ workforce: { ...d.workforce, [f.key]: e.target.value } })} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-border px-6 py-4">
              <Button variant="primary" disabled={!canSubmit} onClick={() => { if (canSubmit) { onSubmit(d); onOpenChange(false); } }} className="w-full">
                {isEdit ? 'Save Changes' : 'Create User'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <PickerSheet
        open={picker === 'roles'}
        onOpenChange={(o) => !o && setPicker(null)}
        title="Select one or more roles for user"
        placeholder="Search by role name or app name"
        options={roles.map((r) => ({ id: r.id, primary: r.name, apps: r.apps, icon: r.icon }))}
        selected={d.roleIds}
        onDone={(ids) => { set({ roleIds: ids }); setPicker(null); }}
      />
      <PickerSheet
        open={picker === 'orgs'}
        onOpenChange={(o) => !o && setPicker(null)}
        title="Select one or more organizations"
        placeholder="Search organizations"
        options={organizations.map((o) => ({ id: o.id, primary: o.name, secondary: o.kind === 'main' ? 'Main Organization' : o.kind === 'sub' ? 'Sub Organization' : undefined, icon: Icons.Building02 }))}
        selected={d.orgIds}
        onDone={(ids) => { set({ orgIds: ids }); setPicker(null); }}
      />
    </>
  );
}

function AssignSection({ label, empty, onOpen, openLabel, updateLabel, children }: { label: string; empty: boolean; onOpen: () => void; openLabel: string; updateLabel: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-body-md font-semibold text-foreground">{label}</h3>
        {!empty && <button type="button" onClick={onOpen} className="rounded-sm text-body-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring">{updateLabel}</button>}
      </div>
      {empty ? (
        <button type="button" onClick={onOpen} className="w-full rounded-lg border border-dashed border-border py-3 text-body-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring">{openLabel}</button>
      ) : (
        <div className="rounded-xl border border-border p-1">{children}</div>
      )}
    </section>
  );
}

function PhoneField({ codes, code, phone, onCode, onPhone }: { codes: UserCountryCode[]; code: string; phone: string; onCode: (c: string) => void; onPhone: (p: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const cur = codes.find((c) => c.code === code) ?? codes[0];
  return (
    <label className="flex h-14 items-stretch rounded-md border border-border bg-input-background focus-within:ring-2 focus-within:ring-ring">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" aria-label="Country code" aria-haspopup="listbox" aria-expanded={open} className="flex items-center gap-1 rounded-l-md border-r border-border px-2.5 text-body-sm text-foreground transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
            <span>{cur?.flag}</span><span>{cur?.code}</span><Icons.ChevronDown size={14} className="text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-60 w-48 overflow-auto p-1">
          {codes.map((c) => (
            <button key={c.code} type="button" onClick={() => { onCode(c.code); setOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body-sm text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
              <span>{c.flag}</span><span className="font-medium">{c.code}</span><span className="truncate text-muted-foreground">{c.label}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>
      <div className="flex min-w-0 flex-1 flex-col justify-center px-3">
        <span className="text-caption font-medium text-muted-foreground">Phone Number</span>
        <input inputMode="tel" aria-label="Phone Number" placeholder="123 456 789" value={phone} onChange={(e) => onPhone(e.target.value)} className="bg-transparent text-body-sm text-foreground outline-none" />
      </div>
    </label>
  );
}

function PasswordField({ value, onChange, rules }: { value: string; onChange: (v: string) => void; rules: UserPasswordRule[] }) {
  const [show, setShow] = React.useState(false);
  const score = passwordScore(value, rules);
  const strength = value.length === 0 ? '' : score >= 3 ? 'Strong' : score === 2 ? 'Medium' : 'Weak';
  const strengthTone = score >= 3 ? 'var(--status-success)' : score === 2 ? 'var(--status-warning)' : 'var(--status-error)';
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex h-14 items-center gap-2 rounded-md border border-border bg-input-background px-3 focus-within:ring-2 focus-within:ring-ring">
        <span className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="flex items-center justify-between">
            <span className="text-caption font-medium text-muted-foreground">Password *</span>
            {strength && <span className="text-caption font-semibold" style={{ color: strengthTone }}>{strength}</span>}
          </span>
          <input type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Create a password" aria-describedby="password-rules" className="bg-transparent text-body-sm text-foreground outline-none" />
        </span>
        <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)} className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          {show ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
        </button>
      </label>
      <ul id="password-rules" className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1">
        {rules.map((r) => {
          const ok = r.test(value);
          return (
            <li key={r.id} className={cn('flex items-center gap-1.5 text-caption', ok ? 'text-[var(--status-success)]' : 'text-muted-foreground')}>
              <Icons.CheckCircle size={13} className={cn(ok ? 'opacity-100' : 'opacity-40')} />{r.label}
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => onChange(generatePassword())} className="self-start rounded-sm text-body-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring">
        Regenerate password
      </button>
    </div>
  );
}

interface PickerOption { id: string; primary: string; secondary?: string; apps?: string[]; icon?: React.ComponentType<{ size?: number; className?: string }> }
function PickerSheet({ open, onOpenChange, title, placeholder, options, selected, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; placeholder: string; options: PickerOption[]; selected: string[]; onDone: (ids: string[]) => void;
}) {
  const [ids, setIds] = React.useState<string[]>(selected);
  const [q, setQ] = React.useState('');
  React.useEffect(() => { if (open) { setIds(selected); setQ(''); } /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open]);
  const visible = React.useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? options.filter((o) => o.primary.toLowerCase().includes(s) || (o.secondary ?? '').toLowerCase().includes(s) || (o.apps ?? []).some((a) => a.toLowerCase().includes(s))) : options;
  }, [options, q]);
  const toggle = (id: string) => setIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" width="min(460px, 94vw)" className="p-0">
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-6 py-5">
            <SheetTitle className="text-h6 font-bold text-foreground">{title}</SheetTitle>
            <SheetDescription className="sr-only">Select one or more options.</SheetDescription>
            <div className="relative mt-3">
              <Icons.SearchSm size={15} className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground" />
              <Input autoFocus placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-auto px-4 py-4">
            {visible.map((o) => {
              const on = ids.includes(o.id);
              const Icon = o.icon;
              return (
                <button key={o.id} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(o.id)}
                  className={cn('flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring', on ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40')}>
                  <Checkbox checked={on} aria-hidden tabIndex={-1} className="pointer-events-none" />
                  {Icon && <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Icon size={16} /></span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body-sm font-semibold text-foreground">{o.primary}</span>
                    {o.apps?.length ? (
                      <span className="mt-1 flex flex-wrap items-center gap-1">
                        {o.apps.map((a, i) => (
                          <span key={i} className="rounded-full border border-border px-2 py-0.5 text-caption text-muted-foreground">{a}</span>
                        ))}
                      </span>
                    ) : o.secondary ? (
                      <span className="block truncate text-caption text-muted-foreground">{o.secondary}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
            {!visible.length && <div className="px-2 py-8 text-center text-body-sm text-muted-foreground">No matches.</div>}
          </div>
          <div className="border-t border-border px-6 py-4">
            <Button variant="primary" onClick={() => onDone(ids)} className="w-full">Continue</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export interface UserSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 'invite' = share invite link (email user); 'credentials' = username+password; 'resent' = invite resent. */
  variant: 'invite' | 'credentials' | 'resent';
  fullName?: string;
  inviteLink?: string;
  username?: string;
  password?: string;
  onDone?: () => void;
}
export function UserSuccessDialog({ open, onOpenChange, variant, fullName, inviteLink, username, password, onDone }: UserSuccessDialogProps) {
  const title = variant === 'resent' ? 'Invitation Resent Successfully' : 'User Added Successfully';
  const subtitle = variant === 'resent'
    ? 'We sent a new invite email. Alternatively, you can copy the link to share it manually.'
    : variant === 'credentials'
      ? `Share these credentials with ${fullName || 'the user'}. The password won’t be shown again.`
      : `Share the invitation link with ${fullName || 'the user'}.`;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <span aria-hidden className="mb-1 grid size-12 place-items-center rounded-full bg-[color:color-mix(in_srgb,var(--status-success)_14%,transparent)] text-[var(--status-success)]"><Icons.CheckCircle size={26} /></span>
        <DialogTitle className="text-h6 font-bold text-foreground">{title}</DialogTitle>
        <DialogDescription className="text-body-sm text-muted-foreground">{subtitle}</DialogDescription>
        <div className="mt-4 flex flex-col gap-2.5">
          {variant === 'credentials' ? (
            <>
              <CopyField label="Username" value={username ?? ''} />
              <CopyField label="Password" value={password ?? ''} secret />
            </>
          ) : (
            <CopyField label="Invite link" value={inviteLink ?? ''} />
          )}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          {variant === 'credentials'
            ? <button type="button" onClick={() => navigator.clipboard?.writeText(`Username: ${username}\nPassword: ${password}`)} className="rounded-md border border-border px-4 py-2 text-body-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">Copy All</button>
            : <span />}
          <Button variant="primary" onClick={() => { onDone?.(); onOpenChange(false); }} className="min-w-[120px]">Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => { navigator.clipboard?.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1500); };
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-caption font-medium text-muted-foreground">{label}</div>
        <div className="truncate text-body-sm text-foreground">{secret ? '•'.repeat(Math.max(8, value.length)) : value}</div>
      </div>
      <button type="button" aria-label={`Copy ${label}`} onClick={copy} className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
        {copied ? <Icons.CheckCircle size={16} className="text-[var(--status-success)]" /> : <Icons.Copy01 size={16} />}
      </button>
    </div>
  );
}

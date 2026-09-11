import { useState, useMemo } from 'react'
import {
  X, Check, Bell, Flag, Layers, Lock, Wand2, ChevronDown, Loader2,
  Pencil, AlertCircle, SlidersHorizontal, Send, ClipboardCheck,
  Monitor, Smartphone, Mail, MessageSquare, MessageCircle, Inbox as InboxIcon,
} from 'lucide-react'
import {
  Sheet, SheetContent, SheetClose, SheetTitle, SheetDescription,
  Button, FloatingLabelInput, Switch, Badge, cn,
} from '@fams/design-system'
import {
  CUSTOM_MODULE_DEFINITIONS, OPERATORS, generateLivePreviewText,
} from './customNotificationData'
import { ROLES, CHANNELS, type Criticality, type NotificationProfile, type Channel, type NotificationType } from './notificationsConfigData2'

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

const CHANNEL_ICONS: Record<Channel, typeof Bell> = {
  inbox: InboxIcon, toast: Monitor, push: Smartphone, email: Mail, sms: MessageSquare, whatsapp: MessageCircle,
}

const CRITICALITY_STYLE: Record<Criticality, { badge: 'destructive' | 'warning' | 'info'; iconBg: string; iconFg: string; active: string }> = {
  critical: { badge: 'destructive', iconBg: 'bg-destructive/10', iconFg: 'text-destructive', active: 'text-destructive' },
  medium: { badge: 'warning', iconBg: 'bg-warning-500/15', iconFg: 'text-warning-700', active: 'text-warning-700' },
  normal: { badge: 'info', iconBg: 'bg-blue-500/10', iconFg: 'text-blue-600', active: 'text-blue-600' },
}

/** Floating-label select (form-field style, matching the guided-wizard aesthetic).
 * Transparent native <select> overlay so the whole field incl. chevron is clickable. */
function WizardSelect({
  label, value, onChange, children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="relative flex h-14 w-full items-center rounded-md border border-border bg-input-background px-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none opacity-0"
      >
        {children}
      </select>
      <div className="flex min-w-0 flex-1 flex-col justify-center pr-6 pointer-events-none">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground" style={{ letterSpacing: '0.04em' }}>{label}</span>
        <span className="truncate text-sm font-medium text-foreground mt-0.5">
          {(() => {
            const arr = Array.isArray(children) ? (children.flat() as any[]) : [children as any]
            const opt = arr.find((c) => c && c.props && String(c.props.value) === String(value))
            return opt ? opt.props.children : value
          })()}
        </span>
      </div>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 shrink-0 text-muted-foreground" aria-hidden />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Wizard                                                              */
/* ------------------------------------------------------------------ */

interface CustomNotificationGuidedSheetProps {
  open: boolean
  onClose: () => void
  profiles: NotificationProfile[]
  onPublish: (newType: NotificationType) => void
}

const STEPS = [
  { id: 1 as const, title: 'Rule & condition', subtitle: 'What triggers it', icon: SlidersHorizontal },
  { id: 2 as const, title: 'Delivery & audience', subtitle: 'Who gets it, and how', icon: Send },
  { id: 3 as const, title: 'Review & publish', subtitle: 'Confirm and go live', icon: ClipboardCheck },
]

export function CustomNotificationGuidedSheet({
  open, onClose, profiles, onPublish,
}: CustomNotificationGuidedSheetProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [maxReached, setMaxReached] = useState<1 | 2 | 3>(1)
  const [attemptedNext, setAttemptedNext] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Rule state
  const [selectedModuleId, setSelectedModuleId] = useState('Fleet')
  const [selectedEntityId, setSelectedEntityId] = useState('vehicle')
  const [selectedFieldId, setSelectedFieldId] = useState('speed')
  const [selectedOperatorId, setSelectedOperatorId] = useState('gt')
  const [conditionValue, setConditionValue] = useState<string | number>(80)
  const [criticality, setCriticality] = useState<Criticality>('critical')

  // Delivery state
  const [customTitle, setCustomTitle] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [enabledChannels, setEnabledChannels] = useState<Set<Channel>>(new Set(['inbox', 'toast']))
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(new Set(profiles.map((p) => p.id)))
  const [isMandatory, setIsMandatory] = useState(false)
  const [isExempt, setIsExempt] = useState(false)

  const currentModuleDef = useMemo(() => CUSTOM_MODULE_DEFINITIONS.find((m) => m.id === selectedModuleId) || CUSTOM_MODULE_DEFINITIONS[0], [selectedModuleId])
  const currentEntityDef = useMemo(() => currentModuleDef.entities.find((e) => e.id === selectedEntityId) || currentModuleDef.entities[0], [currentModuleDef, selectedEntityId])
  const currentFieldDef = useMemo(() => currentEntityDef.fields.find((f) => f.id === selectedFieldId) || currentEntityDef.fields[0], [currentEntityDef, selectedFieldId])
  const availableOperators = useMemo(() => OPERATORS[currentFieldDef.type] || OPERATORS.number, [currentFieldDef])
  const currentOperatorLabel = useMemo(() => {
    const op = availableOperators.find((o) => o.id === selectedOperatorId)
    return op ? op.label : availableOperators[0]?.label || 'equals'
  }, [availableOperators, selectedOperatorId])

  const defaultTitle = `${currentModuleDef.label} · ${currentFieldDef.label} Alert`
  const defaultDesc = `Triggers when ${currentFieldDef.label} in ${currentEntityDef.label} ${currentOperatorLabel} ${conditionValue}${currentFieldDef.unit ? ' ' + currentFieldDef.unit : ''}.`
  const previewTitle = customTitle.trim() || defaultTitle
  const previewDesc = customDesc.trim() || defaultDesc

  const livePreview = useMemo(() => generateLivePreviewText({
    module: currentModuleDef.label, entityLabel: currentEntityDef.label, fieldLabel: currentFieldDef.label,
    operatorLabel: currentOperatorLabel, value: conditionValue, unit: currentFieldDef.unit, criticality,
  }), [currentModuleDef, currentEntityDef, currentFieldDef, currentOperatorLabel, conditionValue, criticality])

  // Cascade selectors
  const applyModule = (modId: string) => {
    setSelectedModuleId(modId)
    const mod = CUSTOM_MODULE_DEFINITIONS.find((m) => m.id === modId) || CUSTOM_MODULE_DEFINITIONS[0]
    const ent = mod.entities[0]; setSelectedEntityId(ent.id)
    const fld = ent.fields[0]; setSelectedFieldId(fld.id); setConditionValue(fld.defaultVal); setSelectedOperatorId(OPERATORS[fld.type][0].id)
  }
  const applyEntity = (entId: string) => {
    setSelectedEntityId(entId)
    const ent = currentModuleDef.entities.find((e) => e.id === entId) || currentModuleDef.entities[0]
    const fld = ent.fields[0]; setSelectedFieldId(fld.id); setConditionValue(fld.defaultVal); setSelectedOperatorId(OPERATORS[fld.type][0].id)
  }
  const applyField = (fldId: string) => {
    setSelectedFieldId(fldId)
    const fld = currentEntityDef.fields.find((f) => f.id === fldId) || currentEntityDef.fields[0]
    setConditionValue(fld.defaultVal); setSelectedOperatorId(OPERATORS[fld.type][0].id)
  }

  const toggleChannel = (ch: Channel) => setEnabledChannels((prev) => { const n = new Set(prev); n.has(ch) ? n.delete(ch) : n.add(ch); return n })
  const toggleProfile = (id: string) => setSelectedProfileIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  // Per-step validation
  const valueSet = conditionValue !== '' && conditionValue !== null && conditionValue !== undefined
  const step1Valid = valueSet
  const step2Valid = enabledChannels.size > 0 && selectedProfileIds.size > 0
  const stepValid: Record<number, boolean> = { 1: step1Valid, 2: step2Valid, 3: true }
  const currentValid = stepValid[step]

  const step2Hint = enabledChannels.size === 0 && selectedProfileIds.size === 0
    ? 'Select at least one channel and one audience profile to continue.'
    : enabledChannels.size === 0 ? 'Select at least one delivery channel to continue.'
    : selectedProfileIds.size === 0 ? 'Select at least one audience profile to continue.'
    : ''

  const targetedRoleCount = useMemo(() => {
    const roleSet = new Set<string>()
    profiles.forEach((p) => { if (selectedProfileIds.has(p.id)) p.roles.forEach((r) => roleSet.add(r)) })
    return roleSet.size
  }, [profiles, selectedProfileIds])

  const goToStep = (target: 1 | 2 | 3) => {
    if (target <= maxReached) { setStep(target); setAttemptedNext(false) }
  }
  const goNext = () => {
    if (!currentValid) { setAttemptedNext(true); return }
    const next = Math.min(step + 1, 3) as 1 | 2 | 3
    setStep(next)
    setMaxReached((m) => (next > m ? next : m))
    setAttemptedNext(false)
  }
  const goBack = () => { setStep((s) => Math.max(s - 1, 1) as 1 | 2 | 3); setAttemptedNext(false) }

  const handlePublish = () => {
    if (publishing) return
    setPublishing(true)
    const roleChannelsMap: Record<string, Record<Channel, boolean>> = {}
    for (const role of ROLES) {
      const belongs = profiles.some((p) => selectedProfileIds.has(p.id) && p.roles.includes(role))
      roleChannelsMap[role] = {
        inbox: belongs && enabledChannels.has('inbox'),
        toast: belongs && enabledChannels.has('toast'),
        push: belongs && enabledChannels.has('push'),
        email: belongs && enabledChannels.has('email'),
        sms: belongs && enabledChannels.has('sms'),
        whatsapp: belongs && enabledChannels.has('whatsapp'),
      }
    }
    const newType: NotificationType = {
      id: `nt-custom-${Date.now()}`,
      name: previewTitle, module: currentModuleDef.label, description: previewDesc,
      criticality, mandatory: isMandatory, platformEnabled: true, batchingExempt: isExempt,
      roleChannels: roleChannelsMap as any,
    }
    window.setTimeout(() => { onPublish(newType); setPublishing(false); onClose() }, 650)
  }

  const critStyle = CRITICALITY_STYLE[criticality]

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" width="min(1080px, 97vw)" hideClose className="p-0 flex flex-col h-full bg-card shadow-none">
        <SheetClose className="absolute -left-14 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </SheetClose>

        {/* Body: left sidebar (heading + stepper) + right content — matches the
            full-page create-flow reference layout */}
        <div className="flex min-h-0 flex-1">
          {/* LEFT — heading + vertical icon stepper */}
          <aside className="hidden w-[320px] shrink-0 flex-col border-r border-border bg-muted/10 px-7 py-8 sm:flex">
            <div className="mb-9">
              <SheetTitle className="text-xl font-bold tracking-tight text-foreground">New Notification</SheetTitle>
              <SheetDescription className="mt-1 text-xs text-muted-foreground">Guided step-by-step setup</SheetDescription>
            </div>

            <nav aria-label="Progress" className="flex flex-col">
              {STEPS.map((s, i) => {
                const isCurrent = step === s.id
                const isDone = maxReached > s.id || s.id < step
                const clickable = s.id <= maxReached
                const StepIcon = s.icon
                return (
                  <div key={s.id} className="flex gap-3.5">
                    {/* marker + connector */}
                    <div className="flex flex-col items-center">
                      <button
                        type="button"
                        disabled={!clickable}
                        aria-current={isCurrent ? 'step' : undefined}
                        aria-label={`Step ${s.id}: ${s.title}`}
                        onClick={() => goToStep(s.id)}
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                          isCurrent ? 'border-primary bg-primary text-primary-foreground'
                            : isDone ? 'border-primary/40 bg-primary/10 text-primary cursor-pointer hover:bg-primary/20'
                            : 'border-border bg-card text-muted-foreground',
                          !clickable && 'cursor-not-allowed'
                        )}
                      >
                        {isDone ? <Check className="size-4" strokeWidth={2.5} /> : <StepIcon className="size-4" />}
                      </button>
                      {i < STEPS.length - 1 ? (
                        <span className={cn('my-1.5 w-px flex-1 min-h-10', isDone ? 'bg-primary/40' : 'bg-border')} />
                      ) : null}
                    </div>
                    {/* labels */}
                    <button
                      type="button"
                      disabled={!clickable}
                      onClick={() => goToStep(s.id)}
                      className={cn('pb-8 pt-1 text-left outline-none', clickable ? 'cursor-pointer' : 'cursor-not-allowed')}
                    >
                      <span className={cn('block text-[10px] font-semibold uppercase tracking-wider transition-colors', isCurrent ? 'text-primary' : 'text-muted-foreground')}>
                        Step {s.id}
                      </span>
                      <span className={cn('mt-0.5 block text-sm font-semibold transition-colors', isCurrent ? 'text-foreground' : isDone ? 'text-foreground/80' : 'text-muted-foreground')}>
                        {s.title}
                      </span>
                    </button>
                  </div>
                )
              })}
            </nav>
          </aside>

          {/* RIGHT — section heading + form + footer CTAs */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Section heading */}
            <div className="shrink-0 px-8 pt-7 pb-4">
              <h3 className="text-lg font-semibold text-foreground">{STEPS[step - 1].title}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{STEPS[step - 1].subtitle} · Step {step} of 3</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-8 pb-6 pt-1">
              {/* STEP 1 */}
              {step === 1 && (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-2 gap-3">
                    <WizardSelect label="Module" value={selectedModuleId} onChange={applyModule}>
                      {CUSTOM_MODULE_DEFINITIONS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </WizardSelect>
                    <WizardSelect label="Entity" value={selectedEntityId} onChange={applyEntity}>
                      {currentModuleDef.entities.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                    </WizardSelect>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <WizardSelect label="Field" value={selectedFieldId} onChange={applyField}>
                      {currentEntityDef.fields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                    </WizardSelect>
                    <WizardSelect label="Condition" value={selectedOperatorId} onChange={setSelectedOperatorId}>
                      {availableOperators.map((op) => <option key={op.id} value={op.id}>{op.label}</option>)}
                    </WizardSelect>
                    {currentFieldDef.type === 'select' && currentFieldDef.options ? (
                      <WizardSelect label="Value" value={String(conditionValue)} onChange={setConditionValue}>
                        {currentFieldDef.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                      </WizardSelect>
                    ) : (
                      <FloatingLabelInput
                        label="Value"
                        type={currentFieldDef.type === 'number' ? 'number' : 'text'}
                        value={conditionValue}
                        onChange={(e) => setConditionValue(currentFieldDef.type === 'number' ? (Number(e.target.value) || 0) : e.target.value)}
                        helperText={currentFieldDef.unit ? `Unit: ${currentFieldDef.unit}` : undefined}
                        errorText={attemptedNext && !valueSet ? 'Enter a threshold value.' : undefined}
                      />
                    )}
                  </div>

                  {/* Severity */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-foreground">Severity</span>
                    <div className="inline-flex w-max rounded-md border border-border bg-muted/30 p-1">
                      {([{ id: 'critical' as const, label: 'Critical' }, { id: 'medium' as const, label: 'Medium' }, { id: 'normal' as const, label: 'Normal' }]).map((lvl) => {
                        const isSel = criticality === lvl.id
                        return (
                          <button
                            key={lvl.id}
                            type="button"
                            onClick={() => setCriticality(lvl.id)}
                            className={cn('flex items-center gap-1.5 rounded-[4px] px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer', isSel ? cn('bg-card shadow-2xs', CRITICALITY_STYLE[lvl.id].active) : 'text-muted-foreground hover:text-foreground')}
                          >
                            <Flag className="size-3" /> {lvl.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Rule preview */}
                  <div className="flex flex-col gap-1.5 rounded-md border border-primary/20 bg-primary/5 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Rule preview</span>
                    <p className="text-xs leading-relaxed text-foreground">{livePreview.ruleText}</p>
                  </div>
                </div>
              )}

              {/* STEP 2 */}
              {step === 2 && (
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">Message</span>
                      <Button variant="tertiary" size="sm" onClick={() => { setCustomTitle(defaultTitle); setCustomDesc(defaultDesc) }} className="h-7 text-xs gap-1 cursor-pointer">
                        <Wand2 className="size-3" /> Auto-write
                      </Button>
                    </div>
                    <FloatingLabelInput label="Notification title" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder={defaultTitle} />
                    <FloatingLabelInput label="Description" value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} placeholder={defaultDesc} />
                  </div>

                  {/* Channels */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-foreground">Delivery channels</span>
                    <div className="flex flex-wrap gap-2">
                      {CHANNELS.map((ch) => {
                        const Icon = CHANNEL_ICONS[ch.id]
                        const on = enabledChannels.has(ch.id)
                        return (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() => toggleChannel(ch.id)}
                            className={cn('flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer', on ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/30')}
                          >
                            <Icon className="size-3.5" /> {ch.label} {on ? <Check className="size-3" /> : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Audience */}
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-foreground">Audience <span className="font-normal text-muted-foreground">· {selectedProfileIds.size} of {profiles.length} profiles</span></span>
                    <div className="flex flex-col gap-2">
                      {profiles.map((prof) => {
                        const on = selectedProfileIds.has(prof.id)
                        return (
                          <button
                            key={prof.id}
                            type="button"
                            onClick={() => toggleProfile(prof.id)}
                            className={cn('flex items-center justify-between rounded-md border px-3 py-2.5 text-left transition-all cursor-pointer', on ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30')}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={cn('flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-input-background')}>
                                {on ? <Check className="size-3" strokeWidth={3} /> : null}
                              </span>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-foreground">{prof.name}</span>
                                <span className="truncate text-[11px] text-muted-foreground">{prof.roles.join(', ') || 'No roles assigned'}</span>
                              </div>
                            </div>
                            <Badge variant="muted" size="xs" className="shrink-0 font-medium text-[10px]">{prof.roles.length} {prof.roles.length === 1 ? 'role' : 'roles'}</Badge>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Rules */}
                  <div className="flex flex-col divide-y divide-border rounded-md border border-border">
                    <div className="flex items-center justify-between px-3.5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Lock className="size-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">Mandatory</span>
                          <span className="text-[11px] text-muted-foreground">Users cannot opt out of this notification.</span>
                        </div>
                      </div>
                      <Switch checked={isMandatory} onCheckedChange={setIsMandatory} />
                    </div>
                    <div className="flex items-center justify-between px-3.5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Layers className="size-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-foreground">Exempt from digest</span>
                          <span className="text-[11px] text-muted-foreground">Always deliver individually, never grouped into a digest.</span>
                        </div>
                      </div>
                      <Switch checked={isExempt} onCheckedChange={setIsExempt} />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3 */}
              {step === 3 && (
                <div className="flex flex-col gap-5">
                  {/* Inbox-accurate preview */}
                  <div className="rounded-md border border-border bg-card p-3.5 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', critStyle.iconBg, critStyle.iconFg)}>
                        <Bell className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground leading-snug">{previewTitle}</span>
                          <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary"><span className="size-1.5 rounded-full bg-primary" /> Just now</span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{previewDesc}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge variant={critStyle.badge} size="xs" className="capitalize gap-0.5 font-semibold h-4.5 rounded-[2px] px-1"><Flag className="size-2.5" /> {criticality}</Badge>
                          <Badge variant="muted" size="xs" className="font-medium h-4.5 rounded-[2px] px-1.5">{currentModuleDef.label}</Badge>
                          {isMandatory ? <Badge variant="muted" size="xs" className="gap-0.5 font-medium h-4.5 rounded-[2px] px-1.5"><Lock className="size-2.5" /> Required</Badge> : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Review sections with edit links */}
                  <ReviewRow label="Trigger rule" onEdit={() => goToStep(1)}>
                    {livePreview.ruleText}
                  </ReviewRow>
                  <ReviewRow label="Delivery channels" onEdit={() => goToStep(2)}>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(enabledChannels).map((c) => {
                        const Icon = CHANNEL_ICONS[c]
                        return <span key={c} className="flex items-center gap-1 rounded-[4px] bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground"><Icon className="size-2.5" /> {c}</span>
                      })}
                    </div>
                  </ReviewRow>
                  <ReviewRow label="Audience" onEdit={() => goToStep(2)}>
                    {profiles.filter((p) => selectedProfileIds.has(p.id)).map((p) => p.name).join(', ') || 'None'}
                    <span className="text-muted-foreground"> · {targetedRoleCount} role{targetedRoleCount === 1 ? '' : 's'}</span>
                  </ReviewRow>
                  <ReviewRow label="Rules" onEdit={() => goToStep(2)}>
                    {isMandatory ? 'Mandatory' : 'Optional'}{isExempt ? ' · Exempt from digest' : ''}
                  </ReviewRow>
                </div>
              )}
            </div>

            {/* Footer CTAs — Back (left) · Save & Continue / Publish (right) */}
            <div className="shrink-0 border-t border-border px-8 py-4">
              {step === 2 && !step2Valid && step2Hint ? (
                <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <AlertCircle className="size-3.5 text-warning-600" /> {step2Hint}
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <Button
                  variant="tertiary"
                  onClick={step > 1 ? goBack : onClose}
                  className="cursor-pointer border-border"
                >
                  Back
                </Button>
                {step < 3 ? (
                  <Button variant="primary" onClick={goNext} disabled={!currentValid} className="cursor-pointer">
                    Save &amp; Continue
                  </Button>
                ) : (
                  <Button variant="primary" onClick={handlePublish} disabled={publishing} className="gap-1.5 cursor-pointer">
                    {publishing ? <><Loader2 className="size-4 animate-spin" /> Publishing…</> : <><Check className="size-4" /> Publish notification</>}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ReviewRow({ label, onEdit, children }: { label: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-card px-3.5 py-3">
      <div className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
        <div className="mt-1 text-xs leading-relaxed text-foreground">{children}</div>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
      >
        <Pencil className="size-3" /> Edit
      </button>
    </div>
  )
}

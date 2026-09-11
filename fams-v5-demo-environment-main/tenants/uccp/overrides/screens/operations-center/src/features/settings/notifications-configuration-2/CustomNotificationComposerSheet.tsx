import { useState, useMemo } from 'react'
import {
  X, Check, Sparkles, Bell, Flag, Layers, Lock, Wand2, ChevronDown, Loader2,
  Gauge, Fuel, ThermometerSun, Clock, Wrench, ShieldAlert, LayoutTemplate,
  Monitor, Smartphone, Mail, MessageSquare, MessageCircle, Inbox as InboxIcon,
} from 'lucide-react'
import {
  Sheet, SheetContent, SheetClose, SheetTitle, SheetDescription,
  Button, FloatingLabelInput, Switch, Badge, cn,
} from '@fams/design-system'
import {
  CUSTOM_MODULE_DEFINITIONS, OPERATORS, generateLivePreviewText, NOTIFICATION_TEMPLATES,
  type NotificationTemplate,
} from './customNotificationData'
import { ROLES, CHANNELS, type Criticality, type NotificationProfile, type Channel, type NotificationType } from './notificationsConfigData2'

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

const TEMPLATE_ICONS: Record<NotificationTemplate['iconKey'], typeof Gauge> = {
  gauge: Gauge, fuel: Fuel, thermometer: ThermometerSun, clock: Clock, wrench: Wrench, shield: ShieldAlert,
}

const CHANNEL_ICONS: Record<Channel, typeof Bell> = {
  inbox: InboxIcon, toast: Monitor, push: Smartphone, email: Mail, sms: MessageSquare, whatsapp: MessageCircle,
}

const CRITICALITY_STYLE: Record<Criticality, { chip: string; badge: 'destructive' | 'warning' | 'info'; iconBg: string; iconFg: string }> = {
  critical: { chip: 'border-destructive/40 text-destructive bg-destructive/10', badge: 'destructive', iconBg: 'bg-destructive/10', iconFg: 'text-destructive' },
  medium: { chip: 'border-warning-500/40 text-warning-700 bg-warning-500/10', badge: 'warning', iconBg: 'bg-warning-500/15', iconFg: 'text-warning-700' },
  normal: { chip: 'border-blue-500/40 text-blue-700 bg-blue-500/10', badge: 'info', iconBg: 'bg-blue-500/10', iconFg: 'text-blue-600' },
}

/** A pill-shaped inline select that reads inside a sentence. Native <select> is
 * overlaid transparently so the whole pill (incl. chevron) is the hit target. */
function InlinePillSelect({
  value, onChange, children, tone = 'value', ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
  tone?: 'value' | 'muted'
  ariaLabel: string
}) {
  const label = useMemo(() => {
    // find the option whose value matches to display its text
    const arr = Array.isArray(children) ? children.flat() : [children]
    for (const c of arr as any[]) {
      if (c && c.props && String(c.props.value) === String(value)) return c.props.children
    }
    return value
  }, [children, value])

  return (
    <span className="relative inline-flex">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none opacity-0"
      >
        {children}
      </select>
      <span
        className={cn(
          'inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-sm font-semibold transition-colors',
          tone === 'value'
            ? 'border-primary/30 bg-primary/8 text-primary hover:bg-primary/12'
            : 'border-border bg-muted/50 text-foreground hover:bg-muted'
        )}
      >
        {label}
        <ChevronDown className="size-3.5 opacity-70" />
      </span>
    </span>
  )
}

function SectionHeader({ index, title, hint, action }: { index: number; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-[11px] font-bold text-primary">
          {index}
        </span>
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {hint ? <span className="text-xs text-muted-foreground">· {hint}</span> : null}
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main composer                                                       */
/* ------------------------------------------------------------------ */

interface CustomNotificationComposerSheetProps {
  open: boolean
  onClose: () => void
  profiles: NotificationProfile[]
  onPublish: (newType: NotificationType) => void
}

export function CustomNotificationComposerSheet({
  open, onClose, profiles, onPublish,
}: CustomNotificationComposerSheetProps) {
  // Trigger state
  const [selectedModuleId, setSelectedModuleId] = useState('Fleet')
  const [selectedEntityId, setSelectedEntityId] = useState('vehicle')
  const [selectedFieldId, setSelectedFieldId] = useState('speed')
  const [selectedOperatorId, setSelectedOperatorId] = useState('gt')
  const [conditionValue, setConditionValue] = useState<string | number>(85)
  const [criticality, setCriticality] = useState<Criticality>('critical')

  // Message / delivery state
  const [customTitle, setCustomTitle] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [enabledChannels, setEnabledChannels] = useState<Set<Channel>>(new Set(['inbox', 'toast']))
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(new Set(profiles.map((p) => p.id)))
  const [isMandatory, setIsMandatory] = useState(false)
  const [isExempt, setIsExempt] = useState(false)

  const [activeTemplateId, setActiveTemplateId] = useState<string | null>('tpl-speeding')
  const [publishing, setPublishing] = useState(false)

  const currentModuleDef = useMemo(
    () => CUSTOM_MODULE_DEFINITIONS.find((m) => m.id === selectedModuleId) || CUSTOM_MODULE_DEFINITIONS[0],
    [selectedModuleId]
  )
  const currentEntityDef = useMemo(
    () => currentModuleDef.entities.find((e) => e.id === selectedEntityId) || currentModuleDef.entities[0],
    [currentModuleDef, selectedEntityId]
  )
  const currentFieldDef = useMemo(
    () => currentEntityDef.fields.find((f) => f.id === selectedFieldId) || currentEntityDef.fields[0],
    [currentEntityDef, selectedFieldId]
  )
  const availableOperators = useMemo(() => OPERATORS[currentFieldDef.type] || OPERATORS.number, [currentFieldDef])
  const currentOperatorLabel = useMemo(() => {
    const op = availableOperators.find((o) => o.id === selectedOperatorId)
    return op ? op.label : availableOperators[0]?.label || 'equals'
  }, [availableOperators, selectedOperatorId])

  const defaultTitle = `${currentModuleDef.label} · ${currentFieldDef.label} Alert`
  const defaultDesc = `Triggers when ${currentFieldDef.label} in ${currentEntityDef.label} ${currentOperatorLabel} ${conditionValue}${currentFieldDef.unit ? ' ' + currentFieldDef.unit : ''}.`

  const livePreview = useMemo(
    () => generateLivePreviewText({
      module: currentModuleDef.label, entityLabel: currentEntityDef.label, fieldLabel: currentFieldDef.label,
      operatorLabel: currentOperatorLabel, value: conditionValue, unit: currentFieldDef.unit, criticality,
    }),
    [currentModuleDef, currentEntityDef, currentFieldDef, currentOperatorLabel, conditionValue, criticality]
  )

  const previewTitle = customTitle.trim() || defaultTitle
  const previewDesc = customDesc.trim() || defaultDesc

  // Cascade resets when a higher-level selector changes
  const applyModule = (modId: string) => {
    setActiveTemplateId(null)
    setSelectedModuleId(modId)
    const mod = CUSTOM_MODULE_DEFINITIONS.find((m) => m.id === modId) || CUSTOM_MODULE_DEFINITIONS[0]
    const ent = mod.entities[0]
    setSelectedEntityId(ent.id)
    const fld = ent.fields[0]
    setSelectedFieldId(fld.id)
    setConditionValue(fld.defaultVal)
    setSelectedOperatorId(OPERATORS[fld.type][0].id)
  }
  const applyEntity = (entId: string) => {
    setActiveTemplateId(null)
    setSelectedEntityId(entId)
    const ent = currentModuleDef.entities.find((e) => e.id === entId) || currentModuleDef.entities[0]
    const fld = ent.fields[0]
    setSelectedFieldId(fld.id)
    setConditionValue(fld.defaultVal)
    setSelectedOperatorId(OPERATORS[fld.type][0].id)
  }
  const applyField = (fldId: string) => {
    setActiveTemplateId(null)
    setSelectedFieldId(fldId)
    const fld = currentEntityDef.fields.find((f) => f.id === fldId) || currentEntityDef.fields[0]
    setConditionValue(fld.defaultVal)
    setSelectedOperatorId(OPERATORS[fld.type][0].id)
  }

  const applyTemplate = (tpl: NotificationTemplate) => {
    setActiveTemplateId(tpl.id)
    setSelectedModuleId(tpl.moduleId)
    setSelectedEntityId(tpl.entityId)
    setSelectedFieldId(tpl.fieldId)
    setSelectedOperatorId(tpl.operatorId)
    setConditionValue(tpl.value)
    setCriticality(tpl.criticality)
    setCustomTitle(tpl.title)
    setCustomDesc(tpl.description)
    setEnabledChannels(new Set(tpl.channels))
  }

  const startBlank = () => {
    // A true clean slate — nothing pre-filled. The trigger resets to the first
    // taxonomy entry with an EMPTY value (so "Trigger condition set" reads
    // unchecked until the user enters one), severity to the neutral default, and
    // channels/profiles/message all cleared so the readiness checklist guides
    // the user to fill everything in.
    setActiveTemplateId('blank')
    const mod = CUSTOM_MODULE_DEFINITIONS[0]
    const ent = mod.entities[0]
    const fld = ent.fields[0]
    setSelectedModuleId(mod.id)
    setSelectedEntityId(ent.id)
    setSelectedFieldId(fld.id)
    setSelectedOperatorId(OPERATORS[fld.type][0].id)
    setConditionValue(fld.type === 'select' ? (fld.options?.[0] ?? '') : '')
    setCriticality('normal')
    setCustomTitle('')
    setCustomDesc('')
    setEnabledChannels(new Set())
    setSelectedProfileIds(new Set())
  }

  const toggleChannel = (ch: Channel) => {
    setEnabledChannels((prev) => {
      const next = new Set(prev)
      next.has(ch) ? next.delete(ch) : next.add(ch)
      return next
    })
  }
  const toggleProfile = (id: string) => {
    setSelectedProfileIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const autoWriteCopy = () => {
    setCustomTitle(defaultTitle)
    setCustomDesc(defaultDesc)
  }

  // Readiness
  const valueSet = conditionValue !== '' && conditionValue !== null && conditionValue !== undefined
  const hasChannel = enabledChannels.size > 0
  const hasAudience = selectedProfileIds.size > 0
  const canPublish = valueSet && hasChannel && hasAudience

  const targetedRoleCount = useMemo(() => {
    const roleSet = new Set<string>()
    profiles.forEach((p) => { if (selectedProfileIds.has(p.id)) p.roles.forEach((r) => roleSet.add(r)) })
    return roleSet.size
  }, [profiles, selectedProfileIds])

  const handlePublish = () => {
    if (!canPublish || publishing) return
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
      name: previewTitle,
      module: currentModuleDef.label,
      description: previewDesc,
      criticality,
      mandatory: isMandatory,
      platformEnabled: true,
      batchingExempt: isExempt,
      roleChannels: roleChannelsMap as any,
    }
    // brief publishing → success feedback before closing
    window.setTimeout(() => {
      onPublish(newType)
      setPublishing(false)
      onClose()
    }, 650)
  }

  const critStyle = CRITICALITY_STYLE[criticality]

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" width="min(1040px, 96vw)" hideClose className="p-0 flex flex-col h-full bg-card shadow-none">
        {/* Floating circular close */}
        <SheetClose className="absolute -left-14 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </SheetClose>

        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4">
          <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="size-4.5" />
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <SheetTitle className="text-base font-semibold text-foreground">New Notification</SheetTitle>
              <Badge size="xs" className="bg-primary/10 text-primary border-primary/20 font-semibold gap-1">
                <Wand2 className="size-2.5" /> Quick Composer
              </Badge>
            </div>
            <SheetDescription className="text-xs text-muted-foreground mt-0.5">
              Build it on one screen — the preview on the right updates as you go.
            </SheetDescription>
          </div>
        </div>

        {/* Two-column body */}
        <div className="flex min-h-0 flex-1">
          {/* LEFT — the form */}
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-7">
            {/* 1 · Templates */}
            <div className="flex flex-col gap-3">
              <SectionHeader index={1} title="Quick start" hint="prefill a common alert, then tweak" />
              <div className="grid grid-cols-3 gap-2.5">
                {NOTIFICATION_TEMPLATES.map((tpl) => {
                  const Icon = TEMPLATE_ICONS[tpl.iconKey]
                  const isSel = activeTemplateId === tpl.id
                  const ts = CRITICALITY_STYLE[tpl.criticality]
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className={cn(
                        'group flex flex-col gap-1.5 rounded-md border p-3 text-left transition-all cursor-pointer',
                        isSel ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('flex size-7 items-center justify-center rounded-md', ts.iconBg, ts.iconFg)}>
                          <Icon className="size-4" />
                        </span>
                        {isSel ? <Check className="size-3.5 text-primary" /> : null}
                      </div>
                      <span className="text-xs font-semibold text-foreground leading-tight">{tpl.label}</span>
                      <span className="text-[11px] text-muted-foreground leading-tight line-clamp-2">{tpl.blurb}</span>
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={startBlank}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1.5 rounded-md border border-dashed p-3 text-center transition-all cursor-pointer',
                    activeTemplateId === 'blank' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                  )}
                >
                  <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <LayoutTemplate className="size-4" />
                  </span>
                  <span className="text-xs font-semibold text-foreground leading-tight">Start blank</span>
                </button>
              </div>
            </div>

            {/* 2 · Trigger */}
            <div className="flex flex-col gap-3">
              <SectionHeader index={2} title="Trigger" hint="when this happens" />
              <div className="rounded-md border border-border bg-muted/20 px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-2.5 text-sm leading-8 text-muted-foreground">
                  <span>When</span>
                  <InlinePillSelect ariaLabel="Field" value={selectedFieldId} onChange={applyField}>
                    {currentEntityDef.fields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </InlinePillSelect>
                  <span>in</span>
                  <InlinePillSelect ariaLabel="Module" tone="muted" value={selectedModuleId} onChange={applyModule}>
                    {CUSTOM_MODULE_DEFINITIONS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </InlinePillSelect>
                  <span className="text-muted-foreground/60">/</span>
                  <InlinePillSelect ariaLabel="Entity" tone="muted" value={selectedEntityId} onChange={applyEntity}>
                    {currentModuleDef.entities.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
                  </InlinePillSelect>
                  <InlinePillSelect ariaLabel="Condition" value={selectedOperatorId} onChange={(v) => { setActiveTemplateId(null); setSelectedOperatorId(v) }}>
                    {availableOperators.map((op) => <option key={op.id} value={op.id}>{op.label}</option>)}
                  </InlinePillSelect>
                  {currentFieldDef.type === 'select' && currentFieldDef.options ? (
                    <InlinePillSelect ariaLabel="Value" value={String(conditionValue)} onChange={(v) => { setActiveTemplateId(null); setConditionValue(v) }}>
                      {currentFieldDef.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </InlinePillSelect>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <input
                        type={currentFieldDef.type === 'number' ? 'number' : 'text'}
                        value={conditionValue}
                        onChange={(e) => { setActiveTemplateId(null); setConditionValue(currentFieldDef.type === 'number' ? (Number(e.target.value) || 0) : e.target.value) }}
                        aria-label="Value"
                        className="h-8 w-20 rounded-md border border-primary/30 bg-primary/8 px-2 text-center text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                      />
                      {currentFieldDef.unit ? <span className="text-sm font-medium text-foreground">{currentFieldDef.unit}</span> : null}
                    </span>
                  )}
                  <span>.</span>
                </div>
              </div>
            </div>

            {/* 3 · Severity */}
            <div className="flex flex-col gap-3">
              <SectionHeader index={3} title="Severity" />
              <div className="inline-flex rounded-md border border-border bg-muted/30 p-1 w-max">
                {([
                  { id: 'critical' as const, label: 'Critical' },
                  { id: 'medium' as const, label: 'Medium' },
                  { id: 'normal' as const, label: 'Normal' },
                ]).map((lvl) => {
                  const isSel = criticality === lvl.id
                  const st = CRITICALITY_STYLE[lvl.id]
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setCriticality(lvl.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-[4px] px-4 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                        isSel ? cn('bg-card shadow-2xs', st.iconFg) : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Flag className="size-3" />
                      {lvl.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 4 · Message */}
            <div className="flex flex-col gap-3">
              <SectionHeader
                index={4}
                title="Message"
                hint="what users see"
                action={
                  <Button variant="tertiary" size="sm" onClick={autoWriteCopy} className="h-7 text-xs gap-1 cursor-pointer">
                    <Wand2 className="size-3" /> Auto-write
                  </Button>
                }
              />
              <div className="flex flex-col gap-3">
                <FloatingLabelInput label="Notification title" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder={defaultTitle} />
                <FloatingLabelInput label="Description" value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} placeholder={defaultDesc} />
              </div>
            </div>

            {/* 5 · Delivery channels */}
            <div className="flex flex-col gap-3">
              <SectionHeader index={5} title="Delivery channels" hint={`${enabledChannels.size} on`} />
              <div className="flex flex-wrap gap-2">
                {CHANNELS.map((ch) => {
                  const Icon = CHANNEL_ICONS[ch.id]
                  const on = enabledChannels.has(ch.id)
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => toggleChannel(ch.id)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                        on ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/30'
                      )}
                    >
                      <Icon className="size-3.5" />
                      {ch.label}
                      {on ? <Check className="size-3" /> : null}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 6 · Audience */}
            <div className="flex flex-col gap-3">
              <SectionHeader index={6} title="Audience" hint={`${selectedProfileIds.size} of ${profiles.length} profiles`} />
              <div className="grid grid-cols-1 gap-2">
                {profiles.map((prof) => {
                  const on = selectedProfileIds.has(prof.id)
                  return (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => toggleProfile(prof.id)}
                      className={cn(
                        'flex items-center justify-between rounded-md border px-3 py-2.5 text-left transition-all cursor-pointer',
                        on ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
                          on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-input-background'
                        )}>
                          {on ? <Check className="size-3" strokeWidth={3} /> : null}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-semibold text-foreground">{prof.name}</span>
                          <span className="truncate text-[11px] text-muted-foreground">{prof.roles.join(', ') || 'No roles assigned'}</span>
                        </div>
                      </div>
                      <Badge variant="muted" size="xs" className="shrink-0 font-medium text-[10px]">
                        {prof.roles.length} {prof.roles.length === 1 ? 'role' : 'roles'}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 7 · Rules */}
            <div className="flex flex-col gap-3">
              <SectionHeader index={7} title="Delivery rules" />
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
          </div>

          {/* RIGHT — live preview */}
          <div className="flex w-[384px] shrink-0 flex-col border-l border-border bg-muted/10">
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              <div className="flex items-center gap-1.5">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">Live preview</span>
              </div>

              {/* Inbox-accurate notification card mock */}
              <div className="rounded-md border border-border bg-card p-3.5 shadow-2xs">
                <div className="flex items-start gap-3">
                  <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', critStyle.iconBg, critStyle.iconFg)}>
                    <Bell className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground leading-snug">{previewTitle}</span>
                      <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary">
                        <span className="size-1.5 rounded-full bg-primary" /> Just now
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-3">{previewDesc}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Badge variant={critStyle.badge} size="xs" className="capitalize gap-0.5 font-semibold h-4.5 rounded-[2px] px-1">
                        <Flag className="size-2.5" /> {criticality}
                      </Badge>
                      <Badge variant="muted" size="xs" className="font-medium h-4.5 rounded-[2px] px-1.5">{currentModuleDef.label}</Badge>
                      {isMandatory ? (
                        <Badge variant="muted" size="xs" className="gap-0.5 font-medium h-4.5 rounded-[2px] px-1.5"><Lock className="size-2.5" /> Required</Badge>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              {/* Rule summary */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Rule</span>
                <p className="rounded-md border border-primary/20 bg-primary/5 p-2.5 text-xs leading-relaxed text-foreground">
                  {livePreview.ruleText}
                </p>
              </div>

              {/* Targeting summary */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reaches</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Profiles', value: selectedProfileIds.size },
                    { label: 'Roles', value: targetedRoleCount },
                    { label: 'Channels', value: enabledChannels.size },
                  ].map((s) => (
                    <div key={s.label} className="flex flex-col items-center rounded-md border border-border bg-card py-2">
                      <span className="text-base font-semibold text-foreground leading-none">{s.value}</span>
                      <span className="mt-0.5 text-[10px] text-muted-foreground">{s.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {Array.from(enabledChannels).map((c) => {
                    const Icon = CHANNEL_ICONS[c]
                    return (
                      <span key={c} className="flex items-center gap-1 rounded-[4px] bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                        <Icon className="size-2.5" /> {c}
                      </span>
                    )
                  })}
                  {enabledChannels.size === 0 ? <span className="text-[11px] text-destructive">No channels selected</span> : null}
                </div>
              </div>

              {/* Readiness checklist */}
              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ready to publish</span>
                {[
                  { ok: valueSet, label: 'Trigger condition set' },
                  { ok: hasChannel, label: 'At least one delivery channel' },
                  { ok: hasAudience, label: 'At least one audience profile' },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-2 text-xs">
                    <span className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded-full',
                      c.ok ? 'bg-primary text-primary-foreground' : 'border border-border bg-card text-transparent'
                    )}>
                      <Check className="size-2.5" strokeWidth={3} />
                    </span>
                    <span className={c.ok ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pinned footer */}
            <div className="shrink-0 border-t border-border bg-card p-4 flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={handlePublish}
                disabled={!canPublish || publishing}
                className="w-full gap-1.5 cursor-pointer"
              >
                {publishing ? (
                  <><Loader2 className="size-4 animate-spin" /> Publishing…</>
                ) : (
                  <><Check className="size-4" /> Publish notification</>
                )}
              </Button>
              <SheetClose asChild>
                <Button variant="tertiary" onClick={onClose} className="w-full cursor-pointer">
                  Cancel
                </Button>
              </SheetClose>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

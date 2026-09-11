import { useState, useMemo } from 'react'
import {
  X, Check, ChevronRight, Sparkles, Bell, Flag, Layers, Lock, ShieldAlert, Sliders, ArrowLeft, ArrowRight,
  ChevronDown, Box, SlidersHorizontal, Tag, FileText, Type,
} from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
  Button, Input, FloatingLabelInput, Switch, Badge, cn, Tooltip, TooltipTrigger, TooltipContent, Checkbox,
} from '@fams/design-system'
import {
  CUSTOM_MODULE_DEFINITIONS, OPERATORS, generateLivePreviewText,
  type ModuleDefinition, type ModuleEntity, type EntityField,
} from './customNotificationData'
import { ROLES, CHANNELS, type Criticality, type NotificationProfile, type Channel, type NotificationType } from './notificationsConfigData2'

function FloatingLabelSelect({
  label,
  leadingIcon,
  value,
  onChange,
  children,
}: {
  label: string
  leadingIcon?: React.ReactNode
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  children: React.ReactNode
}) {
  return (
    <div className="relative flex h-14 w-full items-center rounded-md border border-border bg-input-background px-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 cursor-pointer">
      {/* Absolute overlay select so entire container including chevron is clickable */}
      <select
        value={value}
        onChange={onChange}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none opacity-0"
      >
        {children}
      </select>

      {leadingIcon ? (
        <span className="mr-2 inline-flex shrink-0 items-center justify-center text-muted-foreground pointer-events-none" aria-hidden>
          {leadingIcon}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col justify-center pr-6 pointer-events-none">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground" style={{ letterSpacing: '0.04em' }}>
          {label}
        </span>
        <span className="truncate text-sm font-medium text-foreground mt-0.5">
          {value}
        </span>
      </div>
      <ChevronDown size={16} className="shrink-0 text-muted-foreground pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden />
    </div>
  )
}

interface CustomNotificationWizardSheetProps {
  open: boolean
  onClose: () => void
  profiles: NotificationProfile[]
  onPublish: (newType: NotificationType) => void
}

export function CustomNotificationWizardSheet({
  open,
  onClose,
  profiles,
  onPublish,
}: CustomNotificationWizardSheetProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 State: Condition Builder
  const [selectedModuleId, setSelectedModuleId] = useState<string>('Fleet')
  const [selectedEntityId, setSelectedEntityId] = useState<string>('vehicle')
  const [selectedFieldId, setSelectedFieldId] = useState<string>('speed')
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>('gt')
  const [conditionValue, setConditionValue] = useState<string | number>(80)
  const [criticality, setCriticality] = useState<Criticality>('critical')

  // Step 2 State: Delivery Settings
  const [customTitle, setCustomTitle] = useState<string>('')
  const [customDesc, setCustomDesc] = useState<string>('')
  const [enabledChannels, setEnabledChannels] = useState<Set<Channel>>(
    new Set(['inbox', 'toast'])
  )
  const [selectedProfileIds, setSelectedProfileIds] = useState<Set<string>>(
    new Set(profiles.map((p) => p.id))
  )
  const [isMandatory, setIsMandatory] = useState<boolean>(false)
  const [isExempt, setIsExempt] = useState<boolean>(false)

  // Module object
  const currentModuleDef = useMemo(
    () => CUSTOM_MODULE_DEFINITIONS.find((m) => m.id === selectedModuleId) || CUSTOM_MODULE_DEFINITIONS[0],
    [selectedModuleId]
  )

  // Entity object
  const currentEntityDef = useMemo(
    () => currentModuleDef.entities.find((e) => e.id === selectedEntityId) || currentModuleDef.entities[0],
    [currentModuleDef, selectedEntityId]
  )

  // Field object
  const currentFieldDef = useMemo(
    () => currentEntityDef.fields.find((f) => f.id === selectedFieldId) || currentEntityDef.fields[0],
    [currentEntityDef, selectedFieldId]
  )

  // Available operators based on field type
  const availableOperators = useMemo(() => {
    return OPERATORS[currentFieldDef.type] || OPERATORS.number
  }, [currentFieldDef])

  // Current operator label
  const currentOperatorLabel = useMemo(() => {
    const op = availableOperators.find((o) => o.id === selectedOperatorId)
    return op ? op.label : availableOperators[0]?.label || 'equals'
  }, [availableOperators, selectedOperatorId])

  // Auto-generate title if empty
  const defaultTitle = `${currentModuleDef.label} - ${currentFieldDef.label} Alert`
  const defaultDesc = `Triggers when ${currentFieldDef.label} in ${currentEntityDef.label} ${currentOperatorLabel} ${conditionValue}${currentFieldDef.unit ? ' ' + currentFieldDef.unit : ''}.`

  // Live preview text
  const livePreview = useMemo(() => {
    return generateLivePreviewText({
      module: currentModuleDef.label,
      entityLabel: currentEntityDef.label,
      fieldLabel: currentFieldDef.label,
      operatorLabel: currentOperatorLabel,
      value: conditionValue,
      unit: currentFieldDef.unit,
      criticality,
    })
  }, [currentModuleDef, currentEntityDef, currentFieldDef, currentOperatorLabel, conditionValue, criticality])

  // Handlers for selection changes
  const handleModuleChange = (modId: string) => {
    setSelectedModuleId(modId)
    const mod = CUSTOM_MODULE_DEFINITIONS.find((m) => m.id === modId) || CUSTOM_MODULE_DEFINITIONS[0]
    const ent = mod.entities[0]
    setSelectedEntityId(ent.id)
    const fld = ent.fields[0]
    setSelectedFieldId(fld.id)
    setConditionValue(fld.defaultVal)
    setSelectedOperatorId(OPERATORS[fld.type][0].id)
  }

  const handleEntityChange = (entId: string) => {
    setSelectedEntityId(entId)
    const ent = currentModuleDef.entities.find((e) => e.id === entId) || currentModuleDef.entities[0]
    const fld = ent.fields[0]
    setSelectedFieldId(fld.id)
    setConditionValue(fld.defaultVal)
    setSelectedOperatorId(OPERATORS[fld.type][0].id)
  }

  const handleFieldChange = (fldId: string) => {
    setSelectedFieldId(fldId)
    const fld = currentEntityDef.fields.find((f) => f.id === fldId) || currentEntityDef.fields[0]
    setConditionValue(fld.defaultVal)
    setSelectedOperatorId(OPERATORS[fld.type][0].id)
  }

  const toggleChannel = (ch: Channel) => {
    const next = new Set(enabledChannels)
    if (next.has(ch)) next.delete(ch)
    else next.add(ch)
    setEnabledChannels(next)
  }

  const toggleProfile = (profId: string) => {
    const next = new Set(selectedProfileIds)
    if (next.has(profId)) next.delete(profId)
    else next.add(profId)
    setSelectedProfileIds(next)
  }

  // Publish final notification
  const handlePublish = () => {
    const finalTitle = customTitle.trim() || defaultTitle
    const finalDesc = customDesc.trim() || defaultDesc

    // Build roleChannels map for all roles belonging to selected profiles
    const roleChannelsMap: Record<string, Record<Channel, boolean>> = {}
    for (const role of ROLES) {
      // Find if this role belongs to any of the selected profiles
      const belongsToSelectedProfile = profiles.some(
        (p) => selectedProfileIds.has(p.id) && p.roles.includes(role)
      )

      roleChannelsMap[role] = {
        inbox: belongsToSelectedProfile && enabledChannels.has('inbox'),
        toast: belongsToSelectedProfile && enabledChannels.has('toast'),
        push: belongsToSelectedProfile && enabledChannels.has('push'),
        email: belongsToSelectedProfile && enabledChannels.has('email'),
        sms: belongsToSelectedProfile && enabledChannels.has('sms'),
        whatsapp: belongsToSelectedProfile && enabledChannels.has('whatsapp'),
      }
    }

    const newNotificationType: NotificationType = {
      id: `nt-custom-${Date.now()}`,
      name: finalTitle,
      module: currentModuleDef.label,
      description: finalDesc,
      criticality,
      mandatory: isMandatory,
      platformEnabled: true,
      batchingExempt: isExempt,
      roleChannels: roleChannelsMap as any,
    }

    onPublish(newNotificationType)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" width="620px" hideClose className="p-0 flex flex-col h-full bg-card shadow-none">
        {/* Floating circular close button matching Dashboard sheets */}
        <SheetClose className="absolute -left-14 top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </SheetClose>

        {/* Wizard Header & Step Nav Bar */}
        <SheetHeader className="px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <SheetTitle className="text-base font-semibold text-foreground">
              Create Custom Notification
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs text-muted-foreground mt-0.5">
            Build condition-based notifications with real-time text preview and delivery rules.
          </SheetDescription>

          {/* Steps Breadcrumb Bar */}
          <div className="flex items-center gap-2 pt-3">
            {[
              { num: 1, label: '1. Rule & Condition' },
              { num: 2, label: '2. Delivery & Targets' },
              { num: 3, label: '3. Review & Publish' },
            ].map((s) => {
              const active = step === s.num
              const completed = step > s.num
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => completed && setStep(s.num as any)}
                  className={cn(
                    'flex-1 py-1.5 px-2.5 rounded-[4px] border text-xs font-semibold transition-all text-center flex items-center justify-center gap-1.5',
                    active
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : completed
                      ? 'border-border bg-muted/40 text-foreground cursor-pointer'
                      : 'border-border/60 bg-muted/10 text-muted-foreground/60 cursor-not-allowed'
                  )}
                >
                  {completed ? <Check className="size-3 text-primary" /> : null}
                  <span>{s.label}</span>
                </button>
              )
            })}
          </div>
        </SheetHeader>

        {/* Body Content by Step */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* STEP 1: Rule & Condition Builder */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Condition Configuration
              </span>

              {/* Module & Entity Selectors */}
              <div className="grid grid-cols-2 gap-4">
                <FloatingLabelSelect
                  label="Module"
                  leadingIcon={<Layers className="size-4 text-muted-foreground" />}
                  value={selectedModuleId}
                  onChange={(e) => handleModuleChange(e.target.value)}
                >
                  {CUSTOM_MODULE_DEFINITIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </FloatingLabelSelect>

                <FloatingLabelSelect
                  label="Entity"
                  leadingIcon={<Box className="size-4 text-muted-foreground" />}
                  value={selectedEntityId}
                  onChange={(e) => handleEntityChange(e.target.value)}
                >
                  {currentModuleDef.entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.label}
                    </option>
                  ))}
                </FloatingLabelSelect>
              </div>

              {/* Field, Operator & Value */}
              <div className="grid grid-cols-3 gap-3">
                <FloatingLabelSelect
                  label="Field"
                  leadingIcon={<Sliders className="size-4 text-muted-foreground" />}
                  value={selectedFieldId}
                  onChange={(e) => handleFieldChange(e.target.value)}
                >
                  {currentEntityDef.fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </FloatingLabelSelect>

                <FloatingLabelSelect
                  label="Condition"
                  leadingIcon={<SlidersHorizontal className="size-4 text-muted-foreground" />}
                  value={selectedOperatorId}
                  onChange={(e) => setSelectedOperatorId(e.target.value)}
                >
                  {availableOperators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.label}
                    </option>
                  ))}
                </FloatingLabelSelect>

                {currentFieldDef.type === 'select' && currentFieldDef.options ? (
                  <FloatingLabelSelect
                    label="Value"
                    leadingIcon={<Tag className="size-4 text-muted-foreground" />}
                    value={String(conditionValue)}
                    onChange={(e) => setConditionValue(e.target.value)}
                  >
                    {currentFieldDef.options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </FloatingLabelSelect>
                ) : (
                  <FloatingLabelInput
                    label="Value"
                    leadingIcon={<Tag className="size-4 text-muted-foreground" />}
                    type={currentFieldDef.type === 'number' ? 'number' : 'text'}
                    value={conditionValue}
                    onChange={(e) =>
                      setConditionValue(
                        currentFieldDef.type === 'number' ? Number(e.target.value) || 0 : e.target.value
                      )
                    }
                    helperText={currentFieldDef.unit ? `Unit: ${currentFieldDef.unit}` : undefined}
                  />
                )}
              </div>

              {/* Criticality Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground">Severity Level</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'critical' as const, label: 'Critical', color: 'border-destructive/40 text-destructive bg-destructive/10' },
                    { id: 'medium' as const, label: 'Medium', color: 'border-warning-500/40 text-warning-700 bg-warning-500/10' },
                    { id: 'normal' as const, label: 'Normal', color: 'border-blue-500/40 text-blue-700 bg-blue-500/10' },
                  ].map((lvl) => {
                    const isSel = criticality === lvl.id
                    return (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setCriticality(lvl.id)}
                        className={cn(
                          'p-2.5 rounded-[4px] border text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                          isSel ? lvl.color : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                        )}
                      >
                        <Flag className="size-3.5" />
                        {lvl.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* LIVE NOTIFICATION TEXT PREVIEW PANEL */}
              <div className="flex flex-col gap-2.5 pt-4 border-t border-border">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="size-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Live Notification Preview
                  </span>
                </div>

                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Generated Rule Summary
                  </span>
                  <p className="text-xs font-medium text-foreground leading-relaxed">
                    {livePreview.ruleText}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Delivery Rules, Target Profiles & Roles */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Delivery Settings & Target Profiles
              </span>

              {/* Custom Title & Description Inputs */}
              <div className="flex flex-col gap-4">
                <FloatingLabelInput
                  label="Notification Title"
                  leadingIcon={<Type className="size-4" />}
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={defaultTitle}
                />
                <FloatingLabelInput
                  label="Notification Description"
                  leadingIcon={<FileText className="size-4" />}
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  placeholder={defaultDesc}
                />
              </div>

              {/* Channels Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground">
                  Default Enabled Channels
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {CHANNELS.map((ch) => {
                    const isChecked = enabledChannels.has(ch.id)
                    return (
                      <div
                        key={ch.id}
                        onClick={() => toggleChannel(ch.id)}
                        className={cn(
                          'p-2.5 rounded-[4px] border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between',
                          isChecked
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                        )}
                      >
                        <span>{ch.label}</span>
                        <Checkbox checked={isChecked} onCheckedChange={() => toggleChannel(ch.id)} />
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Target Profiles Assignment */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Target Notification Profiles ({selectedProfileIds.size}/{profiles.length})
                  </label>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Applies rules to profile roles
                  </span>
                </div>

                <div className="flex flex-col gap-2 border border-border rounded-xl p-3 bg-card">
                  {profiles.map((prof) => {
                    const isChecked = selectedProfileIds.has(prof.id)
                    return (
                      <div
                        key={prof.id}
                        onClick={() => toggleProfile(prof.id)}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-[4px] border transition-all cursor-pointer text-xs font-medium',
                          isChecked
                            ? 'border-emerald-500/30 bg-emerald-500/5 text-foreground font-semibold'
                            : 'border-border bg-card hover:border-primary/40 text-muted-foreground'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={isChecked} onCheckedChange={() => toggleProfile(prof.id)} />
                          <div className="flex flex-col">
                            <span>{prof.name}</span>
                            <span className="text-[10px] font-normal text-muted-foreground">
                              {prof.roles.join(', ') || 'No roles assigned'}
                            </span>
                          </div>
                        </div>
                        {isChecked && (
                          <Badge variant="info" size="xs" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                            Targeted
                          </Badge>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Mandatory & Batching Exemption Rules */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                  <div className="flex flex-col gap-0.5 pr-2">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Lock className="size-3.5 text-muted-foreground" /> Mandatory
                    </span>
                    <span className="text-[10px] text-muted-foreground">Users cannot opt out</span>
                  </div>
                  <Switch checked={isMandatory} onCheckedChange={setIsMandatory} className="scale-75" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                  <div className="flex flex-col gap-0.5 pr-2">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Layers className="size-3.5 text-muted-foreground" /> Exempt Batching
                    </span>
                    <span className="text-[10px] text-muted-foreground">Delivers immediately</span>
                  </div>
                  <Switch checked={isExempt} onCheckedChange={setIsExempt} className="scale-75" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Summary Review & Publish */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Review & Confirm Notification
              </span>

              <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-base font-semibold text-foreground">
                      {customTitle.trim() || defaultTitle}
                    </span>
                    <Badge variant="muted" size="xs" className="w-max font-semibold text-[10px]">
                      {currentModuleDef.label}
                    </Badge>
                  </div>

                  <Badge
                    variant={
                      criticality === 'critical'
                        ? 'destructive'
                        : criticality === 'medium'
                        ? 'warning'
                        : 'info'
                    }
                    size="xs"
                    className="capitalize gap-1 font-semibold"
                  >
                    <Flag className="size-3" />
                    {criticality}
                  </Badge>
                </div>

                <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-foreground leading-relaxed">
                  <strong>Rule:</strong> {livePreview.ruleText}
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs border-t border-border/60 pt-3">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                      Enabled Channels
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(enabledChannels).map((c) => (
                        <Badge key={c} variant="muted" size="xs" className="uppercase text-[10px]">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                      Target Profiles ({selectedProfileIds.size})
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {profiles
                        .filter((p) => selectedProfileIds.has(p.id))
                        .map((p) => p.name)
                        .join(', ') || 'None'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <SheetFooter className="px-6 py-4 border-t border-border bg-muted/10 shrink-0 flex items-center justify-between sm:justify-between w-full">
          <div>
            {step > 1 ? (
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => setStep((step - 1) as any)}
                className="h-8 text-xs cursor-pointer gap-1"
              >
                <ArrowLeft className="size-3.5" />
                Back
              </Button>
            ) : (
              <SheetClose asChild>
                <Button variant="tertiary" size="sm" onClick={onClose} className="h-8 text-xs cursor-pointer">
                  Cancel
                </Button>
              </SheetClose>
            )}
          </div>

          <div>
            {step < 3 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep((step + 1) as any)}
                className="h-8 text-xs cursor-pointer gap-1"
              >
                Next Step
                <ArrowRight className="size-3.5" />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={handlePublish}
                className="h-8 text-xs cursor-pointer gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="size-3.5" />
                Publish Notification
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

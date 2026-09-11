import { Pencil, Info } from 'lucide-react'
import {
  Checkbox, Switch, Tooltip, TooltipTrigger, TooltipContent, Badge, cn,
} from '@fams/design-system'
import {
  FEATURES, HARDWARE_LABEL,
  type FeatureId, type FeatureState, type HardwareStatus, type Vehicle,
} from './deviceConfigData'

export interface DeviceConfigTableProps {
  vehicles: Vehicle[]
  selectedIds: Set<string>
  onToggleSelect: (id: string, value: boolean) => void
  onToggleAll: (value: boolean) => void
  onToggleFeature: (id: string, feature: FeatureId, value: boolean) => void
}

/**
 * Device Config table — one row per vehicle, one switch per hardware-gated feature
 * (Immobilizer, CAN Bus, iButton). Matches FleetTable/ZoneTable spec: rounded-[6px]
 * bordered card, sticky HeadCell (11px semibold uppercase), h-16 rows.
 */
export function DeviceConfigTable({
  vehicles,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onToggleFeature,
}: DeviceConfigTableProps) {
  const anyEligible = vehicles.filter((v) =>
    FEATURES.some((f) => v.features[f.id].status === 'fitted')
  )
  const allSelected = anyEligible.length > 0 && anyEligible.every((v) => selectedIds.has(v.id))
  const someSelected = anyEligible.some((v) => selectedIds.has(v.id))

  return (
    <div className="rounded-[6px] border border-border bg-card">
      <table className="w-full min-w-[960px] border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="h-12 border-b border-border">
            <th scope="col" className="w-10 pl-4 pr-1">
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={(v) => onToggleAll(v === true)}
                disabled={anyEligible.length === 0}
                aria-label="Select all eligible vehicles"
              />
            </th>
            <HeadCell className="w-[220px]">VEHICLE</HeadCell>
            <HeadCell className="w-[110px]">TYPE</HeadCell>
            <HeadCell className="w-[170px]">DEVICE (IMEI)</HeadCell>
            {FEATURES.map((f) => (
              <HeadCell key={f.id} className="w-[140px] text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 cursor-help">
                      {f.label.toUpperCase()}
                      <Info className="size-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">{f.description}</TooltipContent>
                </Tooltip>
              </HeadCell>
            ))}
            <th scope="col" className="pr-4 pl-2 text-right w-10">
              <button
                type="button"
                aria-label="Edit columns"
                className="inline-flex size-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <Pencil className="size-4" />
              </button>
            </th>
          </tr>
        </thead>

        <tbody>
          {vehicles.map((v, i) => {
            const divider = i < vehicles.length - 1
            const eligible = FEATURES.some((f) => v.features[f.id].status === 'fitted')
            const selected = selectedIds.has(v.id)

            return (
              <tr
                key={v.id}
                className={cn(
                  'h-16 border-border transition-colors',
                  divider && 'border-b',
                  selected ? 'bg-muted/60' : 'hover:bg-muted/40'
                )}
              >
                <td className="pl-4 pr-1">
                  <Checkbox
                    checked={selected}
                    onCheckedChange={(val) => onToggleSelect(v.id, val === true)}
                    disabled={!eligible}
                    aria-label={`Select ${v.plate}`}
                  />
                </td>

                <td className="px-3">
                  <div className="flex items-center gap-3">
                    <VehicleImage />
                    <span className="block truncate text-sm font-medium text-foreground">
                      {v.plate}
                    </span>
                  </div>
                </td>

                <td className="px-3">
                  <span className="text-sm font-medium text-foreground">{v.type}</span>
                </td>

                <td className="px-3">
                  <span className="truncate text-sm text-foreground">
                    {v.imei}
                  </span>
                </td>

                {FEATURES.map((f) => (
                  <td key={f.id} className="px-3">
                    <FeatureCell
                      state={v.features[f.id]}
                      onToggle={(val) => onToggleFeature(v.id, f.id, val)}
                      featureLabel={f.label}
                    />
                  </td>
                ))}

                <td className="pr-4 pl-2 text-right" />
              </tr>
            )
          })}

          {vehicles.length === 0 ? (
            <tr>
              <td colSpan={5 + FEATURES.length} className="px-4 py-16 text-center text-sm text-muted-foreground">
                No vehicles match your search or filters.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

function HeadCell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        'truncate px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground',
        className
      )}
    >
      {children}
    </th>
  )
}

function FeatureCell({
  state,
  onToggle,
  featureLabel,
}: {
  state: FeatureState
  onToggle: (value: boolean) => void
  featureLabel: string
}) {
  if (state.status === 'fitted') {
    return (
      <div className="flex items-center justify-center">
        <Switch checked={state.enabled} onCheckedChange={onToggle} aria-label={`${featureLabel} enabled`} />
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <HardwareBadge status={state.status} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          {state.status === 'pending'
            ? `${featureLabel} module install pending — cannot enable yet.`
            : `${featureLabel} module not fitted on this vehicle. Install hardware to enable.`}
        </TooltipContent>
      </Tooltip>
    </div>
  )
}

function HardwareBadge({ status }: { status: HardwareStatus }) {
  const variant = status === 'pending' ? 'warning' : 'destructive'
  return (
    <Badge
      variant={variant as any}
      size="xs"
      className="gap-1 px-1.5 h-5 rounded-[2px] font-semibold"
    >
      {HARDWARE_LABEL[status]}
    </Badge>
  )
}

function VehicleImage() {
  return (
    <div className="relative flex shrink-0 items-center justify-center w-14 h-10">
      <img
        src="/assets/vehicle-car.jpg"
        alt="Vehicle"
        className="w-14 h-10 object-contain mix-blend-multiply"
      />
    </div>
  )
}

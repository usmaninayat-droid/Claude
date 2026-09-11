import { useEffect, useState } from 'react'
import {
  Sheet, SheetContent, SheetClose, SheetTitle, SheetDescription, Checkbox,
} from '@fams/design-system'
import { X, ChevronDown, Sparkles } from 'lucide-react'
import { RouteCard, type RouteData } from '../../components/RouteCard'
import { CustomScrollbar } from '../../components/CustomScrollbar'

/** The vehicle a breakdown is being reported for — sourced from the Live GIS Map
 *  telematics card of the selected truck. Used to build the replacement payload. */
export type BreakdownVehicle = {
  model: string
  plate: string
  driver: string
  location: string
  coordinates: string
  plan: string
  route: string
}

/** What the telematics card hands to the report sheet: the selected route (for
 *  the embedded RouteCard) + the vehicle context (for the replacement flow). */
export type BreakdownReport = {
  route: RouteData
  vehicle: BreakdownVehicle
}

const BREAKDOWN_TYPES = [
  'Engine Failure',
  'Tire / Puncture',
  'Hydraulic / Compactor Failure',
  'Brake Failure',
  'Electrical Fault',
  'Overheating',
  'Fuel / Diesel System',
  'Transmission / Gearbox',
  'Accident / Collision',
  'Other',
]

/** Placeholder-style select matching the Figma field (label doubles as placeholder,
 *  transparent native `<select>` overlay so the whole field incl. chevron is clickable). */
function SelectField({
  label, value, onChange, children,
}: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <div className="relative flex h-[54px] w-full items-center rounded-[6px] border border-[color:var(--gray-300,#d0d5dd)] bg-white px-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none opacity-0"
      >
        <option value="" disabled hidden>{label}</option>
        {children}
      </select>
      <span
        className={`flex-1 truncate text-sm font-semibold ${
          value ? 'text-[color:var(--gray-800,#1d2939)]' : 'text-[color:var(--muted-foreground,#667085)]'
        }`}
      >
        {value || label}
      </span>
      <ChevronDown className="size-4 shrink-0 text-[color:var(--muted-foreground,#667085)]" />
    </div>
  )
}

export type ReportBreakdownSheetProps = {
  /** Route + vehicle to report on; the sheet is open when non-null. */
  report: BreakdownReport | null
  onOpenChange: (open: boolean) => void
  /** Fired on submit — the parent files the report (marking the route Action
   *  Required) and, when dispatch is on, opens the Replace Vehicle & Driver flow. */
  onReported: (report: BreakdownReport, opts: { dispatchReplacement: boolean }) => void
}

/**
 * ReportBreakdownSheet — NEW local component, matched 1:1 to Figma
 * `bHPl5hXlBDrwgTY8ycV3IX` node `5776:143788` ("Report Vehicle Breakdown"): a
 * 602px right sheet with a 58px circular close floating 40px into the scrim, the
 * selected route's `RouteCard` as context, a Breakdown Type select, optional
 * Location + Description fields, a light-green "Dispatch a replacement
 * immediately" card (with a gradient "Recommended" badge), and a floating
 * gradient footer (Cancel · Report). Checking dispatch routes submit into the
 * Replace Vehicle & Driver flow; leaving it off files a plain report. Local (no
 * DS equivalent).
 */
export function ReportBreakdownSheet({ report, onOpenChange, onReported }: ReportBreakdownSheetProps) {
  const [type, setType] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [dispatch, setDispatch] = useState(false)

  // Reset the form whenever a new report opens the sheet.
  useEffect(() => {
    if (!report) return
    setType('')
    setLocation('')
    setNotes('')
    setDispatch(false)
  }, [report])

  const canSubmit = type !== ''

  const submit = () => {
    if (!report || !canSubmit) return
    onReported(report, { dispatchReplacement: dispatch })
  }

  return (
    <Sheet open={report != null} onOpenChange={onOpenChange}>
      <SheetContent side="right" hideClose width="min(602px, 96vw)" className="p-0 flex flex-col h-full bg-white shadow-none">
        {/* Close — 58px white circle floating 40px into the scrim, vertically centred */}
        <SheetClose className="absolute -left-[98px] top-1/2 z-10 flex size-[58px] -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.12)] outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          <X className="size-6 text-[color:var(--gray-800,#1d2939)]" />
          <span className="sr-only">Close</span>
        </SheetClose>

        {report ? (
          <div className="relative flex h-full flex-col bg-white">
            {/* Scrollable content (p-24, 16px gaps) — bottom padding clears the floating footer */}
            <CustomScrollbar className="min-h-0 flex-1" viewportClassName="flex flex-col gap-4 px-6 pt-6 pb-[140px]">
              {/* Title */}
              <div>
                <SheetTitle className="text-2xl font-semibold leading-8 text-[color:var(--gray-800,#1d2939)]">
                  Report Vehicle Breakdown
                </SheetTitle>
                <SheetDescription className="sr-only">
                  File a vehicle breakdown report and optionally dispatch a standby replacement.
                </SheetDescription>
              </div>

              {/* Vehicle context — the selected route's card */}
              <RouteCard route={report.route} />

              {/* Breakdown type */}
              <SelectField label="Breakdown Type" value={type} onChange={setType}>
                {BREAKDOWN_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </SelectField>

              {/* Breakdown location (optional) */}
              <div className="flex h-[54px] w-full items-center rounded-[6px] border border-[color:var(--gray-300,#d0d5dd)] bg-white px-3 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Breakdown Location (optional)"
                  className="w-full bg-transparent text-sm font-semibold text-[color:var(--gray-800,#1d2939)] outline-none placeholder:font-semibold placeholder:text-[color:var(--muted-foreground,#667085)]"
                />
              </div>

              {/* Description (optional) */}
              <div className="flex min-h-[160px] w-full flex-col rounded-[6px] border border-[color:var(--gray-300,#d0d5dd)] bg-white px-3 py-2 transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
                <span className="text-xs font-semibold leading-[18px] text-[color:var(--muted-foreground,#667085)]">
                  Description (optional)
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add more details about the breakdown here..."
                  className="mt-0.5 flex-1 resize-none bg-transparent text-sm font-semibold text-[color:var(--gray-800,#1d2939)] outline-none placeholder:font-semibold placeholder:text-[color:var(--gray-400,#98a2b3)]"
                />
              </div>

              {/* Dispatch a replacement immediately */}
              <label className="flex w-full cursor-pointer items-center gap-4 rounded-[6px] border border-[color:var(--accent-success-light,#d1fadf)] bg-[color:var(--accent-success-lightest,#ecfdf3)] p-[14px]">
                <Checkbox
                  checked={dispatch}
                  onCheckedChange={(c) => setDispatch(!!c)}
                  className="size-5 shrink-0 rounded-[3px]"
                />
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-[color:var(--gray-800,#1d2939)]">
                    Dispatch a replacement immediately
                  </span>
                  <span className="inline-flex h-[22px] items-center gap-1 rounded-[32px] border border-[color:var(--status-warning,#f79009)] px-2 py-1">
                    <Sparkles className="size-3.5 text-[color:var(--status-warning,#f79009)]" />
                    <span className="bg-gradient-to-r from-[color:var(--status-warning,#f79009)] to-[color:var(--chart-accent-yellow,#f5bb2a)] bg-clip-text text-xs font-semibold text-transparent">
                      Recommended
                    </span>
                  </span>
                </span>
              </label>
            </CustomScrollbar>

            {/* Floating footer — gradient fade, Cancel + Report */}
            <div
              className="absolute inset-x-0 bottom-0 flex items-center justify-between px-6 pb-6 pt-12"
              style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 34.59%)' }}
            >
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex items-center justify-center rounded-[4px] border border-[color:var(--gray-700,#344054)] bg-white px-7 py-4 text-lg font-semibold leading-[26px] text-[color:var(--gray-800,#1d2939)] outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canSubmit}
                onClick={submit}
                className={`flex min-h-[58px] min-w-[160px] items-center justify-center gap-2 rounded-[4px] px-7 py-4 text-lg font-semibold leading-[26px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                  canSubmit
                    ? 'cursor-pointer bg-primary text-white hover:brightness-95'
                    : 'cursor-not-allowed bg-[color:var(--gray-300,#d0d5dd)] text-white'
                }`}
              >
                {dispatch ? (
                  <>
                    <Sparkles className="size-4" />
                    Report &amp; Find Replacement
                  </>
                ) : (
                  'Report'
                )}
              </button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Button, DetailSheet, FormSheet, toast } from '@fams/ui-kit'
import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
import {
  CockpitCandidateList,
  CockpitFindingOverlay,
  CockpitIssueList,
  CockpitReplaceSummary,
  CockpitReportForm,
} from './CockpitFlowParts'

/**
 * CockpitFlows — the cockpit's four metadata-driven flow sheets (SPEC §2
 * #27–31; UX-NOTES J.47–53): the file-a-report form, the attention-items
 * sheet, the candidate-assignment sheet, and the
 * resource-replacement confirm — plus the between-sheets "finding…" overlay
 * and the success toasts. Every label/status/column comes from the module's
 * own `uiConfig.cockpit.flows` block; the component only knows generic flow
 * shapes (report / issues / assign / replace). Status changes go through the
 * caller's guarded move path (`onMoveStatus`), never a direct write.
 *
 * The issues sheet deliberately carries NO embedded mini map: `MapPanel`'s
 * mount guard (perf rule 3 — one live MapLibre GL context per page) rejects a
 * second map while the cockpit's own map is mounted, so it only ever rendered
 * a fallback card plus a console error. Each issue's location stays reachable
 * by selecting it on the cockpit map behind the sheet.
 *
 * All sheets share the cockpit width MUST — `min(600px, 100vw - 80px)` —
 * and only one is open at a time (the `open` prop is a single enum).
 */
export type CockpitFlowKind = 'report' | 'issues' | 'assign' | 'replace'

const SHEET_WIDTH = 'sm:max-w-[min(37.5rem,calc(100vw-5rem))]'

export interface CockpitFlowsProps {
  config: EntityConfig
  records: EntityRecord[]
  open: CockpitFlowKind | null
  onOpenChange: (flow: CockpitFlowKind | null) => void
  /** The record the report/replace flows act on. */
  targetId: string | null
  onTargetChange: (id: string | null) => void
  /** Guarded status move (the module's transition path). */
  onMoveStatus?: (record: EntityRecord, toStatus: string) => void
  /**
   * Optional real work to run between the report sheet and the replacement
   * sheet (searching for standby resources). The "finding…" overlay is shown
   * for exactly as long as this promise is pending and no longer — when it is
   * not supplied the hand-off is SYNCHRONOUS. A design-system component must
   * never ship its own simulated latency; a demo that wants a delay supplies
   * one here.
   */
  onFindReplacements?: (record: EntityRecord | undefined) => Promise<void>
}

export function CockpitFlows({
  config,
  records,
  open,
  onOpenChange,
  targetId,
  onTargetChange,
  onMoveStatus,
  onFindReplacements,
}: CockpitFlowsProps) {
  const flows = config.uiConfig.cockpit?.flows
  const target = useMemo(
    () => (targetId ? records.find((r) => r.id === targetId) : undefined),
    [records, targetId],
  )

  /* Report form state — reset whenever the sheet (re)opens. */
  const [reportType, setReportType] = useState('')
  const [reportNote, setReportNote] = useState('')
  const [dispatchReplacement, setDispatchReplacement] = useState(false)
  useEffect(() => {
    if (open === 'report') {
      setReportType('')
      setReportNote('')
      setDispatchReplacement(false)
    }
  }, [open])

  /* Between-sheets "finding…" overlay — driven entirely by the caller's
     `onFindReplacements` promise (J.53). With no callback there is nothing to
     wait for and the overlay never appears. */
  const [finding, setFinding] = useState(false)

  /* Sheet-to-sheet transition announcements (UX J.53). A sheet swap is silent
     for a screen-reader user; a persistent polite live region narrates the
     transition without slowing the sighted path down. */
  const [announcement, setAnnouncement] = useState('')
  useEffect(() => {
    if (finding) setAnnouncement('Finding replacements…')
  }, [finding])

  /* Assign sheet's selected candidate. */
  const [candidateId, setCandidateId] = useState<string | null>(null)
  useEffect(() => {
    if (open === 'assign') setCandidateId(null)
  }, [open])

  if (!flows) return null
  const { report, issues, assign, replace } = flows

  const issueRecords = issues ? records.filter((r) => String(r.status ?? '') === issues.status) : []
  const candidates = issues
    ? records.filter((r) => String(r.status ?? '') !== issues.status && r.id !== targetId)
    : records.filter((r) => r.id !== targetId)

  const submitReport = () => {
    if (!report) return
    if (report.targetStatus && target && onMoveStatus) onMoveStatus(target, report.targetStatus)
    toast.success(report.successTitle ?? 'Report filed', {
      description: report.successDescription,
    })
    onOpenChange(null)
    if (!dispatchReplacement || !replace) return
    if (!onFindReplacements) {
      onOpenChange('replace')
      return
    }
    setFinding(true)
    void onFindReplacements(target).finally(() => {
      setFinding(false)
      onOpenChange('replace')
    })
  }

  const confirmReplace = () => {
    if (!replace) return
    if (replace.resolveStatus && target && onMoveStatus) onMoveStatus(target, replace.resolveStatus)
    toast.success(replace.successTitle ?? 'Replacement confirmed', {
      description: replace.successDescription,
    })
    onOpenChange(null)
  }

  const confirmAssign = () => {
    toast.success(assign?.successTitle ?? 'Assigned', { description: assign?.successDescription })
    onOpenChange(null)
  }

  return (
    <>
      {/* Report — form sheet; only the type select is required (J.52). */}
      {report ? (
        <FormSheet
          open={open === 'report'}
          onOpenChange={(next) => onOpenChange(next ? 'report' : null)}
          title={report.title ?? report.label}
          saveLabel={report.label}
          saveDisabled={!reportType}
          onSave={submitReport}
          className={SHEET_WIDTH}
        >
          <CockpitReportForm
            report={report}
            replaceAvailable={Boolean(replace)}
            type={reportType}
            onTypeChange={setReportType}
            note={reportNote}
            onNoteChange={setReportNote}
            dispatchReplacement={dispatchReplacement}
            onDispatchReplacementChange={setDispatchReplacement}
          />
        </FormSheet>
      ) : null}

      {/* Issues — attention items (no second map: MapPanel mount guard). */}
      {issues ? (
        <DetailSheet
          open={open === 'issues'}
          onOpenChange={(next) => onOpenChange(next ? 'issues' : null)}
          title={issues.title ?? 'Attention required'}
          subtitle={`${issueRecords.length} item${issueRecords.length === 1 ? '' : 's'}`}
          className={SHEET_WIDTH}
        >
          <CockpitIssueList
            config={config}
            issues={issues}
            records={issueRecords}
            onSuggest={(recordId) => {
              onTargetChange(recordId)
              onOpenChange('assign')
            }}
          />
        </DetailSheet>
      ) : null}

      {/* Assign — candidate selection. */}
      <DetailSheet
        open={open === 'assign'}
        onOpenChange={(next) => onOpenChange(next ? 'assign' : null)}
        title={assign?.title ?? 'Suggestions'}
        subtitle={target ? String(target.title ?? target.id) : undefined}
        className={SHEET_WIDTH}
        footer={
          <>
            {replace ? (
              <Button
                variant="tertiary"
                onClick={() => {
                  setAnnouncement(`Finding replacements… ${replace.title ?? replace.label} opened.`)
                  onOpenChange('replace')
                }}
              >
                {assign?.replaceLabel ?? replace.label}
              </Button>
            ) : null}
            <Button variant="primary" disabled={!candidateId} onClick={confirmAssign}>
              {assign?.assignLabel ?? 'Assign'}
            </Button>
          </>
        }
      >
        <CockpitCandidateList
          config={config}
          records={candidates}
          label={assign?.title ?? 'Suggestions'}
          selectedId={candidateId}
          onSelect={setCandidateId}
        />
      </DetailSheet>

      {/* Replace — current (struck) vs standby, confirm to resolve. */}
      {replace ? (
        <DetailSheet
          open={open === 'replace'}
          onOpenChange={(next) => onOpenChange(next ? 'replace' : null)}
          title={replace.title ?? replace.label}
          subtitle={target ? String(target.title ?? target.id) : undefined}
          className={SHEET_WIDTH}
          footer={
            <Button variant="primary" onClick={confirmReplace}>
              {replace.confirmLabel ?? 'Confirm'}
            </Button>
          }
        >
          <CockpitReplaceSummary replace={replace} target={target} />
        </DetailSheet>
      ) : null}

      {/* Transition announcements — always mounted so the region exists BEFORE
          its text changes (a live region inserted together with its message is
          not reliably announced). */}
      <p data-slot="cockpit-flow-announcer" role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* Finding overlay — shown for exactly as long as the caller's
          `onFindReplacements` promise is pending (never a simulated delay). */}
      {finding ? (
        <CockpitFindingOverlay
          label={assign?.title ? `Finding ${assign.title.toLowerCase()}…` : 'Finding suggestions…'}
        />
      ) : null}
    </>
  )
}

CockpitFlows.displayName = 'CockpitFlows'

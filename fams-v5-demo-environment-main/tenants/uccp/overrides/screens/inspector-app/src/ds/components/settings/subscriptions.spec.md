# Subscriptions — contract

Settings › Subscriptions (FAMS Web Portal 18133-5227 / Tadweer 176-3062, 176-3222). One module,
two tabs.

## Shape
`Subscriptions({ title?, subtitle?, reportSubscriptions, orgSubscriptions, defaultTab?, editableReports?, onToggleReport?, onReportAction?, onSetLevel?, onBulkSetLevel?, className })`

### My Subscriptions (FAMS Web Portal 211-10138 / row-menu 211-10484)
`ReportSubscription = { id, name, type, frequency, nextRun?, lastRun?, subOrg?, enabled }`.
Table: Name · Type · Frequency · Next Run · Last Run · Sub Organization · Actions (enable `Switch`
+ kebab → Remove). `onToggleReport(id, enabled)`, `onReportAction(sub, 'remove')`.
- **`type` is free-form DATA** — a subscription can originate from any module the user configured at
  create time: `Report` (scheduled → emailed), `Pipeline` (stage notifications), `Maintenance`
  (reminders), `Event`, etc. The renderer never branches on it; it's a label column.
- **`editableReports`** (opt-in, default `false`): adds an **"Edit / Go to source"** item above
  Remove in the row menu → `onReportAction(sub, 'edit')` (navigate to the module form that owns the
  subscription). Default off keeps the menu Remove-only, matching frame 211-10484.

### Organization Subscriptions
`OrgSubscription = { id, role, trigger, severity: 'critical'|'other'|'minor'|'medium'|'low', notification, level: 'off'|'on'|'mandatory' }`.
Table: checkbox · Role · Trigger Event · Severity (coloured flag) · Notification · Actions
(Off / On / **Mandatory** segmented control — Mandatory = users cannot opt out, surfaced via title).
Role (multi) + Severity filters + Clear Filters. Bulk-select → a floating bar sets Off/On/Mandatory
for all selected. `onSetLevel(id, level)`, `onBulkSetLevel(ids, level)`.

## Laws
- Token-only (severity tones are `--status-*` / `--primary` / `--muted-foreground`). Config-driven.
  a11y: tab buttons `aria-current`; severity conveyed by label text (not colour alone); segmented
  control is a labelled `role="group"` of `aria-pressed` buttons; row checkboxes labelled.

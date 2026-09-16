// Single source for the component navigation + routing.
// Components are grouped by FUNCTION (Actions, Forms, Data Display, …) into
// FAMILIES — a family bundles closely-related components behind a tab strip
// (e.g. "Text Inputs" = Input + Textarea + Label). A family with a single
// member renders with no tab strip (a "standalone" item).
// nav.ts builds its nav groups from COMPONENT_GROUPS; App.tsx routes via
// COMPONENT_GROUPS + FamilyPage. Route shape: `group/family` (defaults to the
// family's first member) or `group/family/member`.
import type { ComponentType } from 'react'

// Rich curated pages (kept as the component's page)
import { ButtonPage } from './pages/ButtonPage'
import { ComboboxPage } from './pages/ComboboxPage'

// Actions
import DropdownMenuDemo from './demos/DropdownMenuDemo'
import UserMenuDemo from './demos/UserMenuDemo'
import UserPopoverDemo from './demos/UserPopoverDemo'

// Forms & Input
import InputDemo from './demos/InputDemo'
import FieldErrorDemo from './demos/FieldErrorDemo'
import PhoneInputDemo from './demos/PhoneInputDemo'
import TextareaDemo from './demos/TextareaDemo'
import LabelDemo from './demos/LabelDemo'
import CheckboxDemo from './demos/CheckboxDemo'
import RadioGroupDemo from './demos/RadioGroupDemo'
import SwitchDemo from './demos/SwitchDemo'
import SelectDemo from './demos/SelectDemo'
import IconSelectDemo from './demos/IconSelectDemo'
import CalendarDemo from './demos/CalendarDemo'
import DateRangePickerDemo from './demos/DateRangePickerDemo'
import PeoplePickerDemo from './demos/PeoplePickerDemo'
import TagPickerDemo from './demos/TagPickerDemo'
import TagChipListDemo from './demos/TagChipListDemo'
import FilterOptionGroupsDemo from './demos/FilterOptionGroupsDemo'
import SliderDemo from './demos/SliderDemo'
import ColorPickerDemo from './demos/ColorPickerDemo'
import ColorSelectorDemo from './demos/ColorSelectorDemo'
import StackDemo from './demos/StackDemo'
import FormGridDemo from './demos/FormGridDemo'
import FormSectionDemo from './demos/FormSectionDemo'
import ToolbarDemo from './demos/ToolbarDemo'
import InsetFieldDemo from './demos/InsetFieldDemo'
import ToggleFieldGroupDemo from './demos/ToggleFieldGroupDemo'

// Data Display
import DataTableDemo from './demos/DataTableDemo'
import TableCellDemo from './demos/TableCellDemo'
import ColumnCustomizerDemo from './demos/ColumnCustomizerDemo'
import FilterPanelDemo from './demos/FilterPanelDemo'
import FilterPopupDemo from './demos/FilterPopupDemo'
import FiltersSheetDemo from './demos/FiltersSheetDemo'
import ListRowDemo from './demos/ListRowDemo'
import CriticalEventsListDemo from './demos/CriticalEventsListDemo'
import ActivityFeedDemo from './demos/ActivityFeedDemo'
import TimelineDemo from './demos/TimelineDemo'
import ChecklistSectionDemo from './demos/ChecklistSectionDemo'
import KanbanDemo from './demos/KanbanDemo'
import KpiTileDemo from './demos/KpiTileDemo'
import KpiMetricCardDemo from './demos/KpiMetricCardDemo'
import RouteJobCardDemo from './demos/RouteJobCardDemo'
import StatusBreakdownCardDemo from './demos/StatusBreakdownCardDemo'
import BreakdownStripDemo from './demos/BreakdownStripDemo'
import HealthStripDemo from './demos/HealthStripDemo'
import ConnectionStatusCardDemo from './demos/ConnectionStatusCardDemo'
import LiveDurationCardDemo from './demos/LiveDurationCardDemo'
import SegmentedBarDemo from './demos/SegmentedBarDemo'
import StatBarDemo from './demos/StatBarDemo'
import LeaderboardDemo from './demos/LeaderboardDemo'
import ChartCardDemo from './demos/ChartCardDemo'
import ChartLegendDemo from './demos/ChartLegendDemo'
import ChartTooltipDemo from './demos/ChartTooltipDemo'
import ChartContainerDemo from './demos/ChartContainerDemo'
import BarChartDemo from './demos/BarChartDemo'
import AreaChartDemo from './demos/AreaChartDemo'
import DonutChartDemo from './demos/DonutChartDemo'
import GaugeDemo from './demos/GaugeDemo'
import LineChartDemo from './demos/LineChartDemo'
import HeatmapChartDemo from './demos/HeatmapChartDemo'
import SparklineDemo from './demos/SparklineDemo'
import CompareBarsDemo from './demos/CompareBarsDemo'
import ComplianceGaugeDemo from './demos/ComplianceGaugeDemo'
import BadgeDemo from './demos/BadgeDemo'
import IconBadgeDemo from './demos/IconBadgeDemo'
import StatusPillDemo from './demos/StatusPillDemo'
import StatusDotDemo from './demos/StatusDotDemo'
import PriorityChipDemo from './demos/PriorityChipDemo'
import IdChipDemo from './demos/IdChipDemo'
import CountChipDemo from './demos/CountChipDemo'
import CustomScrollbarDemo from './demos/CustomScrollbarDemo'
import NavRailDemo from './demos/NavRailDemo'
import AppSwitcherPanelDemo from './demos/AppSwitcherPanelDemo'
import HomeLaunchPadDemo from './demos/HomeLaunchPadDemo'
import StagedSaveBarDemo from './demos/StagedSaveBarDemo'
import StepUpVerifyDialogDemo from './demos/StepUpVerifyDialogDemo'
import TimeRemainingChipDemo from './demos/TimeRemainingChipDemo'
import TrendIndicatorDemo from './demos/TrendIndicatorDemo'
import ProgressDemo from './demos/ProgressDemo'
import RadialProgressDemo from './demos/RadialProgressDemo'
import AvatarDemo from './demos/AvatarDemo'
import FileUploaderDemo from './demos/FileUploaderDemo'
import ImageGalleryDemo from './demos/ImageGalleryDemo'

// Overlays
import DialogDemo from './demos/DialogDemo'
import AlertDialogDemo from './demos/AlertDialogDemo'
import DestructiveActionModalDemo from './demos/DestructiveActionModalDemo'
import SheetDemo from './demos/SheetDemo'
import DetailSheetDemo from './demos/DetailSheetDemo'
import EntityPickerDrawerDemo from './demos/EntityPickerDrawerDemo'
import DrawerDemo from './demos/DrawerDemo'
import PopoverDemo from './demos/PopoverDemo'
import TooltipDemo from './demos/TooltipDemo'
import CommandDemo from './demos/CommandDemo'
import ToastDemo from './demos/ToastDemo'
import AlertDemo from './demos/AlertDemo'
import InfoBannerDemo from './demos/InfoBannerDemo'
import NotificationCardDemo from './demos/NotificationCardDemo'

// Feedback
import StatusViewDemo from './demos/StatusViewDemo'
import NoPermissionDemo from './demos/NoPermissionDemo'
import SkeletonDemo from './demos/SkeletonDemo'

// Navigation
import TabsDemo from './demos/TabsDemo'
import CountTabsDemo from './demos/CountTabsDemo'
import ViewTabsDemo from './demos/ViewTabsDemo'
import ModuleViewTabsDemo from './demos/ModuleViewTabsDemo'
import BreadcrumbsDemo from './demos/BreadcrumbsDemo'

// Flows
import StepperDemo from './demos/StepperDemo'
import StateTransitionToolbarDemo from './demos/StateTransitionToolbarDemo'
import StatusTransitionDropdownDemo from './demos/StatusTransitionDropdownDemo'

// Profiles & Records
import ProfileLayoutDemo from './demos/ProfileLayoutDemo'
import RecordLayoutDemo from './demos/RecordLayoutDemo'
import EntityProfileCardDemo from './demos/EntityProfileCardDemo'

// Shells & Structure
import AppShellDemo from './demos/AppShellDemo'
import TopNavDemo from './demos/TopNavDemo'
import SideNavDemo from './demos/SideNavDemo'
import ModuleRailDemo from './demos/ModuleRailDemo'
import PageHeaderDemo from './demos/PageHeaderDemo'
import ListViewDemo from './demos/ListViewDemo'
import HybridViewDemo from './demos/HybridViewDemo'
import DashboardLayoutDemo from './demos/DashboardLayoutDemo'
import CardDemo from './demos/CardDemo'
import AccordionDemo from './demos/AccordionDemo'
import TextDemo from './demos/TextDemo'
import HeadingDemo from './demos/HeadingDemo'
import ScrollAreaDemo from './demos/ScrollAreaDemo'
import SeparatorDemo from './demos/SeparatorDemo'
import MapContainerDemo from './demos/MapContainerDemo'
import MapControlsDemo from './demos/MapControlsDemo'
import VehicleMarkerDemo from './demos/VehicleMarkerDemo'
import VehicleIcon3DDemo from './demos/VehicleIcon3DDemo'
import VehiclePopupCardDemo from './demos/VehiclePopupCardDemo'
import ClusterBadgeDemo from './demos/ClusterBadgeDemo'
import MapStatusMarkerDemo from './demos/MapStatusMarkerDemo'
import AssetStatusIconDemo from './demos/AssetStatusIconDemo'
import MapChipDemo from './demos/MapChipDemo'
import PoiMarkerDemo from './demos/PoiMarkerDemo'
import WallDisplayDemo from './demos/WallDisplayDemo'
import InlineEditFieldDemo from './demos/InlineEditFieldDemo'
import LiveMapViewDemo from './demos/LiveMapViewDemo'
import WeatherLayerDemo from './demos/WeatherLayerDemo'
import LiveHybridViewDemo from './demos/LiveHybridViewDemo'
import CockpitViewDemo from './demos/CockpitViewDemo'
import OperationsConsolesDemo from './demos/OperationsConsolesDemo'
import WorkforcePulseDemo from './demos/WorkforcePulseDemo'
import LiveFiltersPopoverDemo from './demos/LiveFiltersPopoverDemo'
import CustomizeViewDrawerDemo from './demos/CustomizeViewDrawerDemo'
import MapToolDrawersDemo from './demos/MapToolDrawersDemo'
import FileTypeIconDemo from './demos/FileTypeIconDemo'
import LogoDemo from './demos/LogoDemo'

// v5 Patterns (tier-2 — @fams/v5-templates)
import ModuleViewShellDemo from './demos/ModuleViewShellDemo'
import EntityProfileShellDemo from './demos/EntityProfileShellDemo'
import LoginPageDemo from './demos/LoginPageDemo'
import ViewTypePickerDemo from './demos/ViewTypePickerDemo'
import EntityProfileDemo from './demos/EntityProfileDemo'
import OverviewWidgetsDemo from './demos/OverviewWidgetsDemo'
import RecordSectionsGridDemo from './demos/RecordSectionsGridDemo'
import InteractiveReplayDemo from './demos/InteractiveReplayDemo'
import ScopedLinkedRecordsDemo from './demos/ScopedLinkedRecordsDemo'
import LinkedRecordDetailSectionDemo from './demos/LinkedRecordDetailSectionDemo'
import CreationSheetDemo from './demos/CreationSheetDemo'
import ModuleViewDemo from './demos/ModuleViewDemo'
import V5ListViewDemo from './demos/V5ListViewDemo'
import V5KanbanViewDemo from './demos/V5KanbanViewDemo'
import V5HybridViewDemo from './demos/V5HybridViewDemo'
import CalendarViewDemo from './demos/CalendarViewDemo'
import MapHybridViewDemo from './demos/MapHybridViewDemo'
import TaskDetailDemo from './demos/TaskDetailDemo'
import AppBootSkeletonDemo from './demos/AppBootSkeletonDemo'

// Composer (v5 — @fams/v5-composer + @fams/v5-templates)
import GateDemo from './demos/gate-demo/GateDemo'
import DemoConsoleDemo from './demos/DemoConsoleDemo'
import MapPanelDemo from './demos/MapPanelDemo'
import DashboardViewDemo from './demos/DashboardViewDemo'
import InboxViewDemo from './demos/InboxViewDemo'

export type FamilyMember = { id: string; label: string; Demo: ComponentType }
export type Family = { id: string; label: string; intro: string; members: FamilyMember[] }
export type Group = { id: string; label: string; families: Family[] }

export const COMPONENT_GROUPS: Group[] = [
  {
    id: 'actions',
    label: 'Actions',
    families: [
      {
        id: 'buttons-menus',
        label: 'Buttons & Menus',
        intro: 'Everything a user clicks to trigger an action or open a menu of them — primary buttons through user account menus.',
        members: [
          { id: 'button', label: 'Button', Demo: ButtonPage },
          { id: 'dropdown-menu', label: 'DropdownMenu', Demo: DropdownMenuDemo },
          { id: 'user-menu', label: 'UserMenu', Demo: UserMenuDemo },
          { id: 'user-popover', label: 'UserPopover', Demo: UserPopoverDemo },
        ],
      },
    ],
  },
  {
    id: 'forms',
    label: 'Forms & Input',
    families: [
      {
        id: 'text-inputs',
        label: 'Text Inputs',
        intro: 'The base text-entry primitives — free text, multi-line, phone entry, their labels, and the shared field error row.',
        members: [
          { id: 'input', label: 'Input', Demo: InputDemo },
          { id: 'field-error', label: 'FieldError', Demo: FieldErrorDemo },
          { id: 'phone-input', label: 'PhoneInput', Demo: PhoneInputDemo },
          { id: 'textarea', label: 'Textarea', Demo: TextareaDemo },
          { id: 'label', label: 'Label', Demo: LabelDemo },
        ],
      },
      {
        id: 'choice',
        label: 'Choice Controls',
        intro: 'Binary and multi-option choice controls — checkboxes, radios, and toggles.',
        members: [
          { id: 'checkbox', label: 'Checkbox', Demo: CheckboxDemo },
          { id: 'radio-group', label: 'RadioGroup', Demo: RadioGroupDemo },
          { id: 'switch', label: 'Switch', Demo: SwitchDemo },
        ],
      },
      {
        id: 'select',
        label: 'Select & Combobox',
        intro: 'Single-value pickers from a closed or searchable list.',
        members: [
          { id: 'select', label: 'Select', Demo: SelectDemo },
          { id: 'combobox', label: 'Combobox', Demo: ComboboxPage },
          { id: 'icon-select', label: 'IconSelect', Demo: IconSelectDemo },
        ],
      },
      {
        id: 'date-time',
        label: 'Date & Time',
        intro: 'Date and date-range entry, from a single calendar to range pickers.',
        members: [
          { id: 'calendar', label: 'Calendar', Demo: CalendarDemo },
          { id: 'date-range-picker', label: 'DateRangePicker', Demo: DateRangePickerDemo },
        ],
      },
      {
        id: 'pickers',
        label: 'Pickers',
        intro: 'Multi-select entity and tag pickers, plus the chip list that renders their selections.',
        members: [
          { id: 'people-picker', label: 'PeoplePicker', Demo: PeoplePickerDemo },
          { id: 'tag-picker', label: 'TagPicker', Demo: TagPickerDemo },
          { id: 'tag-chip-list', label: 'TagChipList', Demo: TagChipListDemo },
          { id: 'filter-option-groups', label: 'FilterOptionGroups', Demo: FilterOptionGroupsDemo },
        ],
      },
      {
        id: 'value-pickers',
        label: 'Value Pickers',
        intro: 'Continuous-value input primitives — a draggable slider, a popover-based color picker, and the inline color-selector field with preset swatches and a custom picker.',
        members: [
          { id: 'slider', label: 'Slider', Demo: SliderDemo },
          { id: 'color-picker', label: 'ColorPicker', Demo: ColorPickerDemo },
          { id: 'color-selector', label: 'ColorSelector', Demo: ColorSelectorDemo },
        ],
      },
      {
        id: 'form-layout',
        label: 'Form Layout',
        intro: 'Structural building blocks for assembling forms — vertical stacks, grids, sections, toolbars, and the inset-label field shell.',
        members: [
          { id: 'stack', label: 'Stack', Demo: StackDemo },
          { id: 'form-grid', label: 'FormGrid', Demo: FormGridDemo },
          { id: 'form-section', label: 'FormSection', Demo: FormSectionDemo },
          { id: 'toolbar', label: 'Toolbar', Demo: ToolbarDemo },
          { id: 'inset-field', label: 'InsetField', Demo: InsetFieldDemo },
          { id: 'toggle-field-group', label: 'ToggleFieldGroup', Demo: ToggleFieldGroupDemo },
        ],
      },
    ],
  },
  {
    id: 'data',
    label: 'Data Display',
    families: [
      {
        id: 'table',
        label: 'Data Table & Filtering',
        intro: 'The table stack used across every list module — table, cells, column config, and the two filter affordances that feed it.',
        members: [
          { id: 'data-table', label: 'DataTable', Demo: DataTableDemo },
          { id: 'table-cell', label: 'TableCell', Demo: TableCellDemo },
          { id: 'column-customizer', label: 'ColumnCustomizer', Demo: ColumnCustomizerDemo },
          { id: 'filter-panel', label: 'FilterPanel', Demo: FilterPanelDemo },
          { id: 'filter-popup', label: 'FilterPopup', Demo: FilterPopupDemo },
          { id: 'filters-sheet', label: 'FiltersSheet', Demo: FiltersSheetDemo },
        ],
      },
      {
        id: 'lists',
        label: 'Lists & Feeds',
        intro: 'Row-based and feed-style list presentations — rows, activity feeds, timelines, critical events, and checklists.',
        members: [
          { id: 'list-row', label: 'ListRow', Demo: ListRowDemo },
          { id: 'route-job-card', label: 'RouteJobCard', Demo: RouteJobCardDemo },
          { id: 'critical-events-list', label: 'CriticalEventsList', Demo: CriticalEventsListDemo },
          { id: 'activity-feed', label: 'ActivityFeed', Demo: ActivityFeedDemo },
          { id: 'timeline', label: 'Timeline', Demo: TimelineDemo },
          { id: 'checklist-section', label: 'ChecklistSection', Demo: ChecklistSectionDemo },
        ],
      },
      {
        id: 'kanban',
        label: 'Kanban',
        intro: 'Drag-and-drop card board for status-driven workflows.',
        members: [{ id: 'kanban', label: 'Kanban', Demo: KanbanDemo }],
      },
      {
        id: 'media',
        label: 'Media',
        intro: 'File and image surfaces — a presentational upload dropzone with file tiles, and an image gallery with a fullscreen lightbox.',
        members: [
          { id: 'file-uploader', label: 'FileUploader', Demo: FileUploaderDemo },
          { id: 'image-gallery', label: 'ImageGallery', Demo: ImageGalleryDemo },
        ],
      },
      {
        id: 'kpis',
        label: 'KPIs & Metrics',
        intro: 'At-a-glance metric tiles, health rollups, and live status cards for dashboards.',
        members: [
          { id: 'kpi-tile', label: 'KpiTile', Demo: KpiTileDemo },
          { id: 'kpi-metric-card', label: 'KpiMetricCard', Demo: KpiMetricCardDemo },
          { id: 'status-breakdown-card', label: 'StatusBreakdownCard', Demo: StatusBreakdownCardDemo },
          { id: 'breakdown-strip', label: 'BreakdownStrip', Demo: BreakdownStripDemo },
          { id: 'health-strip', label: 'HealthStrip', Demo: HealthStripDemo },
          { id: 'connection-status-card', label: 'ConnectionStatusCard', Demo: ConnectionStatusCardDemo },
          { id: 'live-duration-card', label: 'LiveDurationCard', Demo: LiveDurationCardDemo },
          { id: 'segmented-bar', label: 'SegmentedBar', Demo: SegmentedBarDemo },
          { id: 'stat-bar', label: 'StatBar', Demo: StatBarDemo },
          { id: 'wall-panel', label: 'WallPanel', Demo: WallDisplayDemo },
          { id: 'inline-edit-field', label: 'InlineEditField', Demo: InlineEditFieldDemo },
          { id: 'leaderboard', label: 'Leaderboard', Demo: LeaderboardDemo },
        ],
      },
      {
        id: 'charts',
        label: 'Charts',
        intro: 'Chart chrome — cards, legends, and tooltips wrapping the underlying chart rendering.',
        members: [
          { id: 'chart-card', label: 'ChartCard', Demo: ChartCardDemo },
          { id: 'chart-legend', label: 'ChartLegend', Demo: ChartLegendDemo },
          { id: 'chart-tooltip', label: 'ChartTooltip', Demo: ChartTooltipDemo },
        ],
      },
      {
        id: 'chart-renderers',
        label: 'Chart Renderers',
        intro: 'The ECharts-backed rendering engine and dashboard chart types — bars, areas, donuts, gauges, lines, heatmaps, sparklines, and comparisons. Render through ChartContainer, the one place in the system that touches echarts directly.',
        members: [
          { id: 'chart-container', label: 'ChartContainer', Demo: ChartContainerDemo },
          { id: 'bar-chart', label: 'BarChart', Demo: BarChartDemo },
          { id: 'area-chart', label: 'AreaChart', Demo: AreaChartDemo },
          { id: 'donut-chart', label: 'DonutChart', Demo: DonutChartDemo },
          { id: 'gauge', label: 'Gauge', Demo: GaugeDemo },
          { id: 'line-chart', label: 'LineChart', Demo: LineChartDemo },
          { id: 'heatmap-chart', label: 'HeatmapChart', Demo: HeatmapChartDemo },
          { id: 'sparkline', label: 'Sparkline', Demo: SparklineDemo },
          { id: 'compare-bars', label: 'CompareBars', Demo: CompareBarsDemo },
          { id: 'compliance-gauge', label: 'ComplianceGauge', Demo: ComplianceGaugeDemo },
        ],
      },
      {
        id: 'indicators',
        label: 'Badges & Indicators',
        intro: 'Compact status and progress signifiers — badges, ticketing-stage/priority/id/count chips, trend arrows, and progress bars.',
        members: [
          { id: 'badge', label: 'Badge', Demo: BadgeDemo },
          { id: 'icon-badge', label: 'IconBadge', Demo: IconBadgeDemo },
          { id: 'status-pill', label: 'StatusPill', Demo: StatusPillDemo },
          { id: 'status-dot', label: 'StatusDot', Demo: StatusDotDemo },
          { id: 'priority-chip', label: 'PriorityChip', Demo: PriorityChipDemo },
          { id: 'id-chip', label: 'IdChip', Demo: IdChipDemo },
          { id: 'count-chip', label: 'CountChip', Demo: CountChipDemo },
          { id: 'time-remaining-chip', label: 'TimeRemainingChip', Demo: TimeRemainingChipDemo },
          { id: 'trend-indicator', label: 'TrendIndicator', Demo: TrendIndicatorDemo },
          { id: 'progress', label: 'Progress', Demo: ProgressDemo },
          { id: 'radial-progress', label: 'RadialProgress', Demo: RadialProgressDemo },
        ],
      },
      {
        id: 'avatar',
        label: 'Avatar',
        intro: 'Person and entity avatar rendering.',
        members: [{ id: 'avatar', label: 'Avatar', Demo: AvatarDemo }],
      },
    ],
  },
  {
    id: 'overlays',
    label: 'Overlays',
    families: [
      {
        id: 'dialogs',
        label: 'Dialogs',
        intro: 'Modal dialogs for confirmations, forms, and destructive actions.',
        members: [
          { id: 'dialog', label: 'Dialog', Demo: DialogDemo },
          { id: 'alert-dialog', label: 'AlertDialog', Demo: AlertDialogDemo },
          { id: 'destructive-action-modal', label: 'DestructiveActionModal', Demo: DestructiveActionModalDemo },
        ],
      },
      {
        id: 'sheets',
        label: 'Sheets & Panels',
        intro: "v5's dominant overlay: right-anchored panels (detail ~90%, config 760px) behind every list module's view/create/edit.",
        members: [
          { id: 'sheet', label: 'Sheet', Demo: SheetDemo },
          { id: 'detail-sheet', label: 'DetailSheet / FormSheet', Demo: DetailSheetDemo },
          { id: 'entity-picker-drawer', label: 'EntityPickerDrawer', Demo: EntityPickerDrawerDemo },
          { id: 'drawer', label: 'Drawer', Demo: DrawerDemo },
        ],
      },
      {
        id: 'popover-tooltip',
        label: 'Popover & Tooltip',
        intro: 'Lightweight anchored overlays for contextual content and hints.',
        members: [
          { id: 'popover', label: 'Popover', Demo: PopoverDemo },
          { id: 'tooltip', label: 'Tooltip', Demo: TooltipDemo },
        ],
      },
      {
        id: 'command-palette',
        label: 'Command Palette',
        intro: 'A cmdk-based searchable command list — inline or as a "⌘K" modal palette.',
        members: [{ id: 'command', label: 'Command', Demo: CommandDemo }],
      },
      {
        id: 'toasts',
        label: 'Toasts & Messages',
        intro: 'Transient and persistent messaging — toasts, inline alerts, and notification cards.',
        members: [
          { id: 'toast', label: 'Toast', Demo: ToastDemo },
          { id: 'alert', label: 'Alert', Demo: AlertDemo },
          { id: 'info-banner', label: 'InfoBanner', Demo: InfoBannerDemo },
          { id: 'notification-card', label: 'NotificationCard', Demo: NotificationCardDemo },
        ],
      },
    ],
  },
  {
    id: 'feedback',
    label: 'Feedback',
    families: [
      {
        id: 'status',
        label: 'Status & Empty States',
        intro: 'Full-page and inline states for empty, restricted, and loading content.',
        members: [
          { id: 'status-view', label: 'StatusView', Demo: StatusViewDemo },
          { id: 'no-permission', label: 'NoPermission', Demo: NoPermissionDemo },
          { id: 'skeleton', label: 'Skeleton', Demo: SkeletonDemo },
        ],
      },
    ],
  },
  {
    id: 'navigation',
    label: 'Navigation',
    families: [
      {
        id: 'tabs',
        label: 'Tabs',
        intro: 'Tab strips at every scale — content tabs, count-badged filter strips, view switchers, and module-level view tabs.',
        members: [
          { id: 'tabs', label: 'Tabs', Demo: TabsDemo },
          { id: 'count-tabs', label: 'CountTabs', Demo: CountTabsDemo },
          { id: 'view-tabs', label: 'ViewTabs', Demo: ViewTabsDemo },
          { id: 'module-view-tabs', label: 'ModuleViewTabs', Demo: ModuleViewTabsDemo },
        ],
      },
      {
        id: 'breadcrumbs',
        label: 'Breadcrumbs',
        intro: 'Hierarchical location trail for nested pages.',
        members: [{ id: 'breadcrumbs', label: 'Breadcrumbs', Demo: BreadcrumbsDemo }],
      },
    ],
  },
  {
    id: 'flows',
    label: 'Flows',
    families: [
      {
        id: 'stepper',
        label: 'Stepper & Wizards',
        intro: 'Multi-step wizard navigation.',
        members: [{ id: 'stepper', label: 'Stepper', Demo: StepperDemo }],
      },
      {
        id: 'transitions',
        label: 'Status Transitions',
        intro: 'Status-change affordances — toolbar actions and dropdown-driven transitions.',
        members: [
          { id: 'state-transition-toolbar', label: 'StateTransitionToolbar', Demo: StateTransitionToolbarDemo },
          { id: 'status-transition-dropdown', label: 'StatusTransitionDropdown', Demo: StatusTransitionDropdownDemo },
        ],
      },
    ],
  },
  {
    id: 'profiles',
    label: 'Profiles & Records',
    families: [
      {
        id: 'profile',
        label: 'Profile & Record Layouts',
        intro: "The platform's most-used pattern — 31 tabbed workspace profiles across EAD/FAMS/IWMP plus record layouts and linked-entity cards.",
        members: [
          { id: 'profile-layout', label: 'ProfileLayout', Demo: ProfileLayoutDemo },
          { id: 'record-layout', label: 'RecordLayout', Demo: RecordLayoutDemo },
          { id: 'entity-profile-card', label: 'EntityProfileCard', Demo: EntityProfileCardDemo },
        ],
      },
    ],
  },
  {
    id: 'shells',
    label: 'Shells & Structure',
    families: [
      {
        id: 'chrome',
        label: 'App Chrome',
        intro: 'The persistent app frame — shell, top nav, side nav, module rail, and page header.',
        members: [
          { id: 'app-shell', label: 'AppShell', Demo: AppShellDemo },
          { id: 'top-nav', label: 'TopNav', Demo: TopNavDemo },
          { id: 'side-nav', label: 'SideNav', Demo: SideNavDemo },
          { id: 'nav-rail', label: 'NavRail', Demo: NavRailDemo },
          { id: 'app-switcher-panel', label: 'AppSwitcherPanel', Demo: AppSwitcherPanelDemo },
          { id: 'module-rail', label: 'ModuleRail', Demo: ModuleRailDemo },
          { id: 'page-header', label: 'PageHeader', Demo: PageHeaderDemo },
        ],
      },
      {
        id: 'views',
        label: 'View Containers',
        intro: "Top-level view containers that host a module's content — list, hybrid, and dashboard layouts.",
        members: [
          { id: 'list-view', label: 'ListView', Demo: ListViewDemo },
          { id: 'hybrid-view', label: 'HybridView', Demo: HybridViewDemo },
          { id: 'dashboard-layout', label: 'DashboardLayout', Demo: DashboardLayoutDemo },
        ],
      },
      {
        id: 'surfaces',
        label: 'Surfaces & Disclosure',
        intro: 'Generic content surfaces and disclosure primitives — cards, accordions, scroll areas, separators.',
        members: [
          { id: 'card', label: 'Card', Demo: CardDemo },
          { id: 'accordion', label: 'Accordion', Demo: AccordionDemo },
          { id: 'scroll-area', label: 'ScrollArea', Demo: ScrollAreaDemo },
          { id: 'custom-scrollbar', label: 'CustomScrollbar', Demo: CustomScrollbarDemo },
          { id: 'separator', label: 'Separator', Demo: SeparatorDemo },
        ],
      },
      {
        id: 'typography',
        label: 'Typography',
        intro: 'Token-backed text primitives — Text for body copy outside a Card (retiring the CardDescription-outside-a-card and hand-rolled span anti-patterns), Heading for section titles with level decoupled from visual size.',
        members: [
          { id: 'text', label: 'Text', Demo: TextDemo },
          { id: 'heading', label: 'Heading', Demo: HeadingDemo },
        ],
      },
      {
        id: 'map',
        label: 'Fleet Map',
        intro: 'The fleet map stack — container, controls, vehicle markers, popups, and map chips.',
        members: [
          { id: 'map-container', label: 'MapContainer', Demo: MapContainerDemo },
          { id: 'map-controls', label: 'MapControls', Demo: MapControlsDemo },
          { id: 'vehicle-marker', label: 'VehicleMarker', Demo: VehicleMarkerDemo },
          { id: 'map-status-marker', label: 'MapStatusMarker', Demo: MapStatusMarkerDemo },
          { id: 'asset-status-icon', label: 'AssetStatusIcon', Demo: AssetStatusIconDemo },
          { id: 'vehicle-icon-3d', label: 'VehicleIcon3D', Demo: VehicleIcon3DDemo },
          { id: 'vehicle-popup-card', label: 'VehiclePopupCard', Demo: VehiclePopupCardDemo },
          { id: 'cluster-badge', label: 'ClusterBadge', Demo: ClusterBadgeDemo },
          { id: 'map-chip', label: 'MapChip', Demo: MapChipDemo },
          { id: 'poi-marker', label: 'PoiMarker', Demo: PoiMarkerDemo },
        ],
      },
      {
        id: 'brand',
        label: 'Icons & Branding',
        intro: 'File-type iconography and FAMS branding.',
        members: [
          { id: 'file-type-icon', label: 'FileTypeIcon', Demo: FileTypeIconDemo },
          { id: 'logo', label: 'Logo', Demo: LogoDemo },
        ],
      },
    ],
  },
  {
    id: 'v5-templates',
    label: 'v5 Patterns',
    families: [
      {
        id: 'shells',
        label: 'Product Shells',
        intro:
          'Tier-2 patterns from @fams/v5-templates — opt-in compositions of core components into v5-signature product surfaces. DRAFT exemplars for design-team review, not yet adopted by a second module. See docs/BOUNDARIES.md § The patterns tier.',
        members: [
          { id: 'entity-profile-shell', label: 'EntityProfileShell', Demo: EntityProfileShellDemo },
          { id: 'module-view-shell', label: 'ModuleViewShell', Demo: ModuleViewShellDemo },
          { id: 'login-page', label: 'LoginPage (DRAFT)', Demo: LoginPageDemo },
          { id: 'home-launch-pad', label: 'HomeLaunchPad', Demo: HomeLaunchPadDemo },
          { id: 'app-boot-skeleton', label: 'AppBootSkeleton', Demo: AppBootSkeletonDemo },
        ],
      },
      {
        id: 'staged-saves',
        label: 'Staged Saves & Step-Up',
        intro:
          'The two halves of a CRITICAL settings save: a setting that grants or revokes a physically consequential capability (remote immobilization, access revocation) edits a working copy behind StagedSaveBar, and saving raises StepUpVerifyDialog for an emailed code before anything is committed. Ported from the designer-approved dispatcher prototype (Telematics Features Config). Distinct from UnsavedChangesToast, which is the saved-VIEW-configuration toast inside a view region.',
        members: [
          { id: 'staged-save-bar', label: 'StagedSaveBar', Demo: StagedSaveBarDemo },
          { id: 'step-up-verify-dialog', label: 'StepUpVerifyDialog', Demo: StepUpVerifyDialogDemo },
        ],
      },
      {
        id: 'blueprint-templates',
        label: 'Blueprint Templates',
        intro:
          'Metadata-driven templates that render from a v5-composer blueprint (config + record) — the EntityProfile 30/70 surface and the CreationSheet create flow. Blueprint-driven by default, bespoke by escape hatch. See docs/BOUNDARIES.md § The patterns tier.',
        members: [
          { id: 'entity-profile', label: 'EntityProfile', Demo: EntityProfileDemo },
          { id: 'overview-widgets', label: 'OverviewWidgets', Demo: OverviewWidgetsDemo },
          { id: 'record-sections-grid', label: 'RecordSectionsGrid', Demo: RecordSectionsGridDemo },
          { id: 'interactive-replay', label: 'InteractiveReplay', Demo: InteractiveReplayDemo },
          { id: 'scoped-linked-records', label: 'ScopedLinkedRecords', Demo: ScopedLinkedRecordsDemo },
          { id: 'linked-record-detail-section', label: 'LinkedRecordDetailSection', Demo: LinkedRecordDetailSectionDemo },
          { id: 'creation-sheet', label: 'CreationSheet', Demo: CreationSheetDemo },
        ],
      },
      {
        id: 'view-templates',
        label: 'View Templates',
        intro:
          'The blueprint-driven module views (task 2.4) — ModuleView (the ClickUp-style container) plus its List / Kanban / Hybrid bodies, the pipeline TaskDetail, the dashboard module type’s DashboardView widget grid, the inbox module type’s InboxView date-grouped notification feed, and the metadata-driven ViewTypePicker "Select Preferred View" takeover behind the view-tab strip’s "+" (DRAFT — first-adopter exemplars, API not yet settled). All render from a v5-composer blueprint; Kanban runs on pragmatic-drag-and-drop (v5-tier), saved views persist via an injected adapter. See docs/BOUNDARIES.md § The patterns tier.',
        members: [
          { id: 'module-view', label: 'ModuleView', Demo: ModuleViewDemo },
          { id: 'dashboard-view', label: 'DashboardView (DRAFT)', Demo: DashboardViewDemo },
          { id: 'v5-list-view', label: 'ListView', Demo: V5ListViewDemo },
          { id: 'v5-kanban-view', label: 'KanbanView', Demo: V5KanbanViewDemo },
          { id: 'v5-hybrid-view', label: 'HybridView', Demo: V5HybridViewDemo },
          { id: 'calendar-view', label: 'CalendarView', Demo: CalendarViewDemo },
          { id: 'map-hybrid-view', label: 'MapHybridView (DRAFT)', Demo: MapHybridViewDemo },
          { id: 'task-detail', label: 'TaskDetail', Demo: TaskDetailDemo },
          { id: 'inbox-view', label: 'InboxView (DRAFT)', Demo: InboxViewDemo },
          { id: 'view-type-picker', label: 'ViewTypePicker (DRAFT)', Demo: ViewTypePickerDemo },
          { id: 'live-hybrid-view', label: 'LiveHybridView (DRAFT)', Demo: LiveHybridViewDemo },
          { id: 'cockpit-view', label: 'CockpitView (DRAFT)', Demo: CockpitViewDemo },
          { id: 'dispatcher-cockpit-view', label: 'Operations Consoles (DRAFT)', Demo: OperationsConsolesDemo },
          { id: 'workforce-pulse-view', label: 'WorkforcePulseView (DRAFT)', Demo: WorkforcePulseDemo },
          { id: 'live-filters-popover', label: 'LiveFiltersPopover (DRAFT)', Demo: LiveFiltersPopoverDemo },
          { id: 'customize-view-drawer', label: 'CustomizeViewDrawer (DRAFT)', Demo: CustomizeViewDrawerDemo },
          { id: 'zones-drawer', label: 'Zones / POI Drawers (DRAFT)', Demo: MapToolDrawersDemo },
        ],
      },
      {
        id: 'map-templates',
        label: 'Map Templates',
        intro:
          'The MapLibre GL + deck.gl + TerraDraw map template (phase 2 §3, the Leaflet→MapLibre port). Imported from a separate, heavier package entry (`@fams/v5-templates/map`, not the main barrel) so the map stack never reaches consumers that don’t render one — see `@fams/v5-templates`’s README "MapPanel — a second, heavy entry point" section.',
        members: [
          { id: 'map-panel', label: 'MapPanel', Demo: MapPanelDemo },
          { id: 'live-map-view', label: 'LiveMapView (DRAFT)', Demo: LiveMapViewDemo },
          { id: 'weather-station-drawer', label: 'WeatherStationDrawer (DRAFT)', Demo: WeatherLayerDemo },
        ],
      },
    ],
  },
  {
    id: 'composer',
    label: 'Composer',
    families: [
      {
        id: 'gate-demo',
        label: 'Gate demo',
        intro:
          'The v5 low-code composer end to end: one <ComposedModule/> call renders any blueprint through the default v5 template renderers (@fams/v5-templates). Switch between a CRM companies entity, a CRM deals pipeline, and a fleet-vehicles entity — the whole module surface changes with zero component-code difference. This is the phase-2 review gate.',
        members: [{ id: 'gate-demo', label: 'Gate demo', Demo: GateDemo }],
      },
    ],
  },
  {
    id: 'demo-kit',
    label: 'Demo Kit',
    families: [
      {
        id: 'demo-console',
        label: 'Demo Console',
        intro:
          'The demo environment’s hover-reveal control surface (@fams/demo-kit/console, decision #18). Core-tier and product-agnostic: tenant / persona / module-jump / seed-reset / share-link are wired by the app via callbacks. The full demo app (fams-v5-demo-environment) mounts it at the root over the routed content.',
        members: [{ id: 'demo-console', label: 'DemoConsole', Demo: DemoConsoleDemo }],
      },
    ],
  },
]

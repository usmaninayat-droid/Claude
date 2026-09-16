// ─────────────────────────────────────────────────────────────────────────
// L1 — Primitives (single-purpose interactive parts on Radix)
// ─────────────────────────────────────────────────────────────────────────
export { Button, buttonVariants, type ButtonProps } from './primitives/Button'
export { FieldError, FieldErrorSlot, type FieldErrorProps, type FieldErrorSlotProps } from './primitives/FieldError'
export { Input, type InputProps } from './primitives/Input'
export { InsetField, type InsetFieldProps } from './primitives/InsetField'
export { Label, type LabelProps } from './primitives/Label'
export { Checkbox, type CheckboxProps } from './primitives/Checkbox'
export { Switch, type SwitchProps } from './primitives/Switch'
export { Textarea, type TextareaProps } from './primitives/Textarea'
export { Text, textVariants, type TextProps, type TextElement, type TextAlign } from './primitives/Text'
export {
  Heading,
  headingVariants,
  type HeadingProps,
  type HeadingLevel,
  type HeadingSize,
} from './primitives/Heading'
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from './primitives/Select'
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  type TabsProps,
  type TabsListProps,
  type TabsTriggerProps,
  type TabsContentProps,
} from './primitives/Tabs'
export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './primitives/Dialog'
export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent } from './primitives/Popover'
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipSupport } from './primitives/Tooltip'
/* The ONE application point for an icon-only control's name + tooltip (UX K.67). */
export { IconControl, type IconControlProps } from './composites/IconControl'
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuShortcut,
  type DropdownMenuCheckboxItemProps,
  type DropdownMenuSubTriggerProps,
} from './primitives/DropdownMenu'
export { Toaster, ToasterHost, toast } from './primitives/Toast'
export { Calendar, type CalendarProps } from './primitives/Calendar'
// — ported from the reference DS (design-only), wave 1 —
export { Badge, badgeVariants, type BadgeProps, type BadgeVariant, type BadgeColorIndex } from './primitives/Badge'
export { Avatar, avatarVariants, initialsFrom, type AvatarProps, type AvatarTone } from './primitives/Avatar'
export {
  IconBadge,
  iconBadgeVariants,
  type IconBadgeProps,
  type IconBadgeTone,
  type IconBadgeShape,
} from './primitives/IconBadge'
export { Icon, getIcon, iconNames, type IconProps } from './primitives/Icon'
export {
  TrendIndicator,
  trendIndicatorVariants,
  type TrendIndicatorProps,
} from './primitives/TrendIndicator'
export { Separator } from './primitives/Separator'
export { Progress, progressVariants, type ProgressProps } from './primitives/Progress'
export { RadioGroup, RadioGroupItem } from './primitives/RadioGroup'
export {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  type AccordionProps,
  type AccordionItemProps,
  type AccordionTriggerProps,
  type AccordionContentProps,
} from './primitives/Accordion'
export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from './primitives/AlertDialog'
export {
  Sheet,
  SheetTrigger,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
  sheetVariants,
  type SheetContentProps,
} from './primitives/Sheet'
export {
  DockedPanel,
  DockedPanelHeader,
  dockedPanelVariants,
  type DockedPanelProps,
  type DockedPanelHeaderProps,
} from './primitives/DockedPanel'
export {
  Drawer,
  DrawerTrigger,
  DrawerPortal,
  DrawerClose,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
  drawerVariants,
  type DrawerContentProps,
} from './primitives/Drawer'
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
  type CommandDialogProps,
} from './primitives/Command'
export { ScrollArea, ScrollBar } from './primitives/ScrollArea'
export {
  RadialProgress,
  radialProgressVariants,
  type RadialProgressProps,
  type RadialProgressTone,
} from './primitives/RadialProgress'
export {
  FileTypeIcon,
  fileTypeIconVariants,
  type FileTypeIconProps,
  type FileTypeCategory,
} from './primitives/FileTypeIcon'
// — completion pass: missing input primitives —
export { Slider, type SliderProps, type SliderValue } from './primitives/Slider'
export { ColorPicker, type ColorPickerProps } from './primitives/ColorPicker'
export { ColorSelector, type ColorSelectorProps } from './composites/ColorSelector'

// ─────────────────────────────────────────────────────────────────────────
// L2 — Layout (the spacing/composition grammar — semantic gap presets only)
// ─────────────────────────────────────────────────────────────────────────
export { Stack, type StackProps, type LayoutGap } from './layout/Stack'
export { FormGrid, type FormGridProps } from './layout/FormGrid'
export { FormSection, type FormSectionProps } from './layout/FormSection'
export { Toolbar, type ToolbarProps } from './layout/Toolbar'

// ─────────────────────────────────────────────────────────────────────────
// L3 — Composites (behavioral: search, sort, filter, state-display)
// ─────────────────────────────────────────────────────────────────────────
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './composites/Card'
// — completion pass: missing media composites —
export { FileUploader, type FileUploaderProps, type UploadedFile } from './composites/FileUploader'
export { ImageGallery, type ImageGalleryProps, type ImageGalleryImage } from './composites/ImageGallery'
export { ListRow, type ListRowProps, type ListRowMetaItem } from './composites/ListRow'
export {
  ColumnCustomizer,
  type ColumnCustomizerProps,
  type ColumnCatalogItem,
} from './composites/ColumnCustomizer'
export {
  FilterPanel,
  type FilterPanelProps,
  type FilterOption,
  type FilterGroup,
  type FilterValue,
} from './composites/FilterPanel'
export {
  DataTable,
  type DataTableProps,
  type DataTableColumn,
  type DataTableColumnContentType,
  type DataTableGroupBy,
  type DataTableSummaryCells,
  type SortState,
  type SortDirection,
} from './composites/DataTable'
export {
  DataTablePagination,
  type DataTablePaginationProps,
} from './composites/DataTablePagination'
export { Logo, type LogoProps, type Tenant, type LogoVariant } from './composites/Logo'
export {
  Combobox,
  type ComboboxProps,
  type ComboOption,
} from './composites/Combobox'
export {
  computeOverflow,
  type OverflowResult,
  type OverflowOptions,
} from './lib/overflow'
export { installScrollRegionBehavior } from './lib/scroll-region'
export { IconSelect, type IconSelectProps, type IconSelectOption } from './composites/IconSelect'
export {
  PhoneInput,
  type PhoneInputProps,
  type PhoneCountry,
  DEFAULT_PHONE_COUNTRIES,
  isoToFlagEmoji,
} from './composites/PhoneInput'
export { Skeleton, type SkeletonProps } from './composites/Skeleton'
export { StatusView, type StatusViewProps } from './composites/StatusView'
export { NoPermission, type NoPermissionProps } from './composites/NoPermission'
export { TagChipList, type TagChipListProps, type TagOption } from './composites/TagChipList'
export { TagPicker, type TagPickerProps } from './composites/TagPicker'
export {
  FilterOptionGroups,
  type FilterOptionGroupsProps,
  type FilterOptionGroupOption,
  FILTER_CHIP_GEOMETRY,
} from './composites/FilterOptionGroups'
// — ported from the reference DS (design-only), wave 2 —
export {
  KpiTile,
  type KpiTileProps,
  type KpiTileTrend,
  type KpiTileLayout,
} from './composites/KpiTile'
export {
  KpiMetricCard,
  type KpiMetricCardProps,
  type KpiMetricCardTone,
  type KpiMetricCardBadge,
  type KpiMetricCardBadgeTone,
} from './composites/KpiMetricCard'
export {
  RouteJobCard,
  type RouteJobCardProps,
  type RouteJobCardStatus,
  type RouteJobCardChip,
  type RouteJobCardBanner,
  type RouteJobCardBannerTone,
} from './composites/RouteJobCard'
export {
  BreakdownStrip,
  type BreakdownStripProps,
  type BreakdownStripItem,
  type BreakdownTone,
} from './composites/BreakdownStrip'
export {
  StatTile,
  type StatTileProps,
  type StatTileTone,
} from './composites/StatTile'
export {
  StatusBreakdownCard,
  type StatusBreakdownCardProps,
  type StatusBreakdownRow,
  type StatusBreakdownStat,
  type StatusBreakdownTone,
} from './composites/StatusBreakdownCard'
export {
  Alert,
  alertVariants,
  type AlertProps,
  type AlertSeverity,
} from './composites/Alert'
export {
  InfoBanner,
  type InfoBannerProps,
  type InfoBannerMetaItem,
  type InfoBannerVariant,
  type InfoBannerTone,
} from './composites/InfoBanner'
export {
  Breadcrumbs,
  type BreadcrumbsProps,
  type BreadcrumbItem,
} from './composites/Breadcrumbs'
export { ChartCard, type ChartCardProps } from './composites/ChartCard'
// — wave 1: ECharts engine + dashboard chart renderers —
export {
  ChartContainer,
  type ChartContainerProps,
  type ChartDataTableSpec,
} from './composites/ChartContainer'
export { BarChart, type BarChartProps, type BarChartSeries } from './composites/BarChart'
export { AreaChart, type AreaChartProps, type AreaChartSeries, type AreaChartMarkArea } from './composites/AreaChart'
export { DonutChart, type DonutChartProps, type DonutChartDatum } from './composites/DonutChart'
export { Gauge, type GaugeProps, type GaugeSize, type GaugeSector } from './composites/Gauge'
export { LineChart, type LineChartProps, type LineChartSeries } from './composites/LineChart'
export {
  HeatmapChart,
  type HeatmapChartProps,
  type HeatmapChartCell,
  type HeatmapChartBin,
  type HeatmapChartGroup,
} from './composites/HeatmapChart'
export { Sparkline, type SparklineProps } from './composites/Sparkline'
export { CompareBars, type CompareBarsProps, type CompareBarsSeries } from './composites/CompareBars'
export { ComplianceGauge, type ComplianceGaugeProps } from './composites/ComplianceGauge'
export {
  ChartLegend,
  type ChartLegendItem,
  type ChartLegendProps,
} from './composites/ChartLegend'
export {
  Timeline,
  type TimelineTone,
  type TimelineItem,
  type TimelineProps,
} from './composites/Timeline'
export {
  ChecklistSection,
  type ChecklistItemState,
  type ChecklistItemData,
  type ChecklistSectionProps,
} from './composites/ChecklistSection'
export { ToggleFieldGroup, type ToggleFieldGroupProps } from './composites/ToggleFieldGroup'
export {
  Stepper,
  type StepperStepState,
  type StepperStep,
  type StepperProps,
} from './composites/Stepper'
export { UserMenu, type UserMenuItem, type UserMenuProps } from './composites/UserMenu'
export { UserPopover, type UserPopoverProps } from './composites/UserPopover'
export {
  PeoplePicker,
  type PersonColorIndex,
  type PersonOption,
  type PeoplePickerProps,
} from './composites/PeoplePicker'
export {
  DestructiveActionModal,
  type DestructiveActionModalProps,
} from './composites/DestructiveActionModal'
export {
  NotificationCard,
  type NotificationSeverity,
  type NotificationMetaTone,
  type NotificationMetaChip,
  type NotificationCardProps,
} from './composites/NotificationCard'
// — wave 2b —
export { ChartTooltip, type ChartTooltipItem, type ChartTooltipProps } from './composites/ChartTooltip'
export {
  SegmentedBar,
  segmentedBarVariants,
  type SegmentedBarProps,
  type SegmentedBarSegment,
} from './composites/SegmentedBar'
export {
  LiveDurationCard,
  liveDurationCardVariants,
  type LiveDurationCardProps,
  type LiveDurationCardMode,
} from './composites/LiveDurationCard'
export {
  HealthStrip,
  type HealthStripItem,
  type HealthStripProps,
  type HealthStripStatus,
} from './composites/HealthStrip'
export {
  ConnectionStatusCard,
  type ConnectionStatus,
  type ConnectionStatusCardProps,
} from './composites/ConnectionStatusCard'
export {
  Leaderboard,
  type LeaderboardProps,
  type LeaderboardItem,
  type LeaderboardColumn,
  type LeaderboardMovement,
} from './composites/Leaderboard'
export {
  StatBar,
  type StatBarProps,
  type StatBarTone,
} from './composites/StatBar'
export {
  CriticalEventsList,
  type CriticalEventsListItem,
  type CriticalEventsListProps,
  type CriticalEventSeverity,
} from './composites/CriticalEventsList'
export { ViewTabs, type ViewTab, type ViewTabsProps } from './composites/ViewTabs'
export {
  ModuleViewTabs,
  moduleViewTabsListVariants,
  moduleViewTabsTriggerVariants,
  type ModuleViewTab,
  type ModuleViewTabsProps,
} from './composites/ModuleViewTabs'
export { FilterPopup, type FilterPopupProps } from './composites/FilterPopup'
export {
  FiltersSheet,
  type FiltersSheetProps,
  type FiltersSheetSection,
  type FiltersSheetField,
  type FiltersSheetFieldType,
  type FiltersSheetOption,
  type FiltersSheetValue,
} from './composites/FiltersSheet'
export {
  TableCell,
  type TableCellKind,
  type TableCellAlign,
  type TableCellProps,
  type TableCellBadgeItem,
  type TableCellAvatarItem,
  type TableCellAction,
  type TableCellActivityTone,
  type TableCellTabAction,
  type TableCellMetric,
} from './composites/TableCell'
export {
  EntityPickerDrawer,
  LinkedEntityChip,
  type EntityPickerItem,
  type EntityPickerDrawerProps,
  type LinkedEntityChipProps,
} from './composites/EntityPickerDrawer'
export { TONE_BADGE_VARIANT, type TransitionStage, type TransitionStageTone } from './composites/transition-stage'
export {
  StateTransitionToolbar,
  getForwardTransitions,
  type StateTransitionToolbarProps,
  type StateTransition,
} from './composites/StateTransitionToolbar'
export {
  StatusTransitionDropdown,
  type StatusTransitionDropdownProps,
} from './composites/StatusTransitionDropdown'
export {
  ActivityFeed,
  type ActivityFeedEntry,
  type ActivityFeedAttachment,
  type ActivityFeedTone,
  type ActivityFeedProps,
  type ActivityFeedActor,
  type ActivityFeedSystemActor,
} from './composites/ActivityFeed'
export {
  EntityProfileCard,
  type EntityProfileCardProps,
  type EntityProfileField,
} from './composites/EntityProfileCard'
export {
  DateRangePicker,
  DEFAULT_RANGE_PRESETS,
  type DateRangePickerProps,
  type DateRangePickerMode,
  type DateRangePickerValue,
  type DateRangePickerPreset,
  type DateRangePickerPresetRange,
  type DateRangePickerTime,
} from './composites/DateRangePicker'
export {
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  type KanbanBoardColumn,
  type KanbanBoardProps,
  type KanbanMoveAnnouncement,
  type KanbanBlockedDrop,
  type KanbanActiveDrag,
  type KanbanDragState,
  type KanbanColumnProps,
  type KanbanCardProps,
  type KanbanCardAvatar,
  type KanbanTone,
  type KanbanCardSize,
  useKanbanCardMoveTargets,
  type KanbanCardMoveTarget,
} from './composites/Kanban'
export { PriorityChip, priorityChipVariants, type PriorityChipProps, type PriorityChipVariant } from './composites/PriorityChip'
export { StatusPill, statusPillVariants, type StatusPillProps, type StatusPillVariant } from './composites/StatusPill'
export { StatusDot, type StatusDotProps } from './composites/StatusDot'
export { IdChip, type IdChipProps } from './composites/IdChip'
export { CountChip, tintFromAccent, type CountChipProps } from './composites/CountChip'
export {
  CustomScrollbar,
  type CustomScrollbarProps,
  type CustomScrollbarHandle,
} from './composites/CustomScrollbar'
export { CountTabs, type CountTabsProps, type CountTabItem } from './composites/CountTabs'
export { TimeRemainingChip, type TimeRemainingChipProps } from './composites/TimeRemainingChip'

// ─────────────────────────────────────────────────────────────────────────
// L4 — Shells (page archetypes — chrome + slots, zero content)
// ─────────────────────────────────────────────────────────────────────────
export { AppShell, type AppShellProps } from './shells/AppShell'
export {
  NavRail,
  type NavRailProps,
  type NavRailItem,
  type NavRailMode,
  type NavRailSwitcher,
} from './shells/NavRail'
export {
  NavRailRow,
  NavRailUserRow,
  NavRailDivider,
  useNavRail,
  NavRailContextProvider,
  type NavRailRowProps,
  type NavRailUserRowProps,
  type NavRailContextValue,
} from './shells/NavRailParts'
export { AppSwitcherPanel, type AppSwitcherPanelProps, type AppSwitcherApp } from './composites/AppSwitcherPanel'
export {
  SideNav,
  SideNavFooterItem,
  SIDENAV_RAIL_WIDTH,
  type SideNavProps,
  type SideNavItem,
  type SideNavFooterItemProps,
} from './shells/SideNav'
export { TopNav, type TopNavProps } from './shells/TopNav'
export {
  TopNavSlotPortal,
  TopNavSlotProvider,
  useTopNavSlotHost,
  useTopNavSlots,
  type TopNavSlotNodes,
} from './shells/top-nav-slot'
export {
  ModuleRail,
  MODULE_RAIL_COMPACT_WIDTH,
  type ModuleRailProps,
  type ModuleRailItem,
  type ModuleRailSection,
} from './shells/ModuleRail'
export { PageHeader, type PageHeaderProps } from './shells/PageHeader'
export { ListView, type ListViewProps } from './shells/ListView'
export {
  HybridView,
  MapPlaceholder,
  type HybridViewProps,
} from './shells/HybridView'
export {
  ProfileLayout,
  type ProfileLayoutProps,
  type ProfileTab,
} from './shells/ProfileLayout'
// — ported from the reference DS (design-only), wave 3 —
export {
  RecordLayout,
  type RecordLayoutProps,
  DetailSection,
  type DetailSectionProps,
  FieldGrid,
  type FieldGridProps,
  type FieldGridField,
} from './shells/RecordLayout'
export {
  DetailSheet,
  type DetailSheetProps,
  FormSheet,
  type FormSheetProps,
} from './shells/DetailSheet'
export { DashboardLayout, type DashboardLayoutProps } from './shells/DashboardLayout'

// ─────────────────────────────────────────────────────────────────────────
// Domain — fleet-specific widgets (Rule 10 exception: fleet is FAMS's domain)
// ─────────────────────────────────────────────────────────────────────────
export {
  VehiclePopupCard,
  type VehiclePopupCardProps,
  type VehiclePopupField,
  type VehiclePopupTabItem,
  type VehicleStatusTone,
} from './domain/map/VehiclePopupCard'
export { VehicleMarker, type VehicleMarkerProps } from './domain/map/VehicleMarker'
export {
  PoiMarker,
  PoiCategoryChip,
  POI_CATEGORIES,
  poiCategoryArt,
  type PoiMarkerProps,
  type PoiMarkerDatum,
  type PoiCategoryChipProps,
} from './domain/map/PoiMarker'
export { type PoiCategoryArt, POI_MARKER_WIDTH, POI_MARKER_HEIGHT } from './domain/map/poi-marker-art'

/* ── wall-display: the always-dark operations surfaces (Command Center) ──
   Their own `--color-wall-*` scope, NOT a dark-mode variant of the light
   semantic set — these screens hang on a wall and must not flip with
   `data-theme`. See WallPanel's docblock. */
export { PickerList, type PickerListProps, type PickerListOption } from './composites/PickerList'
export { InlineEditField, type InlineEditFieldProps } from './composites/InlineEditField'
export { WallPanel, type WallPanelProps } from './wall-display/WallPanel'
export { WallStatBar, type WallStatBarProps } from './wall-display/WallStatBar'
export { WallKpiCard, WALL_KPI_HEIGHT, type WallKpiCardProps } from './wall-display/WallKpiCard'
export { useCountUp } from './wall-display/use-count-up'
export { usePrefersReducedMotion } from './wall-display/use-prefers-reduced-motion'
export { useWallClock, type WallClockOptions } from './wall-display/use-wall-clock'
export {
  VehicleIcon3D,
  type VehicleIcon3DArt,
  type VehicleIcon3DProps,
  type VehicleIcon3DSize,
} from './domain/map/VehicleIcon3D'
export {
  VehicleEventsList,
  type VehicleEventItem,
  type VehicleEventSeverity,
  type VehicleEventsListProps,
} from './domain/map/VehicleEventsList'
export {
  VehicleTripsPanel,
  type VehicleTripDateChip,
  type VehicleTripRow,
  type VehicleTripSummary,
  type VehicleTripsPanelProps,
} from './domain/map/VehicleTripsPanel'
export {
  VehicleDevicesTable,
  type VehicleDeviceRow,
  type VehicleDeviceValueTone,
  type VehicleDevicesTableProps,
} from './domain/map/VehicleDevicesTable'
export { DefaultWorkforceArt } from './composites/DefaultWorkforceArt'
export { VehiclePopupTabBar, type VehiclePopupTabBarProps } from './domain/map/VehiclePopupTabBar'
export {
  VehicleWorkforceCard,
  type VehicleWorkforceEntry,
  type VehicleWorkforceCardProps,
} from './domain/map/VehicleWorkforceCard'
export {
  ClusterBadge,
  clusterBadgeTier,
  formatClusterCount,
  type ClusterBadgeProps,
  type ClusterBadgeSegment,
  type ClusterBadgeSize,
} from './domain/map/ClusterBadge'
export {
  MapChip,
  type MapChipProps,
  type MapChipVariant,
} from './domain/map/MapChip'
export {
  MapIconButton,
  MapControlGroup,
  MapZoomControl,
  MapBasemapPreview,
  MapLayersControl,
  MapLayersSwitcher,
  MapSearchControl,
  findUnavailableTool,
  type MapIconButtonProps,
  type MapControlGroupProps,
  type MapZoomControlProps,
  type MapBasemapStyle,
  type MapLayersControlProps,
  type MapLayersSwitcherProps,
  type MapPlace,
  type MapSearchControlProps,
  type MapUnavailableTool,
} from './domain/map/MapControls'
/**
 * Untitled-UI map/vehicle glyphs lucide has no faithful equivalent for
 * (live-monitoring SPEC §2.3 / P0-2). Exported so an application's icon
 * vocabulary can resolve `traffic-lights` / `marker-pin-05` / `zones` /
 * `pin-01` / `search-refraction` / `colors` / `thermometer-03` to the SAME
 * mark the map chrome and the infowindow card draw.
 */
export {
  AlertOctagonIcon,
  CloudRaining06Icon,
  ColorsIcon,
  Globe05Icon,
  LayersThree02Icon,
  MapDeviceIcon,
  MarkerPin05Icon,
  MarkerPin06Icon,
  Pin01Icon,
  SearchRefractionIcon,
  Thermometer03Icon,
  TrafficLightsIcon,
  ZonesIcon,
} from './domain/map/map-glyphs'
export {
  MapContainer,
  type MapContainerProps,
  type MapControlConfig,
} from './domain/map/MapContainer'
export {
  MapStatusMarker,
  type MapStatusMarkerProps,
  type MapMarkerStatus,
  type MapMarkerVariant,
  type MapMarkerSize,
  type MapMarkerStatusStyle,
} from './domain/map/MapStatusMarker'
export {
  MOBILITY_STATUSES,
  MOBILITY_STATUS_STYLES,
  MOBILITY_STATUS_LABELS,
  type MobilityStatus,
  type MobilityStatusStyle,
} from './domain/map/mobility-status'
export {
  AssetStatusIcon,
  type AssetStatusIconProps,
  type AssetStatusIconSize,
} from './domain/map/AssetStatusIcon'

/**
 * Colour resolution for renderers that do not run the CSS cascade (ECharts
 * canvas/SVG, WebGL map layers). `resolveCssColor` turns an AUTHORED colour
 * string — `var(--token)`, `var(--token, fallback)`, a hex, a named colour —
 * into a literal; `useThemeVersion` re-triggers that resolution when the
 * document's theme/tenant changes. Not components: exported so the tier-2
 * packages resolve blueprint-supplied colour exactly the way the core does,
 * instead of forking a second implementation.
 */
export { resolveCssColor, useThemeVersion } from './composites/chart-color'

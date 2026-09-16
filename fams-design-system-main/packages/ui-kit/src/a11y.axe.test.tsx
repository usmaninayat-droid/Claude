/**
 * a11y.axe.test.tsx — automated axe-core accessibility sweep.
 *
 * ONE parametrized suite that renders a representative default instance of
 * every component exported from `src/index.ts` in jsdom and asserts zero axe
 * violations. Fixtures are minimal-but-realistic; overlay components render
 * OPEN so the portal content is what actually gets scanned.
 *
 * Notes on scan configuration:
 * - `color-contrast` is disabled: jsdom has no layout/paint engine and no
 *   stylesheet is loaded, so computed colors are meaningless here. Contrast
 *   is covered by the token pipeline / visual review, not this sweep.
 * - `region` is disabled: it asserts page-level landmark structure ("all
 *   content contained by landmarks"), which is out of scope when rendering
 *   isolated component fragments rather than full documents.
 * - The scan root is `document.body`, not the render container, because
 *   Radix portals (Dialog/Sheet/Popover/Menu/Select content) mount outside
 *   the container.
 * - Modal overlays (Dialog family) are rendered WITHOUT a trigger button:
 *   Radix aria-hides everything outside the portal while a modal is open, so
 *   a focusable trigger left in the aria-hidden container would produce an
 *   `aria-hidden-focus` violation caused by the harness, not the component.
 *
 * vitest-axe 0.1.0's `vitest-axe/extend-expect` entry ships as an EMPTY file,
 * so the matcher is wired manually from `vitest-axe/matchers`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it, describe } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { configureAxe } from 'vitest-axe'
// Deep import: the package's `./matchers` entry re-exports type-only
// (`export type *`), which verbatimModuleSyntax rejects for value use.
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import type { AxeMatchers } from 'vitest-axe'
import { Bell, Truck, Fuel, Check, Minus, X, Search, Layers, ArrowRight, Zap } from './icons'
// Whole-namespace import solely to count the barrel's real export surface for
// the registry-sanity check at the bottom of this file — see that test for
// why a straight 1:1 against FIXTURES.length isn't the right comparison.
import * as UI from './index'

import {
  // L1 — primitives
  Button,
  Input,
  FieldError,
  FieldErrorSlot,
  Label,
  Text,
  Heading,
  Checkbox,
  Switch,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Popover,
  PopoverTrigger,
  PopoverContent,
  IconControl,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipSupport,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  Toaster,
  Calendar,
  Badge,
  Avatar,
  IconBadge,
  PriorityChip,
  StatusPill,
  IdChip,
  CountChip,
  CustomScrollbar,
  NavRail,
  NavRailRow,
  AppSwitcherPanel,
  CountTabs,
  TimeRemainingChip,
  TrendIndicator,
  Separator,
  Progress,
  RadioGroup,
  RadioGroupItem,
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  ScrollArea,
  RadialProgress,
  FileTypeIcon,
  // L2 — layout
  Stack,
  FormGrid,
  FormSection,
  Toolbar,
  // L3 — composites
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  ListRow,
  ColumnCustomizer,
  type ColumnCatalogItem,
  FilterPanel,
  type FilterGroup,
  DataTable,
  type DataTableColumn,
  DataTablePagination,
  Logo,
  Combobox,
  StatusDot,
  InsetField,
  IconSelect,
  PickerList,
  PhoneInput,
  type ComboOption,
  Skeleton,
  StatusView,
  NoPermission,
  TagChipList,
  type TagOption,
  TagPicker,
  FilterOptionGroups,
  type FilterOptionGroupOption,
  KpiTile,
  KpiMetricCard,
  RouteJobCard,
  StatusBreakdownCard,
  BreakdownStrip,
  StatTile,
  Alert,
  InfoBanner,
  Breadcrumbs,
  type BreadcrumbItem,
  ChartCard,
  ChartLegend,
  type ChartLegendItem,
  Timeline,
  type TimelineItem,
  ChecklistSection,
  type ChecklistItemData,
  type ChecklistItemState,
  Stepper,
  type StepperStep,
  ToggleFieldGroup,
  UserMenu,
  UserPopover,
  type UserMenuItem,
  PeoplePicker,
  type PersonOption,
  DestructiveActionModal,
  NotificationCard,
  ChartTooltip,
  type ChartTooltipItem,
  SegmentedBar,
  type SegmentedBarSegment,
  LiveDurationCard,
  HealthStrip,
  type HealthStripItem,
  ConnectionStatusCard,
  CriticalEventsList,
  Leaderboard,
  type LeaderboardItem,
  type LeaderboardColumn,
  StatBar,
  type CriticalEventsListItem,
  ViewTabs,
  type ViewTab,
  ModuleViewTabs,
  type ModuleViewTab,
  FilterPopup,
  FiltersSheet,
  TableCell,
  EntityPickerDrawer,
  LinkedEntityChip,
  type EntityPickerItem,
  StateTransitionToolbar,
  type StateTransition,
  type TransitionStage,
  StatusTransitionDropdown,
  ActivityFeed,
  type ActivityFeedEntry,
  EntityProfileCard,
  type EntityProfileField,
  DateRangePicker,
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  // L4 — shells
  AppShell,
  SideNav,
  SideNavFooterItem,
  type SideNavItem,
  TopNav,
  ModuleRail,
  type ModuleRailItem,
  PageHeader,
  ListView,
  HybridView,
  MapPlaceholder,
  ProfileLayout,
  type ProfileTab,
  RecordLayout,
  DetailSection,
  FieldGrid,
  DetailSheet,
  FormSheet,
  DashboardLayout,
  // Domain — map
  VehiclePopupCard,
  VehicleMarker,
  MapStatusMarker,
  AssetStatusIcon,
  VehicleIcon3D,
  MapChip,
  PoiMarker,
  PoiCategoryChip,
  ClusterBadge,
  VehicleEventsList,
  VehicleTripsPanel,
  VehicleDevicesTable,
  MapIconButton,
  MapControlGroup,
  MapZoomControl,
  MapLayersSwitcher,
  MapContainer,
  ColorSelector,
} from './index'

// vitest-axe 0.1.0's extend-expect build is empty — wire the matcher manually.
expect.extend({ toHaveNoViolations })

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}

const axe = configureAxe({
  rules: {
    // jsdom computes no real colors (no stylesheet is even loaded).
    'color-contrast': { enabled: false },
    // Page-level landmark rule — we render fragments, not documents.
    region: { enabled: false },
  },
})

// ── Shared fixture data ──────────────────────────────────────────────────

interface Row {
  id: string
  name: string
  speed: number
}

const TABLE_COLUMNS: DataTableColumn<Row>[] = [
  { key: 'name', label: 'Vehicle' },
  { key: 'speed', label: 'Speed' },
]
const TABLE_DATA: Row[] = [
  { id: 'a', name: 'TAJ-1', speed: 10 },
  { id: 'b', name: 'TAJ-2', speed: 20 },
]

const COLUMN_CATALOG: ColumnCatalogItem[] = [
  { key: 'name', label: 'Vehicle', group: 'Shown', required: true },
  { key: 'speed', label: 'Speed', group: 'Shown' },
  { key: 'plate', label: 'Plate', group: 'Asset – Basic Info' },
]

const FILTER_GROUPS: FilterGroup[] = [
  {
    key: 'mobility',
    label: 'Mobility Status',
    options: [
      { value: 'moving', label: 'Moving', count: 10 },
      { value: 'stopped', label: 'Stopped', count: 4 },
    ],
  },
]

const COMBO_OPTIONS: ComboOption[] = [
  { value: 'v1', label: 'Vehicle 01' },
  { value: 'v2', label: 'Vehicle 02' },
]

const TAG_OPTIONS: TagOption[] = [
  { value: 'lot-1', label: 'Lot 1', color: '#12b76a' },
  { value: 'lot-7', label: 'Lot 7' },
]

const PEOPLE: PersonOption[] = [
  { id: 'u1', name: 'Kashish Bindrani', email: 'kashish@fams.com' },
  { id: 'u2', name: 'Emmad Ahmad', email: 'emmad@fams.com' },
]

const BREADCRUMB_ITEMS: BreadcrumbItem[] = [
  { label: 'Settings', href: '/settings' },
  { label: 'Users', onClick: () => {} },
  { label: 'Edit user' },
]

const LEGEND_ITEMS: ChartLegendItem[] = [
  { id: 'lot1', label: 'Lot 1', colorIndex: 1, value: 42, trailing: 'leading axis' },
  { id: 'lot2', label: 'Lot 2', colorIndex: 2, value: 7, trailing: 'trailing axis' },
]

const TIMELINE_ITEMS: TimelineItem[] = [
  { id: '1', title: 'Contract created', subtitle: 'by Kashish', timestamp: '09:12', tone: 'success' },
  { id: '2', title: 'Status updated', tone: 'info' },
]

const CHECKLIST_ITEMS: ChecklistItemData[] = [
  { id: 'a', label: 'Seatbelt fastened' },
  { id: 'b', label: 'Mirrors adjusted' },
]

const CHECKLIST_STATES: ChecklistItemState[] = [
  { id: 'pending', label: 'Pending', tone: 'neutral', icon: Minus },
  { id: 'pass', label: 'Pass', tone: 'success', icon: Check },
  { id: 'fail', label: 'Fail', tone: 'danger', icon: X },
]

const STEPS: StepperStep[] = [
  { label: 'Basic info', description: 'Name and category' },
  { label: 'Details' },
  { label: 'Review' },
]

// Icon-bearing, mixed-state rail (W3b): completed/current/upcoming all
// present, every step carrying a per-step icon, so the sweep covers both the
// icon-in-marker path AND the preserved completed-checkmark override.
const ICON_STEPS: StepperStep[] = [
  { label: 'Basic Config', icon: <Zap aria-hidden="true" /> },
  { label: 'Trigger Rule', icon: <Zap aria-hidden="true" /> },
  { label: 'Add Assets', icon: <Zap aria-hidden="true" /> },
  { label: 'Reminders', icon: <Zap aria-hidden="true" /> },
]

const USER_MENU_ITEMS: UserMenuItem[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'logout', label: 'Log out', destructive: true },
]

const TOOLTIP_ITEMS: ChartTooltipItem[] = [
  { label: 'Lot 1', value: 384, colorIndex: 1 },
  { label: 'Lot 2', value: 281, colorIndex: 2 },
]

const SEGMENTS: SegmentedBarSegment[] = [
  { id: 'washed', label: 'Washed', value: 70, colorIndex: 1 },
  { id: 'not-washed', label: 'Not Washed', value: 30, colorIndex: 4 },
]

const HEALTH_ITEMS: HealthStripItem[] = [
  { label: 'GPS', value: '98%', status: 'success' },
  { label: 'Fuel', value: '24 L', status: 'warning', icon: Fuel },
]

const CRITICAL_EVENTS: CriticalEventsListItem[] = [
  { id: '1', title: 'GPS signal lost', description: 'Vehicle QAD-2201', severity: 'error', timestamp: '09:41' },
  { id: '2', title: 'Route deviation', severity: 'warning', timestamp: '09:12' },
]

const LEADERBOARD_ITEMS: LeaderboardItem[] = [
  {
    id: 'a',
    primary: 'Alpha unit',
    secondary: 'AAA-111',
    movement: { direction: 'up', value: '1' },
    score: '98 pts',
    cells: { events: 4 },
  },
  {
    id: 'b',
    primary: 'Bravo unit',
    secondary: 'BBB-222',
    movement: { direction: 'down', value: '2' },
    score: '90 pts',
    cells: { events: 6 },
  },
]

const LEADERBOARD_COLUMNS: LeaderboardColumn[] = [
  { key: 'events', label: 'Events', minWidth: '8rem', align: 'end' },
]

const VIEW_TABS: ViewTab[] = [
  { id: 'v1', label: 'All bins' },
  { id: 'v2', label: 'Overdue', dirty: true },
]

const MODULE_VIEWS: ModuleViewTab[] = [
  { id: 'hybrid', label: 'Hybrid View' },
  { id: 'list', label: 'List View' },
]

const PICKER_ITEMS: EntityPickerItem[] = [
  { id: 'c1', label: 'Acme Corp', secondary: 'acme@example.com', tags: ['Company'] },
  { id: 'c2', label: 'Bilal Traders', secondary: 'bilal@example.com' },
]

const CURRENT_STAGE: TransitionStage = { id: 'pending', label: 'Pending', tone: 'warning' }
const TRANSITIONS: StateTransition[] = [
  { toStageId: 'approved', label: 'Approve', variant: 'primary' },
  { toStageId: 'rejected', label: 'Reject', variant: 'destructive' },
]

const STAGES: TransitionStage[] = [
  { id: 'new', label: 'New', tone: 'neutral' },
  { id: 'in-progress', label: 'In Progress', tone: 'info' },
  { id: 'closed', label: 'Closed', tone: 'success' },
]

const FEED_ENTRIES: ActivityFeedEntry[] = [
  { id: '1', kind: 'system', author: 'Kashish Bindrani', text: 'created this contract', timestamp: '09:12', tone: 'success', dateGroup: 'Today' },
  { id: '2', kind: 'comment', author: 'Emmad Ahmad', text: 'Looks good, approving.', timestamp: '09:20', dateGroup: 'Today' },
  // fix7: a declared system actor (never a person) — covers the axe sweep too.
  { id: '3', kind: 'system', author: { kind: 'system', label: 'Automation' }, text: 'created this job order', timestamp: '13:02', tone: 'info', dateGroup: 'Today' },
]

const PROFILE_FIELDS: EntityProfileField[] = [
  { label: 'Model', value: 'Compactor 4200' },
  { label: 'Odometer', value: '128,340 km' },
]

const NAV_ITEMS: SideNavItem[] = [
  { label: 'Bins', to: '/bins', active: true, icon: <svg aria-hidden="true" /> },
  { label: 'Live Monitoring', to: '/live', icon: <svg aria-hidden="true" /> },
]

const RAIL_ITEMS: ModuleRailItem[] = [
  { label: 'Overview', to: '/overview', active: true, icon: <svg aria-hidden="true" /> },
  { label: 'Reports', to: '/reports', icon: <svg aria-hidden="true" /> },
]

const PROFILE_TABS: ProfileTab[] = [
  { id: 'overview', label: 'Overview', content: <div>Overview body</div> },
  { id: 'devices', label: 'Devices', content: <div>Devices body</div> },
]

const NOW = new Date('2026-01-01T12:00:00.000Z').getTime()

// ── Fixture registry ─────────────────────────────────────────────────────

interface Fixture {
  /** Exported component name(s) this fixture covers. */
  name: string
  render?: () => ReactElement
  /** Post-render interaction, e.g. open a popover via its trigger. */
  open?: () => void | Promise<void>
  /** Per-fixture axe rule overrides — ONLY for documented known issues. */
  disableRules?: string[]
  /**
   * Render this fixture under an explicit `data-theme` on `<html>`. The sweep
   * is light-only by default, which is how the light-only `--color-medal-*`
   * family reached review with a 1.00-1.26:1 podium in dark mode.
   */
  theme?: 'light' | 'dark'
  /** Reason for skipping — only when `render` is omitted. */
  skip?: string
}

const FIXTURES: Fixture[] = [
  // ── L1 primitives ──
  { name: 'Button', render: () => <Button>Save changes</Button> },
  { name: 'Input', render: () => <Input aria-label="Vehicle name" placeholder="Vehicle name" /> },
  {
    name: 'Input (password, revealable, revealed)',
    render: () => <Input label="Password" type="password" revealable defaultValue="hunter2" />,
    open: async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    },
  },
  {
    name: 'FieldError + FieldErrorSlot (errored field wired via aria-describedby)',
    render: () => (
      <div>
        <Input label="Email" defaultValue="not-an-email" hasError aria-describedby="a11y-email-error" />
        <FieldErrorSlot>
          <FieldError id="a11y-email-error">Enter a valid email address</FieldError>
        </FieldErrorSlot>
      </div>
    ),
  },
  {
    name: 'Label',
    render: () => (
      <div>
        <Label htmlFor="a11y-label-input">Vehicle name</Label>
        <Input id="a11y-label-input" />
      </div>
    ),
  },
  { name: 'Checkbox', render: () => <Checkbox aria-label="Accept terms" /> },
  { name: 'Switch', render: () => <Switch aria-label="Enable alerts" /> },
  { name: 'Textarea', render: () => <Textarea aria-label="Notes" /> },
  {
    name: 'Select (open)',
    render: () => (
      <Select defaultOpen value="lot-1">
        <SelectTrigger aria-label="Lot">
          <SelectValue placeholder="Select a lot…" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Lots</SelectLabel>
            <SelectItem value="lot-1">Lot 1</SelectItem>
            <SelectItem value="lot-2">Lot 2</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectItem value="tajmee">Tajmee&apos;e</SelectItem>
        </SelectContent>
      </Select>
    ),
  },
  {
    name: 'Tabs',
    render: () => (
      <Tabs defaultValue="a">
        <TabsList aria-label="Demo tabs">
          <TabsTrigger value="a">Tab A</TabsTrigger>
          <TabsTrigger value="b">Tab B</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Content A</TabsContent>
        <TabsContent value="b">Content B</TabsContent>
      </Tabs>
    ),
  },
  {
    // No DialogTrigger: Radix aria-hides content outside an open modal, so a
    // focusable trigger in the container would be a harness-made violation.
    name: 'Dialog (open)',
    render: () => (
      <Dialog defaultOpen>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm</DialogTitle>
            <DialogDescription>Are you sure?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
  },
  {
    // Radix PopoverContent carries role="dialog", so callers of the raw
    // primitive must name it (aria-label / aria-labelledby) — realistic usage.
    name: 'Popover (open)',
    render: () => (
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent aria-label="Details">Panel body</PopoverContent>
      </Popover>
    ),
  },
  {
    name: 'Tooltip (open)',
    render: () => (
      <Tooltip open>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent showArrow>
          Explanation
          <TooltipSupport>Additional detail goes here</TooltipSupport>
        </TooltipContent>
      </Tooltip>
    ),
  },
  {
    // An icon-only control is the classic unnamed-button axe violation; this
    // fixture asserts the wrapper actually supplies the name (UX K.67).
    name: 'IconControl (icon-only button, named by its tip)',
    render: () => (
      <IconControl tip="Zoom in">
        <Button variant="ghost" size="icon">
          <span aria-hidden="true">+</span>
        </Button>
      </IconControl>
    ),
  },
  {
    name: 'DropdownMenu (open)',
    render: () => (
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Vehicle</DropdownMenuLabel>
          <DropdownMenuGroup>
            <DropdownMenuItem>
              Edit
              <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuCheckboxItem checked>Show on map</DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value="lot-1">
            <DropdownMenuRadioItem value="lot-1">Lot 1</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="lot-2">Lot 2</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub defaultOpen>
            <DropdownMenuSubTrigger>More</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>Archive</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
  {
    // Empty toast region — sonner renders an aria-live region container.
    name: 'Toaster',
    render: () => <Toaster />,
  },
  { name: 'Calendar', render: () => <Calendar mode="single" month={new Date(2026, 5, 1)} /> },
  { name: 'Text', render: () => <Text as="p" tone="muted">Supporting body copy</Text> },
  { name: 'Heading', render: () => <Heading level={2}>Section heading</Heading> },
  { name: 'Badge', render: () => <Badge variant="success">Compliant</Badge> },
  { name: 'Avatar', render: () => <Avatar name="Kashish Bindrani" /> },
  { name: 'IconBadge', render: () => <IconBadge icon={Bell} /> },
  { name: 'PriorityChip', render: () => <PriorityChip variant="critical" /> },
  { name: 'StatusPill', render: () => <StatusPill variant="inProgress">In Progress</StatusPill> },
  { name: 'IdChip', render: () => <IdChip>TK-25874</IdChip> },
  { name: 'ColorSelector', render: () => <ColorSelector label="Color" required value="#0072d6" onChange={() => {}} presets={['#0072d6', '#f04438', '#12b76a']} /> },
  { name: 'CountChip', render: () => <CountChip>3</CountChip> },
  {
    name: 'NavRail',
    render: () => (
      <NavRail
        defaultMode="expanded"
        items={[{ id: 'a', label: 'Dashboard', active: true }, { id: 'b', label: 'Ticketing' }]}
        topItems={[{ id: 'inbox', label: 'Inbox', notificationDot: true }]}
        logo={<span>L</span>}
        switcher={{ label: 'CCMS', panel: <p>apps</p> }}
        footer={<NavRailRow label="Settings" tone="footer" />}
      />
    ),
  },
  {
    name: 'AppSwitcherPanel',
    render: () => (
      <AppSwitcherPanel apps={[{ id: 'a', label: 'Alpha', active: true }, { id: 'b', label: 'Beta' }]} />
    ),
  },
  {
    name: 'CustomScrollbar',
    render: () => (
      <CustomScrollbar className="h-24 w-40">
        <p>scrollable content</p>
      </CustomScrollbar>
    ),
  },
  {
    name: 'CountTabs',
    render: () => (
      <CountTabs
        aria-label="Inbox filters"
        value="unread"
        items={[
          { id: 'unread', label: 'Unread', count: 42 },
          { id: 'all', label: 'All', count: '42' },
          { id: 'critical', label: 'Critical', count: '03' },
        ]}
      />
    ),
  },
  { name: 'TimeRemainingChip', render: () => <TimeRemainingChip>2d 5h left</TimeRemainingChip> },
  { name: 'TrendIndicator', render: () => <TrendIndicator direction="up" value="+12%" note="vs last week" /> },
  { name: 'Separator', render: () => <Separator /> },
  { name: 'Progress', render: () => <Progress value={40} aria-label="Upload progress" /> },
  {
    name: 'RadioGroup',
    render: () => (
      <RadioGroup aria-label="Lot" defaultValue="lot-1">
        <RadioGroupItem value="lot-1" aria-label="Lot 1" />
        <RadioGroupItem value="lot-2" aria-label="Lot 2" />
      </RadioGroup>
    ),
  },
  {
    name: 'Accordion (open item)',
    render: () => (
      <Accordion type="single" collapsible defaultValue="a">
        <AccordionItem value="a">
          <AccordionTrigger>Section A</AccordionTrigger>
          <AccordionContent>Content A</AccordionContent>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionTrigger>Section B</AccordionTrigger>
          <AccordionContent>Content B</AccordionContent>
        </AccordionItem>
      </Accordion>
    ),
  },
  {
    name: 'AlertDialog (open)',
    render: () => (
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    ),
  },
  {
    name: 'Sheet (open)',
    render: () => (
      <Sheet defaultOpen>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit entity</SheetTitle>
            <SheetDescription>Update the linked record.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    ),
  },
  {
    name: 'Drawer (open)',
    render: () => (
      <Drawer defaultOpen>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Quick actions</DrawerTitle>
            <DrawerDescription>Choose what to do next.</DrawerDescription>
          </DrawerHeader>
        </DrawerContent>
      </Drawer>
    ),
  },
  {
    // Standalone list (not an overlay) — no open/close state to exercise.
    name: 'Command',
    render: () => (
      <Command>
        <CommandInput placeholder="Search…" />
        <CommandList>
          <CommandGroup heading="Vehicles">
            <CommandItem value="v1">Vehicle 01</CommandItem>
            <CommandItem value="v2">Vehicle 02</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    ),
  },
  {
    name: 'CommandDialog (open)',
    render: () => (
      <CommandDialog open onOpenChange={() => {}} title="Jump to…">
        <CommandInput placeholder="Search…" />
        <CommandList>
          <CommandGroup heading="Vehicles">
            <CommandItem value="v1">Vehicle 01</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    ),
  },
  {
    name: 'ScrollArea + ScrollBar',
    render: () => (
      <ScrollArea style={{ height: 120 }}>
        <div>Row content</div>
      </ScrollArea>
    ),
  },
  { name: 'RadialProgress', render: () => <RadialProgress value={65} aria-label="Completion" /> },
  { name: 'FileTypeIcon', render: () => <FileTypeIcon filename="invoice.pdf" /> },

  // ── L2 layout ──
  {
    name: 'Stack',
    render: () => (
      <Stack>
        <div>First</div>
        <div>Second</div>
      </Stack>
    ),
  },
  {
    name: 'FormGrid',
    render: () => (
      <FormGrid>
        <Input aria-label="First name" />
        <Input aria-label="Last name" />
      </FormGrid>
    ),
  },
  {
    name: 'FormSection',
    render: () => (
      <FormSection title="Details" description="Basic vehicle facts">
        <Input aria-label="Plate" />
      </FormSection>
    ),
  },
  {
    name: 'Toolbar',
    render: () => (
      <Toolbar>
        <Button variant="secondary">Cancel</Button>
        <Button>Save</Button>
      </Toolbar>
    ),
  },

  // ── L3 composites ──
  {
    name: 'Card (compound)',
    render: () => (
      <Card>
        <CardHeader>
          <CardTitle>Fleet summary</CardTitle>
          <CardDescription>Updated 5 minutes ago</CardDescription>
        </CardHeader>
        <CardContent>Body content</CardContent>
        <CardFooter>
          <Button variant="secondary">View all</Button>
        </CardFooter>
      </Card>
    ),
  },
  { name: 'ListRow', render: () => <ListRow title="Truck 01-80" subtitle="Lot 1" /> },
  {
    name: 'ListRow — metadata columns',
    render: () => (
      <ListRow
        title="Zone Out Violation"
        subtitle="Khalifa Port"
        meta={[
          { label: 'Vehicle', value: 'DXB-B-1007' },
          { label: 'Driver', value: 'Omar Darwish' },
          { label: 'Location', value: 'Al Dafrah' },
        ]}
        trailing={<span>22 Oct 2026</span>}
      />
    ),
  },
  {
    name: 'ColumnCustomizer',
    render: () => <ColumnCustomizer catalog={COLUMN_CATALOG} value={['name', 'speed']} onChange={() => {}} />,
  },
  {
    name: 'FilterPanel',
    render: () => (
      <FilterPanel
        groups={FILTER_GROUPS}
        value={{ tags: [], groups: {} }}
        onChange={() => {}}
        tagOptions={[{ value: 'lot-1', label: 'Lot 1' }]}
      />
    ),
  },
  {
    name: 'DataTable',
    render: () => (
      <DataTable<Row> columns={TABLE_COLUMNS} data={TABLE_DATA} getRowId={(r) => r.id} ariaLabel="Vehicles" />
    ),
  },
  {
    // The legacy `columnsMenuVariant="labelled"` escape hatch (root
    // CLAUDE.md rule 11 — new/changed branch, own fixture; the DEFAULT
    // 'DataTable' fixture above already covers the icon-only pencil trigger
    // that matches product truth, VALUES-CROSSCHECK.md row 25).
    name: 'DataTable (columnsMenuVariant="labelled")',
    render: () => (
      <DataTable<Row>
        columns={TABLE_COLUMNS}
        data={TABLE_DATA}
        getRowId={(r) => r.id}
        columnsMenuVariant="labelled"
        ariaLabel="Vehicles"
      />
    ),
  },
  {
    name: 'DataTable (selectionMode="radio")',
    render: () => (
      <DataTable<Row>
        columns={TABLE_COLUMNS}
        data={TABLE_DATA}
        getRowId={(r) => r.id}
        isSelectable
        selectionMode="radio"
        selectedIds={[]}
        onSelectionChange={() => {}}
        ariaLabel="Vehicles"
      />
    ),
  },
  {
    name: 'DataTable (column expanded — text-truncation.md §7)',
    render: () => (
      <DataTable<Row>
        columns={TABLE_COLUMNS}
        data={TABLE_DATA}
        getRowId={(r) => r.id}
        expandedColumnKey="name"
        onExpandedColumnChange={() => {}}
        ariaLabel="Vehicles"
      />
    ),
  },
  {
    name: 'DataTablePagination',
    render: () => (
      <DataTablePagination page={2} pageCount={5} pageSize={10} rowCount={45} onPageChange={() => {}} />
    ),
  },
  { name: 'Logo', render: () => <Logo tenant="fams" /> },
  { name: 'Logo (horizontal variant)', render: () => <Logo tenant="fams" variant="horizontal" /> },
  {
    name: 'Combobox (open)',
    render: () => <Combobox options={COMBO_OPTIONS} value={null} onChange={() => {}} ariaLabel="Vehicle" />,
    open: () => {
      fireEvent.click(screen.getByRole('combobox'))
    },
  },
  {
    // FAMILY C: the two-section filter listbox — ONE listbox, two labelled
    // groups, `aria-selected` on every row (C.15/C.22, D-4).
    name: 'Combobox (sectioned filter dropdown, open)',
    render: () => (
      <Combobox
        options={[
          { value: 'l1', label: 'Lot 1', color: '#12b76a', count: 12 },
          { value: 'l2', label: 'Lot 2', color: '#f79009', count: 4 },
          { value: 'l3', label: 'Lot 3' },
        ]}
        value={['l2']}
        onChange={() => {}}
        multiple
        sections="selected-available"
        selectedIds={['l2']}
        frozenOrder={['l1', 'l2', 'l3']}
        ariaLabel="Lot"
      />
    ),
    open: () => {
      fireEvent.click(screen.getAllByRole('combobox')[0])
    },
  },
  {
    name: 'StatusDot',
    render: () => (
      <span>
        <StatusDot color="#12b76a" />
        Completed
      </span>
    ),
  },
  {
    name: 'InsetField',
    render: () => (
      <InsetField label="Title" htmlFor="a11y-inset-input">
        <Input id="a11y-inset-input" bare defaultValue="TAMM issue reported by client" />
      </InsetField>
    ),
  },
  {
    name: 'IconSelect (open)',
    render: () => (
      <IconSelect
        value="critical"
        onChange={() => {}}
        ariaLabel="Priority level"
        options={[
          { value: 'critical', label: 'Critical' },
          { value: 'medium', label: 'Medium' },
        ]}
      />
    ),
    open: () => {
      fireEvent.click(screen.getByRole('button', { name: 'Priority level' }))
    },
  },
  {
    name: 'PickerList (selected)',
    render: () => (
      <PickerList
        options={[
          { value: 'critical', label: 'Critical' },
          { value: 'high', label: 'High' },
          { value: 'medium', label: 'Medium' },
        ]}
        onPick={() => {}}
        selected="high"
        ariaLabel="Priority"
      />
    ),
  },
  {
    name: 'PhoneInput (country popover open)',
    render: () => <PhoneInput value="+974504200000" onChange={() => {}} ariaLabel="Phone number" />,
    open: () => {
      fireEvent.click(screen.getByRole('button', { name: 'Phone number country code' }))
    },
  },
  { name: 'Skeleton', render: () => <Skeleton /> },
  { name: 'StatusView', render: () => <StatusView kind="empty" action={<Button>Create</Button>} /> },
  {
    name: 'StatusView (coming-soon)',
    render: () => <StatusView kind="coming-soon" subject="Zones Management" />,
  },
  {
    name: 'NoPermission',
    render: () => (
      <NoPermission reason="Requires the Admin role">
        <Button>Delete</Button>
      </NoPermission>
    ),
  },
  { name: 'TagChipList', render: () => <TagChipList tags={TAG_OPTIONS} onRemove={() => {}} /> },
  {
    name: 'TagPicker (open)',
    render: () => <TagPicker options={TAG_OPTIONS} value={['lot-1']} onChange={() => {}} />,
    open: () => {
      fireEvent.click(screen.getAllByRole('button')[0])
    },
  },
  {
    // FAMILY C: categorised chip groups — each category a labelled
    // role="group" (I.78), selected chips carry a trailing ✓ (I.79).
    name: 'FilterOptionGroups (categorised, selected-available)',
    render: () => {
      const options: FilterOptionGroupOption[] = [
        { value: 'north-yard', label: 'North Yard', category: 'Sites' },
        { value: 'south-depot', label: 'South Depot', category: 'Sites' },
        { value: 'contract-a', label: 'Contract A', category: 'Contracts' },
      ]
      return (
        <FilterOptionGroups
          options={options}
          value={['north-yard']}
          onChange={() => {}}
          sections="selected-available"
          selectedIds={['north-yard']}
          frozenOrder={options.map((o) => o.value)}
        />
      )
    },
  },
  {
    name: 'KpiTile',
    render: () => (
      <KpiTile
        label="Active vehicles"
        value="128"
        icon={Truck}
        tone="success"
        badge={<span>Real Time</span>}
        target="200"
        valueSuffix="fleet-wide"
        trend={{ direction: 'up', value: '+12%', note: 'vs last week' }}
      />
    ),
  },
  {
    name: 'KpiMetricCard',
    render: () => (
      <KpiMetricCard
        value="96%"
        label="Fulfillment Rate"
        accent="success"
        badge={{ label: '+12 vs Yest.', tone: 'up' }}
        clickable
        onClick={() => {}}
      />
    ),
  },
  {
    name: 'RouteJobCard',
    render: () => (
      <RouteJobCard
        title="JOB-1042"
        subtitle="Plate AB-1234 · Jordan Reyes"
        status={{ label: 'In Progress', variant: 'inProgress' }}
        progressPct={66}
        progressLabel="12/18 · 66%"
        plannedLabel="Planned 06:00 – 14:00"
        actualLabel="Actual 06:12 · +12 min"
        meta={[{ id: 'plan', label: 'Downtown Service Plan' }]}
        banner={{ tone: 'warning', text: 'SLA at risk' }}
        selected
        onSelect={() => {}}
      />
    ),
  },
  {
    name: 'StatTile',
    render: () => (
      <StatTile label="Total Manpower" value="788" caption="Employee master · all statuses" tone="info" icon={Truck} />
    ),
  },
  {
    name: 'BreakdownStrip',
    render: () => (
      <BreakdownStrip
        aria-label="Fleet availability"
        items={[
          { id: 'on-route', label: 'On Route', value: 271, tone: 'success' },
          { id: 'idle', label: 'Idle', value: 19, tone: 'lavender' },
          { id: 'standby', label: 'Standby', value: 24, tone: 'info' },
          { id: 'maintenance', label: 'Maintenance', value: 10, tone: 'yellow' },
          { id: 'breakdown', label: 'Breakdown', value: 3, tone: 'danger', display: '03' },
          { id: 'inactive', label: 'Inactive', value: 1, tone: 'neutral', display: '01' },
        ]}
      />
    ),
  },
  {
    name: 'StatusBreakdownCard',
    render: () => (
      <StatusBreakdownCard
        title="Fleet Availability"
        icon={Truck}
        stats={[{ label: 'Total Vehicles', value: '200' }]}
        rows={[
          { id: 'available', label: 'Available', count: 128, tone: 'success' },
          { id: 'in-service', label: 'In Service', count: 34, tone: 'warning' },
          { id: 'down', label: 'Down', count: 38, tone: 'danger' },
        ]}
      />
    ),
  },
  {
    name: 'Alert',
    render: () => (
      <Alert severity="info" title="Heads up" description="Something to know." onDismiss={() => {}} />
    ),
  },
  {
    name: 'InfoBanner',
    render: () => (
      <InfoBanner title="Upcoming Plan" meta={[{ label: '# 231454' }, { label: '22 Jul, 2025 12:00pm' }]} />
    ),
  },
  {
    name: 'InfoBanner (insight)',
    render: () => <InfoBanner variant="insight" tone="success" title="3 anomalies resolved today" />,
  },
  {
    name: 'InfoBanner (accent)',
    render: () => (
      <InfoBanner variant="accent" tone="warning" title="Plan updated" trailing={<span>2h ago</span>} />
    ),
  },
  { name: 'Breadcrumbs', render: () => <Breadcrumbs items={BREADCRUMB_ITEMS} /> },
  {
    name: 'ChartCard',
    render: () => (
      <ChartCard title="Fleet utilization" subtitle="Last 30 days" actions={<Button variant="secondary">Export</Button>}>
        chart body
      </ChartCard>
    ),
  },
  { name: 'ChartLegend', render: () => <ChartLegend items={LEGEND_ITEMS} showCounts /> },
  {
    name: 'ChartLegend (toggleable)',
    render: () => <ChartLegend items={LEGEND_ITEMS} showCounts hiddenIds={['lot2']} onToggle={() => {}} />,
  },
  { name: 'Timeline', render: () => <Timeline items={TIMELINE_ITEMS} /> },
  {
    name: 'ChecklistSection (binary)',
    render: () => <ChecklistSection items={CHECKLIST_ITEMS} value={{ a: 'checked' }} onChange={() => {}} />,
  },
  {
    name: 'ChecklistSection (multi-state)',
    render: () => (
      <ChecklistSection items={CHECKLIST_ITEMS} states={CHECKLIST_STATES} value={{ a: 'pass' }} onChange={() => {}} />
    ),
  },
  { name: 'Stepper', render: () => <Stepper steps={STEPS} current={1} /> },
  {
    name: 'Stepper (variant="tabs", clickable back-navigation)',
    render: () => <Stepper variant="tabs" steps={STEPS} current={1} onStepSelect={() => {}} />,
  },
  {
    name: 'Stepper (per-step icons, mixed completed/current/upcoming, orientation="vertical")',
    render: () => (
      <Stepper orientation="vertical" steps={ICON_STEPS} current={1} onStepSelect={() => {}} />
    ),
  },
  {
    name: 'ToggleFieldGroup (switch, ON — children + trailingLabel visible)',
    render: () => (
      <ToggleFieldGroup checked onCheckedChange={() => {}} label="Odometer Interval" trailingLabel="Before Due">
        <input aria-label="Distance Interval (km)" defaultValue="10,000" />
      </ToggleFieldGroup>
    ),
  },
  {
    name: 'ToggleFieldGroup (checkbox, OFF — summary visible)',
    render: () => (
      <ToggleFieldGroup
        checked={false}
        onCheckedChange={() => {}}
        label="Send via SMS"
        controlKind="checkbox"
        summary="+971501234567"
      >
        <input aria-label="Select Recipients" />
      </ToggleFieldGroup>
    ),
  },
  {
    name: 'UserMenu (open)',
    render: () => (
      <UserMenu name="Kashish Bindrani" email="kashish@fams.com" items={USER_MENU_ITEMS} defaultOpen />
    ),
  },
  {
    name: 'UserPopover (open)',
    render: () => (
      <UserPopover
        name="Avery Stone"
        email="avery@fams.example"
        trigger={<button type="button">User</button>}
        defaultOpen
      />
    ),
  },
  {
    name: 'PeoplePicker (open)',
    render: () => <PeoplePicker people={PEOPLE} value={null} onChange={() => {}} />,
    open: () => {
      fireEvent.click(screen.getAllByRole('button')[0])
    },
  },
  {
    name: 'DestructiveActionModal (open)',
    render: () => (
      <DestructiveActionModal
        open
        onOpenChange={() => {}}
        title="Delete this record?"
        description="This action cannot be undone."
        onConfirm={() => {}}
      />
    ),
  },
  {
    name: 'NotificationCard',
    render: () => (
      <NotificationCard title="Plan approved" description="Lot 1 plan approved." timestamp="2h ago" severity="success" unread />
    ),
  },
  { name: 'ChartTooltip', render: () => <ChartTooltip items={TOOLTIP_ITEMS} title="2026-06-08" /> },
  { name: 'SegmentedBar', render: () => <SegmentedBar segments={SEGMENTS} /> },
  {
    name: 'LiveDurationCard (completed)',
    render: () => (
      <LiveDurationCard start={new Date(NOW - 2 * 60 * 60 * 1000)} end={new Date(NOW - 30 * 60 * 1000)} />
    ),
  },
  { name: 'HealthStrip', render: () => <HealthStrip items={HEALTH_ITEMS} /> },
  { name: 'ConnectionStatusCard', render: () => <ConnectionStatusCard status="online" label="Device uplink" /> },
  { name: 'CriticalEventsList', render: () => <CriticalEventsList items={CRITICAL_EVENTS} /> },
  {
    name: 'CriticalEventsList (metadata columns)',
    render: () => (
      <CriticalEventsList
        items={[
          {
            id: '1',
            title: 'Harsh braking',
            severity: 'warning',
            meta: [
              { label: 'Asset', value: 'TME-298' },
              { label: 'Speed', value: '82 km/h' },
            ],
            timestamp: '09:41',
          },
        ]}
        onItemClick={() => {}}
      />
    ),
  },
  {
    name: 'Leaderboard',
    render: () => (
      <Leaderboard
        items={LEADERBOARD_ITEMS}
        columns={LEADERBOARD_COLUMNS}
        ariaLabel="Unit ranking"
        onItemClick={() => {}}
      />
    ),
  },
  {
    name: 'Leaderboard (no rank column)',
    render: () => (
      <Leaderboard
        items={LEADERBOARD_ITEMS}
        columns={LEADERBOARD_COLUMNS}
        showRank={false}
        entityLabel="Vehicle"
        ariaLabel="Unit ranking"
      />
    ),
  },
  {
    name: 'Leaderboard (podium + searchable)',
    render: () => (
      <Leaderboard
        variant="podium"
        searchable
        searchPlaceholder="Search units"
        scoreLabel="Score"
        items={LEADERBOARD_ITEMS}
        columns={LEADERBOARD_COLUMNS}
        ariaLabel="Unit ranking"
        onItemClick={() => {}}
      />
    ),
  },
  {
    // The podium is the one component whose surfaces come from a dedicated
    // ordinal token family (`--color-medal-*`), so it is the fixture that has
    // to be swept under BOTH themes. jsdom paints nothing, so axe's own
    // `color-contrast` rule stays off here (see `configureAxe` above) — the
    // colour half of this defect class is asserted numerically by the
    // 'dark-theme medal surfaces' suite at the bottom of this file.
    name: 'Leaderboard (podium, dark theme)',
    theme: 'dark',
    render: () => (
      <Leaderboard
        variant="podium"
        scoreLabel="Score"
        items={LEADERBOARD_ITEMS}
        columns={LEADERBOARD_COLUMNS}
        ariaLabel="Unit ranking"
        onItemClick={() => {}}
      />
    ),
  },
  {
    name: 'StatBar',
    render: () => (
      <StatBar label="Fleet fuel reserve" value="3,500 L of 5,000 L" percent={70} showPercent />
    ),
  },
  {
    name: 'StatBar (segmented + info)',
    render: () => (
      <StatBar label="Battery" info="Charge split by pack." segments={SEGMENTS} aria-label="Battery" />
    ),
  },
  { name: 'ViewTabs', render: () => <ViewTabs tabs={VIEW_TABS} activeId="v1" onSelect={() => {}} /> },
  {
    // Fixed: ModuleViewTabs now force-mounts a hidden, contentless
    // TabsContent stub per view (see ModuleViewTabs.tsx), so every trigger's
    // `aria-controls` resolves to a real element. No rule suppression needed.
    name: 'ModuleViewTabs',
    render: () => <ModuleViewTabs views={MODULE_VIEWS} active="hybrid" onSelect={() => {}} />,
  },
  {
    // The `navbar` variant is a distinct visual contract (Figma node
    // 6995:419's "Top Navbar"): a disabled placeholder tab, the trailing "+"
    // affordance, and the inset active-state underline all only exist in this
    // shape, so it gets its own sweep rather than riding on the `pill` one.
    name: 'ModuleViewTabs (navbar)',
    render: () => (
      <ModuleViewTabs
        variant="navbar"
        views={[...MODULE_VIEWS, { id: 'calendar', label: 'Calendar', disabled: true }]}
        active="hybrid"
        onSelect={() => {}}
        onAddView={() => {}}
      />
    ),
  },
  {
    name: 'FilterPopup (open)',
    render: () => (
      <FilterPopup defaultOpen activeCount={2}>
        <Label htmlFor="a11y-filter-active">Active only</Label>
        <Checkbox id="a11y-filter-active" />
      </FilterPopup>
    ),
  },
  {
    name: 'FiltersSheet (open)',
    render: () => (
      <FiltersSheet
        open
        onOpenChange={() => {}}
        activeCount={1}
        sections={[
          {
            key: 'schedule',
            label: 'Schedule',
            fields: [
              {
                key: 'shift',
                label: 'Select Shift',
                type: 'select',
                options: [
                  { value: 'morning', label: 'Morning' },
                  { value: 'evening', label: 'Evening' },
                ],
              },
            ],
          },
          {
            key: 'waste-types',
            label: 'Waste Types',
            fields: [
              {
                key: 'wasteTypes',
                label: 'Waste Types',
                type: 'checkbox-group',
                options: [
                  { value: 'recyclables', label: 'Recyclables', count: 102 },
                  { value: 'general', label: 'General', count: 102 },
                ],
              },
            ],
          },
        ]}
        value={{ wasteTypes: ['recyclables'] }}
        onChange={() => {}}
        onApply={() => {}}
        onClear={() => {}}
      />
    ),
  },
  { name: 'TableCell', render: () => <TableCell kind="text" value="TAJ-1042" /> },
  {
    name: 'TableCell (kind="avatar", secondary + icon)',
    render: () => (
      <TableCell kind="avatar" name="Jane Doe" label="Jane Doe" secondary="jane.doe@example.com" />
    ),
  },
  {
    name: 'TableCell (kind="tags")',
    render: () => (
      <TableCell
        kind="tags"
        max={2}
        tags={[
          { value: 'a', label: 'Recurring' },
          { value: 'b', label: 'Priority' },
          { value: 'c', label: 'Overdue' },
        ]}
      />
    ),
  },
  {
    name: 'TableCell (kind="actions", appearance="outline")',
    render: () => (
      <TableCell
        kind="actions"
        appearance="outline"
        actions={[
          { id: 'reject', icon: <ArrowRight />, label: 'Reject', tone: 'destructive' },
          { id: 'accept', icon: <ArrowRight />, label: 'Accept', tone: 'primary' },
        ]}
      />
    ),
  },
  {
    name: 'EntityPickerDrawer (open)',
    render: () => (
      <EntityPickerDrawer
        open
        onOpenChange={() => {}}
        items={PICKER_ITEMS}
        value={[]}
        entityLabel="contact"
        onChange={() => {}}
      />
    ),
  },
  { name: 'LinkedEntityChip', render: () => <LinkedEntityChip label="Acme Corp" onRemove={() => {}} /> },
  {
    name: 'StateTransitionToolbar',
    render: () => <StateTransitionToolbar currentStage={CURRENT_STAGE} transitions={TRANSITIONS} />,
  },
  {
    name: 'StatusTransitionDropdown (open)',
    render: () => (
      <StatusTransitionDropdown stages={STAGES} currentId="in-progress" onTransition={() => {}} defaultOpen />
    ),
  },
  { name: 'ActivityFeed', render: () => <ActivityFeed entries={FEED_ENTRIES} /> },
  {
    name: 'EntityProfileCard',
    render: () => (
      <EntityProfileCard name="Asset 42" identifier="AB-1234" subtitle="Lot 1 · Compactor" fields={PROFILE_FIELDS} />
    ),
  },
  {
    name: 'DateRangePicker (open)',
    render: () => <DateRangePicker onChange={() => {}} />,
    open: () => {
      fireEvent.click(screen.getByRole('button', { name: /Select date range/ }))
    },
  },
  {
    // Static render — drag simulation is out of scope (see Kanban.test.tsx);
    // pragmatic-drag-and-drop's draggable()/dropTargetForElements() attach
    // fine in jsdom for a non-dragging board. Two columns so the card's
    // keyboard-accessible "Move to…" menu (the a11y fallback — pragmatic-dnd
    // ships no built-in keyboard DnD) has a reachable target; `open` renders
    // it OPEN (Radix menus open on pointerdown, unavailable in jsdom, or
    // keyboard — same workaround as the `DropdownMenu (open)` fixture above)
    // so its portal content gets real axe coverage. `onClick` is supplied so
    // the whole-card open button (fix7, run-2026-09-05) renders too, proving
    // its sibling-overlay pattern — not nested inside the move trigger or any
    // other interactive descendant — never trips axe's `nested-interactive`.
    name: 'KanbanBoard + KanbanColumn + KanbanCard',
    render: () => (
      <KanbanBoard columns={[{ id: 'todo' }, { id: 'done' }]} onCardMove={() => {}}>
        <KanbanColumn id="todo" title="To do" count={1}>
          <KanbanCard
            id="card-1"
            index={0}
            title="Fix GPS drift"
            tone="warning"
            onClick={() => {}}
            badges={
              <>
                <Badge variant="muted">WO-1042</Badge>
                <Badge variant="warning" className="ms-auto">High</Badge>
              </>
            }
            metadataFields={<span>Truck AUH-4471</span>}
            coverImage="/vehicle.jpg"
            coverImageAlt="Truck AUH-4471 at the depot"
            avatars={[{ name: 'Kashish Bindrani' }]}
            footerEnd={<span>Due Jun 5</span>}
          />
        </KanbanColumn>
        <KanbanColumn id="done" title="Done" count={0} />
      </KanbanBoard>
    ),
    open: () => {
      fireEvent.keyDown(screen.getByRole('button', { name: 'Move to column: Fix GPS drift' }), {
        key: 'Enter',
      })
    },
  },

  // ── L4 shells ──
  {
    name: 'AppShell (with SideNav + TopNav)',
    render: () => (
      <AppShell sidebar={<SideNav items={NAV_ITEMS} />} topNav={<TopNav brand={<span>Bins Module</span>} />}>
        <div>page content</div>
      </AppShell>
    ),
  },
  {
    name: 'SideNav',
    render: () => (
      <SideNav
        items={NAV_ITEMS}
        preItems={[{ label: 'Pinned', to: '/pinned', notificationDot: true, icon: <svg aria-hidden="true" /> }]}
      />
    ),
  },
  { name: 'SideNavFooterItem', render: () => <SideNavFooterItem label="Settings" icon={<svg aria-hidden="true" />} /> },
  {
    name: 'TopNav',
    render: () => <TopNav brand={<span>Brand</span>} actions={<Button variant="secondary">Action</Button>} onMenuClick={() => {}} />,
  },
  { name: 'ModuleRail', render: () => <ModuleRail items={RAIL_ITEMS} /> },
  {
    name: 'PageHeader',
    render: () => <PageHeader title="Bins" subtitle="3 bins" actions={<Button>New</Button>} />,
  },
  {
    name: 'ListView',
    render: () => (
      <ListView title="Bins" subtitle="3 bins" filterBar={<Input aria-label="Filter" />}>
        <div>rows</div>
      </ListView>
    ),
  },
  {
    name: 'HybridView + MapPlaceholder',
    render: () => <HybridView list={<div>list</div>} map={<MapPlaceholder />} />,
  },
  { name: 'ProfileLayout', render: () => <ProfileLayout title="Truck 07" tabs={PROFILE_TABS} /> },
  {
    name: 'RecordLayout + DetailSection + FieldGrid',
    render: () => (
      <RecordLayout title="WO-4821" category="Work order" subtitle="Created 2 days ago" aside={<div>Key facts</div>}>
        <DetailSection title="Overview">
          <FieldGrid fields={[{ label: 'Model', value: 'Compactor 4200' }, { label: 'VIN', value: undefined }]} />
        </DetailSection>
      </RecordLayout>
    ),
  },
  {
    name: 'DetailSheet (open)',
    render: () => (
      <DetailSheet open onOpenChange={() => {}} title="Truck QAD-4021" subtitle="Lot 1 · Lavajet">
        <p>Record body content.</p>
      </DetailSheet>
    ),
  },
  {
    name: 'FormSheet (open)',
    render: () => (
      <FormSheet open onOpenChange={() => {}} title="Edit vehicle" onSave={() => {}}>
        <Input aria-label="Plate" />
      </FormSheet>
    ),
  },
  {
    name: 'DashboardLayout',
    render: () => (
      <DashboardLayout header={<PageHeader title="Fleet overview" />} kpis={<KpiTile label="Active" value="42" />} footer={<div>Activity feed</div>}>
        <div>Chart 1</div>
      </DashboardLayout>
    ),
  },

  // ── Domain — map ──
  // None of the map components skip: they are engine-agnostic DOM/SVG chrome.
  // The actual WebGL canvas (MapLibre) is supplied BY THE CALLER as
  // `MapContainer`'s children, so a placeholder div is a realistic fixture.
  {
    name: 'VehiclePopupCard',
    render: () => (
      <VehiclePopupCard
        model="Hilux 2023"
        plate="AUH-12345"
        driver="Ali Hassan"
        location="Al Rayyan Rd, Doha"
        status="Moving"
        statusTone="success"
        fields={[{ icon: <Fuel aria-hidden="true" />, label: 'Fuel', value: '64%' }]}
        onClose={() => {}}
      />
    ),
  },
  { name: 'VehicleMarker', render: () => <VehicleMarker label="AUH-1" meta="41m" tone="success" selected /> },
  { name: 'MapStatusMarker', render: () => <MapStatusMarker status="moving" variant="tinted" selected /> },
  { name: 'AssetStatusIcon', render: () => <AssetStatusIcon status="moving" icon={<img src="/car.svg" alt="" />} /> },
  {
    name: 'VehicleIcon3D (labeled, list anatomy + decorative, tile anatomy)',
    render: () => (
      <div>
        <VehicleIcon3D size="sm" tone="success" badge="start" label="Vehicle 45213" />
        <VehicleIcon3D size="md" tone="error" badge="end" />
        <VehicleIcon3D size={26} />
      </div>
    ),
  },
  { name: 'MapChip', render: () => <MapChip variant="glass">41m</MapChip> },
  {
    name: 'PoiMarker + PoiCategoryChip',
    render: () => (
      <div>
        <PoiMarker poi={{ id: 'p1', name: 'Doha Port', category: 'port', radiusMeters: 50 }} />
        <PoiCategoryChip category="hospital" />
      </div>
    ),
  },
  {
    name: 'ClusterBadge',
    render: () => (
      <ClusterBadge
        count={1284}
        segments={[
          { tone: 'success', count: 800 },
          { tone: 'warning', count: 300 },
          { tone: 'error', count: 184 },
        ]}
      />
    ),
  },
  {
    name: 'VehicleEventsList',
    render: () => (
      <VehicleEventsList
        events={[
          { id: 'e1', name: 'Black Spot', subtype: 'Camera obstructed', location: 'West Bay – Doha', time: '07 Oct, 24 | 02:49 PM' },
        ]}
      />
    ),
  },
  {
    name: 'VehicleTripsPanel',
    render: () => (
      <VehicleTripsPanel
        dates={[
          { id: 'today', label: 'Today', today: true },
          { id: 'd15', label: '15 Oct 2024' },
        ]}
        selectedDateId="d15"
        onDateChange={() => {}}
        onClearDate={() => {}}
        summary={{ distance: '43 km', trips: 30, duration: '2h43m' }}
        showLatest={false}
        onShowLatestChange={() => {}}
        trips={[
          { id: 't1', startTime: '15:30', endTime: '11:21', origin: 'Cluster M, West Bay – Doha', events: 2, distance: '30 KM', duration: '2h 43m' },
        ]}
      />
    ),
  },
  {
    name: 'VehicleDevicesTable',
    render: () => (
      <VehicleDevicesTable
        devices={[
          { id: 'd1', name: 'Temp Sensor', imei: '356938035643809', dataRec: '12:32', value: '54°C', valueTone: 'error', trend: true },
        ]}
      />
    ),
  },
  {
    name: 'MapIconButton',
    render: () => (
      <MapIconButton label="Search the map">
        <Search aria-hidden="true" />
      </MapIconButton>
    ),
  },
  {
    name: 'MapControlGroup',
    render: () => (
      <MapControlGroup>
        <MapIconButton label="Search the map">
          <Search aria-hidden="true" />
        </MapIconButton>
        <MapIconButton label="Toggle layers" active>
          <Layers aria-hidden="true" />
        </MapIconButton>
      </MapControlGroup>
    ),
  },
  { name: 'MapZoomControl', render: () => <MapZoomControl onZoomIn={() => {}} onZoomOut={() => {}} onFullscreen={() => {}} /> },
  {
    // Hover-row EXPANDED: the listbox of style cards is what gets scanned.
    name: 'MapLayersSwitcher (expanded)',
    render: () => (
      <MapLayersSwitcher
        defaultOpen
        styles={[
          { id: 'muted', label: 'Muted' },
          { id: 'bright', label: 'Bright' },
          { id: 'dark', label: 'Dark' },
        ]}
        activeStyleId="muted"
        onStyleChange={() => {}}
      />
    ),
  },
  {
    name: 'MapContainer',
    render: () => (
      <MapContainer
        controls={{
          onSearch: () => {},
          onToggleLayers: () => {},
          layersActive: true,
          onZoomIn: () => {},
          onZoomOut: () => {},
          onFullscreen: () => {},
        }}
      >
        <div aria-label="Map canvas placeholder" role="img" />
      </MapContainer>
    ),
  },
]

// ── The sweep ────────────────────────────────────────────────────────────

describe('axe a11y sweep — every exported component', () => {
  for (const fixture of FIXTURES) {
    if (!fixture.render) {
      it.skip(`${fixture.name} — SKIPPED: ${fixture.skip}`, () => {})
      continue
    }
    it(`${fixture.name} has no axe violations`, async () => {
      const previousTheme = document.documentElement.getAttribute('data-theme')
      if (fixture.theme) document.documentElement.setAttribute('data-theme', fixture.theme)
      try {
        await sweep(fixture)
      } finally {
        if (previousTheme === null) document.documentElement.removeAttribute('data-theme')
        else document.documentElement.setAttribute('data-theme', previousTheme)
      }
    })
  }

  async function sweep(fixture: Fixture) {
      render(fixture.render!())
      await fixture.open?.()
      // Radix portals mount overlay content on document.body, outside the
      // render container — scan the whole body so overlays are included.
      const results = await axe(
        document.body,
        fixture.disableRules
          ? {
              rules: Object.fromEntries(fixture.disableRules.map((rule) => [rule, { enabled: false }])),
            }
          : undefined,
      )
      expect(results).toHaveNoViolations()
  }

  it('covers a fixture for every renderable export (registry sanity)', () => {
    // Guards against silently dropping fixtures during refactors. Tracks the
    // real barrel export count (`./index`) instead of a hand-maintained magic
    // number that goes stale every time a component is added. Not a 1:1
    // check — many fixtures cover a whole compound family in one entry (e.g.
    // "Card (compound)" exercises Card/CardHeader/CardTitle/CardDescription/
    // CardContent/CardFooter), and the barrel also exports non-component
    // values (cva `*Variants` helpers) — so the floor is a fraction of the
    // barrel's total export count, derived from today's actual ratio
    // (~95 fixtures / ~199 exports), not an arbitrary round number.
    const barrelExportCount = Object.keys(UI).length
    expect(FIXTURES.length).toBeGreaterThanOrEqual(Math.floor(barrelExportCount * 0.4))
  })
})

/**
 * The colour half of the dark-podium defect class.
 *
 * axe's `color-contrast` rule is off in this file and always will be: jsdom
 * has no paint engine, so a dark-theme FIXTURE proves the a11y TREE is sound
 * but can never prove the ink is legible. `--color-medal-*-surface` /
 * `-accent` are filled grounds painted under `text-foreground`, and they
 * shipped light-only — measuring 1.00-1.26:1 against the dark-mode
 * foreground. So the contrast is asserted here, numerically, straight off the
 * built stylesheet, for the exact pairing `LeaderboardPodium` renders.
 *
 * `-border` is deliberately excluded: it is a stroke at 50% opacity, not a
 * ground, and is theme-neutral on purpose (see
 * `packages/tokens/test/theme-parity.test.js`).
 */
describe('dark-theme medal surfaces are legible under text-foreground', () => {
  // `import.meta.url` is an http: URL under the jsdom environment, so the
  // built stylesheet is located from the vitest cwd instead.
  const themeCssPath = (() => {
    let dir = process.cwd()
    for (let depth = 0; depth < 5; depth += 1) {
      for (const relative of ['packages/tokens/dist/theme.css', '../tokens/dist/theme.css']) {
        const candidate = join(dir, relative)
        if (existsSync(candidate)) return candidate
      }
      dir = join(dir, '..')
    }
    throw new Error('@fams/tokens dist/theme.css not found — run `pnpm --filter @fams/tokens build`')
  })()
  const themeCss = readFileSync(themeCssPath, 'utf8')

  /** Read one `--<name>` declaration out of the `:root[data-theme="dark"]` block. */
  const darkBlock = (() => {
    const start = themeCss.indexOf(':root[data-theme="dark"] {')
    const end = themeCss.indexOf('\n}', start)
    return themeCss.slice(start, end)
  })()
  const readVar = (block: string, name: string): string => {
    const match = block.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
    if (!match) throw new Error(`missing token in dark block: --${name}`)
    return match[1]
  }

  /** WCAG 2.x relative luminance + contrast ratio. */
  const relativeLuminance = (hex: string): number => {
    const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  }
  const contrastRatio = (a: string, b: string): number => {
    const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }

  const GROUNDS = [
    'color-medal-gold-surface',
    'color-medal-gold-accent',
    'color-medal-silver-surface',
    'color-medal-silver-accent',
    'color-medal-bronze-surface',
    'color-medal-bronze-accent',
  ]

  for (const ground of GROUNDS) {
    it(`${ground} carries a dark override at >= 4.5:1 against text-foreground`, () => {
      const foreground = readVar(darkBlock, 'color-foreground')
      const surface = readVar(darkBlock, ground)
      expect(contrastRatio(foreground, surface)).toBeGreaterThanOrEqual(4.5)
    })
  }
})


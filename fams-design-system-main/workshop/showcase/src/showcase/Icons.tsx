import { useState } from 'react'
import { Section } from './kit'
import { ICON_SIZES } from './tokens'
import {
  LayoutDashboard,
  Map,
  Truck,
  ClipboardCheck,
  Settings,
  Search,
  Plus,
  Download,
  Upload,
  Bell,
  User,
  Users,
  Calendar,
  Clock,
  MapPin,
  Navigation,
  Route,
  Fuel,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  Trash2,
  Recycle,
  Package,
  Filter,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Menu,
  X,
  Eye,
  Pencil,
  Copy,
  ExternalLink,
  RefreshCw,
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
  Wrench,
  Shield,
  Camera,
  Wifi,
  Battery,
  Icon,
  iconNames,
  type LucideIcon,
} from '@fams/ui-kit/icons'

const ICONS: { name: string; Glyph: LucideIcon }[] = [
  { name: 'LayoutDashboard', Glyph: LayoutDashboard },
  { name: 'Map', Glyph: Map },
  { name: 'Truck', Glyph: Truck },
  { name: 'ClipboardCheck', Glyph: ClipboardCheck },
  { name: 'Settings', Glyph: Settings },
  { name: 'Search', Glyph: Search },
  { name: 'Plus', Glyph: Plus },
  { name: 'Download', Glyph: Download },
  { name: 'Upload', Glyph: Upload },
  { name: 'Bell', Glyph: Bell },
  { name: 'User', Glyph: User },
  { name: 'Users', Glyph: Users },
  { name: 'Calendar', Glyph: Calendar },
  { name: 'Clock', Glyph: Clock },
  { name: 'MapPin', Glyph: MapPin },
  { name: 'Navigation', Glyph: Navigation },
  { name: 'Route', Glyph: Route },
  { name: 'Fuel', Glyph: Fuel },
  { name: 'Gauge', Glyph: Gauge },
  { name: 'AlertTriangle', Glyph: AlertTriangle },
  { name: 'CheckCircle2', Glyph: CheckCircle2 },
  { name: 'XCircle', Glyph: XCircle },
  { name: 'Info', Glyph: Info },
  { name: 'Trash2', Glyph: Trash2 },
  { name: 'Recycle', Glyph: Recycle },
  { name: 'Package', Glyph: Package },
  { name: 'Filter', Glyph: Filter },
  { name: 'ChevronDown', Glyph: ChevronDown },
  { name: 'ChevronRight', Glyph: ChevronRight },
  { name: 'ArrowRight', Glyph: ArrowRight },
  { name: 'Menu', Glyph: Menu },
  { name: 'X', Glyph: X },
  { name: 'Eye', Glyph: Eye },
  { name: 'Pencil', Glyph: Pencil },
  { name: 'Copy', Glyph: Copy },
  { name: 'ExternalLink', Glyph: ExternalLink },
  { name: 'RefreshCw', Glyph: RefreshCw },
  { name: 'FileText', Glyph: FileText },
  { name: 'BarChart3', Glyph: BarChart3 },
  { name: 'PieChart', Glyph: PieChart },
  { name: 'TrendingUp', Glyph: TrendingUp },
  { name: 'Wrench', Glyph: Wrench },
  { name: 'Shield', Glyph: Shield },
  { name: 'Camera', Glyph: Camera },
  { name: 'Wifi', Glyph: Wifi },
  { name: 'Battery', Glyph: Battery },
].sort((a, b) => a.name.localeCompare(b.name))

export function Icons() {
  const [q, setQ] = useState('')
  const filtered = ICONS.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <>
      <Section
        id="icon-sizes"
        title="Icon sizes"
        description="The icon-size token scale — 2xs (14px) through 2xl (48px). Icons use currentColor so they inherit the surrounding text colour."
      >
        <div className="flex flex-wrap items-end gap-8">
          {ICON_SIZES.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-2">
              <Truck size={s.px} className="text-primary" />
              <span className="text-caption font-semibold text-foreground">{s.name}</span>
              <code className="text-caption text-muted-foreground">{s.px}px</code>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="icon-library"
        title="Icon library"
        description="A curated slice of the canonical FAMS V5 icon library used across the platform — navigation, fleet, alerts, hardware and actions. Search by name."
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search icons…"
          className="mb-6 w-full max-w-xs rounded-sm border border-border bg-card px-3 py-2 text-body-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring"
        />
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {filtered.map(({ name, Glyph }) => (
            <div
              key={name}
              className="flex flex-col items-center gap-2.5 rounded-md border border-border bg-card p-4 text-center transition-colors hover:border-primary hover:shadow-sm"
            >
              <Glyph size={24} className="text-foreground" />
              <span className="w-full truncate text-caption text-muted-foreground" title={name}>
                {name}
              </span>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-body-sm text-muted-foreground">No icons match “{q}”.</p>
          )}
        </div>
      </Section>

      <Section
        id="icon-generic"
        title="Icon — by name"
        description={`The generic <Icon name="…" /> component: every glyph the design system vendors from the canonical FAMS V5 icon library, addressed by its library filename (plus the legacy/metadata aliases blueprints author). ${iconNames.length} names resolve. Decorative by default — pass \`title\` for an accessible name.`}
      >
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {iconNames
            .filter((n) => n.toLowerCase().includes(q.toLowerCase()))
            .slice(0, 96)
            .map((n) => (
              <div
                key={n}
                className="flex flex-col items-center gap-2.5 rounded-md border border-border bg-card p-4 text-center transition-colors hover:border-primary hover:shadow-sm"
              >
                <Icon name={n} size={24} className="text-foreground" />
                <span className="w-full truncate text-caption text-muted-foreground" title={n}>
                  {n}
                </span>
              </div>
            ))}
        </div>
      </Section>
    </>
  )
}

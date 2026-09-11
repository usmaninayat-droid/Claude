import { useState, useEffect, useMemo } from 'react'
import { Search, LayoutGrid, Flag, Truck } from 'lucide-react'
import { SettingsNav, Breadcrumbs, Input, Select, SelectTrigger, SelectContent, SelectItem, cn } from '@fams/design-system'
import { SETTINGS_SECTIONS } from './settingsNavData'
import { ComingSoonPanel } from './ComingSoonPanel'
import { NotificationsConfigurationPage } from './notifications-configuration/NotificationsConfigurationPage'
import { NotificationsConfigurationPage2 } from './notifications-configuration-2/NotificationsConfigurationPage2'
import { MyNotificationsPage } from './my-notifications/MyNotificationsPage'
import { DeviceConfigPage } from './device-config/DeviceConfigPage'
import { VEHICLE_TYPE_LABEL } from './device-config/deviceConfigData'
import {
  MODULES, CRITICALITY_LEVELS, CRITICALITY_COLOR, NOTIFICATION_TYPES, CHANNELS_NO_PUSH,
  type Criticality, type NotificationType,
} from './notifications-configuration/notificationsConfigData'
import { CustomScrollbar } from '../../components/CustomScrollbar'

const ALL_ITEMS = SETTINGS_SECTIONS.flatMap((s) => s.items)

const getActiveIdFromPath = () => {
  const hash = window.location.hash
  const prefix = '#/settings/'
  if (hash.startsWith(prefix)) {
    const sub = hash.slice(prefix.length)
    if (sub && ALL_ITEMS.some((i) => i.id === sub)) {
      return sub
    }
  }
  return 'notifications-configuration'
}

export function SettingsPage() {
  const [activeId, setActiveId] = useState(getActiveIdFromPath)
  const [searchQuery, setSearchQuery] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [criticalityFilter, setCriticalityFilter] = useState('all')
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all')

  useEffect(() => {
    const handleHashChange = () => {
      setActiveId(getActiveIdFromPath())
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    const hash = window.location.hash
    if (hash === '#/settings' || hash === '#/settings/') {
      window.location.hash = '#/settings/notifications-configuration'
    }
  }, [])

  const active = ALL_ITEMS.find((i) => i.id === activeId) ?? ALL_ITEMS[0]

  /**
   * The rows the active page can currently show. The filters live here in the
   * chrome, but they have to describe the page underneath — so each page
   * reports its own corpus (profile tab / selected role / custom notifications
   * all move it) and the options + counts are derived from that, never from a
   * fixed list. `NOTIFICATION_TYPES` is only the seed before the first report.
   */
  const [filterCorpus, setFilterCorpus] = useState<NotificationType[]>(NOTIFICATION_TYPES)

  /** Modules present in the corpus, in catalogue order, each with its row count. */
  const moduleOptions = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of filterCorpus) counts.set(t.module, (counts.get(t.module) ?? 0) + 1)
    return MODULES.filter((m) => counts.has(m)).map((m) => ({ id: m, count: counts.get(m) ?? 0 }))
  }, [filterCorpus])

  /** Same for criticality — a level with nothing behind it isn't offered. */
  const criticalityOptions = useMemo(() => {
    const counts = new Map<Criticality, number>()
    for (const t of filterCorpus) counts.set(t.criticality, (counts.get(t.criticality) ?? 0) + 1)
    return CRITICALITY_LEVELS.filter((l) => counts.has(l.id)).map((l) => ({
      ...l,
      count: counts.get(l.id) ?? 0,
    }))
  }, [filterCorpus])

  const totalInCorpus = filterCorpus.length

  // A filter picked on one page can be meaningless on the next — drop it rather
  // than leaving the page silently filtered by something not on offer.
  useEffect(() => {
    if (moduleFilter !== 'all' && !moduleOptions.some((m) => m.id === moduleFilter)) {
      setModuleFilter('all')
    }
    if (criticalityFilter !== 'all' && !criticalityOptions.some((l) => l.id === criticalityFilter)) {
      setCriticalityFilter('all')
    }
  }, [moduleOptions, criticalityOptions, moduleFilter, criticalityFilter])

  const sections = SETTINGS_SECTIONS.map((section) => ({
    label: section.label,
    items: section.items.map((item) => ({
      ...item,
      active: item.id === activeId,
      onClick: () => {
        window.location.hash = `#/settings/${item.id}`
        setActiveId(item.id)
        setSearchQuery('')
        setModuleFilter('all')
        setCriticalityFilter('all')
        setVehicleTypeFilter('all')
      },
    })),
  }))

  return (
    <div className="flex min-h-0 flex-1">
      <SettingsNav sections={sections} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <CustomScrollbar className="min-h-0 flex-1" viewportClassName="px-6 pb-6 pt-0">
          <div className="flex items-center justify-between pt-6 pb-5 flex-wrap gap-y-2">
            <Breadcrumbs items={[{ label: 'Settings' }, { label: active.label }]} />
            {activeId === 'device-config' && (
              <div className="flex items-center gap-2.5">
                <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
                  <SelectTrigger className="h-9 w-[160px] bg-card text-xs">
                    <div className="flex items-center gap-1.5 text-foreground">
                      <Truck className="size-3.5 text-muted-foreground" />
                      {vehicleTypeFilter === 'all'
                        ? 'Vehicle type'
                        : `${vehicleTypeFilter} — ${VEHICLE_TYPE_LABEL[vehicleTypeFilter as keyof typeof VEHICLE_TYPE_LABEL]}`}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All vehicle types</SelectItem>
                    {(Object.keys(VEHICLE_TYPE_LABEL) as Array<keyof typeof VEHICLE_TYPE_LABEL>).map((t) => (
                      <SelectItem key={t} value={t}>
                        {t} — {VEHICLE_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search plate, VIN, IMEI or model"
                  leadingIcon={<Search />}
                  containerClassName="w-[320px]"
                  className="h-9"
                />
              </div>
            )}
            {(activeId === 'notifications-configuration' || activeId === 'notifications-configuration-2' || activeId === 'my-notification-preferences') && (
              <div className="flex items-center gap-2.5">
                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger className="h-9 w-[140px] bg-card text-xs">
                    <div className="flex items-center gap-1.5 text-foreground">
                      <LayoutGrid className="size-3.5 text-muted-foreground" />
                      {moduleFilter === 'all' ? 'Module' : moduleFilter}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All modules ({moduleOptions.length})</SelectItem>
                    {moduleOptions.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.id} ({m.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
                  <SelectTrigger className="h-9 w-[140px] bg-card text-xs">
                    <div className="flex items-center gap-1.5 text-foreground">
                      <Flag className="size-3.5 text-muted-foreground" />
                      {criticalityFilter === 'all'
                        ? 'Criticality'
                        : criticalityOptions.find((l) => l.id === criticalityFilter)?.label ?? 'Criticality'}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All criticality ({totalInCorpus})</SelectItem>
                    {criticalityOptions.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        <span className={cn('mr-1.5 inline-block size-1.5 rounded-full', CRITICALITY_COLOR[l.id].dot)} />
                        {l.label} ({l.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by module or notification title"
                  leadingIcon={<Search />}
                  containerClassName="w-[320px]"
                  className="h-9"
                />
              </div>
            )}
          </div>

          {activeId === 'notifications-configuration' ? (
            <NotificationsConfigurationPage2
              query={searchQuery}
              moduleFilter={moduleFilter}
              criticalityFilter={criticalityFilter as any}
              title="Notification Configuration"
              showNewNotification={false}
              channels={CHANNELS_NO_PUSH}
              onCorpusChange={setFilterCorpus}
            />
          ) : activeId === 'notifications-configuration-2' ? (
            <NotificationsConfigurationPage2
              query={searchQuery}
              moduleFilter={moduleFilter}
              criticalityFilter={criticalityFilter as any}
              onCorpusChange={setFilterCorpus}
            />
          ) : activeId === 'device-config' ? (
            <DeviceConfigPage query={searchQuery} vehicleTypeFilter={vehicleTypeFilter} />
          ) : activeId === 'my-notification-preferences' ? (
            <MyNotificationsPage
              query={searchQuery}
              moduleFilter={moduleFilter}
              criticalityFilter={criticalityFilter as any}
              onCorpusChange={setFilterCorpus}
            />
          ) : (
            <ComingSoonPanel label={active.label} icon={active.icon} />
          )}
        </CustomScrollbar>
      </div>
    </div>
  )
}

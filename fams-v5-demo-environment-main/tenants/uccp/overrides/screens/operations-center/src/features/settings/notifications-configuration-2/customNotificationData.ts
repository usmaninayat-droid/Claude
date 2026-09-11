import type { Criticality, Channel } from './notificationsConfigData2'

export interface EntityField {
  id: string
  label: string
  type: 'number' | 'select' | 'boolean'
  unit?: string
  options?: string[]
  defaultVal: string | number
}

export interface ModuleEntity {
  id: string
  label: string
  fields: EntityField[]
}

export interface ModuleDefinition {
  id: string
  label: string
  entities: ModuleEntity[]
}

export const OPERATORS = {
  number: [
    { id: 'gt', label: 'is greater than (>)' },
    { id: 'lt', label: 'is less than (<)' },
    { id: 'gte', label: 'is greater than or equal to (≥)' },
    { id: 'lte', label: 'is less than or equal to (≤)' },
    { id: 'eq', label: 'is equal to (=)' },
  ],
  select: [
    { id: 'eq', label: 'is equal to (=)' },
    { id: 'neq', label: 'is not equal to (≠)' },
    { id: 'changes_to', label: 'changes to' },
  ],
  boolean: [
    { id: 'is_true', label: 'is True' },
    { id: 'is_false', label: 'is False' },
  ],
} as const

export const CUSTOM_MODULE_DEFINITIONS: ModuleDefinition[] = [
  {
    id: 'Dispatching',
    label: 'Dispatching',
    entities: [
      {
        id: 'dispatch_plan',
        label: 'Dispatch Plan',
        fields: [
          { id: 'delay_mins', label: 'Plan Delay', type: 'number', unit: 'mins', defaultVal: 15 },
          { id: 'status', label: 'Plan Status', type: 'select', options: ['Draft', 'Published', 'Delayed', 'Cancelled'], defaultVal: 'Delayed' },
          { id: 'completion_pct', label: 'Completion %', type: 'number', unit: '%', defaultVal: 80 },
        ],
      },
      {
        id: 'trip',
        label: 'Trip / Route',
        fields: [
          { id: 'eta_delay', label: 'ETA Delay', type: 'number', unit: 'mins', defaultVal: 20 },
          { id: 'stoppage_time', label: 'Unscheduled Stop Time', type: 'number', unit: 'mins', defaultVal: 10 },
          { id: 'off_route', label: 'Off Route Distance', type: 'number', unit: 'km', defaultVal: 5 },
        ],
      },
    ],
  },
  {
    id: 'Events',
    label: 'Events',
    entities: [
      {
        id: 'incident',
        label: 'Incident Alert',
        fields: [
          { id: 'severity', label: 'Incident Severity', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'], defaultVal: 'Critical' },
          { id: 'response_delay', label: 'Response Delay', type: 'number', unit: 'mins', defaultVal: 10 },
          { id: 'resolution_status', label: 'Resolution Status', type: 'select', options: ['Pending', 'In Progress', 'Resolved', 'Escalated'], defaultVal: 'Escalated' },
        ],
      },
      {
        id: 'safety_event',
        label: 'Safety Anomaly',
        fields: [
          { id: 'event_type', label: 'Event Type', type: 'select', options: ['Harsh Braking', 'Harsh Acceleration', 'Cornering', 'Drowsiness'], defaultVal: 'Harsh Braking' },
          { id: 'duration_secs', label: 'Duration', type: 'number', unit: 'secs', defaultVal: 5 },
        ],
      },
    ],
  },
  {
    id: 'Fleet',
    label: 'Fleet',
    entities: [
      {
        id: 'vehicle',
        label: 'Vehicle',
        fields: [
          { id: 'speed', label: 'Vehicle Speed', type: 'number', unit: 'km/h', defaultVal: 80 },
          { id: 'fuel_level', label: 'Fuel Level', type: 'number', unit: '%', defaultVal: 15 },
          { id: 'engine_temp', label: 'Engine Temp', type: 'number', unit: '°C', defaultVal: 95 },
          { id: 'battery_voltage', label: 'Battery Voltage', type: 'number', unit: 'V', defaultVal: 11.5 },
        ],
      },
      {
        id: 'sensor',
        label: 'Telematics Sensor',
        fields: [
          { id: 'connection_status', label: 'Sensor Connection', type: 'select', options: ['Online', 'Offline', 'Tampered'], defaultVal: 'Offline' },
          { id: 'signal_strength', label: 'Signal Strength', type: 'number', unit: '%', defaultVal: 20 },
        ],
      },
    ],
  },
  {
    id: 'Maintenance',
    label: 'Maintenance',
    entities: [
      {
        id: 'service_order',
        label: 'Service Order',
        fields: [
          { id: 'overdue_days', label: 'Overdue Time', type: 'number', unit: 'days', defaultVal: 3 },
          { id: 'priority', label: 'Work Order Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'], defaultVal: 'Urgent' },
        ],
      },
    ],
  },
  {
    id: 'Workforce',
    label: 'Workforce',
    entities: [
      {
        id: 'driver_shift',
        label: 'Driver Shift',
        fields: [
          { id: 'driving_hours', label: 'Continuous Driving Hours', type: 'number', unit: 'hrs', defaultVal: 8 },
          { id: 'rest_break_delay', label: 'Rest Break Overdue', type: 'number', unit: 'mins', defaultVal: 30 },
        ],
      },
    ],
  },
  {
    id: 'Compliance',
    label: 'Compliance',
    entities: [
      {
        id: 'inspection',
        label: 'Safety Inspection',
        fields: [
          { id: 'pass_score', label: 'Pass Score', type: 'number', unit: '%', defaultVal: 70 },
          { id: 'violation_count', label: 'Violation Count', type: 'number', defaultVal: 2 },
        ],
      },
    ],
  },
]

/**
 * Quick-start templates for the v2 Composer flow. Each one prefills the whole
 * composer (trigger + severity + suggested copy + default channels) so a common
 * alert can be created in one click and then tweaked. `iconKey` maps to a lucide
 * icon inside the component (data file stays JSX-free).
 */
export interface NotificationTemplate {
  id: string
  label: string
  blurb: string
  iconKey: 'gauge' | 'fuel' | 'thermometer' | 'clock' | 'wrench' | 'shield'
  moduleId: string
  entityId: string
  fieldId: string
  operatorId: string
  value: string | number
  criticality: Criticality
  title: string
  description: string
  channels: Channel[]
}

export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'tpl-speeding',
    label: 'Speeding Alert',
    blurb: 'Vehicle exceeds a speed limit',
    iconKey: 'gauge',
    moduleId: 'Fleet', entityId: 'vehicle', fieldId: 'speed', operatorId: 'gt', value: 85,
    criticality: 'critical',
    title: 'Vehicle Speeding',
    description: 'A vehicle has exceeded the safe speed threshold on an active route.',
    channels: ['inbox', 'toast'],
  },
  {
    id: 'tpl-low-fuel',
    label: 'Low Fuel',
    blurb: 'Fuel level drops below a limit',
    iconKey: 'fuel',
    moduleId: 'Fleet', entityId: 'vehicle', fieldId: 'fuel_level', operatorId: 'lt', value: 15,
    criticality: 'medium',
    title: 'Low Fuel Level',
    description: 'A vehicle is running low on fuel and may need refuelling before its next trip.',
    channels: ['inbox', 'toast'],
  },
  {
    id: 'tpl-overheat',
    label: 'Engine Overheat',
    blurb: 'Engine temperature too high',
    iconKey: 'thermometer',
    moduleId: 'Fleet', entityId: 'vehicle', fieldId: 'engine_temp', operatorId: 'gt', value: 100,
    criticality: 'critical',
    title: 'Engine Overheating',
    description: 'Engine coolant temperature has exceeded safe operating thresholds mid-route.',
    channels: ['inbox', 'toast'],
  },
  {
    id: 'tpl-plan-delay',
    label: 'Plan Delayed',
    blurb: 'Dispatch plan falls behind',
    iconKey: 'clock',
    moduleId: 'Dispatching', entityId: 'dispatch_plan', fieldId: 'delay_mins', operatorId: 'gt', value: 15,
    criticality: 'medium',
    title: 'Dispatch Plan Delayed',
    description: 'A dispatch plan has slipped past its scheduled window beyond the allowed threshold.',
    channels: ['inbox', 'toast'],
  },
  {
    id: 'tpl-maint-overdue',
    label: 'Maintenance Overdue',
    blurb: 'Service order past its due date',
    iconKey: 'wrench',
    moduleId: 'Maintenance', entityId: 'service_order', fieldId: 'overdue_days', operatorId: 'gt', value: 3,
    criticality: 'medium',
    title: 'Maintenance Overdue',
    description: 'A scheduled service order is overdue and should be actioned to keep the asset compliant.',
    channels: ['inbox', 'email'],
  },
  {
    id: 'tpl-incident',
    label: 'Incident Escalated',
    blurb: 'Incident reaches escalation',
    iconKey: 'shield',
    moduleId: 'Events', entityId: 'incident', fieldId: 'resolution_status', operatorId: 'eq', value: 'Escalated',
    criticality: 'critical',
    title: 'Incident Escalated',
    description: 'An incident has been escalated and requires immediate attention from the response team.',
    channels: ['inbox', 'toast', 'email'],
  },
]

export function generateLivePreviewText(params: {
  module: string
  entityLabel: string
  fieldLabel: string
  operatorLabel: string
  value: string | number
  unit?: string
  criticality: Criticality
}) {
  const formattedVal = params.unit ? `${params.value} ${params.unit}` : `${params.value}`

  const ruleText = `When [${params.fieldLabel}] in [${params.module} / ${params.entityLabel}] ${params.operatorLabel} ${formattedVal}, trigger a ${params.criticality.toUpperCase()} notification.`

  const sampleAlert = `Alert: ${params.entityLabel} (${params.fieldLabel}) ${params.operatorLabel} ${formattedVal} in ${params.module}. Immediate action required.`

  return {
    ruleText,
    sampleAlert,
  }
}

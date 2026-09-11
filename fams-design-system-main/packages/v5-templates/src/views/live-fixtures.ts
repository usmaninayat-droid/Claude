import type { EntityConfig, EntityRecord } from '@fams/v5-composer'
// Type-only map-entry import — erased at build time (lazy-weight rule).
import type { LiveVehiclePopupData } from '../map/LiveVehiclePopup'

/**
 * live-fixtures.ts — a coordinate-bound live-monitoring module fixture for
 * tests and the showcase demos (the same role `dashboard-fixtures.ts` plays
 * for the dashboard surface). Positions are `[lat, lng]` COLUMN values
 * (Doha-ish) that `deriveLiveVehicles` re-orders into GeoJSON `[lng, lat]`.
 */
export const liveMonitoringConfig: EntityConfig = {
  code: 'live-monitoring',
  name: 'Live Monitoring',
  uidPrefix: 'LV',
  systemcolumns: [
    { id: 'fld_title', col: 'title', name: 'Vehicle', type: 'SmallText', required: true },
    {
      id: 'fld_status',
      col: 'status',
      name: 'Mobility Status',
      type: 'SingleSelect',
      listValues: ['Moving', 'Idling', 'Stopped', 'Non-Reporting'],
    },
    { id: 'fld_plate', col: 'systemcol1', name: 'Plate', type: 'SmallText' },
    { id: 'fld_speed', col: 'systemcol2', name: 'Speed', type: 'Numeric' },
    { id: 'fld_lat', col: 'systemcol3', name: 'Latitude', type: 'Numeric' },
    { id: 'fld_lng', col: 'systemcol4', name: 'Longitude', type: 'Numeric' },
    { id: 'fld_driver', col: 'systemcol5', name: 'Driver', type: 'SmallText' },
    { id: 'fld_dwell', col: 'systemcol6', name: 'Dwell', type: 'SmallText' },
    { id: 'fld_heading', col: 'systemcol7', name: 'Heading', type: 'Numeric' },
    { id: 'fld_location', col: 'systemcol8', name: 'Location', type: 'SmallText' },
    { id: 'fld_since', col: 'systemcol9', name: 'Status Since', type: 'SmallText' },
    { id: 'fld_tags', col: 'systemcol10', name: 'Shift Type', type: 'SmallText' },
    { id: 'fld_fuel', col: 'systemcol11', name: 'Fuel Type', type: 'SingleSelect', listValues: ['Petrol', 'Diesel', 'Hybrid'] },
  ],
  listcolumns: [
    { id: 'fld_title', col: 'title' },
    { id: 'fld_status', col: 'status' },
    { id: 'fld_speed', col: 'systemcol2' },
  ],
  uiConfig: {
    statusList: [
      { id: 'sts_moving', key: 'Moving', label: 'Moving', color: 'var(--color-success)' },
      { id: 'sts_idling', key: 'Idling', label: 'Idling', color: 'var(--color-warning)' },
      { id: 'sts_stopped', key: 'Stopped', label: 'Stopped', color: 'var(--color-destructive)' },
      { id: 'sts_nonrep', key: 'Non-Reporting', label: 'Non-Reporting', color: 'var(--color-muted-foreground)' },
    ],
    map: {
      latCol: 'systemcol3',
      lngCol: 'systemcol4',
      statusCol: 'status',
      plateCol: 'systemcol1',
      speedCol: 'systemcol2',
      dwellCol: 'systemcol6',
      headingCol: 'systemcol7',
      driverCol: 'systemcol5',
      locationCol: 'systemcol8',
      statusSinceCol: 'systemcol9',
      tagsCol: 'systemcol10',
      expandedColumns: ['systemcol2', 'systemcol9'],
      zones: [
        {
          id: 'Z-1234',
          label: 'Z-1234',
          parent: 'Lot A',
          color: 'var(--color-warning)',
          points: [
            [51.52, 25.31],
            [51.54, 25.31],
            [51.54, 25.33],
            [51.52, 25.33],
          ],
        },
        {
          id: 'Z-2200',
          label: 'Z-2200',
          parent: 'Lot B',
          color: 'var(--color-success)',
          points: [
            [51.55, 25.32],
            [51.56, 25.32],
            [51.56, 25.34],
            [51.55, 25.34],
          ],
        },
      ],
      pois: [
        { id: 'poi-1', name: 'Lake View Tower, West Bay – Doha', position: [51.53, 25.32], radiusMeters: 43, color: 'var(--color-info)' },
        { id: 'poi-2', name: 'Central Depot', position: [51.545, 25.332], radiusMeters: 120 },
      ],
    },
    filters: [
      { col: 'status', id: 'flt_status', name: 'Mobility Status' },
      { col: 'systemcol11', id: 'flt_fuel', name: 'Fuel Type' },
    ],
    hybrid: { listColumns: ['fld_title', 'fld_status', 'fld_speed'] },
  },
}

export const liveVehicleRecords: EntityRecord[] = [
  {
    id: 'V-101',
    uniqueidentifier: 'LV-101',
    title: 'Mitsubishi X6734',
    status: 'Moving',
    systemcol1: 'Y 31022',
    systemcol2: 100,
    systemcol3: 25.324,
    systemcol4: 51.531,
    systemcol5: 'Jhon Doe',
    systemcol7: 45,
    systemcol8: 'West Bay – Doha',
    systemcol9: 'since 2 minutes',
    systemcol10: 'Street',
    systemcol11: 'Petrol',
  },
  {
    id: 'V-102',
    uniqueidentifier: 'LV-102',
    title: 'Toyota Hilux 42',
    status: 'Idling',
    systemcol1: 'D 88451',
    systemcol2: 0,
    systemcol3: 25.329,
    systemcol4: 51.539,
    systemcol5: 'Dana Reyes',
    systemcol6: '12 mins',
    systemcol8: 'Lusail Marina – Doha',
    systemcol9: 'since 12 minutes',
    systemcol10: 'Night Shift',
    systemcol11: 'Diesel',
  },
  {
    id: 'V-103',
    uniqueidentifier: 'LV-103',
    title: 'Ashok Leyland T9',
    status: 'Stopped',
    systemcol1: 'A 10930',
    systemcol2: 0,
    systemcol3: 25.318,
    systemcol4: 51.525,
    systemcol5: 'Avery Stone',
    systemcol6: '37 mins',
    systemcol8: 'Industrial Area – Doha',
    systemcol9: 'since 37 minutes',
    systemcol10: 'Street',
    systemcol11: 'Hybrid',
  },
  {
    id: 'V-104',
    uniqueidentifier: 'LV-104',
    title: 'Nissan Patrol 7',
    status: 'Non-Reporting',
    systemcol1: 'N 55210',
    systemcol3: 25.335,
    systemcol4: 51.548,
    systemcol5: 'Sara Ahmed',
    systemcol8: 'Msheireb – Doha',
  },
]

/** Sample popup tab data (Critical Events / Trips / Devices) keyed by record. */
export const liveVehiclePopupData: LiveVehiclePopupData = {
  events: [
    {
      id: 'ev1',
      name: 'Black Spot',
      subtype: 'Camera obstructed',
      location: 'West Bay – Doha',
      time: '07 Oct, 24 | 02:49 PM',
      severity: 'critical',
    },
    { id: 'ev2', name: 'Harsh Braking', location: 'Al Rayyan Road', time: '07 Oct, 24 | 01:12 PM', severity: 'critical' },
  ],
  /* Figma 495:8937: the day chips, an OUTLINED `Today`, and the picked-date
     chip carrying `calendar` — the SOLID blue one (round-1 visual #15 found
     the pair inverted). Each chip carries its OWN trips + summary, so picking
     a day changes the card body (interaction 16a). */
  tripDates: [
    {
      id: 'd10',
      label: '10 Oct',
      trips: [
        {
          id: 'd10-t1',
          startTime: '08:04',
          endTime: '09:35',
          origin: 'Cluster A, Industrial Area',
          destination: 'Cluster M, West Bay – Doha',
          events: 1,
          distance: '18 KM',
          duration: '1h 31m',
        },
      ],
      summary: { distance: '18 KM', trips: 1, duration: '1h 31m' },
    },
    {
      id: 'd11',
      label: '11 Oct',
      trips: [
        {
          id: 'd11-t1',
          startTime: '07:12',
          endTime: '08:48',
          origin: 'Cluster B, Al Rayyan Road',
          destination: 'Cluster A, Industrial Area',
          events: 0,
          distance: '24 KM',
          duration: '1h 36m',
        },
        {
          id: 'd11-t2',
          startTime: '16:20',
          endTime: '17:05',
          origin: 'Cluster A, Industrial Area',
          destination: 'Cluster M, West Bay – Doha',
          events: 2,
          distance: '12 KM',
          duration: '45m',
        },
      ],
      summary: { distance: '36 KM', trips: 2, duration: '2h 21m' },
    },
    { id: 'today', label: 'Today', today: true },
    {
      id: 'd15',
      label: '15 Oct 2024',
      calendar: true,
      trips: [
        {
          id: 'd15-t1',
          startTime: '15:30',
          endTime: '11:21',
          origin: 'Cluster M, West Bay – Doha',
          destination: 'Cluster B, Al Rayyan Road',
          events: 2,
          distance: '30 KM',
          duration: '2h 43m',
        },
      ],
      summary: { distance: '30 KM', trips: 1, duration: '2h 43m' },
    },
  ],
  tripSummary: { distance: '43 km', trips: 30, duration: '2h43m' },
  trips: [
    {
      id: 't1',
      startTime: '15:30',
      endTime: '11:21',
      origin: 'Cluster M, West Bay – Doha',
      events: 2,
      distance: '30 KM',
      duration: '2h 43m',
    },
  ],
  devices: [
    { id: 'dv1', name: 'Temp Sensor', imei: '356938035643809', dataRec: '12:32', value: '54°C', valueTone: 'error', trend: true },
    { id: 'dv2', name: 'Door Lock', imei: '356938035643810', dataRec: '12:30', value: 'All Secure', valueTone: 'success' },
  ],
}

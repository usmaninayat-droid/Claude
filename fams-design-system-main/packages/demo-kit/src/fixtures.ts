/**
 * A self-contained example dataset + endpoint contract, shared across the test
 * suite and referenced by the README. The domain nouns here (workforce /
 * vehicle / site) are GENERIC illustrations, not v5 vocabulary — this file
 * proves the machinery end-to-end without any product coupling.
 */
import type { EntitySchema } from './types'
import type { EndpointContract } from './handlers'
import type { SeedSet } from './seeds'

export const exampleSchemas: EntitySchema[] = [
  {
    type: 'vehicle',
    fields: [
      { name: 'plate', type: 'string', required: true },
      { name: 'status', type: 'string', default: 'active' },
    ],
    references: [],
  },
  {
    type: 'site',
    fields: [{ name: 'name', type: 'string', required: true }],
    references: [],
  },
  {
    type: 'workforce',
    fields: [
      { name: 'name', type: 'string', required: true },
      { name: 'role', type: 'string' },
    ],
    references: [
      // one worker → one vehicle; the vehicle sees its crew via `crew`.
      { name: 'vehicleId', target: 'vehicle', cardinality: 'one', inverse: 'crew' },
      // one worker → many sites; each site sees its `workers`.
      { name: 'siteIds', target: 'site', cardinality: 'many', inverse: 'workers' },
    ],
  },
]

export const exampleSeeds: SeedSet = {
  entities: {
    vehicle: [
      { id: 'v1', plate: 'ABC-001', status: 'active' },
      { id: 'v2', plate: 'XYZ-999', status: 'maintenance' },
    ],
    site: [
      { id: 's1', name: 'North Depot' },
      { id: 's2', name: 'South Yard' },
    ],
    workforce: [
      { id: 'w1', name: 'Ada', role: 'driver', vehicleId: 'v1', siteIds: ['s1', 's2'] },
      { id: 'w2', name: 'Ben', role: 'driver', vehicleId: 'v1', siteIds: ['s1'] },
      { id: 'w3', name: 'Cy', role: 'mechanic', vehicleId: 'v2', siteIds: [] },
    ],
  },
  users: [
    { id: 'u_dispatcher', name: 'Dana (Dispatcher)', roles: ['dispatcher'] },
    { id: 'u_viewer', name: 'Val (Viewer)', roles: ['viewer'] },
  ],
  roles: {
    dispatcher: ['workforce.read', 'workforce.write', 'vehicle.read'],
    viewer: ['workforce.read', 'vehicle.read'],
  },
}

export const exampleContract: EndpointContract[] = [
  { method: 'get', path: '/api/workforce', op: { kind: 'list', type: 'workforce' } },
  { method: 'get', path: '/api/workforce/:id', op: { kind: 'get', type: 'workforce' } },
  { method: 'post', path: '/api/workforce', op: { kind: 'create', type: 'workforce' } },
  { method: 'patch', path: '/api/workforce/:id', op: { kind: 'update', type: 'workforce' } },
  { method: 'delete', path: '/api/workforce/:id', op: { kind: 'remove', type: 'workforce' } },
  { method: 'get', path: '/api/vehicles', op: { kind: 'list', type: 'vehicle' } },
]

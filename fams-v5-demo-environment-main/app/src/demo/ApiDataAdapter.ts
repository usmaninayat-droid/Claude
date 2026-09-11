import type { EntityRecord } from '@fams/demo-kit'

/**
 * ApiDataAdapter — the app's ONLY data client. It talks `fetch()` and nothing
 * else, against the v5-shaped endpoints MSW serves (`/api/entity/*`). The
 * frontend never learns MSW exists: in the browser MSW is a service worker
 * intercepting these same-origin requests; under `msw/node` it intercepts
 * Node's fetch. Swap MSW for a real backend and this adapter is unchanged.
 *
 * Every method is ASYNC (fetch is async). The composer's render-time
 * `DataAdapter` is synchronous, so a thin buffer bridges the two (see
 * `composer-data.ts`) — the documented contract friction of this v1.
 */
export interface ListResult {
  data: EntityRecord[]
  total: number
}

export interface ListParams {
  filters?: Record<string, unknown>
  search?: string
  sort?: { col: string; dir: 'asc' | 'desc' }
  offset?: number
  limit?: number
}

export class ApiDataAdapter {
  constructor(private readonly baseUrl = '') {}

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`[api] ${path} → ${res.status}`)
    return (await res.json()) as T
  }

  listByCode(code: string, params: ListParams = {}): Promise<ListResult> {
    return this.post<ListResult>('/api/entity/entity_list_by_code', { code, ...params })
  }

  profile(code: string, id: string): Promise<EntityRecord> {
    return this.post<EntityRecord>('/api/entity/entity_profile', { code, id })
  }

  create(code: string, values: Partial<EntityRecord>): Promise<EntityRecord> {
    return this.post<EntityRecord>('/api/entity/entity_create', { code, values })
  }

  update(code: string, id: string, values: Partial<EntityRecord>): Promise<EntityRecord> {
    return this.post<EntityRecord>('/api/entity/entity_update', { code, id, values })
  }

  async remove(code: string, id: string): Promise<boolean> {
    const res = await fetch(`${this.baseUrl}/api/entity/entity_delete`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, id }),
    })
    return res.status === 204
  }
}

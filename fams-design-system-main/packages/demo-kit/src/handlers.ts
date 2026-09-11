import { http, HttpResponse, type PathParams, type RequestHandler } from 'msw'
import type { RelationalStore } from './store'
import type { EntityRecord, Query, QueryResult, WhereClause } from './types'

/**
 * MSW mock-API generator. An {@link EndpointContract} maps an HTTP method+path
 * onto a store operation; {@link buildHandlers} turns a contract array into MSW
 * request handlers that read/write the {@link RelationalStore}. GENERIC — no
 * product endpoint names are baked in; the consuming app supplies the paths.
 */

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

export interface ListOp {
  kind: 'list'
  type: string
  /** Derive a store Query from the URL search params. Default: paging/sort/eq. */
  toQuery?: (params: URLSearchParams) => Query
  /** Shape the JSON body. Default: `{ data, total }`. */
  toResponse?: (result: QueryResult) => unknown
}

export interface GetOp {
  kind: 'get'
  type: string
  /** Path parameter holding the id (default `id`). */
  param?: string
}

export interface CreateOp {
  kind: 'create'
  type: string
  mapBody?: (body: unknown) => Partial<EntityRecord>
}

export interface UpdateOp {
  kind: 'update'
  type: string
  param?: string
  mapBody?: (body: unknown) => Partial<EntityRecord>
}

export interface RemoveOp {
  kind: 'remove'
  type: string
  param?: string
}

export interface CustomOp {
  kind: 'custom'
  resolve: (args: {
    request: Request
    params: PathParams
    store: RelationalStore
  }) => Response | Promise<Response>
}

export type EndpointOp = ListOp | GetOp | CreateOp | UpdateOp | RemoveOp | CustomOp

export interface EndpointContract {
  method: HttpMethod
  path: string
  op: EndpointOp
}

const RESERVED = new Set(['limit', 'offset', 'sort', 'dir'])

function defaultQuery(params: URLSearchParams): Query {
  const query: Query = {}
  const limit = params.get('limit')
  if (limit != null) query.limit = Number(limit)
  const offset = params.get('offset')
  if (offset != null) query.offset = Number(offset)
  const sort = params.get('sort')
  if (sort) query.sort = { field: sort, dir: params.get('dir') === 'desc' ? 'desc' : 'asc' }
  const where: Record<string, WhereClause> = {}
  for (const [k, v] of params) if (!RESERVED.has(k)) where[k] = v
  if (Object.keys(where).length) query.where = where
  return query
}

function idParam(params: PathParams, name = 'id'): string {
  const raw = params[name]
  if (typeof raw === 'string') return raw
  if (Array.isArray(raw)) return raw[0] ?? ''
  return ''
}

export interface BuildHandlersOptions {
  /**
   * Origin (or origin+prefix) to resolve each contract's path against, e.g.
   * `https://api.example.test`. In the browser, same-origin relative paths
   * match without this; under `msw/node` (and to target a specific API origin)
   * set it so handlers carry an absolute URL.
   */
  baseUrl?: string
}

function buildHandler(contract: EndpointContract, store: RelationalStore, baseUrl?: string): RequestHandler {
  const { op } = contract
  const path = baseUrl ? `${baseUrl.replace(/\/$/, '')}${contract.path}` : contract.path

  const resolver: Parameters<typeof http.get>[1] = async ({ request, params }) => {
    switch (op.kind) {
      case 'list': {
        const url = new URL(request.url)
        const query = (op.toQuery ?? defaultQuery)(url.searchParams)
        const result = store.list(op.type, query)
        const body = op.toResponse ? op.toResponse(result) : { data: result.records, total: result.total }
        return HttpResponse.json(body as Record<string, unknown>)
      }
      case 'get': {
        const rec = store.read(op.type, idParam(params, op.param))
        return rec ? HttpResponse.json(rec) : new HttpResponse(null, { status: 404 })
      }
      case 'create': {
        const body = await request.json()
        const input = op.mapBody ? op.mapBody(body) : (body as Partial<EntityRecord>)
        return HttpResponse.json(store.create(op.type, input), { status: 201 })
      }
      case 'update': {
        const body = await request.json()
        const input = op.mapBody ? op.mapBody(body) : (body as Partial<EntityRecord>)
        const rec = store.update(op.type, idParam(params, op.param), input)
        return rec ? HttpResponse.json(rec) : new HttpResponse(null, { status: 404 })
      }
      case 'remove': {
        const ok = store.remove(op.type, idParam(params, op.param))
        return new HttpResponse(null, { status: ok ? 204 : 404 })
      }
      case 'custom':
        return op.resolve({ request, params, store })
    }
  }

  return http[contract.method](path, resolver)
}

export function buildHandlers(
  contract: EndpointContract[],
  store: RelationalStore,
  options: BuildHandlersOptions = {},
): RequestHandler[] {
  return contract.map((c) => buildHandler(c, store, options.baseUrl))
}

/**
 * Wrap MSW's browser worker over the given handlers. Async because `msw/browser`
 * is imported lazily — that keeps browser-only worker code out of Node test /
 * SSR bundles that only need {@link buildHandlers}.
 *
 * NOTE: the consuming app MUST serve the MSW service-worker script — run
 * `npx msw init public/ --save` once (see README).
 */
export async function setupDemoWorker(handlers: RequestHandler[]): Promise<import('msw/browser').SetupWorker> {
  const { setupWorker } = await import('msw/browser')
  return setupWorker(...handlers)
}

import { describe, expect, it } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { wipeTenantCache } from './cache'

describe('wipeTenantCache', () => {
  it('removes only the target tenant\'s [tenant, ...] queries', () => {
    const qc = new QueryClient()
    qc.setQueryData(['crm', 'assets', 1], { a: 1 })
    qc.setQueryData(['crm', 'deals'], { d: 1 })
    qc.setQueryData(['mm', 'assets', 1], { a: 2 })
    qc.setQueryData(['iwmp'], { x: 1 })

    wipeTenantCache(qc, 'crm')

    // crm keys gone…
    expect(qc.getQueryData(['crm', 'assets', 1])).toBeUndefined()
    expect(qc.getQueryData(['crm', 'deals'])).toBeUndefined()
    // …other tenants untouched.
    expect(qc.getQueryData(['mm', 'assets', 1])).toEqual({ a: 2 })
    expect(qc.getQueryData(['iwmp'])).toEqual({ x: 1 })
  })

  it('does not touch another tenant whose id is a prefix substring', () => {
    const qc = new QueryClient()
    qc.setQueryData(['crm', 'x'], 1)
    qc.setQueryData(['crm-staging', 'x'], 2)
    wipeTenantCache(qc, 'crm')
    // Array-prefix matching is element-wise, not string-substring: 'crm-staging'
    // is a different first element and survives.
    expect(qc.getQueryData(['crm', 'x'])).toBeUndefined()
    expect(qc.getQueryData(['crm-staging', 'x'])).toBe(2)
  })
})

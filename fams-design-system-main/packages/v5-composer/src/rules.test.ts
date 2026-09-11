import { describe, it, expect } from 'vitest'
import { allowedTransitions, isTaskVisible, resolvePermissions } from './rules'
import type { PipelineRules, EntityRecord, UserContext } from './types'
import dealsRulesJson from '../blueprints/crm/deals.rules.json'

const rules = dealsRulesJson as unknown as PipelineRules

const manager: UserContext = { id: 'u_mgr', roles: ['SalesManager'] }
const rep: UserContext = { id: 'u_rep', roles: ['SalesRep'] }

function deal(status: string, owner: string): EntityRecord {
  return { id: 'd', status, systemcol6: owner }
}

describe('rules — allowedTransitions', () => {
  it('lets a SalesManager close a proposal to won or lost', () => {
    const next = allowedTransitions(rules, manager, deal('proposal', 'u_mgr'))
    expect(next.sort()).toEqual(['lost', 'won'])
  })

  it('blocks a SalesRep from the manager-gated proposal transitions', () => {
    // Both proposal→won and proposal→lost require SalesManager.
    expect(allowedTransitions(rules, rep, deal('proposal', 'u_rep'))).toEqual([])
  })

  it('allows an ungated transition (lead→qualified) for a rep but not the gated lead→lost', () => {
    const next = allowedTransitions(rules, rep, deal('lead', 'u_rep'))
    expect(next).toEqual(['qualified'])
  })

  it('returns no transitions from a terminal stage', () => {
    expect(allowedTransitions(rules, manager, deal('won', 'u_mgr'))).toEqual([])
  })
})

describe('rules — isTaskVisible (row-level RBAC)', () => {
  it('shows every row to a SalesManager', () => {
    expect(isTaskVisible(rules, manager, deal('lead', 'u_rep'))).toBe(true)
    expect(isTaskVisible(rules, manager, deal('lead', 'someone_else'))).toBe(true)
  })

  it('shows a SalesRep only their own rows', () => {
    expect(isTaskVisible(rules, rep, deal('lead', 'u_rep'))).toBe(true)
    expect(isTaskVisible(rules, rep, deal('lead', 'u_mgr'))).toBe(false)
  })
})

describe('rules — resolvePermissions', () => {
  it('encodes each declared transition as an allowed/denied flag per user', () => {
    const mgr = resolvePermissions(rules, manager, deal('proposal', 'u_mgr'))
    expect(mgr.transitionRules['proposal->won']).toBe(true)
    const r = resolvePermissions(rules, rep, deal('proposal', 'u_rep'))
    expect(r.transitionRules['proposal->won']).toBe(false)
    // Ungated transitions resolve to allowed for anyone.
    expect(r.transitionRules['lead->qualified']).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { createPersonaAuth } from './persona'
import { exampleSeeds } from './fixtures'

function auth() {
  return createPersonaAuth(exampleSeeds.users, exampleSeeds.roles)
}

describe('createPersonaAuth', () => {
  it('starts logged out', () => {
    const a = auth()
    expect(a.current()).toBeNull()
    expect(a.privileges()).toEqual([])
    // Logged-out must resolve to 'user', not '' — v5-kit-style gating treats
    // any userType !== 'user' as a full bypass, so '' would fail open and
    // show every gated UI to a logged-out visitor.
    expect(a.userType()).toBe('user')
  })

  it('logs in and resolves the persona + role privileges', () => {
    const a = auth()
    const persona = a.login('u_dispatcher')
    expect(persona.name).toBe('Dana (Dispatcher)')
    expect(a.current()?.id).toBe('u_dispatcher')
    expect(a.privileges().sort()).toEqual(['vehicle.read', 'workforce.read', 'workforce.write'])
  })

  it('defaults userType to "user" (safe-by-default gating)', () => {
    const a = auth()
    a.login('u_dispatcher')
    expect(a.userType()).toBe('user') // safe default when no explicit userType
    a.login('u_viewer')
    expect(a.userType()).toBe('user') // safe default for this persona too
  })

  it('throws on an unknown persona id', () => {
    expect(() => auth().login('nobody')).toThrow(/unknown persona/)
  })

  it('returns to safe userType "user" (and empty privileges) after logout', () => {
    const a = auth()
    a.login('u_dispatcher')
    a.logout()
    expect(a.current()).toBeNull()
    expect(a.userType()).toBe('user')
    expect(a.privileges()).toEqual([])
  })

  it('notifies subscribers on login and logout, and stops after unsubscribe', () => {
    const a = auth()
    let hits = 0
    const unsubscribe = a.subscribe(() => {
      hits += 1
    })
    a.login('u_dispatcher')
    a.logout()
    expect(hits).toBe(2)

    unsubscribe()
    a.login('u_viewer')
    expect(hits).toBe(2) // no further notifications
  })

  it('does not notify a redundant logout', () => {
    const a = auth()
    let hits = 0
    a.subscribe(() => {
      hits += 1
    })
    a.logout() // already logged out
    expect(hits).toBe(0)
  })
})

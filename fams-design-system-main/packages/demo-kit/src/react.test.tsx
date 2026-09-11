import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePersona } from './react'
import { createPersonaAuth } from './persona'
import { exampleSeeds } from './fixtures'

describe('usePersona', () => {
  it('re-renders when the persona switches (observable shim)', () => {
    const auth = createPersonaAuth(exampleSeeds.users, exampleSeeds.roles)
    const { result } = renderHook(() => usePersona(auth))

    expect(result.current.persona).toBeNull()
    expect(result.current.privileges).toEqual([])

    act(() => {
      auth.login('u_dispatcher')
    })
    expect(result.current.persona?.id).toBe('u_dispatcher')
    expect(result.current.privileges).toContain('workforce.write')
    expect(result.current.userType).toBe('user')

    act(() => {
      auth.logout()
    })
    expect(result.current.persona).toBeNull()
    expect(result.current.privileges).toEqual([])
  })
})

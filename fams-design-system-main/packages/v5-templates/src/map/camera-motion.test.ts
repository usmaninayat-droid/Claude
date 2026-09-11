import { afterEach, describe, expect, it, vi } from 'vitest'
import { cameraMotion } from './camera-motion'

/**
 * Round-6 UX gate U4 / UX-NOTES F44 [SHOULD]. jsdom ships no `matchMedia` at
 * all, so the no-preference path is the DEFAULT here — which is also the point
 * of the assertion: on shared surface, a user who has expressed no preference
 * must get exactly main's behaviour.
 */
const originalMatchMedia = window.matchMedia

function stubPreference(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

describe('cameraMotion', () => {
  it('adds NO duration key when the caller had none and no preference is set', () => {
    // Load-bearing: MapLibre merges caller options over its defaults, so an
    // explicit `duration: undefined` would overwrite the 500ms default.
    expect(cameraMotion()).toEqual({})
    expect('duration' in cameraMotion()).toBe(false)
  })

  it("passes the caller's own duration through untouched with no preference set", () => {
    stubPreference(false)
    expect(cameraMotion(600)).toEqual({ duration: 600 })
    expect(cameraMotion(240)).toEqual({ duration: 240 })
  })

  it('collapses every camera move to an instant jump under prefers-reduced-motion', () => {
    stubPreference(true)
    expect(cameraMotion()).toEqual({ duration: 0 })
    expect(cameraMotion(600)).toEqual({ duration: 0 })
  })

  it('reads the preference at call time, so a mid-session flip is honoured', () => {
    stubPreference(false)
    expect(cameraMotion(600)).toEqual({ duration: 600 })
    stubPreference(true)
    expect(cameraMotion(600)).toEqual({ duration: 0 })
  })
})

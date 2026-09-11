import { describe, expect, it } from 'vitest'
import {
  getSectionComponentRenderer,
  listRegisteredSectionComponents,
  registerSectionComponent,
} from './section-components'

describe('section-components registry', () => {
  it('an unregistered name resolves to undefined', () => {
    expect(getSectionComponentRenderer('TotallyMadeUp')).toBeUndefined()
  })

  it('registers and resolves a named section renderer', () => {
    const render = () => null
    registerSectionComponent('TestSection', render)
    expect(getSectionComponentRenderer('TestSection')).toBe(render)
    expect(listRegisteredSectionComponents()).toContain('TestSection')
  })

  it('overriding a name replaces the previous renderer', () => {
    const first = () => null
    const second = () => null
    registerSectionComponent('OverrideMe', first)
    registerSectionComponent('OverrideMe', second)
    expect(getSectionComponentRenderer('OverrideMe')).toBe(second)
  })
})

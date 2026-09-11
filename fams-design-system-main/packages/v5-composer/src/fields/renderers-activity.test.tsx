import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { ReadActivityOverview } from './renderers'

/**
 * fix-d6 finding 6: `ACTIVITY_TONE_CLASS` was aliased to the shared
 * `TONE_TEXT_CLASS` map, which silently added a fifth `default` tone beside
 * the four the activity renderer originally supported
 * (`danger`/`warning`/`success`/`neutral`). No existing seed authors
 * `tone: 'default'`, so this was inert — but unpinned. This test turns the
 * accidental addition into a documented, regression-proof behaviour.
 */
describe('ReadActivityOverview — tone: "default"', () => {
  it('renders text-foreground (the shared default tone) rather than falling back to neutral', () => {
    const { container } = render(
      <ReadActivityOverview
        descriptor={{ id: 'fld_activity', col: 'activity', label: 'Activity', type: 'SmallText', required: false, multiple: false }}
        value={[{ icon: 'clock', count: 3, tone: 'default' }]}
      />,
    )
    const icon = container.querySelector('svg')
    expect(icon).toBeTruthy()
    expect(icon?.getAttribute('class')).toContain('text-foreground')
    expect(icon?.getAttribute('class')).not.toContain('text-muted-foreground')
  })
})

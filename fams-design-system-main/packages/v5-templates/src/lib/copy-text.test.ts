import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from './copy-text'

/**
 * REGRESSION LOCK — round-4 UX finding 1. The cockpit's contact Copy showed a
 * green "Copied" toast unconditionally while the write had rejected, and let
 * the rejection escape as a console error.
 */
describe('copyText', () => {
  const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  const setClipboard = (value: unknown) => {
    Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
  }

  afterEach(() => {
    if (original) Object.defineProperty(navigator, 'clipboard', original)
    else setClipboard(undefined)
  })

  it('resolves true when the write succeeds', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    await expect(copyText('+974 50 123 4567')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('+974 50 123 4567')
  })

  it('resolves false — never throws — when the write rejects', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) })
    await expect(copyText('+974 50 123 4567')).resolves.toBe(false)
  })

  it('resolves false when the clipboard API is absent entirely', async () => {
    setClipboard(undefined)
    await expect(copyText('x')).resolves.toBe(false)
  })

  it('resolves false when writeText is missing from the clipboard object', async () => {
    setClipboard({})
    await expect(copyText('x')).resolves.toBe(false)
  })
})

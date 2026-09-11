import { render, screen, act } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveCssColor, useThemeVersion } from './chart-color'

/**
 * chart-color — the shared authored-colour resolver. These tests pin the
 * exact defect it was written for: a `var(--x)` string authored in a
 * blueprint must never reach an ECharts canvas unresolved (it paints black).
 */

const TOKEN = '--test-chart-color'
const FALLBACK = 'rgb(1, 2, 3)'

function setToken(value: string | null) {
  if (value === null) document.documentElement.style.removeProperty(TOKEN)
  else document.documentElement.style.setProperty(TOKEN, value)
}

afterEach(() => {
  setToken(null)
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.removeAttribute('data-tenant')
})

describe('resolveCssColor', () => {
  it('resolves a bare var() to the token’s computed value', () => {
    setToken('rgb(240, 68, 56)')
    expect(resolveCssColor(`var(${TOKEN})`, FALLBACK)).toBe('rgb(240, 68, 56)')
  })

  it('uses the authored var() fallback when the token is undefined', () => {
    expect(resolveCssColor(`var(--not-a-real-token, rgb(9, 9, 9))`, FALLBACK)).toBe('rgb(9, 9, 9)')
  })

  it('prefers the token over the authored fallback when both exist', () => {
    setToken('rgb(18, 183, 106)')
    expect(resolveCssColor(`var(${TOKEN}, rgb(9, 9, 9))`, FALLBACK)).toBe('rgb(18, 183, 106)')
  })

  it('follows nested var() fallbacks', () => {
    setToken('rgb(5, 5, 5)')
    expect(resolveCssColor(`var(--missing, var(${TOKEN}))`, FALLBACK)).toBe('rgb(5, 5, 5)')
  })

  it('falls back to the caller’s literal when nothing resolves', () => {
    expect(resolveCssColor('var(--missing)', FALLBACK)).toBe(FALLBACK)
    expect(resolveCssColor(undefined, FALLBACK)).toBe(FALLBACK)
    expect(resolveCssColor('   ', FALLBACK)).toBe(FALLBACK)
  })

  it('passes plain literals through untouched', () => {
    expect(resolveCssColor('#f04438', FALLBACK)).toBe('#f04438')
    expect(resolveCssColor('tomato', FALLBACK)).toBe('tomato')
    expect(resolveCssColor('rgb(0, 0, 0)', FALLBACK)).toBe('rgb(0, 0, 0)')
  })

  it('leaves a compound expression it cannot safely rewrite alone', () => {
    // Not a bare `var(...)`: rewriting the inner vars of a gradient is out of
    // scope, so the string is handed to the renderer as authored.
    const gradient = 'linear-gradient(var(--a), var(--b))'
    expect(resolveCssColor(gradient, FALLBACK)).toBe(gradient)
  })

  it('falls back when a bare var() expression is malformed', () => {
    expect(resolveCssColor('var(notatoken)', FALLBACK)).toBe(FALLBACK)
  })
})

function ThemeVersionProbe() {
  const version = useThemeVersion()
  return <span data-testid="version">{version}</span>
}

describe('useThemeVersion', () => {
  it('starts at 0 and increments when the theme or tenant attribute changes', async () => {
    render(<ThemeVersionProbe />)
    expect(screen.getByTestId('version')).toHaveTextContent('0')

    await act(async () => {
      document.documentElement.setAttribute('data-theme', 'dark')
      await Promise.resolve()
    })
    expect(Number(screen.getByTestId('version').textContent)).toBeGreaterThan(0)

    const afterTheme = Number(screen.getByTestId('version').textContent)
    await act(async () => {
      document.documentElement.setAttribute('data-tenant', 'iwmp')
      await Promise.resolve()
    })
    expect(Number(screen.getByTestId('version').textContent)).toBeGreaterThan(afterTheme)
  })
})

import { describe, expect, it } from 'vitest'
import { createGazetteerSearchProvider, qatarGazetteer } from './qatar-gazetteer'

describe('qatar-gazetteer — the opt-in Qatar places/districts/landmarks dataset (search-video-spec.md)', () => {
  it('matches by name (municipality entries), title == "Name, Qatar"', async () => {
    // "doha municipality" also matches every district whose `municipality`
    // field IS "Doha Municipality" (matchesGazetteer checks both fields) —
    // find the municipality row itself rather than assert list length.
    const results = await createGazetteerSearchProvider(qatarGazetteer).search('doha municipality')
    const dohaMunicipality = results.find((r) => r.title === 'Doha Municipality')
    expect(dohaMunicipality).toMatchObject({
      kind: 'place',
      title: 'Doha Municipality',
      subtitle: 'Doha Municipality, Qatar',
    })
    expect(dohaMunicipality?.position).toBeDefined()
  })

  it('matches by name (district entries) with "Name, Municipality, Qatar" subtitle', async () => {
    const results = await createGazetteerSearchProvider(qatarGazetteer).search('west bay')
    expect(results).toHaveLength(1)
    expect(results[0].subtitle).toBe('West Bay, Doha Municipality, Qatar')
  })

  it('matches by parent municipality name too', async () => {
    const results = await createGazetteerSearchProvider(qatarGazetteer).search('al rayyan')
    // Both the Al Rayyan Municipality entry itself and Education City (inside it)
    expect(results.length).toBeGreaterThanOrEqual(2)
    expect(results.some((r) => r.title === 'Al Rayyan Municipality')).toBe(true)
    expect(results.some((r) => r.title === 'Education City')).toBe(true)
  })

  it('an empty query matches every entry', async () => {
    const results = await createGazetteerSearchProvider(qatarGazetteer).search('')
    expect(results).toHaveLength(qatarGazetteer.length)
  })

  it('is not part of createDefaultSearchProviders unless the caller opts in', async () => {
    const { createDefaultSearchProviders } = await import('./search-providers')
    const withoutGazetteer = createDefaultSearchProviders({ places: [{ id: 'p', name: 'X', position: [0, 0] }] })
    expect(withoutGazetteer.map((p) => p.id)).not.toContain('gazetteer')
    const withGazetteer = createDefaultSearchProviders({ gazetteer: qatarGazetteer })
    expect(withGazetteer.map((p) => p.id)).toContain('gazetteer')
  })

  it('a "no match" query yields an empty array (flat list, no results row still handled by MapSearchPanel)', async () => {
    const results = await createGazetteerSearchProvider(qatarGazetteer).search('zzz-not-a-place-zzz')
    expect(results).toEqual([])
  })
})

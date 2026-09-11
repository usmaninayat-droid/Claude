# Weather Monitoring layer — verification runbook

Branch `feat/weather-layer` (DS worktree `wt-weather`, demo worktree
`wt-weather-demo`). Figma file `PAk7skcUc0OeD8FcQyDVe7`, section `22:41486`.

**No live verification was performed in this run — no dev server was started**
(the main checkout and its `:6310` server belong to another agent). Everything
below is the manual pass to run before merge. Reference PNGs for the visual
diff live beside this file in `plan/weather/`.

| File | Figma node | What it shows |
|---|---|---|
| `plan/weather/figma-19-22895.png` | 19:22895 | Baseline — weather layer OFF |
| `plan/weather/figma-19-25255.png` | 19:25255 | Weather ON — checkbox row + station markers |
| `plan/weather/figma-19-27942.png` | 19:27942 | Weather ON + station drawer open, in context |
| `plan/weather/figma-22-38014.png` | 22:38014 | The drawer isolated, full scroll depth |

## Getting it on screen

**Showcase (components only, no map):**
```
pnpm --filter @fams/tokens build && pnpm --filter @fams/ui-kit build && pnpm --filter @fams/v5-templates build
pnpm --filter @fams/showcase dev     # :6100
```
→ Templates ▸ Map Templates ▸ **WeatherStationDrawer (DRAFT)**.

**Demo environment (the real screen):** build the DS packages as above, then
in the demo worktree `pnpm demo resolve uccp && pnpm dev`, and open UCCP ▸
Live Monitoring ▸ Hybrid View. The weather tool is the thermometer button in
the map's top-end tool stack.

## Playwright steps

```ts
// Live Monitoring, hybrid view, tenant uccp.
await page.getByRole('button', { name: 'Weather layer' }).click()

// 1. The checkbox row appears, Stations pre-checked, the other three clear.
const overlays = page.getByRole('group', { name: 'Weather overlays' })
await expect(overlays).toBeVisible()
await expect(overlays.getByRole('checkbox', { name: 'Stations' })).toBeChecked()
for (const label of ['Rain Heat-map', 'Clouds', 'Precipitation']) {
  await expect(overlays.getByRole('checkbox', { name: label })).not.toBeChecked()
}

// 2. All 40 stations plot, and they do NOT cluster at any zoom.
await expect(page.getByRole('button', { name: /^Weather station/ })).toHaveCount(40)
await page.getByRole('button', { name: 'Zoom out' }).click()
await expect(page.getByRole('button', { name: /^Weather station/ })).toHaveCount(40)

// 3. The two non-reporting stations render the dash, not "0°".
await expect(page.getByRole('button', { name: /Weather station Al Ruwais, no reading/ })).toHaveText('–')

// 4. The band legend is painted beside the layer.
await expect(page.getByText('No reading')).toBeVisible()

// 5. Marker click opens the DOCKED drawer — no scrim, map still interactive.
await page.getByRole('button', { name: /Weather station Qatar University/ }).click()
const drawer = page.getByRole('complementary', { name: 'Weather station Qatar University' })
await expect(drawer).toBeVisible()
await expect(page.getByRole('dialog')).toHaveCount(0)          // never a modal
await expect(drawer.getByText('38.85 °C')).toBeVisible()
await expect(drawer.getByText('Area 9')).toBeVisible()
await expect(drawer.getByText('25.382 , 51.479')).toBeVisible()
await expect(drawer.getByText('Forecast — Open-Meteo')).toBeVisible()
await expect(drawer.getByText('QMD official — 10 day')).toBeVisible()

// 6. Clicking another marker SWAPS the panel in place (no close/reopen).
await page.getByRole('button', { name: /Weather station Al Khor/ }).click()
await expect(page.getByRole('complementary', { name: 'Weather station Al Khor' })).toBeVisible()

// 7. Both tables scroll INSIDE their own region — the drawer body must not
//    grow to fit them and the columns must not be crushed.
const forecast = drawer.getByRole('table').first()
await expect(forecast).toHaveCount(1)
// scrollHeight > clientHeight on the table's own wrapper

// 8. Escape and the × both close it.
await page.keyboard.press('Escape')
await expect(page.getByRole('complementary')).toHaveCount(0)

// 9. Each field overlay paints something visible — no dead checkboxes.
for (const label of ['Rain Heat-map', 'Clouds', 'Precipitation']) {
  await page.getByText(label).click()
  // assert the MapLibre layer exists:
  //   map.getLayer('fams-weather-rain-heatmap-field') etc.
  await page.getByText(label).click()
}

// 10. Clearing Stations hides the markers AND closes any open drawer.
await page.getByRole('button', { name: /Weather station Qatar University/ }).click()
await page.getByText('Stations').click()
await expect(page.getByRole('button', { name: /^Weather station/ })).toHaveCount(0)
await expect(page.getByRole('complementary')).toHaveCount(0)

// 11. The tanker fleet is untouched throughout — markers, clusters, popup.
// 12. Switch the tool off: row, legend, markers and drawer all go.
```

## Visual-diff checklist vs the Figma PNGs

Compare at 1920 wide, tenant `uccp` (primary `#6E112D`), light theme.

**vs `figma-19-25255.png` — weather ON**
- [ ] The checkbox row is a single horizontal white pill, centred over the top
      of the map, clear of the search control (start) and the tool stack (end).
- [ ] Labels read exactly `Stations` / `Rain Heat-map` / `Clouds` /
      `Precipitation`, left to right, Stations checked in brand maroon.
- [ ] Station markers are ~32px circles, white bold text, `°` always present,
      no border ring, visibly smaller than the tanker cluster badges.
- [ ] Band colours: green below 42°C, orange 42–45°C, red 46°C and above,
      grey `–` with no reading.
- [ ] Markers overlap near Doha and stay unclustered.
- [ ] Tanker cluster badges (20 / 90 / 18 / 3 / 30) still paint alongside.
- [ ] The weather tool button in the end stack reads pressed/filled maroon.
- [ ] List panel, list-meta row, search and filters are pixel-unchanged
      from `figma-19-22895.png`.

**vs `figma-19-27942.png` / `figma-22-38014.png` — the drawer**
- [ ] 550px wide, docked at the map's end edge, full height under the navbar,
      white, with a left border. The map is narrower, not covered — no scrim.
- [ ] Header strip is light grey with the round close × at its start.
- [ ] Identity chips: `Area 9` and `25.382 , 51.479`, icon-prefixed, outlined.
- [ ] Station name at 20px semibold below the chips.
- [ ] The 2×4 stat grid reads across: Temp/Humidity · Wind/Gust ·
      Pressure/Visibility · Rainfall/Reading, muted labels, dark values.
- [ ] `Trends & Forecast` section label, then the `Last 24 hours` card.
- [ ] The trend is ONE maroon line, y 0–50°C in 10° steps, x 00:00–24:00 in
      4h steps, with the translucent maroon "now" band. **No rain bars.**
- [ ] `Forecast — Open-Meteo` table: TIME / °C / MM / % / KM/H, two-decimal
      numbers, ~7 rows visible then inner scroll.
- [ ] `QMD official — 10 day` table: DATE / WARNING / RANGE, range rendered
      as `33.00–41.00°`.
- [ ] Nothing from the hidden Solid-Waste compliance frame appears.

## Known, deliberate deviations from the raw dev prototype

1. **No rain bars on the 24h chart.** Figma dropped them; a second y-axis on a
   line chart is also the one thing the charting standard forbids outright.
   Temperature only, one axis, no legend.
2. **No blue header strip** (city / Temp / Rain / timestamp / station count /
   refresh). That was the prototype's own page chrome; the adapted design
   replaces it with the app's navbar. `MapOverlayLayersPanel` accepts optional
   `meta` + `onRefresh` props for a deployment that wants it back — UCCP does
   not pass them, so the row ends at its last checkbox, per Figma.
3. **Weather tool glyph is `Thermometer`.** The icon set carries no plain
   cloud glyph; thermometer is the honest read for a temperature-station
   layer. Swap it if a cloud glyph is added to `@fams/ui-kit/icons`.
4. **The field overlays are generated, not fetched.** Rain heat-map, clouds
   and precipitation paint a deterministic seeded field over the viewport
   (`weather-overlay.ts`), exactly as the traffic overlay does. They are
   visibly real layers, not stubs, and no OpenWeatherMap or Open-Meteo request
   is ever made.

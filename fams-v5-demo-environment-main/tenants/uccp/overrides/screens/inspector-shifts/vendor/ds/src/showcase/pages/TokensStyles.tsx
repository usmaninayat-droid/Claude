import {
  ACCENT_FAMILIES,
  BASE,
  SURFACE,
  BRAND_PRIMARY,
  BORDER,
  NEUTRAL,
  DEFAULT_TEXT,
  TRANSPARENT,
  ICON_SIZE,
  TYPE_SCALE,
  FONT_WEIGHTS,
  EFFECT_STYLES,
  PAINT_STYLE_GROUPS,
  STOPS,
} from '../../tokens/figma-tokens';

/* ── shared layout ─────────────────────────────────────────────── */
function Sec({ id, title, count, children }: { id: string; title: string; count?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border py-10">
      <div className="mb-6 flex items-baseline gap-3">
        <h2 className="text-h4 font-semibold text-foreground">{title}</h2>
        {count && (
          <span className="rounded-full border border-border px-2.5 py-0.5 text-caption font-semibold text-muted-foreground">
            {count}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="mb-3 text-body-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function Chip({ hex, label, sub }: { hex: string; label: string; sub?: string }) {
  // dark text on light swatches, white on dark
  const isLight = ['#ff', '#fe', '#fd', '#fc', '#fa', '#f9', '#f7', '#f3', '#f4', '#ef', '#e6', '#ec', '#eb', '#e0', '#db', '#cf', '#cc', '#b3', '#d0', '#d1'].some(
    (p) => hex.toLowerCase().startsWith(p),
  );
  return (
    <div className="flex w-[112px] flex-col gap-1.5">
      <div
        className="h-16 rounded-lg border border-border/70"
        style={{ backgroundColor: hex }}
        title={hex}
      >
        <span className={`block px-2 pt-1 text-caption font-semibold ${isLight ? 'text-foreground/70' : 'text-white/85'}`}>{label}</span>
      </div>
      <code className="text-caption text-muted-foreground">{hex}</code>
      {sub && <span className="text-caption text-muted-foreground/70">{sub}</span>}
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2.5">{children}</div>;
}

export function TokensStyles() {
  return (
    <div>
      <Sec id="colors" title="Color Tokens" count="22 groups · 100+ values">
        <Group title="Base">
          <Row>
            {Object.entries(BASE).map(([k, v]) => (
              <Chip key={k} hex={v} label={k} />
            ))}
          </Row>
        </Group>
        <Group title="Surface">
          <Row>
            {Object.entries(SURFACE).map(([k, v]) => (
              <Chip key={k} hex={v} label={k} />
            ))}
          </Row>
        </Group>
        <Group title="Brand / Primary  (Secondary aliases to the same ramp in FAMS mode)">
          <Row>
            {STOPS.map((s) => (
              <Chip key={s} hex={BRAND_PRIMARY[s]} label={s} />
            ))}
          </Row>
        </Group>
        <Group title="Border">
          <Row>
            {STOPS.map((s) => (
              <Chip key={s} hex={BORDER[s]} label={s} />
            ))}
          </Row>
        </Group>
        <Group title="Neutral (8 stops)">
          <Row>
            {Object.entries(NEUTRAL).map(([k, v]) => (
              <Chip key={k} hex={v} label={k} />
            ))}
          </Row>
        </Group>
        <Group title="Default Text (7 stops)">
          <Row>
            {Object.entries(DEFAULT_TEXT).map(([k, v]) => (
              <Chip key={k} hex={v} label={k} />
            ))}
          </Row>
        </Group>
        <Group title="Transparent (overlays)">
          <Row>
            {Object.entries(TRANSPARENT).map(([k, v]) => (
              <Chip key={k} hex={v} label={k} />
            ))}
          </Row>
        </Group>
        <Group title="Accent — 16 families × 5 stops (Lightest · Light · Normal · Dark · Darkest)">
          <div className="flex flex-col gap-4">
            {Object.entries(ACCENT_FAMILIES).map(([fam, stops]) => (
              <div key={fam}>
                <div className="mb-1.5 text-body-sm font-semibold text-foreground">{fam}</div>
                <Row>
                  {STOPS.map((s) => (stops[s] ? <Chip key={s} hex={stops[s]!} label={s} /> : null))}
                </Row>
              </div>
            ))}
          </div>
        </Group>
      </Sec>

      <Sec id="size" title="Size Tokens" count="IconSize · 7">
        <Group title="IconSize">
          <div className="flex flex-wrap items-end gap-6">
            {Object.entries(ICON_SIZE).map(([k, px]) => (
              <div key={k} className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center rounded-md bg-secondary" style={{ width: px, height: px }}>
                  <div className="rounded-sm bg-primary" style={{ width: px * 0.55, height: px * 0.55 }} />
                </div>
                <span className="text-caption font-semibold text-foreground">{k}</span>
                <code className="text-caption text-muted-foreground">{px}px</code>
              </div>
            ))}
          </div>
        </Group>
      </Sec>

      <Sec id="typography" title="Typography Tokens" count="Gilroy · 12 sizes">
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
          {TYPE_SCALE.map((t) => (
            <div key={t.name} className="flex items-baseline justify-between gap-6 px-5 py-3">
              <span
                className="truncate text-foreground"
                style={{ fontSize: t.size, lineHeight: `${t.line}px`, fontWeight: t.weight }}
              >
                {t.name} — Gilroy
              </span>
              <div className="flex shrink-0 items-baseline gap-4 text-caption text-muted-foreground">
                <span>{t.family}</span>
                <code className="text-primary">{t.size}/{t.line} · {t.weight}</code>
              </div>
            </div>
          ))}
        </div>
        <Group title="Weights">
          <div className="mt-4 flex flex-wrap gap-6">
            {FONT_WEIGHTS.map((w) => (
              <div key={w.value} className="flex flex-col gap-1">
                <span className="text-h5 text-foreground" style={{ fontWeight: w.value }}>
                  Ag
                </span>
                <span className="text-caption text-muted-foreground">{w.name} · {w.value}</span>
              </div>
            ))}
          </div>
        </Group>
      </Sec>

      <Sec id="text-styles" title="Text Styles" count="78 styles">
        <p className="mb-4 max-w-3xl text-body-sm text-muted-foreground">
          Figma ships 78 named text styles in Gilroy across three families — Headings (24),
          Body | Subtitle (50) and Caption (4) — composed from the size, line-height and weight
          tokens above. A representative set:
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-left text-body-sm">
            <thead className="bg-muted text-caption uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Family</th>
                <th className="px-4 py-2.5 font-semibold">Style</th>
                <th className="px-4 py-2.5 font-semibold">Size / Line</th>
                <th className="px-4 py-2.5 font-semibold">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {TYPE_SCALE.map((t) =>
                FONT_WEIGHTS.filter((w) => (t.family === 'Headings' ? w.value >= 600 : w.value <= 600)).map((w) => (
                  <tr key={`${t.name}-${w.value}`}>
                    <td className="px-4 py-2 text-muted-foreground">{t.family}</td>
                    <td className="px-4 py-2 text-foreground">{t.name} / {w.name}</td>
                    <td className="px-4 py-2"><code className="text-caption text-primary">{t.size}/{t.line}</code></td>
                    <td className="px-4 py-2">
                      <span style={{ fontSize: Math.min(t.size, 20), fontWeight: w.value }}>The quick brown fox</span>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </Sec>

      <Sec id="effect-styles" title="Effect Styles" count="Shadows · 6">
        <div className="flex flex-wrap gap-8">
          {EFFECT_STYLES.map((e) => (
            <div key={e.name} className="flex flex-col items-center gap-3">
              <div className="flex h-24 w-32 items-center justify-center rounded-xl bg-card" style={{ boxShadow: e.shadow }}>
                <code className="text-caption text-muted-foreground">shadow-{e.name}</code>
              </div>
            </div>
          ))}
        </div>
      </Sec>

      <Sec id="paint-styles" title="Paint Styles" count="raster libraries">
        <p className="mb-4 max-w-3xl text-body-sm text-muted-foreground">
          The Figma file also defines raster Paint Styles for map tiles and a workforce avatar
          library. These are image assets (not colour tokens) and are referenced here for
          completeness — they ship via a separate asset pipeline, not this token layer.
        </p>
        <div className="flex flex-col gap-2">
          {PAINT_STYLE_GROUPS.map((g) => (
            <div key={g.group} className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5">
              <span className="text-body-sm font-semibold text-foreground">{g.group}</span>
              <span className="text-caption text-muted-foreground">{g.regions.join(' · ')}</span>
            </div>
          ))}
        </div>
      </Sec>
    </div>
  );
}

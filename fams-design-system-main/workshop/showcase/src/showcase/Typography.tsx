import { Section } from './kit'
import { TYPE_SCALE, FONT_WEIGHTS, SCREEN_SIZES } from './tokens'

export function Typography() {
  const groups = ['Headings', 'Body', 'Caption'] as const
  return (
    <>
      <Section
        id="type-scale"
        title="Type scale"
        description="The FAMS type scale rendered live in Gilroy — the self-hosted brand face shipped in @fams/tokens/fonts.css. Each row shows the real size · line-height · weight."
      >
        <div className="flex flex-col gap-8">
          {groups.map((g) => (
            <div key={g}>
              <div className="mb-3 text-body-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {g}
              </div>
              <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-card">
                {TYPE_SCALE.filter((t) => t.group === g).map((t) => (
                  <div key={t.name} className="flex items-baseline justify-between gap-6 px-5 py-4">
                    <span
                      className="min-w-0 truncate text-foreground"
                      style={{
                        fontSize: t.size,
                        lineHeight: `${t.line}px`,
                        fontWeight: t.weight,
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      The quick brown fox
                    </span>
                    <div className="flex shrink-0 items-baseline gap-4 text-caption text-muted-foreground">
                      <code className="text-foreground">{t.className}</code>
                      <code className="text-primary">
                        {t.size}/{t.line} · {t.weight}
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="font-weights"
        title="Gilroy weights"
        description="Six weights ship as self-hosted .woff faces (Light 300 → Extrabold 800), each with a matching italic."
      >
        <div className="flex flex-wrap gap-8">
          {FONT_WEIGHTS.map((w) => (
            <div key={w.value} className="flex flex-col items-center gap-2">
              <span
                className="text-h2 text-foreground"
                style={{ fontWeight: w.value, fontFamily: 'var(--font-sans)' }}
              >
                Ag
              </span>
              <span className="text-caption font-semibold text-foreground">{w.name}</span>
              <code className="text-caption text-muted-foreground">{w.value}</code>
            </div>
          ))}
        </div>
        <div className="mt-8 max-w-3xl rounded-md border border-border bg-card p-6">
          <p className="text-body-lg text-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
            The Integrated Waste Management Platform digitalises Abu Dhabi's full waste lifecycle —
            <em> municipal collection, facility inbound, inspection and compliance</em> — on one
            token-driven, multi-tenant surface.
          </p>
          <p className="mt-3 text-body-sm text-muted-foreground">
            Set in Gilroy at body-lg / 18px. If this renders in Gilroy (not a system fallback), the
            brand face has loaded from <code className="text-primary">fonts.css</code>.
          </p>
        </div>
      </Section>

      <Section
        id="screen-widths"
        title="Screen / container max-widths"
        description="Figma Design System V2's Responsive spec — canvas max-widths for the product's Desktop/Tablet/Mobile frames, emitted as `--screen-*`. Distinct from the Tailwind `breakpoint.*` scale (640/768/1024/1280/1536, unchanged) that every `sm:`/`md:`/`lg:`/`xl:`/`2xl:` utility across ui-kit already assumes — use these to cap a layout's own max-width (e.g. a page shell), not to re-point existing responsive utilities."
      >
        <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-card">
          {SCREEN_SIZES.map((s) => (
            <div key={s.name} className="flex items-center justify-between gap-6 px-5 py-3">
              <code className="text-foreground">--screen-{s.name}</code>
              <span className="text-body-sm text-muted-foreground">
                {s.px}px{s.note ? ` · ${s.note}` : ''}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}

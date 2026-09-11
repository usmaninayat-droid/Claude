import { useEffect, useState } from 'react'
import { Section } from './kit'
import {
  BRAND_RAMP,
  GRAY_RAMP,
  STATUS_RAMPS,
  SEMANTIC_TOKENS,
  RADII,
  SHADOWS,
  SPACING,
  readCssVar,
  isLightHex,
  type Ramp,
  type Swatch,
} from './tokens'

/** A labelled sub-block. */
function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline gap-3">
        <h3 className="text-body-md font-semibold text-foreground">{title}</h3>
        {hint && <span className="text-body-sm text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

/** One colour swatch with name + resolved value. */
function SwatchChip({ name, value, note }: Swatch) {
  const light = isLightHex(value)
  return (
    <div className="w-[116px]">
      <div
        className="flex h-16 items-end rounded-md border border-border/70 p-2 shadow-sm"
        style={{ backgroundColor: value }}
        title={value}
      >
        <span className={`text-caption font-semibold ${light ? 'text-foreground/70' : 'text-white/90'}`}>
          {name.replace(/^--color-/, '')}
        </span>
      </div>
      <code className="mt-1.5 block truncate text-caption text-muted-foreground">{value}</code>
      {note && <span className="block text-caption text-muted-foreground/70">{note}</span>}
    </div>
  )
}

function RampRow({ ramp }: { ramp: Ramp }) {
  return (
    <Block title={ramp.title} hint={ramp.note}>
      <div className="flex flex-wrap gap-2.5">
        {ramp.swatches.map((s) => (
          <SwatchChip key={s.name} {...s} />
        ))}
      </div>
    </Block>
  )
}

/** Semantic tokens resolve live from CSS vars, so they follow the tenant. */
function SemanticGrid({ tick }: { tick: number }) {
  const [resolved, setResolved] = useState<Swatch[]>([])
  useEffect(() => {
    setResolved(SEMANTIC_TOKENS.map((t) => ({ ...t, value: readCssVar(t.name) || '#000' })))
  }, [tick])

  return (
    <Block title="Semantic tokens" hint="resolve live — switch tenant in the header to watch them re-theme">
      <div className="flex flex-wrap gap-2.5">
        {resolved.map((s) => (
          <SwatchChip key={s.name} {...s} />
        ))}
      </div>
    </Block>
  )
}

export function Foundations() {
  // Re-read semantic CSS vars whenever the tenant attribute changes.
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const obs = new MutationObserver(() => setTick((t) => t + 1))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tenant', 'dir'] })
    // initial
    setTick((t) => t + 1)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <Section
        id="colors"
        title="Colour"
        description="Every colour in the system is a token. Ramps are fixed brand values; semantic tokens map onto them and re-theme per tenant."
      >
        <SemanticGrid tick={tick} />
        <RampRow ramp={BRAND_RAMP} />
        <RampRow ramp={GRAY_RAMP} />
        <Block title="Status ramps" hint="success · warning · error — full 50→900">
          <div className="flex flex-col gap-6">
            {STATUS_RAMPS.map((r) => (
              <div key={r.title}>
                <div className="mb-2 text-body-sm font-semibold text-foreground">{r.title}</div>
                <div className="flex flex-wrap gap-2.5">
                  {r.swatches.map((s) => (
                    <SwatchChip key={s.name} {...s} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Block>
      </Section>

      <Section id="radius" title="Radius" description="Corner-radius scale used across surfaces and controls.">
        <div className="flex flex-wrap items-end gap-8">
          {RADII.map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-2">
              <div
                className="size-20 border-2 border-primary bg-secondary"
                style={{ borderRadius: r.value }}
              />
              <span className="text-caption font-semibold text-foreground">
                radius-{r.name}
                {r.note && <span className="ms-1 font-normal text-muted-foreground">({r.note})</span>}
              </span>
              <code className="text-caption text-muted-foreground">{r.value}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section id="shadow" title="Elevation" description="Shadow ladder — from resting cards to floating overlays.">
        <div className="flex flex-wrap gap-8">
          {SHADOWS.map((s) => (
            <div key={s.name} className="flex flex-col items-center gap-3">
              <div
                className="grid h-24 w-36 place-items-center rounded-md border border-border/40 bg-card"
                style={{ boxShadow: s.value }}
              >
                <code className="text-caption text-muted-foreground">shadow-{s.name}</code>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="spacing" title="Spacing" description="4px base grid. The bars below are drawn at the token's real pixel width.">
        <div className="flex flex-col gap-2.5">
          {SPACING.map((s) => (
            <div key={s.name} className="flex items-center gap-4">
              <code className="w-16 shrink-0 text-caption text-muted-foreground">space-{s.name}</code>
              <code className="w-12 shrink-0 text-caption text-muted-foreground">{s.px}px</code>
              <div className="h-4 rounded-xs bg-primary" style={{ width: Math.max(s.px, 1) }} />
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}

import { Logo, type Tenant } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList } from '../docs'

/**
 * LogoDemo — standalone showcase for the Logo composite.
 * Belongs under the "Primitives" showcase page (`showcase/Primitives.tsx`) once wired by the orchestrator.
 */

const TENANTS: Tenant[] = ['fams', 'tadweer', 'iwmp', 'ead', 'mm']

export default function LogoDemo() {
  return (
    <DocPage
      title="Logo"
      badge="stable"
      summary="Tenant wordmark. Resolves which brand to render from an explicit tenant prop, or falls back to document.documentElement.dataset.tenant — the same attribute the token layer reads to re-theme the whole app."
    >
      <DocSection id="tenants" title="Tenants">
        <Prose>
          One closed enum — fams, tadweer, iwmp, ead, mm — never a per-tenant forked component. Omit
          tenant to read document.documentElement.dataset.tenant, falling back to fams.
        </Prose>
        <Gallery
          items={TENANTS.map((tenant) => ({
            label: tenant,
            node: <Logo tenant={tenant} />,
          }))}
        />
      </DocSection>

      <DocSection id="variant" title="Variant">
        <Prose>
          variant controls lockup orientation and only matters when src is omitted:
          horizontal renders the tenant's built-in inline mark (currently fams only)
          beside the wordmark; stacked (default) keeps the plain-text fallback. A
          tenant with no built-in horizontal mark falls back to the text wordmark —
          variant never removes a rendering option, only adds one.
        </Prose>
        <Gallery
          items={[
            {
              label: 'stacked (default)',
              node: <Logo tenant="fams" />,
            },
            {
              label: 'horizontal',
              node: <Logo tenant="fams" variant="horizontal" />,
            },
            {
              label: 'horizontal, no built-in mark (falls back to text)',
              node: <Logo tenant="ead" variant="horizontal" />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="tone" title="Tone">
        <Prose>
          Logo renders text-primary by default; on a dark/brand surface, override the colour via
          className to keep contrast.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'On light surface',
              node: (
                <div className="flex items-center justify-center rounded-md border border-border bg-card p-6">
                  <Logo tenant="iwmp" />
                </div>
              ),
            },
            {
              label: 'On brand surface',
              caption: 'className override',
              node: (
                <div className="flex items-center justify-center rounded-md bg-primary p-6">
                  <Logo tenant="iwmp" className="text-primary-foreground" />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'tenant',
              type: "'fams' | 'tadweer' | 'iwmp' | 'ead' | 'mm'",
              description:
                'Tenant brand to render. Defaults to document.documentElement.dataset.tenant, falling back to fams.',
            },
            {
              prop: 'src',
              type: 'string',
              description:
                'Real logo asset URL (tenant-branding asset, e.g. from the tenant manifest). Renders the image (h-full w-auto, wordmark as alt) instead of the text wordmark; omit to keep the wordmark fallback. Takes priority over variant’s built-in mark when both are given.',
            },
            {
              prop: 'variant',
              type: "'stacked' | 'horizontal'",
              description:
                'Lockup orientation. Only matters when src is omitted: horizontal renders the tenant’s built-in inline mark if one exists (currently fams), else falls back to the text wordmark, same as stacked (default).',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLSpanElement>',
              description: 'className and any span attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Omit tenant and let it read data-tenant when rendering inside the themed app shell.',
            'Pass tenant explicitly in contexts outside the shell (previews, emails, PDFs).',
            'Override colour via className, never by forking the component per tenant.',
            'Use it as the single wordmark everywhere a brand name is shown.',
          ]}
          donts={[
            'Don’t hardcode a tenant’s literal name string instead of using Logo.',
            'Don’t create a per-tenant Logo variant — the enum is deliberately closed to five values.',
            'Don’t assume a fixed text colour — it inherits text-primary and needs an override on dark surfaces.',
            'Don’t use it as a clickable link wrapper — wrap it externally if it needs to navigate.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders a <span> — wrap it in an <h1> or <a> at the call site when it needs that semantic role.',
            'Text is real content ("FAMS", "Tadweer", "EAD", "MM"), never an image, so it stays readable by assistive tech and scales with text zoom.',
            'Colour comes from the text-primary token and meets contrast on both light and brand surfaces (see Tone above).',
            'Has no inherent direction, so it sits correctly among RTL siblings without any component-level change.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

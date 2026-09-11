import { AppBootSkeleton } from '@fams/v5-templates'
import { DocPage, DocSection, Prose, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * AppBootSkeletonDemo — the app's FIRST FRAME, previewed inside a bordered
 * box rather than at its natural `h-dvh`.
 *
 * Both states are shown because they are dimensionally different promises:
 * the generic frame (rail + top bar + module header/tabs + a body placeholder)
 * and the config-aware frame, which delegates the body to the booting module's
 * OWN view template in its loading state.
 */
export default function AppBootSkeletonDemo() {
  return (
    <DocPage
      title="AppBootSkeleton"
      badge="wip"
      summary="The frame a FAMS app paints before the router, the API worker or the tenant bootstrap have resolved — the app entry renders it into the root synchronously, then re-renders the real app onto the same root. It reproduces the shell frame (nav rail column, 48px top bar, 64px module header/tabs row, the p-6 module-body inset) so the swap to the loaded UI shifts nothing, and delegates the body to the booting module's own view template when that module's blueprint is known synchronously."
    >
      <DocSection id="preview" title="Preview">
        <Prose>
          The generic frame — no blueprint known yet. It fills its container (<Code>h-dvh</Code> in
          a real app); the box below constrains it for the docs.
        </Prose>
        <div className="h-[420px] w-full overflow-hidden rounded-md border border-border">
          <AppBootSkeleton className="h-full" />
        </div>
      </DocSection>

      <DocSection id="brand-loader" title="Branded loader (brandLoaderSrc)">
        <Prose>
          A tenant with a boot-time brand animation (e.g. a self-contained, looping HTML page)
          replaces the skeleton bars entirely with a full-bleed iframe showing it — the animation
          IS the boot page, not a fragment slotted into the module body.
        </Prose>
        <div className="h-[420px] w-full overflow-hidden rounded-md border border-border">
          <AppBootSkeleton className="h-full" brandLoaderSrc="/branding/qatar-mme-logo-animation.html" />
        </div>
      </DocSection>

      <DocSection id="register" title="Register with the loaded layout">
        <Prose>
          The whole point of the component is dimensional honesty: every row it draws matches the
          loaded shell&apos;s own row, so hydration is a swap and not a lurch. A missing row is a
          visible jump that CLS does <strong>not</strong> catch, because the skeleton subtree
          unmounts rather than reflows. Rows, top to bottom: the 46px collapsed nav rail column,
          the 48px top bar, the 64px module header + view-tabs row, then the module body at its{' '}
          <Code>p-6</Code> inset.
        </Prose>
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'config',
              type: 'EntityConfig',
              description:
                'The blueprint of the module the app is booting into, when it is known synchronously (v5 apps bundle their resolved blueprints). Given one, the body renders that module’s own view template in its loading state instead of a generic placeholder. Omit for the generic frame.',
            },
            { prop: 'className', type: 'string', description: 'Root class override — e.g. h-full to preview it inside a box instead of at h-dvh.' },
            {
              prop: 'brandLoaderSrc',
              type: 'string',
              description:
                'Path to a tenant’s self-contained, looping HTML boot animation (e.g. a tenant manifest’s branding.loader). When set, replaces the skeleton bars with a full-bleed, non-interactive iframe showing that page — config is then ignored. Omit for the generic frame; behaviour is unchanged.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Render it from the app ENTRY, into the same root the real app will re-render onto — a component-level loading state cannot help, because no React node is mounted yet.',
            'Keep every row height in step with the real shell; a skeleton out of register is worse than none.',
            'Pass the booting module’s config whenever it is known synchronously — the module’s own template is a far better shape guess than anything generic.',
          ]}
          donts={[
            'Don’t use it as a per-view loading state — views own their own loading branch (CockpitView’s loading prop, ListView’s, …).',
            'Don’t add a spinner: under prefers-reduced-motion the shimmer freezes, and static shape placeholders still read as loading. A spinner would be the one progress signal that stops.',
            'Don’t let it be the app’s FIRST paint budget — it only helps once the document itself has bytes in it.',
          ]}
        />
      </DocSection>

      <DocSection id="a11y" title="Accessibility">
        <A11yList
          items={[
            'The root is role="status" with aria-busy="true" and aria-label="Loading" — assistive tech announces the boot instead of an empty page.',
            'Every purely decorative row (rail, top bar, module header) is aria-hidden, so the announcement is one word, not a tour of empty boxes.',
            'No focusable content: the skeleton never steals or traps focus from the app that replaces it.',
            'Under prefers-reduced-motion the pulse freezes; the shapes themselves remain the progress signal.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

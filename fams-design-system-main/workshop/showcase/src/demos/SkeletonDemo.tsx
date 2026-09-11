import { Skeleton, Stack, Card, CardHeader, CardContent, CardFooter } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

/**
 * SkeletonDemo — the loading placeholder every data surface uses instead of
 * a spinner. Compose several to build a table/card/list/profile skeleton —
 * never an ad-hoc pulsing div per feature.
 */
export default function SkeletonDemo() {
  return (
    <DocPage
      title="Skeleton"
      badge="stable"
      summary="Loading placeholder every data surface uses instead of a spinner. Compose several to build a table/card/list/profile skeleton — never an ad-hoc pulsing div per feature."
    >
      <DocSection id="shapes" title="Shapes">
        <Prose>
          Four preset shapes. <Code>image</Code> centers a muted map/photo icon for the
          map-tile / thumbnail placeholder archetype — not a plain rect.
        </Prose>
        <Gallery
          minColRem={10}
          items={[
            { label: 'text', node: <Skeleton variant="text" className="w-full" /> },
            { label: 'circle', node: <Skeleton variant="circle" className="size-10" /> },
            { label: 'rect', node: <Skeleton variant="rect" className="w-full" /> },
            { label: 'image', node: <Skeleton variant="image" className="h-24 w-full" /> },
          ]}
        />
      </DocSection>

      <DocSection id="composed" title="Composed patterns">
        <Prose>
          Skeleton has no knowledge of layout — the caller composes shapes to match the loaded
          content.
        </Prose>
        <Gallery
          minColRem={16}
          items={[
            {
              label: 'List row',
              node: (
                <Stack gap="field" className="w-full">
                  <Stack direction="row" align="center" gap="field">
                    <Skeleton variant="circle" className="size-8" />
                    <Skeleton variant="text" className="flex-1" />
                  </Stack>
                  <Stack direction="row" align="center" gap="field">
                    <Skeleton variant="circle" className="size-8" />
                    <Skeleton variant="text" className="flex-1" />
                  </Stack>
                </Stack>
              ),
            },
            {
              label: 'Card',
              node: (
                <Card className="w-full">
                  <CardHeader>
                    <Skeleton variant="text" className="w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton variant="rect" className="h-20" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton variant="text" className="w-24" />
                  </CardFooter>
                </Card>
              ),
            },
            {
              label: 'Profile',
              node: (
                <Stack align="center" gap="field" className="w-full">
                  <Skeleton variant="circle" className="size-16" />
                  <Skeleton variant="text" className="w-1/3" />
                  <Skeleton variant="text" className="w-2/3" />
                </Stack>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'variant',
              type: "'text' | 'circle' | 'rect' | 'image' | 'custom'",
              default: "'text'",
              description:
                'Preset shape. image renders a centered muted icon (map-tile/thumbnail archetype). custom relies entirely on className for sizing.',
            },
            {
              prop: '…props',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'className (for sizing) and any native div attribute pass through.',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Compose several Skeletons to mirror the loaded layout — list row, card, profile.',
            'Use variant="image" for map-tile / thumbnail placeholders instead of a plain rect.',
            "Size it with className (w-1/2, size-10, h-20) to match the real content's footprint.",
            'Swap it out the instant real content is available.',
          ]}
          donts={[
            'Don’t hand-roll a pulsing div per feature — there is exactly one Skeleton for this.',
            'Don’t use a spinner where a Skeleton communicates shape and position better.',
            'Don’t use variant="custom" without a className — it renders with no shape at all.',
            'Don’t leave it mounted after data has loaded.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Rendered with aria-hidden="true" — a purely visual loading affordance that assistive tech does not announce.',
            'Pair it with a live region or loading announcement on the parent surface; Skeleton itself does not announce "loading".',
            'The pulse animation duration is clamped to near-zero under prefers-reduced-motion via the shared global stylesheet rule.',
            'Layout is driven entirely by className (widths, gaps), so it mirrors correctly under RTL with no extra logic.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

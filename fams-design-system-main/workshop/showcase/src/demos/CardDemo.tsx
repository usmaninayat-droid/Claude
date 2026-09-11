import { Truck } from '@fams/ui-kit/icons'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
  Badge,
} from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'

export default function CardDemo() {
  return (
    <DocPage
      title="Card"
      badge="stable"
      summary="Surface container for grouped content — composes with CardHeader/CardTitle/CardDescription/CardContent/CardFooter for the standard header+body+actions layout used across list and detail panels."
    >
      <DocSection id="composition" title="Composition">
        <Prose>
          Every slot — <Code>CardHeader</Code>, <Code>CardTitle</Code>, <Code>CardDescription</Code>,{' '}
          <Code>CardContent</Code>, <Code>CardFooter</Code> — is optional and composes independently;
          use only what a given card needs.
        </Prose>
        <Gallery
          minColRem={18}
          items={[
            {
              label: 'Header + body + footer',
              node: (
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>Lot 1 — Al Ain Central</CardTitle>
                  </CardHeader>
                  <CardContent className="text-body-sm text-muted-foreground">
                    24 vehicles active, 3 in maintenance.
                  </CardContent>
                  <CardFooter>
                    <Button size="sm">View plan</Button>
                  </CardFooter>
                </Card>
              ),
            },
            {
              label: 'With description',
              caption: 'CardHeader + CardTitle + CardDescription',
              node: (
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>Compactor 4200</CardTitle>
                    <CardDescription>Lot 1 · Municipal collection</CardDescription>
                  </CardHeader>
                  <CardContent className="text-body-sm text-muted-foreground">
                    Odometer 128,340 km
                  </CardContent>
                  <CardFooter className="gap-2">
                    <Button size="sm" variant="secondary">
                      Log maintenance
                    </Button>
                    <Button size="sm" variant="tertiary">
                      Compliance
                    </Button>
                  </CardFooter>
                </Card>
              ),
            },
            {
              label: 'Stat card',
              caption: 'CardFooter used for a caption, not actions',
              node: (
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle>Compliance today</CardTitle>
                    <CardDescription>Contract-level SLA rollup</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2">
                      <span className="text-h2 font-bold text-success">96.4%</span>
                      <span className="pb-1 text-body-sm text-muted-foreground">on-route SLA</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <span className="text-body-xs text-muted-foreground">Updated 2 minutes ago</span>
                  </CardFooter>
                </Card>
              ),
            },
            {
              label: 'Header + content only',
              caption: 'no footer',
              node: (
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="size-4 text-muted-foreground" /> Fleet AUH-4471
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-2">
                    <Badge variant="success" dot>
                      Active
                    </Badge>
                    <Badge variant="outline">Lot 2</Badge>
                  </CardContent>
                </Card>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="heading-level" title="Heading level on a card-only page">
        <Prose>
          <Code>CardTitle</Code> renders an <Code>{'<h3>'}</Code> by default so it drops into a
          normal page that already has its own <Code>{'<h1>'}</Code>/<Code>{'<h2>'}</Code>. A page
          built <em>entirely</em> out of Cards — e.g. a login screen with no other heading on
          it — has no <Code>{'<h1>'}</Code> at all unless one CardTitle is told to be one. Set{' '}
          <Code>level={'{1}'}</Code> on that card's title; visual size stays exactly the same,
          only the rendered tag changes. Do not use <Code>aria-level</Code> for this — it does not
          override the accessible level Chromium computes from a native <Code>{'<h3>'}</Code>.
        </Prose>
        <Gallery
          minColRem={18}
          items={[
            {
              label: 'Primary heading of a card-only page',
              caption: 'level={1} — renders <h1>, same visual style as the default <h3>',
              node: (
                <Card className="w-full">
                  <CardHeader>
                    <CardTitle level={1}>Sign in to FAMS</CardTitle>
                    <CardDescription>Enter your credentials to continue.</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button size="sm">Continue</Button>
                  </CardFooter>
                </Card>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <Prose>
          None of the slots declare custom props — each forwards <Code>className</Code> and native
          attributes to a plain element. Composition is the API.
        </Prose>
        <PropsTable
          rows={[
            {
              prop: 'Card',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'Root surface — rounded border, background, and elevation shadow.',
            },
            {
              prop: 'CardHeader',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'Padded header slot; stacks CardTitle/CardDescription vertically.',
            },
            {
              prop: 'CardTitle',
              type: "HTMLAttributes<HTMLHeadingElement> & { level?: 1|2|3|4|5|6; asChild?: boolean }",
              description:
                'Renders an <h3> by default. Set `level` (1–6) to change the rendered tag for document structure — e.g. `level={1}` for the primary title on a card-only page — without changing CardTitle\'s visual size. `asChild` merges onto a single child element instead.',
            },
            {
              prop: 'CardDescription',
              type: 'HTMLAttributes<HTMLParagraphElement>',
              description: "Renders a <p> — muted secondary line under the title.",
            },
            {
              prop: 'CardContent',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'Padded body slot (no top padding — sits directly under CardHeader).',
            },
            {
              prop: 'CardFooter',
              type: 'HTMLAttributes<HTMLDivElement>',
              description: 'Padded, horizontally-aligned row for actions or a trailing caption (no top padding).',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use CardFooter for the primary action(s) tied to the card\'s content, or a short trailing caption.',
            'Skip slots you don\'t need — a stat card can be just CardHeader + CardContent.',
            'Keep CardTitle to a short label; move detail into CardDescription or CardContent.',
            'Compose freely — CardContent accepts any content, including other components (Badge, charts, lists).',
            'On a page built entirely out of Cards (e.g. a login screen), set `level={1}` on the one CardTitle that is the page\'s main heading, so the page still has a real <h1>.',
          ]}
          donts={[
            "Don't nest a Card inside another Card's CardContent — flatten the hierarchy instead.",
            "Don't use Card as a clickable button surface; wrap an actual Button/link inside CardFooter for actions.",
            "Don't put form controls directly in CardHeader — that's CardContent's job.",
            "Don't override the border/shadow with raw values — extend via className using tokens only.",
            "Don't reach for `aria-level` to fake a different heading level — browsers/AT read the accessible level from the actual tag name, so `aria-level={1}` on a <h3> still reports level 3 in Chromium's accessibility tree. Use CardTitle's `level` prop instead; it changes the real element.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Card itself carries no implicit role — it is a plain, non-interactive container.',
            'CardTitle renders an <h3> by default; place a default Card only where an h3 is valid in the surrounding heading hierarchy. Pass `level` (1–6) when a card\'s title needs to be a different heading level — e.g. `level={1}` when a page is composed entirely of Cards and needs a real top-level heading. `aria-level` is not a substitute: it does not change what the accessibility tree reports for a native heading element.',
            'Interactive content (buttons, links) inside CardFooter keeps its own native keyboard support — Card adds no extra tab stops.',
            'Header/content/footer padding is logical (p-4, pt-0), so the layout mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

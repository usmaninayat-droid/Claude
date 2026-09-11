import { Download, Plus } from '@fams/ui-kit/icons'
import { PageHeader, Button } from '@fams/ui-kit'
import { DocPage, DocSection, Gallery, Playground, PropsTable, Guidelines, A11yList } from '../docs'

/**
 * PageHeaderDemo — standalone showcase for the PageHeader shell.
 * Belongs under the "Shells" showcase page — the title/subtitle/actions row
 * embedded at the top of ListView, and reusable standalone for any page that
 * doesn't need the full ListView skeleton.
 */

type PageHeaderControls = {
  title: string
  subtitle: string
  showActions: boolean
}

export default function PageHeaderDemo() {
  return (
    <DocPage
      title="PageHeader"
      badge="stable"
      summary="Title + subtitle on the start edge, actions pinned to the end. Stacks vertically below sm and goes side-by-side from sm up. Embedded inside ListView — also usable standalone on any page that needs just a title row."
    >
      <DocSection id="playground" title="Playground">
        <Playground<PageHeaderControls>
          controls={[
            { name: 'title', type: 'text', default: 'Fleet' },
            { name: 'subtitle', type: 'text', default: 'Northern Emirates — Al Ain · 128 vehicles' },
            { name: 'showActions', type: 'boolean', default: true },
          ]}
        >
          {(v) => (
            <div className="w-full">
              <PageHeader
                title={v.title}
                subtitle={v.subtitle || undefined}
                actions={
                  v.showActions ? (
                    <>
                      <Button variant="secondary" size="sm">
                        <Download /> Export
                      </Button>
                      <Button size="sm">
                        <Plus /> New plan
                      </Button>
                    </>
                  ) : undefined
                }
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="compositions" title="Compositions">
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'Title + subtitle + actions',
              caption: 'actions wrap to a new row below sm',
              node: (
                <div className="w-full">
                  <PageHeader
                    title="Fleet"
                    subtitle="Northern Emirates — Al Ain · 128 vehicles"
                    actions={
                      <>
                        <Button variant="secondary" size="sm">
                          <Download /> Export
                        </Button>
                        <Button size="sm">
                          <Plus /> New plan
                        </Button>
                      </>
                    }
                  />
                </div>
              ),
            },
            {
              label: 'Title + subtitle',
              caption: 'no actions',
              node: (
                <div className="w-full">
                  <PageHeader title="Contracts" subtitle="12 active" />
                </div>
              ),
            },
            {
              label: 'Title only',
              caption: 'subtitle and actions both optional',
              node: (
                <div className="w-full">
                  <PageHeader title="Contracts" />
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
              prop: 'title',
              type: 'ReactNode',
              required: true,
              description: 'Primary page title, rendered as an <h1>.',
            },
            {
              prop: 'subtitle',
              type: 'ReactNode',
              description: 'Optional supporting line below the title.',
            },
            {
              prop: 'actions',
              type: 'ReactNode',
              description: 'Action content (buttons), pinned to the end edge on sm and up.',
            },
            {
              prop: '…props',
              type: "Omit<HTMLAttributes<HTMLDivElement>, 'title'>",
              description: 'className and any div attribute pass through (the native title attribute is reserved by the title prop above).',
            },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Use PageHeader for the title row atop any page, standalone or embedded (ListView already renders one internally).',
            'Keep subtitle to a single supporting line — a count or scope, not a paragraph.',
            "Put the page's primary action(s) in actions — it pins them to the trailing edge on sm and up.",
            'Let it stack vertically on narrow screens; that responsive behaviour is automatic.',
          ]}
          donts={[
            'Don’t nest a second PageHeader inside a component that already renders one (e.g. ListView).',
            "Don't crowd actions with more than 2–3 buttons — a header row isn't a toolbar.",
            "Don't pass a long paragraph as subtitle — it renders as a single truncated line, not a wrapping block.",
            "Don't hand-roll the sm side-by-side breakpoint with custom flex classes — PageHeader already handles it.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'title renders as an <h1> — use one PageHeader per page to keep the document outline correct.',
            'subtitle is a plain <p> immediately after the heading, read right after the title by assistive tech.',
            'Actions keep native button semantics and tab order — no custom focus handling.',
            'Layout uses logical properties (sm:ms-auto), so it mirrors correctly under RTL (switch the header language).',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

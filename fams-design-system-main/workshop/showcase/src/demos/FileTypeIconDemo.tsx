import { DocPage, DocSection, Prose, Gallery, PropsTable, Guidelines, A11yList, Code } from '../docs'
import { FileTypeIcon } from '../../../../packages/ui-kit/src/primitives/FileTypeIcon'

const COMMON_FILES = ['report.pdf', 'budget.xlsx', 'photo.png', 'contract.docx', 'archive.zip', 'unknown.xyz']

/**
 * FileTypeIconDemo — filename/extension → icon + accent tile. See
 * docs/COMPONENT-GUIDE.md for the standard component-page template.
 */
export default function FileTypeIconDemo() {
  return (
    <DocPage
      title="FileTypeIcon"
      badge="stable"
      summary="Maps a filename or extension to a glyph + accent tile. Replaces the extension→SVG lookup duplicated across v5 (only 12 extensions covered by static assets today; everything else silently falls through)."
    >
      <DocSection id="file-types" title="Common file types">
        <Prose>
          Pass a <Code>filename</Code> (or a bare extension) — the extension is resolved
          case-insensitively and matched to an accent category and glyph.
        </Prose>
        <Gallery
          minColRem={8}
          items={COMMON_FILES.map((filename) => ({
            label: filename,
            node: <FileTypeIcon filename={filename} />,
          }))}
        />
      </DocSection>

      <DocSection id="sizes" title="Sizes">
        <Gallery
          minColRem={8}
          items={[
            { label: 'sm', node: <FileTypeIcon filename="report.pdf" size="sm" /> },
            { label: 'md', caption: 'default', node: <FileTypeIcon filename="report.pdf" size="md" /> },
            { label: 'lg', node: <FileTypeIcon filename="report.pdf" size="lg" /> },
          ]}
        />
      </DocSection>

      <DocSection id="fallback" title="Unknown / blank fallback">
        <Prose>
          An unmapped extension or a missing filename renders the neutral question-mark glyph —
          never a blank tile.
        </Prose>
        <Gallery
          minColRem={8}
          items={[
            {
              label: 'archive.xyz',
              caption: 'unmapped extension',
              node: <FileTypeIcon filename="archive.xyz" />,
            },
            { label: '(no filename)', caption: 'omitted prop', node: <FileTypeIcon /> },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'filename',
              type: 'string | null',
              description: 'Filename ("invoice.pdf") or a bare extension ("pdf" / ".pdf"), case-insensitive.',
            },
            {
              prop: 'size',
              type: "'sm' | 'md' | 'lg'",
              default: "'md'",
              description: 'Tile and glyph scale together: sm (size-8), md (size-10), lg (size-12).',
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
            'Pass the real filename so the extension is resolved automatically.',
            'Pair it with the visible filename text — the icon alone should never be the only label.',
            'Use size sm in dense lists, lg for a standalone upload/attachment card.',
            'Trust the fallback — an unrecognized extension still renders a sensible neutral glyph.',
          ]}
          donts={[
            'Don’t hardcode a per-extension icon lookup elsewhere — extend the shared FILE_TYPE_MAP instead.',
            'Don’t use it as an interactive control; it is a non-interactive presenter.',
            'Don’t assume every extension has a distinct color — many share the same accent category.',
            'Don’t pass a raw MIME type; it expects a filename or extension string.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Renders role="img" with an aria-label ("PDF file", "unknown file type") — no visible text needed.',
            "The glyph itself is aria-hidden; the span's aria-label carries the meaning for assistive tech.",
            'Every category tint meets WCAG 2.2 AA contrast against its tile background.',
            'The tile is symmetric with no directional classes, so it renders identically under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

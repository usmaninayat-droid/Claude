import { useState } from 'react'
import { ImageGallery, type ImageGalleryImage } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

// Domain-agnostic inline SVG placeholders — no network calls, no CSP issues.
function placeholderImage(label: string, bg: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="40" fill="#ffffff">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const SAMPLE_IMAGES: ImageGalleryImage[] = [
  { src: placeholderImage('01', '#0072e0'), alt: 'Sample photo 1', caption: 'Site visit — 09:12' },
  { src: placeholderImage('02', '#12b76a'), alt: 'Sample photo 2', caption: 'Before' },
  { src: placeholderImage('03', '#f79009'), alt: 'Sample photo 3', caption: 'After' },
  { src: placeholderImage('04', '#f04438'), alt: 'Sample photo 4' },
  { src: placeholderImage('05', '#7a5af8'), alt: 'Sample photo 5' },
]

const SINGLE_IMAGE: ImageGalleryImage[] = [{ src: placeholderImage('01', '#0072e0'), alt: 'Single sample photo' }]

type ImageGalleryControls = {
  size: 'sm' | 'md' | 'lg'
}

/**
 * ImageGalleryDemo — standard component-page template for the ImageGallery
 * composite. Consolidates the thumbnail-grid-to-fullscreen-lightbox pattern
 * repeated across evidence photos, before/after shots, and inspection
 * attachments. Sample images are inline SVG data URIs — no network
 * dependency, safe under any CSP.
 */
export default function ImageGalleryDemo() {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <DocPage
      title="ImageGallery"
      badge="stable"
      summary="Thumbnail strip (embla-carousel-react) plus a fullscreen lightbox Dialog with Previous/Next, a counter, and RTL-aware arrow-key navigation. State-agnostic — renders exactly the images it is given; which one is active is transient UI state, mirrored out via onIndexChange. Consolidates the thumbnail-grid-to-fullscreen pattern repeated across evidence photos, before/after shots, and inspection attachments."
    >
      <DocSection id="playground" title="Playground">
        <Prose>
          Click a thumbnail to open the fullscreen lightbox — Previous/Next, the counter, and arrow keys all
          move together. <Code>onIndexChange</Code> mirrors the active index out; it is currently{' '}
          <Code>{activeIndex}</Code>.
        </Prose>
        <Playground<ImageGalleryControls>
          controls={[{ name: 'size', type: 'select', default: 'md', options: ['sm', 'md', 'lg'] }]}
        >
          {(v) => (
            <div className="w-full max-w-xl">
              <ImageGallery images={SAMPLE_IMAGES} size={v.size} onIndexChange={setActiveIndex} />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="sizes" title="Thumbnail sizes">
        <Gallery
          minColRem={20}
          items={[
            {
              label: 'sm',
              node: (
                <div className="max-w-xs">
                  <ImageGallery images={SAMPLE_IMAGES} size="sm" />
                </div>
              ),
            },
            {
              label: 'md (default)',
              node: (
                <div className="max-w-xs">
                  <ImageGallery images={SAMPLE_IMAGES} size="md" />
                </div>
              ),
            },
            {
              label: 'lg',
              node: (
                <div className="max-w-xs">
                  <ImageGallery images={SAMPLE_IMAGES} size="lg" />
                </div>
              ),
            },
          ]}
        />
      </DocSection>

      <DocSection id="states" title="States">
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'Single image',
              caption: 'Previous/Next and the counter hide',
              node: <ImageGallery images={SINGLE_IMAGE} />,
            },
            {
              label: 'Loading',
              caption: 'skeleton placeholders while the caller is still loading images',
              node: <ImageGallery images={[]} loading />,
            },
            { label: 'Empty', caption: 'no images to show', node: <ImageGallery images={[]} /> },
          ]}
        />
      </DocSection>

      <DocSection id="props" title="Props">
        <PropsTable
          rows={[
            {
              prop: 'images',
              type: 'ImageGalleryImage[]',
              required: true,
              description: 'Images to display. Click any thumbnail to open the fullscreen lightbox on it.',
            },
            {
              prop: 'initialIndex',
              type: 'number',
              default: '0',
              description: 'Index the lightbox opens on the first time it is triggered. Clamped to the images range.',
            },
            {
              prop: 'onIndexChange',
              type: '(index: number) => void',
              description: 'Fires whenever the active image changes — thumbnail click, Previous/Next, or arrow keys.',
            },
            { prop: 'size', type: "'sm' | 'md' | 'lg'", default: "'md'", description: 'Thumbnail size.' },
            {
              prop: 'loading',
              type: 'boolean',
              default: 'false',
              description: 'Shows skeleton placeholders instead of thumbnails while images is still loading.',
            },
            { prop: 'className', type: 'string', description: 'Applied to the outer container.' },
          ]}
        />
        <Prose>
          Each entry in <Code>images</Code> is an <Code>ImageGalleryImage</Code>:
        </Prose>
        <PropsTable
          rows={[
            { prop: 'src', type: 'string', required: true, description: 'Image URL.' },
            { prop: 'alt', type: 'string', required: true, description: 'Accessible alt text — required, never inferred from the filename.' },
            { prop: 'caption', type: 'string', description: 'Optional caption shown under the image in the lightbox.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Always provide a meaningful alt for every image — it is required and never inferred from the filename.',
            'Use caption for context that belongs with the image (location, timestamp, before/after label).',
            'Wire onIndexChange only when another part of the screen needs to stay in sync (e.g. a caption panel).',
            'Pass loading while the caller is still fetching images, rather than rendering an empty gallery.',
          ]}
          donts={[
            "Don't treat ImageGallery as an editor — it has no delete/reorder affordance; compose that around it if needed.",
            "Don't pass a single-item array expecting Previous/Next controls — they hide automatically for one image.",
            "Don't rely on the lightbox for anything but review — it renders images only, no zoom/pan/annotation.",
            "Don't skip caption when the same image set is also used without surrounding context (e.g. a standalone evidence review).",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Each thumbnail is a labelled button ("Open image N of M: <alt>"), not a bare <img>.',
            'The lightbox is a real Dialog — focus is trapped inside it and Escape closes it.',
            'Previous/Next controls and the counter are keyboard- and screen-reader-accessible; the counter region is aria-live.',
            'Arrow-key navigation respects the nearest dir ancestor, including through the lightbox\'s portal into document.body — under RTL the visually-forward key always advances.',
            'Chevron icons and the counter position mirror correctly under RTL via logical properties.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

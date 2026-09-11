import { useState } from 'react'
import { FileUploader, type UploadedFile } from '@fams/ui-kit'
import { DocPage, DocSection, Prose, Gallery, Playground, PropsTable, Guidelines, A11yList, Code } from '../docs'

// Domain-agnostic inline SVG placeholders — no network calls, no CSP issues.
function placeholderImage(label: string, bg: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#ffffff">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

let idCounter = 100
function nextId() {
  idCounter += 1
  return `upload-${idCounter}`
}

const STARTER_FILES: UploadedFile[] = [
  {
    id: 'starter-1',
    name: 'photo-01.jpg',
    mimeType: 'image/jpeg',
    previewUrl: placeholderImage('01', '#12b76a'),
    status: 'done',
  },
  {
    id: 'starter-2',
    name: 'photo-02.jpg',
    mimeType: 'image/jpeg',
    previewUrl: placeholderImage('02', '#0072e0'),
    status: 'uploading',
    progress: 55,
  },
  {
    id: 'starter-3',
    name: 'photo-03.jpg',
    mimeType: 'image/jpeg',
    status: 'error',
    errorText: 'Upload failed — retry',
  },
]

const PDF_FILE: UploadedFile = {
  id: 'starter-doc',
  name: 'report.pdf',
  mimeType: 'application/pdf',
  status: 'done',
}

type FileUploaderControls = {
  maxFiles: string
  disabled: boolean
}

function toUploadedFiles(added: File[]): UploadedFile[] {
  return added.map((file) => ({
    id: nextId(),
    name: file.name,
    mimeType: file.type,
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    status: 'done',
  }))
}

/**
 * FileUploaderDemo — standard component-page template for the FileUploader
 * composite. Presentational only: never touches File, FormData, or an
 * upload request — the caller's useFileUpload hook owns compression/upload/
 * progress. Ported from MediaUploader.vue, retiring ~10 forked upload
 * components across the v5 codebase (ImageUpload, FileUpload, two
 * tenant-forked ImageUploaders, UploadWithDelete, SignUploader, …).
 */
export default function FileUploaderDemo() {
  const [files, setFiles] = useState<UploadedFile[]>(STARTER_FILES)
  const [emptyFiles, setEmptyFiles] = useState<UploadedFile[]>([])

  const handleAdd = (added: File[]) => setFiles((prev) => [...prev, ...toUploadedFiles(added)])
  const handleRemove = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id))

  const handleEmptyAdd = (added: File[]) => setEmptyFiles((prev) => [...prev, ...toUploadedFiles(added)])
  const handleEmptyRemove = (id: string) => setEmptyFiles((prev) => prev.filter((f) => f.id !== id))

  return (
    <DocPage
      title="FileUploader"
      badge="stable"
      summary="Presentational drag-and-drop / click-to-browse dropzone plus per-file tiles for preview, progress, and error states. It never uploads anything — onAdd emits the accepted File objects and the caller's useFileUpload hook owns compression, the request, and progress; this component only renders whatever files state that hook hands back."
    >
      <DocSection id="playground" title="Playground">
        <Prose>
          Drop a file or click the dropzone to add it, or remove one of the starter tiles — this demo keeps
          local state to stand in for the caller's <Code>useFileUpload</Code> hook, so add/remove genuinely
          work here.
        </Prose>
        <Playground<FileUploaderControls>
          controls={[
            { name: 'maxFiles', type: 'select', default: '5', options: ['3', '5', '8'] },
            { name: 'disabled', type: 'boolean', default: false },
          ]}
        >
          {(v) => (
            <div className="w-full max-w-md">
              <FileUploader
                files={files}
                onAdd={handleAdd}
                onRemove={handleRemove}
                maxFiles={Number(v.maxFiles)}
                disabled={v.disabled}
              />
            </div>
          )}
        </Playground>
      </DocSection>

      <DocSection id="empty" title="Empty dropzone">
        <Prose>No files yet — the dropzone alone, with custom call-to-action and hint text.</Prose>
        <div className="max-w-sm">
          <FileUploader
            files={emptyFiles}
            onAdd={handleEmptyAdd}
            onRemove={handleEmptyRemove}
            addMoreText="Add inspection photo"
            hint="PNG or JPG, up to 10MB"
          />
        </div>
      </DocSection>

      <DocSection id="states" title="Tile states">
        <Prose>
          Every tile state the caller's hook can hand back — <Code>done</Code> with a preview,{' '}
          <Code>uploading</Code> with a progress bar, and <Code>error</Code> with a reason. A non-image file
          falls back to the generic file icon.
        </Prose>
        <Gallery
          minColRem={12}
          items={[
            {
              label: 'done',
              node: <FileUploader files={[STARTER_FILES[0]]} onAdd={() => {}} onRemove={() => {}} />,
            },
            {
              label: 'uploading',
              node: <FileUploader files={[STARTER_FILES[1]]} onAdd={() => {}} onRemove={() => {}} />,
            },
            {
              label: 'error',
              node: <FileUploader files={[STARTER_FILES[2]]} onAdd={() => {}} onRemove={() => {}} />,
            },
            {
              label: 'non-image file',
              caption: 'generic file icon fallback',
              node: <FileUploader files={[PDF_FILE]} onAdd={() => {}} onRemove={() => {}} />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="limits" title="Disabled and at-limit">
        <Gallery
          minColRem={14}
          items={[
            {
              label: 'disabled',
              node: <FileUploader files={STARTER_FILES} onAdd={() => {}} onRemove={() => {}} disabled />,
            },
            {
              label: 'maxFiles reached',
              caption: 'the dropzone hides once the cap is hit',
              node: <FileUploader files={STARTER_FILES} onAdd={() => {}} onRemove={() => {}} maxFiles={3} />,
            },
          ]}
        />
      </DocSection>

      <DocSection id="panel" title="File-upload spec (panel layout)">
        <Prose>
          The figma file-upload spec surface: <Code>layout="panel"</Code> renders the illustrated
          dashed dropzone (drag-over swaps to a <Code>Drop here</Code> fill). <Code>variant="compact"</Code>{' '}
          is the tighter pipelines density. Uploaded files render as large tiles with re-upload /
          edit / delete overlay actions (image) or the single-file row with text actions
          (non-image, <Code>multiple=false</Code>); with <Code>multiple</Code> the affordance moves
          into the leading <Code>Upload More</Code> tile. <Code>label</Code> turns the empty
          dropzone into a named-group tile — compose one labeled uploader per group app-side.
        </Prose>
        <Gallery
          minColRem={22}
          items={[
            {
              label: 'panel — default',
              node: (
                <FileUploader
                  files={[]}
                  onAdd={() => {}}
                  onRemove={() => {}}
                  layout="panel"
                  hint="Accepted formats: .png, .jpeg, .jpg, .mp4, .mov"
                />
              ),
            },
            {
              label: 'panel — compact',
              node: (
                <FileUploader
                  files={[]}
                  onAdd={() => {}}
                  onRemove={() => {}}
                  layout="panel"
                  variant="compact"
                  hint="Accepted formats: .png, .jpeg, .jpg"
                />
              ),
            },
            {
              label: 'single image uploaded',
              caption: 're-upload / edit / delete overlay actions',
              node: (
                <FileUploader
                  files={[STARTER_FILES[0]]}
                  onAdd={() => {}}
                  onRemove={() => {}}
                  onReupload={() => {}}
                  onFileEdit={() => {}}
                  layout="panel"
                  multiple={false}
                />
              ),
            },
            {
              label: 'single non-image uploaded',
              caption: 'row with Re-Upload / Delete text actions',
              node: (
                <FileUploader
                  files={[PDF_FILE]}
                  onAdd={() => {}}
                  onRemove={() => {}}
                  onReupload={() => {}}
                  layout="panel"
                  multiple={false}
                />
              ),
            },
            {
              label: 'multi — mixed files',
              caption: 'Upload More tile leads the grid',
              node: (
                <FileUploader
                  files={[STARTER_FILES[0], PDF_FILE]}
                  onAdd={() => {}}
                  onRemove={() => {}}
                  onReupload={() => {}}
                  onFileEdit={() => {}}
                  layout="panel"
                  addMoreText="Upload More"
                />
              ),
            },
            {
              label: 'named groups',
              caption: 'one labeled uploader per group, composed app-side',
              node: (
                <div className="flex gap-4">
                  <FileUploader files={[]} onAdd={() => {}} onRemove={() => {}} layout="panel" label="Front Side" />
                  <FileUploader files={[]} onAdd={() => {}} onRemove={() => {}} layout="panel" label="Back Side" />
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
              prop: 'files',
              type: 'UploadedFile[]',
              required: true,
              description: "Always caller-supplied — the app-layer useFileUpload hook owns compression/upload/progress.",
            },
            {
              prop: 'onAdd',
              type: '(files: File[]) => void',
              required: true,
              description: 'Fires with the accepted files — accept/maxFiles/maxFileSizeMB filtering already applied.',
            },
            { prop: 'onRemove', type: '(id: string) => void', required: true, description: 'Fires with the tile\'s id.' },
            {
              prop: 'accept',
              type: 'string',
              default: "'image/png,image/jpeg,image/jpg'",
              description: 'Native accept passed straight to the file input.',
            },
            { prop: 'maxFiles', type: 'number', default: '5', description: 'Cap on total files; the dropzone hides once reached.' },
            {
              prop: 'maxFileSizeMB',
              type: 'number',
              default: '10',
              description: '0 disables the size check.',
            },
            { prop: 'multiple', type: 'boolean', default: 'true', description: 'Allows selecting/dropping more than one file at once.' },
            { prop: 'disabled', type: 'boolean', default: 'false', description: 'Disables the dropzone and remove buttons.' },
            { prop: 'addMoreText', type: 'string', default: "'Upload more'", description: 'Dropzone label shown once at least one file exists.' },
            { prop: 'hint', type: 'string', description: 'Helper text under the tiles (inside the empty panel dropzone), hidden while a rejection message is showing.' },
            { prop: 'layout', type: "'grid' | 'bar' | 'panel'", default: "'grid'", description: "'panel' is the figma file-upload spec dropzone; 'grid'/'bar' are the legacy layouts." },
            { prop: 'variant', type: "'default' | 'compact'", default: "'default'", description: 'Panel density — compact is the pipelines usage context.' },
            { prop: 'illustration', type: 'ReactNode', description: 'Replaces the default dropzone illustration in the panel layout.' },
            { prop: 'ctaText', type: 'string', default: "'Drag & drop here, or Choose files'", description: 'CTA line inside the panel dropzone.' },
            { prop: 'dropText', type: 'string', default: "'Drop here'", description: 'Shown while dragging over the panel dropzone.' },
            { prop: 'label', type: 'ReactNode', description: 'Named-group tile mode for the empty panel dropzone.' },
            { prop: 'onReupload', type: '(id: string) => void', description: 'Re-upload action — rendered only when provided.' },
            { prop: 'onFileEdit', type: '(id: string) => void', description: 'Edit action on image tiles — rendered only when provided.' },
            {
              prop: 'renderPreview',
              type: '(file: UploadedFile) => ReactNode',
              description: 'Custom per-file tile content — hook in a doc-icon or carousel-preview variant here instead of a new prop.',
            },
            {
              prop: 'onRejected',
              type: '(rejected: { file: File; reason: string }[]) => void',
              description: 'Files rejected locally (wrong type / too large / over the cap) before onAdd ever fires.',
            },
            { prop: 'className', type: 'string', description: 'Applied to the outer container.' },
          ]}
        />
        <Prose>
          Each entry in <Code>files</Code> is an <Code>UploadedFile</Code>:
        </Prose>
        <PropsTable
          rows={[
            { prop: 'id', type: 'string', required: true, description: 'Stable identifier, passed back on remove.' },
            {
              prop: 'previewUrl',
              type: 'string',
              description: 'Data-URL/blob/CDN url. Omit to fall back to the generic file icon.',
            },
            { prop: 'name', type: 'string', description: 'Shown under the icon fallback and in the remove button\'s aria-label.' },
            { prop: 'mimeType', type: 'string', description: 'Used to decide image preview vs. generic icon.' },
            { prop: 'progress', type: 'number', description: '0-100. Only rendered while status is uploading.' },
            { prop: 'status', type: "'pending' | 'uploading' | 'done' | 'error'", description: 'Drives the progress bar, spinner, and error banner.' },
            { prop: 'errorText', type: 'string', description: 'Reason shown in the destructive banner when status is error.' },
          ]}
        />
      </DocSection>

      <DocSection id="guidelines" title="Guidelines">
        <Guidelines
          dos={[
            'Own compression/upload/progress in an app-layer useFileUpload hook — FileUploader only renders the files state it is handed.',
            'Set accept and maxFileSizeMB to match the real backend limits so rejections happen before a wasted upload attempt.',
            'Surface onRejected feedback prominently if the built-in inline message needs more context (e.g. a toast).',
            'Pair with an explicit Save/Submit step when files attach to a form — do not treat selection as already committed.',
          ]}
          donts={[
            "Don't expect FileUploader to perform the upload — it never touches File, FormData, or a network request.",
            "Don't mutate the files array outside onAdd/onRemove; treat it as state owned by the caller.",
            "Don't rely on progress rendering outside status 'uploading' — it is ignored otherwise.",
            "Don't omit errorText on an error tile — the destructive banner needs a reason to be useful.",
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <A11yList
          items={[
            'Remove buttons carry an aria-label ("Remove <name>") — never an icon-only unlabeled control.',
            'The dropzone is a real <label>/<input type="file"> pair, keyboard-focusable and screen-reader operable without extra ARIA.',
            'Rejection and hint text render as visible text, not just a title attribute.',
            'disabled sets the native disabled attribute on the input and remove buttons, removing them from the interactive tab order.',
            'Tile borders and the remove-button position use logical properties, so layout mirrors correctly under RTL.',
          ]}
        />
      </DocSection>
    </DocPage>
  )
}

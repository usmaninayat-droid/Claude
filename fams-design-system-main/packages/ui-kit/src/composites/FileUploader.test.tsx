import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { configureAxe } from 'vitest-axe'
import { toHaveNoViolations } from 'vitest-axe/dist/matchers.js'
import { FileUploader, type UploadedFile } from './FileUploader'

expect.extend({ toHaveNoViolations })
const axe = configureAxe({ rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })

function makeFile(name: string, type: string, sizeBytes = 1024) {
  const file = new File(['x'.repeat(sizeBytes)], name, { type })
  return file
}

const FILES: UploadedFile[] = [
  { id: '1', name: 'plate.jpg', mimeType: 'image/jpeg', previewUrl: 'data:image/jpeg;base64,abc', status: 'done' },
  { id: '2', name: 'contract.pdf', mimeType: 'application/pdf', status: 'uploading', progress: 42 },
]

describe('FileUploader', () => {
  it('renders a tile per given file, image preview vs generic icon', () => {
    render(<FileUploader files={FILES} onAdd={() => {}} onRemove={() => {}} />)
    expect(screen.getByAltText('plate.jpg')).toBeInTheDocument()
    expect(screen.getByText('contract.pdf')).toBeInTheDocument()
  })

  it('shows the dropzone with addMoreText when there are no files', () => {
    render(<FileUploader files={[]} onAdd={() => {}} onRemove={() => {}} addMoreText="Add a photo" />)
    expect(screen.getByText('Add a photo')).toBeInTheDocument()
  })

  it('hides the dropzone once maxFiles is reached', () => {
    render(<FileUploader files={FILES} onAdd={() => {}} onRemove={() => {}} maxFiles={2} />)
    expect(screen.queryByLabelText(/upload|add/i)).not.toBeInTheDocument()
  })

  it('calls onRemove with the tile file id', () => {
    const onRemove = vi.fn()
    render(<FileUploader files={FILES} onAdd={() => {}} onRemove={onRemove} />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove plate.jpg' }))
    expect(onRemove).toHaveBeenCalledWith('1')
  })

  it('calls onAdd with accepted files picked via the input', () => {
    const onAdd = vi.fn()
    render(<FileUploader files={[]} onAdd={onAdd} onRemove={() => {}} accept="image/png,image/jpeg" />)
    const input = screen.getByLabelText(/upload more/i) as HTMLInputElement
    const file = makeFile('a.png', 'image/png')
    fireEvent.change(input, { target: { files: [file] } })
    expect(onAdd).toHaveBeenCalledTimes(1)
    const passed = onAdd.mock.calls[0][0] as FileList
    expect(passed).toHaveLength(1)
    expect(passed[0].name).toBe('a.png')
  })

  it('rejects a file of the wrong type before calling onAdd, and reports it', () => {
    const onAdd = vi.fn()
    const onRejected = vi.fn()
    render(
      <FileUploader
        files={[]}
        onAdd={onAdd}
        onRemove={() => {}}
        accept="image/png"
        onRejected={onRejected}
      />,
    )
    const input = screen.getByLabelText(/upload more/i) as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile('doc.pdf', 'application/pdf')] } })
    expect(onAdd).not.toHaveBeenCalled()
    expect(onRejected).toHaveBeenCalledWith([{ file: expect.any(File), reason: 'Unsupported file type' }])
    expect(screen.getByText(/1 file skipped/)).toBeInTheDocument()
  })

  it('rejects a file over maxFileSizeMB', () => {
    const onAdd = vi.fn()
    render(<FileUploader files={[]} onAdd={onAdd} onRemove={() => {}} maxFileSizeMB={0.000001} />)
    const input = screen.getByLabelText(/upload more/i) as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile('big.jpg', 'image/jpeg', 5000)] } })
    expect(onAdd).not.toHaveBeenCalled()
    expect(screen.getByText(/skipped/)).toBeInTheDocument()
  })

  it('shows an upload progress bar and an error state', () => {
    render(
      <FileUploader
        files={[
          { id: '1', name: 'a.jpg', status: 'uploading', progress: 60 },
          { id: '2', name: 'b.jpg', status: 'error', errorText: 'Network error' },
        ]}
        onAdd={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(screen.getByText('Network error')).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = render(<FileUploader files={FILES} onAdd={() => {}} onRemove={() => {}} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('FileUploader panel layout (file-upload figma spec)', () => {
  const IMAGE: UploadedFile = { id: 'i1', name: 'site.jpg', mimeType: 'image/jpeg', previewUrl: 'data:image/jpeg;base64,abc', status: 'done' }
  const DOC: UploadedFile = { id: 'd1', name: 'File Name.abc', mimeType: 'application/octet-stream', status: 'done' }

  it('empty panel shows CTA + hint inside the dropzone', () => {
    render(
      <FileUploader files={[]} onAdd={() => {}} onRemove={() => {}} layout="panel" hint="Accepted formats: .png, .jpeg" />,
    )
    expect(screen.getByText(/Choose files/)).toBeInTheDocument()
    expect(screen.getByText('Accepted formats: .png, .jpeg')).toBeInTheDocument()
  })

  it('dragover swaps panel content for the drop text', () => {
    const { container } = render(
      <FileUploader files={[]} onAdd={() => {}} onRemove={() => {}} layout="panel" />,
    )
    const zone = container.querySelector('[data-slot=file-uploader-dropzone]')!
    fireEvent.dragEnter(zone)
    expect(screen.getByText('Drop here')).toBeInTheDocument()
    expect(screen.queryByText(/Choose files/)).not.toBeInTheDocument()
  })

  it('single uploaded non-image renders the row with Re-Upload/Delete text actions', () => {
    const onRemove = vi.fn()
    const onReupload = vi.fn()
    render(
      <FileUploader files={[DOC]} onAdd={() => {}} onRemove={onRemove} onReupload={onReupload} layout="panel" multiple={false} />,
    )
    expect(screen.getByText('File Name.abc')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Re-Upload' }))
    expect(onReupload).toHaveBeenCalledWith('d1')
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onRemove).toHaveBeenCalledWith('d1')
  })

  it('single uploaded image renders the large tile with overlay actions', () => {
    const onRemove = vi.fn()
    const onReupload = vi.fn()
    const onFileEdit = vi.fn()
    render(
      <FileUploader files={[IMAGE]} onAdd={() => {}} onRemove={onRemove} onReupload={onReupload} onFileEdit={onFileEdit} layout="panel" multiple={false} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Re-upload site.jpg' }))
    expect(onReupload).toHaveBeenCalledWith('i1')
    fireEvent.click(screen.getByRole('button', { name: 'Edit site.jpg' }))
    expect(onFileEdit).toHaveBeenCalledWith('i1')
    fireEvent.click(screen.getByRole('button', { name: 'Delete site.jpg' }))
    expect(onRemove).toHaveBeenCalledWith('i1')
  })

  it('multi with files shows the Upload More tile plus a tile per file (mixed types)', () => {
    render(
      <FileUploader files={[IMAGE, DOC]} onAdd={() => {}} onRemove={() => {}} layout="panel" addMoreText="Upload More" />,
    )
    expect(screen.getByText('Upload More')).toBeInTheDocument()
    expect(screen.getByAltText('site.jpg')).toBeInTheDocument()
    expect(screen.getByText('File Name.abc')).toBeInTheDocument()
    expect(screen.queryByText(/Choose files/)).not.toBeInTheDocument()
  })

  it('labeled empty panel renders the named-group tile', () => {
    render(<FileUploader files={[]} onAdd={() => {}} onRemove={() => {}} layout="panel" label="Front Side" />)
    expect(screen.getByText('Front Side')).toBeInTheDocument()
  })

  it('panel layout passes axe in empty + uploaded states', async () => {
    const { container } = render(
      <>
        <FileUploader files={[]} onAdd={() => {}} onRemove={() => {}} layout="panel" hint="Accepted formats: .png" />
        <FileUploader files={[IMAGE, DOC]} onAdd={() => {}} onRemove={() => {}} onReupload={() => {}} onFileEdit={() => {}} layout="panel" />
      </>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

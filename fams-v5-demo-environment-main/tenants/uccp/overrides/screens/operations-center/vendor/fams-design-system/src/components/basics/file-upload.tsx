import * as React from 'react';
import { UploadCloud, X } from 'lucide-react';
import { cn } from '../utils/cn';
import { FileTypeIcon } from './file-type-icon';

export interface UploadedFile {
  name: string;
  ext: string;
  size: string;
  progress?: number; // 0-100
}

export interface FileUploadProps extends React.HTMLAttributes<HTMLDivElement> {
  hint?: string;
  files?: UploadedFile[];
  onRemove?: (name: string) => void;
}

/** FileUpload — dropzone + file rows, modelled on the Figma "File Upload" page. */
export function FileUpload({
  hint = 'SVG, PNG, JPG or PDF (max. 10 MB)',
  files = [],
  onRemove,
  className,
  ...rest
}: FileUploadProps) {
  const [dragOver, setDragOver] = React.useState(false);
  return (
    <div className={cn('flex w-full max-w-md flex-col gap-3', className)} {...rest}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        className={cn(
          'flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-6 text-center transition-colors',
          dragOver ? 'border-primary bg-secondary' : 'border-border bg-card',
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-primary">
          <UploadCloud className="size-5" />
        </span>
        <p className="text-body-sm text-foreground">
          <span className="font-semibold text-primary">Click to upload</span> or drag and drop
        </p>
        <p className="text-caption text-muted-foreground">{hint}</p>
      </div>

      {files.map((f) => (
        <div key={f.name} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <FileTypeIcon ext={f.ext} size={36} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-body-sm font-medium text-foreground">{f.name}</span>
              <button
                type="button"
                aria-label="remove"
                onClick={() => onRemove?.(f.name)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </div>
            <span className="text-caption text-muted-foreground">{f.size}</span>
            {typeof f.progress === 'number' && (
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${f.progress}%` }} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

import * as React from 'react';
import { cn } from '../utils/cn';

/**
 * FileTypeIcon — faithful code reproduction of the Figma "Icons → File Type" set
 * (43 types). A document page with a folded corner plus a coloured extension
 * badge. Colours map to the Figma accent palette exactly per file type.
 */

const ACCENT: Record<string, string> = {
  error: 'var(--fig-accent-error-normal)',
  info: 'var(--fig-accent-info-normal)',
  success: 'var(--fig-accent-success-normal)',
  flame: 'var(--fig-accent-flame-normal)',
  plum: 'var(--fig-accent-plum-normal)',
  lavender: 'var(--fig-accent-lavender-normal)',
  pink: 'var(--fig-accent-pink-normal)',
  cyan: 'var(--fig-accent-cyan-normal)',
  neutral: 'var(--fig-neutral-darker)',
};

/** Extension → accent colour, taken verbatim from the Figma File Type components. */
export const FILE_TYPE_COLOR: Record<string, keyof typeof ACCENT> = {
  PDF: 'error', AI: 'error',
  DOC: 'info', DOCX: 'info', JPG: 'info', JPEG: 'info', PNG: 'info', GIF: 'info',
  SVG: 'info', WEBP: 'info', TIFF: 'info', IMG: 'info', MP4: 'info', MKV: 'info',
  AVI: 'info', MPEG: 'info', PSD: 'info', FIG: 'info', EPS: 'info',
  XLS: 'success', XLSX: 'success', CSV: 'success',
  PPT: 'flame', PPTX: 'flame',
  MP3: 'plum', WAV: 'plum',
  AEP: 'lavender', KML: 'lavender',
  INDD: 'pink',
  HTML: 'cyan', CSS: 'cyan', JS: 'cyan', JSON: 'cyan', XML: 'cyan', JAVA: 'cyan',
  SQL: 'cyan', RSS: 'cyan', EXE: 'cyan', DMG: 'cyan',
  TXT: 'neutral', ZIP: 'neutral', RAR: 'neutral',
};

export const FILE_TYPES = Object.keys(FILE_TYPE_COLOR);

export interface FileTypeIconProps extends React.SVGProps<SVGSVGElement> {
  /** Extension label, e.g. "PDF". If omitted / unknown, renders a blank page. */
  ext?: string;
  size?: number;
}

export function FileTypeIcon({ ext, size = 40, className, ...rest }: FileTypeIconProps) {
  const key = ext?.toUpperCase();
  const tone = key && FILE_TYPE_COLOR[key] ? ACCENT[FILE_TYPE_COLOR[key]] : undefined;
  return (
    <svg
      viewBox="0 0 32 40"
      width={size * 0.8}
      height={size}
      className={cn('inline-block', className)}
      {...rest}
    >
      {/* page body */}
      <path
        d="M4 2.5A2.5 2.5 0 0 1 6.5 0H20l8 8v29.5a2.5 2.5 0 0 1-2.5 2.5h-19A2.5 2.5 0 0 1 4 37.5z"
        fill="#fff"
        stroke="var(--fig-neutral-xlight)"
        strokeWidth={1.5}
      />
      {/* folded corner */}
      <path d="M20 0l8 8h-6a2 2 0 0 1-2-2z" fill="var(--fig-neutral-lighter)" />
      {/* extension badge */}
      {tone && key && (
        <>
          <rect x="2" y="22" width={Math.min(28, 8 + key.length * 5)} height="12" rx="2" fill={tone} />
          <text
            x={2 + Math.min(28, 8 + key.length * 5) / 2}
            y="30.5"
            textAnchor="middle"
            fontSize="7"
            fontWeight="700"
            fontFamily="Gilroy, sans-serif"
            fill="#fff"
          >
            {key}
          </text>
        </>
      )}
    </svg>
  );
}

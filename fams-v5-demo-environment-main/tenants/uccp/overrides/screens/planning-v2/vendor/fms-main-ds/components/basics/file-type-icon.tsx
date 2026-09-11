import * as React from 'react';
import { cn } from '../utils/cn';
import { fileTypeIconUrl, FILE_TYPE_ICON_KEYS } from './file-type-icons';

/**
 * FileTypeIcon — the REAL Figma "Icons → File Type" artwork (illustrated
 * document page + colour-coded extension corner, ~42 types + a `Default`
 * fallback), loaded from `assets/vectors/file type/File Type/*.svg` via the
 * `file-type-icons` registry (T-089 — was a plain code-drawn page+badge
 * reproduction; upgraded to the shipped artwork itself).
 */

/** All known extension slugs (sorted) — used by the Icons showcase page. */
export const FILE_TYPES = FILE_TYPE_ICON_KEYS;

export interface FileTypeIconProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Extension label, e.g. "PDF". Unknown/omitted → the generic Default glyph. */
  ext?: string;
  size?: number;
}

export function FileTypeIcon({ ext, size = 40, className, alt, ...rest }: FileTypeIconProps) {
  const url = fileTypeIconUrl(ext);
  return (
    <img
      src={url}
      alt={alt ?? (ext ? `${ext.toUpperCase()} file` : 'File')}
      width={size}
      height={size}
      className={cn('inline-block shrink-0', className)}
      {...rest}
    />
  );
}

// Factory for the AUTO-GENERATED V5 icon set (see generate-icons.mjs).
import * as React from 'react';

export interface V5IconProps extends React.SVGProps<SVGSVGElement> {
  /** Square size in px (default 24 — the source asset grid). */
  size?: number;
}

export function createV5Icon(name: string, viewBox: string, inner: string) {
  const Icon = React.forwardRef<SVGSVGElement, V5IconProps>(function V5Icon(
    { size = 24, ...props },
    ref
  ) {
    return (
      <svg
        ref={ref}
        viewBox={viewBox}
        width={size}
        height={size}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden={props['aria-label'] ? undefined : true}
        dangerouslySetInnerHTML={{ __html: inner }}
        {...props}
      />
    );
  });
  Icon.displayName = name;
  return Icon;
}

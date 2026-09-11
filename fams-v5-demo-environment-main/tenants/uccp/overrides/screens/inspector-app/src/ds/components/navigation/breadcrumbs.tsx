import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';

export interface BreadcrumbItem {
  label: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
}

export function Breadcrumbs({ className, items, separator, ...props }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-caption text-muted-foreground', className)} {...props}>
      <ol className="flex items-center gap-1">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          const sep = separator ?? <ChevronRight className="size-3" />;
          const node = item.href ? (
            <a href={item.href} onClick={item.onClick} className="hover:text-foreground hover:underline">
              {item.label}
            </a>
          ) : item.onClick ? (
            <button onClick={item.onClick} className="hover:text-foreground hover:underline">
              {item.label}
            </button>
          ) : (
            <span className={isLast ? 'text-foreground font-medium' : undefined}>{item.label}</span>
          );
          return (
            <li key={i} className="flex items-center gap-1">
              {node}
              {!isLast ? <span aria-hidden>{sep}</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

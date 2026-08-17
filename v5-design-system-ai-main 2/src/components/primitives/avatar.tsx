import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils/cn';

const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        xs: 'size-5 text-caption',
        sm: 'size-6 text-caption',
        md: 'size-8 text-body-sm',
        lg: 'size-10 text-body-sm',
        xl: 'size-14 text-body-md',
      },
    },
    defaultVariants: { size: 'md' },
  }
);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string; // initials
  status?: 'online' | 'offline' | 'busy';
}

export const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  ({ className, size, src, alt, fallback, status, ...props }, ref) => (
    <AvatarPrimitive.Root ref={ref} className={cn(avatarVariants({ size }), className)} {...props}>
      {src ? (
        <AvatarPrimitive.Image src={src} alt={alt} className="aspect-square h-full w-full object-cover" />
      ) : null}
      <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center rounded-full bg-secondary font-medium text-secondary-foreground">
        {fallback ?? (alt ? alt.slice(0, 2).toUpperCase() : '??')}
      </AvatarPrimitive.Fallback>
      {status ? (
        <span
          className={cn(
            'absolute right-0 bottom-0 size-2 rounded-full ring-2 ring-card',
            status === 'online' && 'bg-[color:var(--status-success)]',
            status === 'busy' && 'bg-[color:var(--status-error)]',
            status === 'offline' && 'bg-[color:var(--gray-400)]'
          )}
        />
      ) : null}
    </AvatarPrimitive.Root>
  )
);
Avatar.displayName = 'Avatar';

'use client';
import * as React from 'react';
import { Toaster as Sonner, toast } from 'sonner';

/**
 * Toaster — wraps sonner with FAMS theme defaults.
 */
export function Toaster(props: React.ComponentProps<typeof Sonner>) {
  return (
    <Sonner
      position="top-right"
      theme="light"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: 'var(--card)',
          color: 'var(--card-foreground)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--elevation-sm)',
        },
      }}
      {...props}
    />
  );
}

export { toast };

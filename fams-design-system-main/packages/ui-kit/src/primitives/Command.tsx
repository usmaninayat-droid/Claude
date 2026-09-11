import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react'
import { Command as CommandPrimitive } from 'cmdk'
import { Search } from '../icons'
import { cn } from '../lib/cn'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './Dialog'

/**
 * Command — cmdk-based command list / palette. [L1 primitive]
 * Ported from `FAMS-Design-System-By-Shaheer`
 * (`src/components/primitives/command.tsx`), restyled onto tokens (phase 1
 * §6). Same `cmdk` dependency the `Combobox` composite already uses for its
 * search list — this exposes it as a standalone list primitive for the
 * "Command palette" entry in CLAUDE.md § Use shadcn for / custom-build for.
 */
export const Command = forwardRef<
  ElementRef<typeof CommandPrimitive>,
  ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    data-slot="command"
    className={cn('flex h-full w-full flex-col overflow-hidden rounded-md bg-card text-card-foreground', className)}
    {...props}
  />
))
Command.displayName = 'Command'

export interface CommandDialogProps extends ComponentPropsWithoutRef<typeof Dialog> {
  /** Accessible dialog title — visually hidden by default (a search palette rarely wants a visible heading). */
  title?: ReactNode
  description?: ReactNode
  className?: string
}

/**
 * CommandDialog — `Command` rendered inside a modal overlay (the "⌘K"
 * command-palette pattern). Composes the existing `Dialog`/`DialogContent`
 * primitives rather than importing Radix directly — decision #7 bans new
 * `@radix-ui/*` imports; this file never imports Radix itself.
 */
export function CommandDialog({
  title = 'Command palette',
  description = 'Search for a command…',
  className,
  children,
  ...props
}: CommandDialogProps) {
  return (
    <Dialog {...props}>
      <DialogContent className={cn('overflow-hidden p-0', className)} hideClose>
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <Command>{children}</Command>
      </DialogContent>
    </Dialog>
  )
}

export const CommandInput = forwardRef<
  ElementRef<typeof CommandPrimitive.Input>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className="flex items-center gap-2 border-b border-border px-3" data-slot="command-input-wrapper">
    <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <CommandPrimitive.Input
      ref={ref}
      data-slot="command-input"
      className={cn(
        'flex h-10 w-full rounded-sm bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  </div>
))
CommandInput.displayName = 'CommandInput'

export const CommandList = forwardRef<
  ElementRef<typeof CommandPrimitive.List>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    data-slot="command-list"
    className={cn('max-h-80 overflow-y-auto overflow-x-hidden p-1', className)}
    {...props}
  />
))
CommandList.displayName = 'CommandList'

export const CommandEmpty = forwardRef<
  ElementRef<typeof CommandPrimitive.Empty>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    data-slot="command-empty"
    className="py-6 text-center text-sm text-muted-foreground"
    {...props}
  />
))
CommandEmpty.displayName = 'CommandEmpty'

export const CommandGroup = forwardRef<
  ElementRef<typeof CommandPrimitive.Group>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    data-slot="command-group"
    className={cn(
      'overflow-hidden p-1 text-foreground',
      '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground',
      className,
    )}
    {...props}
  />
))
CommandGroup.displayName = 'CommandGroup'

export const CommandItem = forwardRef<
  ElementRef<typeof CommandPrimitive.Item>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    data-slot="command-item"
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-xs px-2 py-1.5 text-sm text-foreground outline-none data-[selected='true']:bg-muted data-[disabled='true']:pointer-events-none data-[disabled='true']:opacity-50",
      className,
    )}
    {...props}
  />
))
CommandItem.displayName = 'CommandItem'

export const CommandSeparator = forwardRef<
  ElementRef<typeof CommandPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    data-slot="command-separator"
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
))
CommandSeparator.displayName = 'CommandSeparator'

export function CommandShortcut({ className, ...props }: ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn('ms-auto text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  )
}

import { Section, Demo } from './kit';
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Popover,
  PopoverTrigger,
  PopoverContent,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Toaster,
  toast,
} from '../components';
import { MoreHorizontal } from 'lucide-react';

export function Overlays() {
  return (
    <Section
      id="overlays"
      title="Overlays & Menus"
      description="Dialogs, side sheets, popovers, dropdown menus and toasts — all Radix-driven with the brand scrim and elevation tokens."
    >
      <Toaster />
      <Demo title="Dialog · Alert dialog · Sheet">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary">Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create work order</DialogTitle>
              <DialogDescription>Fill in the details to schedule maintenance.</DialogDescription>
            </DialogHeader>
            <p className="text-body-sm text-muted-foreground">Dialog body content goes here.</p>
            <DialogFooter>
              <Button variant="ghost">Cancel</Button>
              <Button>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The asset and its history will be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="tertiary">Open side sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Asset 4218</SheetTitle>
              <SheetDescription>Concrete mixer · Dubai Yard</SheetDescription>
            </SheetHeader>
            <div className="p-4 text-body-sm text-muted-foreground">Detail panel content.</div>
          </SheetContent>
        </Sheet>
      </Demo>

      <Demo title="Popover · Dropdown menu · Toast">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary">Popover</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <p className="text-body-sm text-foreground">Quick filters and inline actions live here.</p>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="menu">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View</DropdownMenuItem>
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={() => toast.success('Work order created', { description: 'WO-1245 scheduled for Jun 15.' })}>
          Show toast
        </Button>
      </Demo>
    </Section>
  );
}

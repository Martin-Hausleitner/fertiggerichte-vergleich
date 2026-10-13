/**
 * App-level UI barrel. Everything here is a thin, typed adapter over the official
 * shadcn/ui primitives in this folder, so views keep a short import path.
 */
import * as React from 'react'
import { cn } from '@/lib'
import { Button as ShButton, buttonVariants } from './button'
import { Badge as ShBadge } from './badge'
import { Sheet as ShSheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from './sheet'
export { buttonVariants }
export { Separator } from './separator'
export { Input } from './input'
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card'
export { Skeleton } from './skeleton'

type ButtonProps = Omit<React.ComponentProps<typeof ShButton>, 'size'> & { active?: boolean; size?: 'sm' | 'md' | 'icon' }
/** shadcn Button; `active` toggles between the default (filled) and outline variant. */
export function Button({ active, size = 'md', variant, className, ...p }: ButtonProps) {
  return <ShButton variant={variant ?? (active ? 'default' : 'outline')} size={size === 'md' ? 'default' : size} className={cn('shadow-none', className)} {...p} />
}

/** Calm, monochrome badge: shadcn Badge (outline) with normal weight. Colour classes from callers still win. */
export function Badge({ className, variant = 'outline', ...p }: React.ComponentProps<typeof ShBadge>) {
  return <ShBadge variant={variant} className={cn('gap-1 rounded-md px-1.5 py-0 text-[11px] font-medium whitespace-nowrap', className)} {...p} />
}

/** Native select styled like shadcn Input (kept native for long option lists and mobile pickers). */
export function Select({ className, ...p }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn('h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer', className)} {...p} />
}

type SheetProps = { open: boolean; onClose: () => void; side?: 'right' | 'bottom'; title?: React.ReactNode; children: React.ReactNode }
/** Controlled shadcn Sheet with a title bar and scrolling body. */
export function Sheet({ open, onClose, side = 'right', title, children }: SheetProps) {
  return <ShSheet open={open} onOpenChange={o => { if (!o) onClose() }}>
    <SheetContent side={side} className={cn('flex flex-col gap-0 p-0', side === 'right' ? 'w-full sm:max-w-[560px] lg:max-w-[680px]' : 'max-h-[88vh]')}>
      <SheetHeader className="border-b px-5 py-3.5 text-left"><SheetTitle>{title}</SheetTitle><SheetDescription className="sr-only">{title}</SheetDescription></SheetHeader>
      <div className="flex-1 overflow-y-auto p-5">{children}</div>
    </SheetContent>
  </ShSheet>
}
